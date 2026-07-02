"""
Pipeline 2 — GraphRAG (TigerGraph + LLM).

TigerGraph runs a 3-hop traversal first, extracting:
  - Shared devices with flagged accounts
  - Blacklisted IPs
  - Fraud ring membership

The LLM receives only the relevant graph facts (~250 tokens)
and correctly identifies Account #8821 as SUSPICIOUS.
"""
from dataclasses import dataclass, field
from typing import List
from llm_layer.llm_client import LLMClient, LLMResponse
from graph_layer.tigergraph_client import TigerGraphClient


SYSTEM_PROMPT = """You are a Senior Cyber-Forensics AI specializing in synthetic identity fraud detection.
You are provided with a Knowledge Graph Context extracted from TigerGraph.
This context represents relationships within 3 hops of the target account.
The graph evidence is factual and verified — trust it completely.
Respond with SAFE or SUSPICIOUS, a risk score (0-10), and structured reasoning."""


@dataclass
class GraphRAGResult:
    account_id: str
    verdict: str              # "SAFE" or "SUSPICIOUS"
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


class GraphRAGPipeline:
    def __init__(self, llm: LLMClient, tg: TigerGraphClient):
        self.llm = llm
        self.tg = tg

    def run(self, account_id: str) -> GraphRAGResult:
        # Step 1: TigerGraph multi-hop traversal
        graph_data = self.tg.multi_hop_fraud_context(account_id, max_hops=3)

        evidence       = graph_data.get("evidence", [])
        flagged        = graph_data.get("flagged_accounts", [])
        blacklisted    = graph_data.get("blacklisted_ips", [])
        shared_devices = graph_data.get("shared_devices", [])
        nodes_visited  = graph_data.get("total_nodes_traversed", 0)

        # Step 1b: Neighborhood summary
        neighborhood_data = self.tg.neighborhood_summary(account_id)
        neighborhood_summary = neighborhood_data.get("summary", "")

        # Step 2: Build focused graph-context prompt (~250 tokens)
        evidence_text = "\n".join(f"  • {e}" for e in evidence) if evidence else "  • No suspicious connections found."

        prompt = f"""Target: Account #{account_id}

GRAPH EVIDENCE (extracted by TigerGraph — 3-hop traversal):
Neighborhood Context: {neighborhood_summary}
{evidence_text}

SUMMARY:
  - Flagged/Banned accounts in network: {flagged if flagged else 'None'}
  - Blacklisted IPs in network: {blacklisted if blacklisted else 'None'}
  - Shared devices with other accounts: {shared_devices if shared_devices else 'None'}
  - Total nodes traversed: {nodes_visited}

Based on this multi-hop relationship graph, analyze the fraud risk of Account #{account_id}.
Provide: verdict (SAFE/SUSPICIOUS), risk_score (0-10), and reasoning."""

        response = self.llm.complete_with_metrics(prompt, system=SYSTEM_PROMPT, max_tokens=400)
        content = response.content.strip()

        # Parse verdict and risk score
        verdict = "SUSPICIOUS" if "SUSPICIOUS" in content.upper() else "SAFE"
        risk_score = 0.0
        import re
        match = re.search(r'risk[_\s]?score[:\s]+([0-9.]+)', content, re.IGNORECASE)
        if match:
            risk_score = min(float(match.group(1)), 10.0)
        elif verdict == "SUSPICIOUS":
            risk_score = 8.5 if flagged or blacklisted else 5.0

        # Agentic loop: refine if SUSPICIOUS with mid-range risk and blacklisted IPs
        agentic_loop_triggered = False
        agentic_refinement = ""
        if verdict == "SUSPICIOUS" and 5.0 <= risk_score <= 8.0 and blacklisted:
            ip_data = self.tg.ip_transaction_volume(blacklisted[0])
            second_prompt = f"""Initial Analysis:
{content}

Additional IP Intelligence for {blacklisted[0]}:
  - Total login count: {ip_data.get('total_login_count', 'N/A')}
  - Unique accounts using this IP: {ip_data.get('unique_accounts', 'N/A')}
  - Chargeback rate: {ip_data.get('chargeback_rate', 'N/A')}%

Based on this additional IP volume data, refine your fraud verdict for Account #{account_id}.
Provide updated verdict (SAFE/SUSPICIOUS), risk_score (0-10), and refined reasoning."""
            refined = self.llm.complete_with_metrics(second_prompt, system=SYSTEM_PROMPT, max_tokens=400)
            agentic_loop_triggered = True
            agentic_refinement = refined.content.strip()

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
