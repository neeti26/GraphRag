"""
Evaluation Layer — runs the full 3-pipeline benchmark suite.

Round 2: runs all three pipelines (Baseline, Basic RAG, GraphRAG)
on the benchmark question set and produces the full comparison report.
"""
import json
import time
from typing import List, Dict, Optional

from evaluation_layer.metrics import BenchmarkRecord, build_record
from evaluation_layer.accuracy_evaluator import AccuracyEvaluator
from inference_layer.baseline_pipeline import BaselinePipeline
from inference_layer.basic_rag_pipeline import BasicRAGPipeline
from inference_layer.graphrag_pipeline import GraphRAGPipeline


def load_benchmark_questions(path: str = "data/benchmark_questions.json") -> list:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        # Fallback demo questions
        return [
            {
                "question_id": "Q_DEMO_1",
                "question": "Is account FR0000A00 part of a fraud ring?",
                "account_id": "FR0000A00",
                "ground_truth": "SUSPICIOUS",
                "ground_truth_answer": "Account FR0000A00 is SUSPICIOUS — part of a synthetic identity fraud ring sharing devices and blacklisted IPs.",
                "question_type": "fraud_detection",
            },
            {
                "question_id": "Q_DEMO_2",
                "question": "Is account ACC0000001 suspicious?",
                "account_id": "ACC0000001",
                "ground_truth": "SAFE",
                "ground_truth_answer": "Account ACC0000001 is SAFE with no connections to flagged accounts or blacklisted IPs.",
                "question_type": "fraud_detection",
            },
        ]


class BenchmarkRunner:
    def __init__(
        self,
        baseline: BaselinePipeline,
        basic_rag: BasicRAGPipeline,
        graphrag: GraphRAGPipeline,
    ):
        self.baseline  = baseline
        self.basic_rag = basic_rag
        self.graphrag  = graphrag
        self.results: List[BenchmarkRecord] = []
        self.evaluator = AccuracyEvaluator()

    def run_single(self, question_data: dict) -> BenchmarkRecord:
        account_id = question_data["account_id"]
        ground_truth = question_data["ground_truth"]
        question = question_data["question"]

        print(f"\n[Benchmark] {question_data['question_id']} — Account {account_id} (GT: {ground_truth})")

        # Pipeline 1: Baseline LLM
        b = self.baseline.run(account_id)
        print(f"  Baseline  : {b.verdict:10s} | {b.llm_response.total_tokens:4d} tokens | {b.llm_response.latency_ms:.0f}ms")

        # Pipeline 2: Basic RAG
        br = self.basic_rag.run(account_id)
        print(f"  Basic RAG : {br.verdict:10s} | {br.llm_response.total_tokens:4d} tokens | {br.llm_response.latency_ms:.0f}ms")

        # Pipeline 3: GraphRAG
        g = self.graphrag.run(account_id)
        print(f"  GraphRAG  : {g.verdict:10s} | {g.llm_response.total_tokens:4d} tokens | {g.llm_response.latency_ms:.0f}ms | risk={g.risk_score}")

        record = build_record(account_id, ground_truth, question, b, br, g)
        self.results.append(record)
        return record

    def run_suite(
        self,
        questions: Optional[list] = None,
        max_questions: int = 50,
    ) -> List[BenchmarkRecord]:
        if questions is None:
            questions = load_benchmark_questions()

        questions = questions[:max_questions]
        print(f"\n{'='*60}")
        print(f"Running benchmark on {len(questions)} questions...")
        print(f"{'='*60}")

        for q in questions:
            try:
                self.run_single(q)
            except Exception as e:
                print(f"  [ERROR] {q['question_id']}: {e}")

        return self.results

    def run_accuracy_evaluation(self, questions: list) -> dict:
        """Run LLM-Judge + BERTScore on all results."""
        gt_answers = {q["account_id"]: q["ground_truth_answer"] for q in questions}
        return self.evaluator.evaluate_records(self.results, gt_answers)

    def summary(self) -> Dict:
        if not self.results:
            return {}

        n = len(self.results)

        def avg(vals):
            return round(sum(vals) / n, 1) if n else 0

        b_correct  = sum(1 for r in self.results if r.baseline_correct)
        br_correct = sum(1 for r in self.results if r.basic_rag_correct)
        g_correct  = sum(1 for r in self.results if r.graphrag_correct)

        # LLM-Judge pass rates
        b_judge  = sum(1 for r in self.results if r.baseline_llm_judge == "PASS")
        br_judge = sum(1 for r in self.results if r.basic_rag_llm_judge == "PASS")
        g_judge  = sum(1 for r in self.results if r.graphrag_llm_judge == "PASS")

        # BERTScore averages
        b_bert  = avg([r.baseline_bertscore for r in self.results])
        br_bert = avg([r.basic_rag_bertscore for r in self.results])
        g_bert  = avg([r.graphrag_bertscore for r in self.results])

        return {
            "total_questions": n,
            "dataset_tokens": "~100M (see data/token_count_report.json)",
            "tokenizer": "gemini-1.5-flash count_tokens API",

            "pipeline_1_baseline": {
                "accuracy_pct": round(b_correct / n * 100, 1),
                "llm_judge_pass_rate_pct": round(b_judge / n * 100, 1),
                "bertscore_f1_mean": b_bert,
                "avg_tokens": avg([r.baseline_tokens for r in self.results]),
                "avg_latency_ms": avg([r.baseline_latency_ms for r in self.results]),
                "avg_cost_usd": round(sum(r.baseline_cost_usd for r in self.results) / n, 7),
                "total_cost_usd": round(sum(r.baseline_cost_usd for r in self.results), 6),
            },
            "pipeline_2_basic_rag": {
                "accuracy_pct": round(br_correct / n * 100, 1),
                "llm_judge_pass_rate_pct": round(br_judge / n * 100, 1),
                "bertscore_f1_mean": br_bert,
                "avg_tokens": avg([r.basic_rag_tokens for r in self.results]),
                "avg_latency_ms": avg([r.basic_rag_latency_ms for r in self.results]),
                "avg_cost_usd": round(sum(r.basic_rag_cost_usd for r in self.results) / n, 7),
                "total_cost_usd": round(sum(r.basic_rag_cost_usd for r in self.results), 6),
            },
            "pipeline_3_graphrag": {
                "accuracy_pct": round(g_correct / n * 100, 1),
                "llm_judge_pass_rate_pct": round(g_judge / n * 100, 1),
                "bertscore_f1_mean": g_bert,
                "avg_tokens": avg([r.graphrag_tokens for r in self.results]),
                "avg_latency_ms": avg([r.graphrag_latency_ms for r in self.results]),
                "avg_cost_usd": round(sum(r.graphrag_cost_usd for r in self.results) / n, 7),
                "total_cost_usd": round(sum(r.graphrag_cost_usd for r in self.results), 6),
            },
            "graphrag_vs_basic_rag": {
                "token_savings_pct": avg([r.token_savings_vs_basic_rag_pct for r in self.results]),
                "latency_improvement_pct": avg([r.latency_improvement_pct for r in self.results]),
                "cost_savings_pct": avg([r.cost_savings_vs_basic_rag_pct for r in self.results]),
                "accuracy_improvement_pct": round((g_correct - br_correct) / n * 100, 1),
                "hallucination_cases_fixed": [
                    r.account_id for r in self.results
                    if not r.basic_rag_correct and r.graphrag_correct
                ],
            },
            "graphrag_vs_baseline": {
                "token_savings_pct": round(
                    (sum(r.baseline_tokens for r in self.results) - sum(r.graphrag_tokens for r in self.results))
                    / max(sum(r.baseline_tokens for r in self.results), 1) * 100, 1
                ),
                "avg_baseline_tokens": avg([r.baseline_tokens for r in self.results]),
                "avg_graphrag_tokens": avg([r.graphrag_tokens for r in self.results]),
            },
            "bonus_thresholds": {
                "llm_judge_ge_90pct": round(g_judge / n * 100, 1) >= 90.0,
                "bertscore_rescaled_ge_055": g_bert >= 0.55,
                "both_bonuses_unlocked": (
                    round(g_judge / n * 100, 1) >= 90.0 and g_bert >= 0.55
                ),
            },
        }

    def save(self, path: str = "results.json"):
        questions = load_benchmark_questions()
        accuracy_report = self.run_accuracy_evaluation(questions)
        data = {
            "summary": self.summary(),
            "accuracy_evaluation": accuracy_report,
            "records": [r.to_dict() for r in self.results],
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print(f"\nResults saved → {path}")
        return data
