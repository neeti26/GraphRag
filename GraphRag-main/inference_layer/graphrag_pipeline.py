"""
Pipeline 3 — GraphRAG (TigerGraph + LLM).

TigerGraph runs a 3-hop GSQL traversal first.
The LLM receives the verified graph facts and produces grounded reasoning.

Key design: verdict is determined by graph evidence, NOT by the LLM's whim.
  - If graph shows flagged accounts / blacklisted IPs / shared devices → SUSPICIOUS
  - If graph shows clean connections only → SAFE
  - LLM provides the reasoning narrative (the "why"), graph provides the verdict.

This mirrors how real production fraud systems work — the graph is the oracle,
the LLM is the explainer.
"""
import re
from dataclasses import dataclass, field
from typing import List

from llm_layer.llm_client import LLMClient, LLMResponse
from graph_layer.tigergraph_client import TigerGraphClient


SYSTEM_PROMPT = """You are a Senior Cyber-Forensics AI explaining a fraud detection decision.
The verdict has already been determined by graph analysis.
Your job is to write a clear, grounded explanation of WHY the verdict is correct,
citing the specific graph evidence provided.

Format your response as:
Verdict: [VERDICT]
Risk Score: [X]/10
Reasoning: [3-5 sentences explaining the verdict using specific graph evidence]

Do not second-guess the verdict. Explain it using ONLY the facts provided."""


@dataclass
class GraphRAGResult:
    account_id: str
    verdict: str
    risk_score: float
    reasoning: str
    graph_evidence: List[str] = field(default_factory=list)
    flagged_connections: List[str] = field(default_factory=list)
    blacklisted_ips: List[str] = field(default_factory=list)
    shared_devices: List[str] = field(default_factory=list)
    hops_traversed: int = 0
    nodes_visited: int = 0
    llm_response: LLMResponse = None
    pipeline: str = "graphrag"
    neighborhood_summary: str = ""
    agentic_loop_triggered: bool = False
    agentic_refinement: str = ""


def _graph_verdict(flagged: list, blacklisted: list, shared_devices: list) -> tuple[str, float]:
    """
    Deterministic verdict from graph facts — no LLM needed for this decision.
    Returns (verdict, base_risk_score).
    """
    if flagged and blacklisted and shared_devices:
        return "SUSPICIOUS", 9.5
    if flagged and blacklisted:
        return "SUSPICIOUS", 9.0
    if blacklisted and shared_devices:
        return "SUSPICIOUS", 8.5
    if flagged or shared_devices:
        return "SUSPICIOUS", 7.5
    if blacklisted:
        return "SUSPICIOUS", 7.0
    return "SAFE", 0.0


def _extract_risk_score(text: str) -> float | None:
    """Extract numeric risk score from LLM response text."""
    patterns = [
        r'risk\s*score\s*[:\-]\s*([0-9]+(?:\.[0-9]+)?)\s*/?\s*10',
        r'risk\s*score\s*[:\-]\s*([0-9]+(?:\.[0-9]+)?)',
        r'\b([0-9]+(?:\.[0-9]+)?)\s*/\s*10\b',
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            val = float(m.group(1))
            if 0.0 <= val <= 10.0:
                return round(val, 1)
    return None


class GraphRAGPipeline:
    def __init__(self, llm: LLMClient, tg: TigerGraphClient):
        self.llm = llm
        self.tg  = tg

    def run(self, account_id: str) -> GraphRAGResult:
        # ── Step 1: TigerGraph 3-hop traversal ───────────────────
        graph_data     = self.tg.multi_hop_fraud_context(account_id, max_hops=3)
        evidence       = graph_data.get("evidence", [])
        flagged        = graph_data.get("flagged_accounts", [])
        blacklisted    = graph_data.get("blacklisted_ips", [])
        shared_devices = graph_data.get("shared_devices", [])
        nodes_visited  = graph_data.get("total_nodes_traversed", 0)

        neighborhood_data    = self.tg.neighborhood_summary(account_id)
        neighborhood_summary = neighborhood_data.get("summary", "")

        # ── Step 2: Deterministic verdict from graph ──────────────
        verdict, base_risk = _graph_verdict(flagged, blacklisted, shared_devices)

        # ── Step 3: Ask LLM to explain the verdict ────────────────
        evidence_bullets = "\n".join(f"- {e}" for e in evidence) if evidence \
                           else "- No suspicious connections found within 3 hops."

        prompt = (
            f"Target Account: #{account_id}\n"
            f"Graph-determined verdict: {verdict}\n"
            f"Base risk score: {base_risk}/10\n\n"
            f"GRAPH EVIDENCE (TigerGraph 3-hop GSQL traversal):\n"
            f"Cluster context: {neighborhood_summary}\n"
            f"{evidence_bullets}\n\n"
            f"SUMMARY:\n"
            f"- Flagged/Banned accounts in network: {flagged or 'None'}\n"
            f"- Blacklisted IPs in network: {blacklisted or 'None'}\n"
            f"- Shared devices with other accounts: {shared_devices or 'None'}\n"
            f"- Total nodes traversed: {nodes_visited}\n\n"
            f"Write your explanation confirming the {verdict} verdict for Account #{account_id}."
        )

        response = self.llm.complete_with_metrics(
            prompt, system=SYSTEM_PROMPT, max_tokens=600
        )
        content = response.content.strip()

        # Use LLM's risk score if it refined ours, otherwise keep graph-derived
        llm_risk = _extract_risk_score(content)
        risk_score = llm_risk if llm_risk is not None else base_risk

        # ── Step 4: Agentic refinement loop ──────────────────────
        # Extra IP intelligence call when SUSPICIOUS with mid-range risk
        agentic_loop_triggered = False
        agentic_refinement     = ""

        if verdict == "SUSPICIOUS" and 5.0 <= risk_score <= 8.5 and blacklisted:
            ip_data = self.tg.ip_transaction_volume(blacklisted[0])
            refine_prompt = (
                f"Initial analysis for Account #{account_id}:\n{content}\n\n"
                f"Additional IP intelligence for {blacklisted[0]}:\n"
                f"- Total logins from this IP: {ip_data.get('total_login_count', 'N/A')}\n"
                f"- Unique accounts using this IP: {ip_data.get('unique_accounts', 'N/A')}\n"
                f"- Chargeback rate: {ip_data.get('chargeback_rate', 'N/A')}%\n\n"
                f"Refine the risk assessment for Account #{account_id} with this IP intelligence."
            )
            refined = self.llm.complete_with_metrics(
                refine_prompt, system=SYSTEM_PROMPT, max_tokens=600
            )
            agentic_loop_triggered = True
            agentic_refinement     = refined.content.strip()
            refined_risk = _extract_risk_score(agentic_refinement)
            if refined_risk and refined_risk > risk_score:
                risk_score = refined_risk

        return GraphRAGResult(
            account_id=account_id,
            verdict=verdict,
            risk_score=risk_score,
            reasoning=content,
            graph_evidence=evidence,
            flagged_connections=flagged,
            blacklisted_ips=blacklisted,
            shared_devices=shared_devices,
            hops_traversed=3,
            nodes_visited=nodes_visited,
            llm_response=response,
            neighborhood_summary=neighborhood_summary,
            agentic_loop_triggered=agentic_loop_triggered,
            agentic_refinement=agentic_refinement,
        )
