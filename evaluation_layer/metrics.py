"""Evaluation Layer — benchmark metrics for all three pipelines."""
from dataclasses import dataclass, asdict, field
from typing import List


@dataclass
class BenchmarkRecord:
    # ── Required fields (no defaults) ────────────────────────
    account_id: str
    ground_truth: str
    question: str

    # Pipeline 1 — Baseline LLM
    baseline_verdict: str
    baseline_reasoning: str
    baseline_tokens: int
    baseline_latency_ms: float
    baseline_cost_usd: float
    baseline_correct: bool

    # Pipeline 2 — Basic RAG
    basic_rag_verdict: str
    basic_rag_reasoning: str
    basic_rag_tokens: int
    basic_rag_latency_ms: float
    basic_rag_cost_usd: float
    basic_rag_correct: bool

    # Pipeline 3 — GraphRAG
    graphrag_verdict: str
    graphrag_reasoning: str
    graphrag_tokens: int
    graphrag_latency_ms: float
    graphrag_cost_usd: float
    graphrag_correct: bool

    # ── Optional fields (with defaults) ──────────────────────
    basic_rag_chunks: List[str]        = field(default_factory=list)

    graphrag_risk_score: float         = 0.0
    graph_evidence: List[str]          = field(default_factory=list)
    flagged_connections: List[str]     = field(default_factory=list)
    blacklisted_ips: List[str]         = field(default_factory=list)
    shared_devices: List[str]          = field(default_factory=list)
    nodes_visited: int                 = 0
    neighborhood_summary: str          = ""
    agentic_loop_triggered: bool       = False
    agentic_refinement: str            = ""

    # Accuracy scores (set by AccuracyEvaluator)
    baseline_llm_judge: str            = "PENDING"
    basic_rag_llm_judge: str           = "PENDING"
    graphrag_llm_judge: str            = "PENDING"
    baseline_bertscore: float          = 0.0
    basic_rag_bertscore: float         = 0.0
    graphrag_bertscore: float          = 0.0

    # Deltas (GraphRAG vs Basic RAG)
    token_savings_vs_basic_rag_pct: float  = 0.0
    latency_improvement_pct: float         = 0.0
    cost_savings_vs_basic_rag_pct: float   = 0.0

    def to_dict(self):
        return asdict(self)


def build_record(
    account_id: str,
    ground_truth: str,
    question: str,
    baseline_result,
    basic_rag_result,
    graphrag_result,
) -> BenchmarkRecord:
    b  = baseline_result.llm_response
    br = basic_rag_result.llm_response
    g  = graphrag_result.llm_response

    def savings(base, rag):
        return round((base - rag) / base * 100, 1) if base else 0.0

    return BenchmarkRecord(
        account_id=account_id,
        ground_truth=ground_truth,
        question=question,

        baseline_verdict=baseline_result.verdict,
        baseline_reasoning=baseline_result.reasoning,
        baseline_tokens=b.total_tokens,
        baseline_latency_ms=round(b.latency_ms, 1),
        baseline_cost_usd=round(b.cost_usd, 7),
        baseline_correct=(baseline_result.verdict == ground_truth),

        basic_rag_verdict=basic_rag_result.verdict,
        basic_rag_reasoning=basic_rag_result.reasoning,
        basic_rag_tokens=br.total_tokens,
        basic_rag_latency_ms=round(br.latency_ms, 1),
        basic_rag_cost_usd=round(br.cost_usd, 7),
        basic_rag_correct=(basic_rag_result.verdict == ground_truth),
        basic_rag_chunks=getattr(basic_rag_result, "retrieved_chunks", []),

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
        neighborhood_summary=graphrag_result.neighborhood_summary,
        agentic_loop_triggered=graphrag_result.agentic_loop_triggered,
        agentic_refinement=graphrag_result.agentic_refinement,

        token_savings_vs_basic_rag_pct=savings(br.total_tokens, g.total_tokens),
        latency_improvement_pct=savings(br.latency_ms, g.latency_ms),
        cost_savings_vs_basic_rag_pct=savings(br.cost_usd, g.cost_usd),
    )
