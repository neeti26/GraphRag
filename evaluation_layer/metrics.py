"""
Evaluation Layer — benchmark metrics for fraud detection.
"""
from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class BenchmarkRecord:
    account_id: str
    ground_truth: str           # "SAFE" or "SUSPICIOUS"

    # Baseline
    baseline_verdict: str
    baseline_reasoning: str
    baseline_tokens: int
    baseline_latency_ms: float
    baseline_cost_usd: float
    baseline_correct: bool

    # GraphRAG
    graphrag_verdict: str
    graphrag_reasoning: str
    graphrag_tokens: int
    graphrag_latency_ms: float
    graphrag_cost_usd: float
    graphrag_correct: bool
    graphrag_risk_score: float
    graph_evidence: list
    flagged_connections: list
    blacklisted_ips: list
    shared_devices: list
    nodes_visited: int

    # Deltas
    token_savings_pct: float
    latency_improvement_pct: float
    cost_savings_pct: float

    # Agentic / entity fields
    neighborhood_summary: str = ""
    agentic_loop_triggered: bool = False
    agentic_refinement: str = ""
    entity_link: dict = None

    def to_dict(self):
        return asdict(self)


def build_record(account_id, ground_truth, baseline_result, graphrag_result) -> BenchmarkRecord:
    b = baseline_result.llm_response
    g = graphrag_result.llm_response

    def savings(base, rag):
        return round((base - rag) / base * 100, 1) if base else 0.0

    return BenchmarkRecord(
        account_id=account_id,
        ground_truth=ground_truth,
        baseline_verdict=baseline_result.verdict,
        baseline_reasoning=baseline_result.reasoning,
        baseline_tokens=b.total_tokens,
        baseline_latency_ms=round(b.latency_ms, 1),
        baseline_cost_usd=round(b.cost_usd, 7),
        baseline_correct=(baseline_result.verdict == ground_truth),
        graphrag_verdict=graphrag_result.verdict,
        graphrag_reasoning=graphrag_result.reasoning,
        graphrag_tokens=g.total_tokens,
        graphrag_latency_ms=round(g.latency_ms, 1),
        graphrag_cost_usd=round(g.cost_usd, 7),
        graphrag_correct=(graphrag_result.verdict == ground_truth),
        graphrag_risk_score=graphrag_result.risk_score,
        graph_evidence=graphrag_result.graph_evidence,
        flagged_connections=graphrag_result.flagged_connections,
        blacklisted_ips=graphrag_result.blacklisted_ips,
        shared_devices=graphrag_result.shared_devices,
        nodes_visited=graphrag_result.nodes_visited,
        token_savings_pct=savings(b.total_tokens, g.total_tokens),
        latency_improvement_pct=savings(b.latency_ms, g.latency_ms),
        cost_savings_pct=savings(b.cost_usd, g.cost_usd),
    )
