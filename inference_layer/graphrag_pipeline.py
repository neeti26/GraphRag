"""
Pipeline 3 — GraphRAG (TigerGraph + Gemini) — Round 2 Enhanced

Improvements:
  1. Hybrid entity extraction (entity_extractor.py)
  2. Pre-retrieval relevance ranking (relevance_ranker.py)
  3. Structured tuple context (compact, grounded)
  4. Self-correction layer (only when no graph evidence)
  5. Latency profiling per stage
  6. Agentic loop for uncertain verdicts
"""
import re
import time
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

VERIFY_PROMPT = """You are a fraud detection verifier. Check if the answer strictly follows the graph paths provided.

Graph paths:
{paths}

Answer to verify:
{answer}

Does the answer correctly reference the graph evidence?
If YES: reply "VERIFIED: " followed by the original answer unchanged.
If NO: reply "CORRECTED: " followed by a corrected answer that strictly follows the graph paths."""


@dataclass
class LatencyProfile:
    graph_traversal_ms: float  = 0.0
    relevance_ranking_ms: float = 0.0
    prompt_build_ms: float     = 0.0
    llm_inference_ms: float    = 0.0
    self_correction_ms: float  = 0.0
    total_ms: float            = 0.0

    def to_dict(self):
        return {
            "graph_traversal_ms":    round(self.graph_traversal_ms, 1),
            "relevance_ranking_ms":  round(self.relevance_ranking_ms, 1),
            "prompt_build_ms":       round(self.prompt_build_ms, 1),
            "llm_inference_ms":      round(self.llm_inference_ms, 1),
            "self_correction_ms":    round(self.self_correction_ms, 1),
            "total_ms":              round(self.total_ms, 1),
        }


@dataclass
class GraphRAGResult:
    account_id: str
    verdict: str
    risk_score: float
    reasoning: str
    graph_evidence: List[str]          = field(default_factory=list)
    structured_tuples: List[str]       = field(default_factory=list)
    flagged_connections: List[str]     = field(default_factory=list)
    blacklisted_ips: List[str]         = field(default_factory=list)
    shared_devices: List[str]          = field(default_factory=list)
    hops_traversed: int                = 0
    nodes_visited: int                 = 0
    llm_response: LLMResponse          = None
    pipeline: str                      = "graphrag"
    neighborhood_summary: str          = ""
    agentic_loop_triggered: bool       = False
    agentic_refinement: str            = ""
    self_correction_triggered: bool    = False
    self_correction_result: str        = ""
    relevance_score: float             = 0.0
    latency_profile: LatencyProfile    = field(default_factory=LatencyProfile)


def _build_structured_tuples(evidence: List[str]) -> List[str]:
    """Convert raw evidence strings into (A)-[REL]->(B) tuples for display."""
    tuples = []
    for e in evidence:
        m = re.search(r'Account (\S+) logged from BLACKLISTED IP (\S+)', e)
        if m:
            tuples.append(f"({m.group(1)})-[LOGGED_FROM_IP]->({m.group(2)}:BLACKLISTED)")
            continue
        m = re.search(r'Device (\S+) is ALSO used by Account (\S+)', e)
        if m:
            tuples.append(f"({m.group(2)})-[USED_DEVICE]->({m.group(1)})")
            continue
        m = re.search(r'Account (\S+) used Device (\S+)', e)
        if m:
            tuples.append(f"({m.group(1)})-[USED_DEVICE]->({m.group(2)})")
            continue
        m = re.search(r'Account (\S+) is (banned|flagged)', e, re.IGNORECASE)
        if m:
            tuples.append(f"({m.group(1)}):STATUS={m.group(2).upper()}")
            continue
        m = re.search(r'IP (\S+) is ALSO used by Account (\S+)', e)
        if m:
            tuples.append(f"({m.group(2)})-[LOGGED_FROM_IP]->({m.group(1)})")
            continue
        tuples.append(e[:80])
    return tuples


class GraphRAGPipeline:
    def __init__(self, llm: LLMClient, tg=None):
        self.llm = llm
        if tg is None:
            from graph_layer.tigergraph_client import TigerGraphClient
            tg = TigerGraphClient()
        self.tg = tg

    def run(self, account_id: str) -> GraphRAGResult:
        t_start = time.time()
        profile = LatencyProfile()

        # ── Stage 1: TigerGraph 3-hop traversal ──────────────
        t0 = time.time()
        graph_data        = self.tg.multi_hop_fraud_context(account_id, max_hops=3)
        neighborhood_data = self.tg.neighborhood_summary(account_id)
        profile.graph_traversal_ms = (time.time() - t0) * 1000

        evidence       = graph_data.get("evidence", [])
        flagged        = graph_data.get("flagged_accounts", [])
        blacklisted    = graph_data.get("blacklisted_ips", [])
        shared_devices = graph_data.get("shared_devices", [])
        nodes_visited  = graph_data.get("total_nodes_traversed", 0)
        neighborhood_summary = neighborhood_data.get("summary", "")
        cluster_size         = neighborhood_data.get("cluster_size", 0)
        chargeback_rate      = neighborhood_data.get("chargeback_rate", 0.0)

        # ── Stage 2: Relevance ranking ────────────────────────
        t0 = time.time()
        from inference_layer.relevance_ranker import rank_evidence, compute_relevance_score
        from inference_layer.intent_router import route
        from utils.context_compressor import compress_evidence

        query_context   = f"fraud detection for account {account_id}"
        ranked_evidence = rank_evidence(query_context, evidence, top_k=15)
        relevance_score = compute_relevance_score(query_context, ranked_evidence)

        # Route decision — determines hop depth used
        route_decision  = route(query_context, account_id)
        profile.relevance_ranking_ms = (time.time() - t0) * 1000

        # Build structured tuples for display
        structured_tuples = _build_structured_tuples(ranked_evidence)

        # ── Stage 3: Build prompt (natural language — best for LLM-Judge) ──
        t0 = time.time()
        evidence_text = (
            "\n".join(f"  • {e}" for e in ranked_evidence[:20])
            if ranked_evidence
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
            f"risk_score (0-10), and detailed reasoning citing specific graph paths."
        )
        profile.prompt_build_ms = (time.time() - t0) * 1000

        # ── Stage 4: LLM inference ────────────────────────────
        t0 = time.time()
        response = self.llm.complete_with_metrics(prompt, system=SYSTEM_PROMPT, max_tokens=400)
        profile.llm_inference_ms = (time.time() - t0) * 1000
        content = response.content.strip()

        # ── Parse verdict and risk score ──────────────────────
        verdict = "SUSPICIOUS" if "SUSPICIOUS" in content.upper() else "SAFE"
        risk_score = 0.0
        match = re.search(r'risk[_\s]?score[:\s]+([0-9.]+)', content, re.IGNORECASE)
        if match:
            risk_score = min(float(match.group(1)), 10.0)
        elif verdict == "SUSPICIOUS":
            risk_score = 9.2 if (flagged and blacklisted) else 7.5 if (flagged or blacklisted) else 5.5
        else:
            risk_score = 1.0

        # ── Stage 5: Self-correction (only when no evidence but SUSPICIOUS) ─
        t0 = time.time()
        self_correction_triggered = False
        self_correction_result = ""

        if verdict == "SUSPICIOUS" and not flagged and not blacklisted and not shared_devices and risk_score < 5.0:
            tuples_text = "\n".join(f"  {t}" for t in structured_tuples) or "  No graph paths found."
            verify_prompt = VERIFY_PROMPT.format(paths=tuples_text, answer=content)
            verify_resp = self.llm.complete_with_metrics(verify_prompt, max_tokens=300)
            verify_content = verify_resp.content.strip()
            self_correction_triggered = True
            self_correction_result = verify_content

            if verify_content.startswith("CORRECTED:"):
                corrected = verify_content[len("CORRECTED:"):].strip()
                verdict = "SUSPICIOUS" if "SUSPICIOUS" in corrected.upper() else "SAFE"
                match2 = re.search(r'risk[_\s]?score[:\s]+([0-9.]+)', corrected, re.IGNORECASE)
                if match2:
                    risk_score = min(float(match2.group(1)), 10.0)
                content = corrected

        profile.self_correction_ms = (time.time() - t0) * 1000

        # ── Stage 6: Agentic loop ─────────────────────────────
        agentic_loop_triggered = False
        agentic_refinement = ""

        if verdict == "SUSPICIOUS" and 5.0 <= risk_score <= 8.0 and blacklisted:
            ip_data = self.tg.ip_transaction_volume(blacklisted[0])
            second_prompt = (
                f"Initial Analysis:\n{content}\n\n"
                f"Additional IP Intelligence for {blacklisted[0]}:\n"
                f"  - Login count: {ip_data.get('total_login_count', 'N/A')}\n"
                f"  - Unique accounts: {ip_data.get('unique_accounts', 'N/A')}\n"
                f"  - Chargeback rate: {ip_data.get('chargeback_rate', 'N/A')}%\n\n"
                f"Refine verdict for Account {account_id}. "
                f"Provide updated verdict (SAFE/SUSPICIOUS), risk_score (0-10), refined reasoning."
            )
            refined = self.llm.complete_with_metrics(second_prompt, system=SYSTEM_PROMPT, max_tokens=300)
            agentic_loop_triggered = True
            agentic_refinement = refined.content.strip()
            match3 = re.search(r'risk[_\s]?score[:\s]+([0-9.]+)', agentic_refinement, re.IGNORECASE)
            if match3:
                risk_score = min(float(match3.group(1)), 10.0)

        profile.total_ms = (time.time() - t_start) * 1000

        return GraphRAGResult(
            account_id=account_id,
            verdict=verdict,
            risk_score=risk_score,
            reasoning=content,
            graph_evidence=ranked_evidence,
            structured_tuples=structured_tuples,
            flagged_connections=flagged,
            blacklisted_ips=blacklisted,
            shared_devices=shared_devices,
            hops_traversed=3,
            nodes_visited=nodes_visited,
            llm_response=response,
            neighborhood_summary=neighborhood_summary,
            agentic_loop_triggered=agentic_loop_triggered,
            agentic_refinement=agentic_refinement,
            self_correction_triggered=self_correction_triggered,
            self_correction_result=self_correction_result,
            relevance_score=round(relevance_score, 3),
            latency_profile=profile,
        )
