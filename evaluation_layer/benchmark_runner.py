"""
Evaluation Layer — runs the full benchmark suite.
"""
import json
from typing import List, Dict
from evaluation_layer.metrics import BenchmarkRecord, build_record
from inference_layer.baseline_pipeline import BaselinePipeline
from inference_layer.graphrag_pipeline import GraphRAGPipeline

# Ground truth labels for our test accounts
GROUND_TRUTH = {
    "8821": "SUSPICIOUS",   # In fraud ring — should be caught
    "3344": "SAFE",         # Innocent bystander — should be safe
    "1002": "SUSPICIOUS",   # Known flagged
    "0001": "SUSPICIOUS",   # Known banned
    "5566": "SUSPICIOUS",   # Ring member
}


class BenchmarkRunner:
    def __init__(self, baseline: BaselinePipeline, graphrag: GraphRAGPipeline):
        self.baseline = baseline
        self.graphrag = graphrag
        self.results: List[BenchmarkRecord] = []

    def run_single(self, account_id: str) -> BenchmarkRecord:
        gt = GROUND_TRUTH.get(account_id, "UNKNOWN")
        print(f"\n[Benchmark] Account #{account_id} (ground truth: {gt})")

        b = self.baseline.run(account_id)
        print(f"  Baseline : {b.verdict:10s} | {b.llm_response.total_tokens:4d} tokens | {b.llm_response.latency_ms:.0f}ms")

        g = self.graphrag.run(account_id)
        print(f"  GraphRAG : {g.verdict:10s} | {g.llm_response.total_tokens:4d} tokens | {g.llm_response.latency_ms:.0f}ms | risk={g.risk_score}")

        record = build_record(account_id, gt, b, g)
        self.results.append(record)
        return record

    def run_suite(self, account_ids: List[str] = None) -> List[BenchmarkRecord]:
        ids = account_ids or list(GROUND_TRUTH.keys())
        for aid in ids:
            self.run_single(aid)
        return self.results

    def summary(self) -> Dict:
        if not self.results:
            return {}
        n = len(self.results)
        b_correct = sum(1 for r in self.results if r.baseline_correct)
        g_correct = sum(1 for r in self.results if r.graphrag_correct)
        return {
            "total_accounts": n,
            "baseline_accuracy_pct": round(b_correct / n * 100, 1),
            "graphrag_accuracy_pct": round(g_correct / n * 100, 1),
            "avg_token_savings_pct": round(sum(r.token_savings_pct for r in self.results) / n, 1),
            "avg_latency_improvement_pct": round(sum(r.latency_improvement_pct for r in self.results) / n, 1),
            "avg_cost_savings_pct": round(sum(r.cost_savings_pct for r in self.results) / n, 1),
            "total_baseline_tokens": sum(r.baseline_tokens for r in self.results),
            "total_graphrag_tokens": sum(r.graphrag_tokens for r in self.results),
            "total_baseline_cost_usd": round(sum(r.baseline_cost_usd for r in self.results), 6),
            "total_graphrag_cost_usd": round(sum(r.graphrag_cost_usd for r in self.results), 6),
            "hallucination_cases": [r.account_id for r in self.results if not r.baseline_correct and r.graphrag_correct],
        }

    def save(self, path="results.json"):
        data = {"summary": self.summary(), "records": [r.to_dict() for r in self.results]}
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
        print(f"\nResults saved → {path}")
