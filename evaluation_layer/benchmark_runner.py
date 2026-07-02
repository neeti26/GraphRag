"""
Evaluation Layer — runs the full 3-pipeline benchmark suite.

Pipelines
---------
  1. Baseline  — LLM with raw logs (no retrieval)
  2. Basic RAG — FAISS vector search + LLM (new)
  3. GraphRAG  — TigerGraph 3-hop GSQL + LLM

Quality Metrics
---------------
  • BERTScore F1  — semantic similarity vs gold answers
  • LLM Judge     — GPT/Groq rates Accuracy / Completeness / Grounding
"""
from __future__ import annotations

import json
from typing import List, Dict, Optional

from evaluation_layer.metrics import BenchmarkRecord, build_record
from evaluation_layer.quality_scorer import score_answer, llm_judge, GOLD_ANSWERS
from inference_layer.baseline_pipeline import BaselinePipeline
from inference_layer.basic_rag_pipeline import BasicRAGPipeline
from inference_layer.graphrag_pipeline import GraphRAGPipeline

# Ground truth labels for all test accounts
GROUND_TRUTH: Dict[str, str] = {
    "8821": "SUSPICIOUS",   # In fraud ring — looks innocent in isolation
    "3344": "SAFE",         # Innocent bystander
    "1002": "SUSPICIOUS",   # Known flagged
    "5566": "SUSPICIOUS",   # Ring member
}


class BenchmarkRunner:
    def __init__(
        self,
        baseline: BaselinePipeline,
        basic_rag: BasicRAGPipeline,
        graphrag: GraphRAGPipeline,
        llm=None,               # LLMClient for the judge; if None, judge is skipped
        run_quality_scoring: bool = True,
    ):
        self.baseline = baseline
        self.basic_rag = basic_rag
        self.graphrag = graphrag
        self.llm = llm
        self.run_quality_scoring = run_quality_scoring
        self.results: List[BenchmarkRecord] = []

    # ── single account ────────────────────────────────────────────────────────

    def run_single(self, account_id: str) -> BenchmarkRecord:
        gt = GROUND_TRUTH.get(account_id, "UNKNOWN")
        ref = GOLD_ANSWERS.get(account_id, f"{gt} — reference answer not available.")

        print(f"\n[Benchmark] Account #{account_id} (ground truth: {gt})")

        # ── run pipelines ────────────────────────────────────────
        b = self.baseline.run(account_id)
        print(
            f"  Baseline  : {b.verdict:10s} | "
            f"{b.llm_response.total_tokens:4d} tokens | "
            f"{b.llm_response.latency_ms:.0f}ms"
        )

        r = self.basic_rag.run(account_id)
        print(
            f"  Basic RAG : {r.verdict:10s} | "
            f"{r.llm_response.total_tokens:4d} tokens | "
            f"{r.llm_response.latency_ms:.0f}ms | "
            f"{len(r.retrieved_chunks)} chunks retrieved"
        )

        g = self.graphrag.run(account_id)
        print(
            f"  GraphRAG  : {g.verdict:10s} | "
            f"{g.llm_response.total_tokens:4d} tokens | "
            f"{g.llm_response.latency_ms:.0f}ms | "
            f"risk={g.risk_score}"
        )

        # ── quality scoring ──────────────────────────────────────
        qs: Dict = {}
        if self.run_quality_scoring:
            print(f"  Scoring BERTScore …", end="", flush=True)
            qs["baseline_bert"]  = score_answer(b.reasoning, ref)
            qs["basic_rag_bert"] = score_answer(r.reasoning, ref)
            qs["graphrag_bert"]  = score_answer(g.reasoning, ref)
            print(
                f" baseline={qs['baseline_bert']:.3f} "
                f"basic_rag={qs['basic_rag_bert']:.3f} "
                f"graphrag={qs['graphrag_bert']:.3f}"
            )

            if self.llm is not None:
                print(f"  LLM Judge …", end="", flush=True)
                bj = llm_judge(self.llm, account_id, b.reasoning, gt)
                rj = llm_judge(self.llm, account_id, r.reasoning, gt)
                gj = llm_judge(self.llm, account_id, g.reasoning, gt)
                qs["baseline_judge"]        = bj["avg_score"]
                qs["basic_rag_judge"]       = rj["avg_score"]
                qs["graphrag_judge"]        = gj["avg_score"]
                qs["baseline_judge_detail"]  = bj
                qs["basic_rag_judge_detail"] = rj
                qs["graphrag_judge_detail"]  = gj
                print(
                    f" baseline={bj['avg_score']:.1f} "
                    f"basic_rag={rj['avg_score']:.1f} "
                    f"graphrag={gj['avg_score']:.1f}"
                )

        record = build_record(account_id, gt, b, r, g, qs)
        self.results.append(record)
        return record

    # ── full suite ────────────────────────────────────────────────────────────

    def run_suite(self, account_ids: Optional[List[str]] = None) -> List[BenchmarkRecord]:
        ids = account_ids or list(GROUND_TRUTH.keys())
        for aid in ids:
            self.run_single(aid)
        return self.results

    # ── aggregate summary ─────────────────────────────────────────────────────

    def summary(self) -> Dict:
        if not self.results:
            return {}
        n = len(self.results)

        def acc(key):
            return round(sum(1 for r in self.results if getattr(r, key)) / n * 100, 1)

        def avg(key):
            vals = [getattr(r, key) for r in self.results if getattr(r, key)]
            return round(sum(vals) / len(vals), 3) if vals else 0.0

        return {
            "total_accounts": n,
            "run_timestamp": __import__("datetime").datetime.utcnow().isoformat() + "Z",

            # Accuracy
            "baseline_accuracy_pct":   acc("baseline_correct"),
            "basic_rag_accuracy_pct":  acc("basic_rag_correct"),
            "graphrag_accuracy_pct":   acc("graphrag_correct"),

            # BERTScore averages
            "avg_baseline_bert_score":  avg("baseline_bert_score"),
            "avg_basic_rag_bert_score": avg("basic_rag_bert_score"),
            "avg_graphrag_bert_score":  avg("graphrag_bert_score"),

            # LLM Judge averages
            "avg_baseline_judge_score":  avg("baseline_judge_score"),
            "avg_basic_rag_judge_score": avg("basic_rag_judge_score"),
            "avg_graphrag_judge_score":  avg("graphrag_judge_score"),

            # Token economics
            "avg_token_savings_pct":        round(sum(r.token_savings_pct for r in self.results) / n, 1),
            "avg_latency_improvement_pct":  round(sum(r.latency_improvement_pct for r in self.results) / n, 1),
            "avg_cost_savings_pct":         round(sum(r.cost_savings_pct for r in self.results) / n, 1),
            "total_baseline_tokens":  sum(r.baseline_tokens for r in self.results),
            "total_basic_rag_tokens": sum(r.basic_rag_tokens for r in self.results),
            "total_graphrag_tokens":  sum(r.graphrag_tokens for r in self.results),
            "total_baseline_cost_usd":  round(sum(r.baseline_cost_usd for r in self.results), 6),
            "total_basic_rag_cost_usd": round(sum(r.basic_rag_cost_usd for r in self.results), 6),
            "total_graphrag_cost_usd":  round(sum(r.graphrag_cost_usd for r in self.results), 6),

            # Hallucination analysis
            "hallucination_cases": [
                r.account_id for r in self.results
                if not r.baseline_correct and r.graphrag_correct
            ],
            "basic_rag_hallucination_cases": [
                r.account_id for r in self.results
                if not r.basic_rag_correct and r.graphrag_correct
            ],
        }

    # ── save ──────────────────────────────────────────────────────────────────

    def save(self, path: str = "results.json"):
        data = {
            "summary": self.summary(),
            "records": [r.to_dict() for r in self.results],
        }
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
        print(f"\nResults saved → {path}")
