"""
Evaluation Layer — benchmark metrics for all three fraud detection pipelines.

Three pipelines compared:
  1. Baseline  — LLM-only, raw logs (no retrieval)
  2. Basic RAG — vector search (FAISS) + LLM
  3. GraphRAG  — TigerGraph 3-hop traversal + LLM
"""
from dataclasses import dataclass, asdict, field
from typing import Optional, List


@dataclass
class BenchmarkRecord:
    account_id: str
    ground_truth: str           # "SAFE" or "SUSPICIOUS"

    # ── Pipeline 1: Baseline LLM ────────────────────────────────
    baseline_verdict: str
    baseline_reasoning: str
    baseline_tokens: int
    baseline_latency_ms: float
    baseline_cost_usd: float
    baseline_correct: bool
    baseline_bert_score: float = 0.0
    baseline_judge_score: float = 0.0
    baseline_judge_detail: dict = field(default_factory=dict)

    # ── Pipeline 2: Basic RAG (vector search) ───────────────────
    basic_rag_verdict: str = ""
    basic_rag_reasoning: str = ""
    basic_rag_tokens: int = 0
    basic_rag_latency_ms: float = 0.0
    basic_rag_cost_usd: float = 0.0
    basic_rag_correct: bool = False
    basic_rag_bert_score: float = 0.0
    basic_rag_judge_score: float = 0.0
    basic_rag_judge_detail: dict = field(default_factory=dict)
    basic_rag_retrieved_chunks: List[str] = field(default_factory=list)

    # ── Pipeline 3: GraphRAG ─────────────────────────────────────
    graphrag_verdict: str = ""
    graphrag_reasoning: str = ""
    graphrag_tokens: int = 0
    graphrag_latency_ms: float = 0.0
    graphrag_cost_usd: float = 0.0
    graphrag_correct: bool = False
    graphrag_risk_score: float = 0.0
    graphrag_bert_score: float = 0.0
    graphrag_judge_score: float = 0.0
    graphrag_judge_detail: dict = field(default_factory=dict)
    graph_evidence: List[str] = field(default_factory=list)
    flagged_connections: List[str] = field(default_factory=list)
    blacklisted_ips: List[str] = field(default_factory=list)
    shared_devices: List[str] = field(default_factory=list)
    nodes_visited: int = 0

    # ── Cross-pipeline deltas (Baseline → GraphRAG) ──────────────
    token_savings_pct: float = 0.0
    latency_improvement_pct: float = 0.0
    cost_savings_pct: float = 0.0

    # ── Extra GraphRAG fields ────────────────────────────────────
    neighborhood_summary: str = ""
    agentic_loop_triggered: bool = False
    agentic_refinement: str = ""
    entity_link: Optional[dict] = None

    def to_dict(self):
        return asdict(self)


def _savings(base: float, rag: float) -> float:
    return round((base - rag) / base * 100, 1) if base else 0.0


def build_record(
    account_id: str,
    ground_truth: str,
    baseline_result,
    basic_rag_result,
    graphrag_result,
    quality_scores: Optional[dict] = None,
) -> BenchmarkRecord:
    """
    Builds a BenchmarkRecord from the three pipeline results.

    quality_scores (optional) should have keys:
        baseline_bert, basic_rag_bert, graphrag_bert,
        baseline_judge, basic_rag_judge, graphrag_judge,
        baseline_judge_detail, basic_rag_judge_detail, graphrag_judge_detail
    """
    b = baseline_result.llm_response
    r = basic_rag_result.llm_response
    g = graphrag_result.llm_response
    qs = quality_scores or {}

    return BenchmarkRecord(
        account_id=account_id,
        ground_truth=ground_truth,

        # Baseline
        baseline_verdict=baseline_result.verdict,
        baseline_reasoning=baseline_result.reasoning,
        baseline_tokens=b.total_tokens,
        baseline_latency_ms=round(b.latency_ms, 1),
        baseline_cost_usd=round(b.cost_usd, 7),
        baseline_correct=(baseline_result.verdict == ground_truth),
        baseline_bert_score=qs.get("baseline_bert", 0.0),
        baseline_judge_score=qs.get("baseline_judge", 0.0),
        baseline_judge_detail=qs.get("baseline_judge_detail", {}),

        # Basic RAG
        basic_rag_verdict=basic_rag_result.verdict,
        basic_rag_reasoning=basic_rag_result.reasoning,
        basic_rag_tokens=r.total_tokens,
        basic_rag_latency_ms=round(r.latency_ms, 1),
        basic_rag_cost_usd=round(r.cost_usd, 7),
        basic_rag_correct=(basic_rag_result.verdict == ground_truth),
        basic_rag_bert_score=qs.get("basic_rag_bert", 0.0),
        basic_rag_judge_score=qs.get("basic_rag_judge", 0.0),
        basic_rag_judge_detail=qs.get("basic_rag_judge_detail", {}),
        basic_rag_retrieved_chunks=basic_rag_result.retrieved_chunks,

        # GraphRAG
        graphrag_verdict=graphrag_result.verdict,
        graphrag_reasoning=graphrag_result.reasoning,
        graphrag_tokens=g.total_tokens,
        graphrag_latency_ms=round(g.latency_ms, 1),
        graphrag_cost_usd=round(g.cost_usd, 7),
        graphrag_correct=(graphrag_result.verdict == ground_truth),
        graphrag_risk_score=graphrag_result.risk_score,
        graphrag_bert_score=qs.get("graphrag_bert", 0.0),
        graphrag_judge_score=qs.get("graphrag_judge", 0.0),
        graphrag_judge_detail=qs.get("graphrag_judge_detail", {}),
        graph_evidence=graphrag_result.graph_evidence,
        flagged_connections=graphrag_result.flagged_connections,
        blacklisted_ips=graphrag_result.blacklisted_ips,
        shared_devices=graphrag_result.shared_devices,
        nodes_visited=graphrag_result.nodes_visited,

        # Deltas (Baseline vs GraphRAG — primary comparison)
        token_savings_pct=_savings(b.total_tokens, g.total_tokens),
        latency_improvement_pct=_savings(b.latency_ms, g.latency_ms),
        cost_savings_pct=_savings(b.cost_usd, g.cost_usd),

        # GraphRAG extras
        neighborhood_summary=graphrag_result.neighborhood_summary,
        agentic_loop_triggered=graphrag_result.agentic_loop_triggered,
        agentic_refinement=graphrag_result.agentic_refinement,
    )
