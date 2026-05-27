"""
Pipeline 3 — GraphRAG (TigerGraph + Gemini).

TigerGraph runs a 3-hop traversal first, extracting:
  - Shared devices with flagged/banned accounts
  - Blacklisted IPs
  - Fraud ring membership
  - Merchant fraud patterns
  - Transaction history summary

The LLM receives only the relevant graph facts (~250 tokens)
and correctly identifies fraud rings that raw logs miss entirely.
"""
import re
from dataclasses import dataclass, field
from typing import List

from llm_layer.llm_client import LLMClient, LLMResponse

SYSTEM_PROMPT = """You are a Senior Cyber-Forensics AI specializing in synthetic
identity fraud detection.

You are provided with a Knowledge Graph Context extracted from TigerGraph.
This context represents verified relationships within 3 hops of the target account.
The graph evidence is factual — trust it completely.

Respond with:
1. Verdict: SAFE or SUSPICIOUS
2. Risk Score: 0.0–10.0
3. Reasoning: cite specific graph paths as evidence"""


@dataclass
class GraphRAGResult:
    account_id: str
    verdict: str                  # "SAFE" or "SUSPICIOUS"
    risk_score: float
    reasoning: str
    graph_evidence: List[str]     = field(default_factory=list)
    flagged_connections: List[str] = field(default_factory=list)
    blacklisted_ips: List[str]    = field(default_factory=list)
    shared_devices: List[str]     = field(default_factory=list)
    hops_traversed: int           = 0
    nodes_visited: int            = 0
    llm_response: LLMResponse     = None
    pipeline: str                 = "graphrag"
    neighborhood_summary: str     = ""
    agentic_loop_triggered: bool  = False
    agentic_refinement: str       = ""


class GraphRAGPipeline:
    def __init__(self, llm: LLMClient, tg=None):
        self.llm = llm
        # Always use TigerGraphClient (auto-falls back to local engine)
        if tg is None:
            from graph_layer.tigergraph_client import TigerGraphClient
            tg = TigerGraphClient()
        self.tg = tg

    def run(self, account_id: str) -> GraphRAGResult:
        # ── Step 1: TigerGraph 3-hop traversal (or local engine) ─
        graph_data        = self.tg.multi_hop_fraud_context(account_id, max_hops=3)
        neighborhood_data = self.tg.neighborhood_summary(account_id)
        evidence       = graph_data.get("evidence", [])
        flagged        = graph_data.get("flagged_accounts", [])
        blacklisted    = graph_data.get("blacklisted_ips", [])
        shared_devices = graph_data.get("shared_devices", [])
        nodes_visited  = graph_data.get("total_nodes_traversed", 0)

        # ── Step 1b: Neighborhood summary ────────────────────
        neighborhood_summary = neighborhood_data.get("summary", "")
        cluster_size         = neighborhood_data.get("cluster_size", 0)
        chargeback_rate      = neighborhood_data.get("chargeback_rate", 0.0)

        # ── Step 2: Build focused graph-context prompt (~250 tokens) ──
        evidence_text = (
            "\n".join(f"  • {e}" for e in evidence[:20])
            if evidence
            else "  • No suspicious connections found."
        )

        prompt = (
            f"Target: Account {account_id}\n\n"
            f"GRAPH EVIDENCE (TigerGraph 3-hop traversal):\n"
            f"Neighborhood: {neighborhood_summary}\n"
            f"Cluster size: {cluster_size} connected accounts | "
            f"Chargeback rate: {chargeback_rate:.1f}%\n\n"
            f"{evidence_text}\n\n"
            f"SUMMARY:\n"
            f"  - Flagged/Banned accounts in network: {flagged if flagged else 'None'}\n"
            f"  - Blacklisted IPs in network: {blacklisted if blacklisted else 'None'}\n"
            f"  - Shared devices with other accounts: {shared_devices if shared_devices else 'None'}\n"
            f"  - Total nodes traversed: {nodes_visited}\n\n"
            f"Based on this multi-hop relationship graph, analyze the fraud risk of "
            f"Account {account_id}. Provide: verdict (SAFE/SUSPICIOUS), "
            f"risk_score (0-10), and reasoning."
        )

        # ── Step 3: LLM inference ─────────────────────────────
        response = self.llm.complete_with_metrics(
            prompt, system=SYSTEM_PROMPT, max_tokens=400
        )
        content = response.content.strip()

        # ── Step 4: Parse verdict and risk score ──────────────
        verdict = "SUSPICIOUS" if "SUSPICIOUS" in content.upper() else "SAFE"
        risk_score = 0.0
        match = re.search(r'risk[_\s]?score[:\s]+([0-9.]+)', content, re.IGNORECASE)
        if match:
            risk_score = min(float(match.group(1)), 10.0)
        elif verdict == "SUSPICIOUS":
            # Infer risk from evidence strength
            if flagged and blacklisted:
                risk_score = 9.2
            elif flagged or blacklisted:
                risk_score = 7.5
            else:
                risk_score = 5.5
        else:
            risk_score = 1.0

        # ── Step 5: Agentic loop ──────────────────────────────
        # Refine if SUSPICIOUS with mid-range risk and blacklisted IPs
        agentic_loop_triggered = False
        agentic_refinement = ""

        if verdict == "SUSPICIOUS" and 5.0 <= risk_score <= 8.0 and blacklisted:
            ip_data = self.tg.ip_transaction_volume(blacklisted[0])
            second_prompt = (
                f"Initial Analysis:\n{content}\n\n"
                f"Additional IP Intelligence for {blacklisted[0]}:\n"
                f"  - Total login count: {ip_data.get('total_login_count', 'N/A')}\n"
                f"  - Unique accounts using this IP: {ip_data.get('unique_accounts', 'N/A')}\n"
                f"  - Chargeback rate: {ip_data.get('chargeback_rate', 'N/A')}%\n\n"
                f"Based on this additional IP volume data, refine your fraud verdict "
                f"for Account {account_id}. Provide updated verdict (SAFE/SUSPICIOUS), "
                f"risk_score (0-10), and refined reasoning."
            )
            refined = self.llm.complete_with_metrics(
                second_prompt, system=SYSTEM_PROMPT, max_tokens=400
            )
            agentic_loop_triggered = True
            agentic_refinement = refined.content.strip()

            # Update risk score from refined analysis
            match2 = re.search(r'risk[_\s]?score[:\s]+([0-9.]+)',
                                agentic_refinement, re.IGNORECASE)
            if match2:
                risk_score = min(float(match2.group(1)), 10.0)

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
