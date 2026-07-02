"""
run_benchmark.py — Real 3-pipeline benchmark runner.

Runs all three pipelines against live LLM calls and a live TigerGraph
instance, measures real token counts / latency / cost, scores with
BERTScore and an LLM Judge, then saves results.json.

Usage
-----
  # With TigerGraph live:
  python run_benchmark.py

  # Demo fallback (no TigerGraph, still real LLM calls):
  python run_benchmark.py --demo-graph

  # Skip LLM judge to save API calls:
  python run_benchmark.py --no-judge

Environment
-----------
  See .env.example — copy to .env and fill in credentials.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import asdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from llm_layer.llm_client import LLMClient
from inference_layer.baseline_pipeline import BaselinePipeline
from inference_layer.basic_rag_pipeline import BasicRAGPipeline
from inference_layer.graphrag_pipeline import GraphRAGPipeline
from evaluation_layer.benchmark_runner import BenchmarkRunner, GROUND_TRUTH


def _banner(text: str):
    print("\n" + "=" * 66)
    print(f"  {text}")
    print("=" * 66)


def main():
    parser = argparse.ArgumentParser(description="FraudGraph 3-pipeline benchmark")
    parser.add_argument("--demo-graph", action="store_true",
                        help="Use TigerGraph demo fallback (no live connection required)")
    parser.add_argument("--no-judge", action="store_true",
                        help="Skip LLM judge scoring to save API calls")
    parser.add_argument("--accounts", nargs="+", default=None,
                        help="Specific account IDs to run (default: all)")
    parser.add_argument("--out", default="results.json",
                        help="Output path for results JSON")
    args = parser.parse_args()

    _banner("FraudGraph Benchmark — 3-Pipeline Evaluation")
    print(f"  Pipelines : Baseline LLM  |  Basic RAG  |  GraphRAG")
    print(f"  Accounts  : {args.accounts or list(GROUND_TRUTH.keys())}")
    print(f"  Quality   : BERTScore + {'LLM Judge' if not args.no_judge else 'no judge'}")
    print(f"  Graph     : {'DEMO fallback' if args.demo_graph else 'Live TigerGraph'}")

    # ── Initialise LLM ───────────────────────────────────────────
    _banner("Initialising LLM client")
    llm = LLMClient()
    print(f"  Provider  : {llm.provider}")
    print(f"  Model     : {llm.model}")

    # ── Initialise TigerGraph ────────────────────────────────────
    _banner("Initialising TigerGraph")
    from graph_layer.tigergraph_client import TigerGraphClient
    tg = TigerGraphClient(force_demo=args.demo_graph)
    print(f"  TigerGraph mode: {tg.mode}")

    # ── Build pipelines ──────────────────────────────────────────
    baseline  = BaselinePipeline(llm)
    basic_rag = BasicRAGPipeline(llm)
    graphrag  = GraphRAGPipeline(llm, tg)

    # ── Run ──────────────────────────────────────────────────────
    runner = BenchmarkRunner(
        baseline=baseline,
        basic_rag=basic_rag,
        graphrag=graphrag,
        llm=None if args.no_judge else llm,
        run_quality_scoring=True,
    )

    _banner("Running benchmark")
    t0 = time.time()
    runner.run_suite(args.accounts)
    elapsed = time.time() - t0

    # ── Summary ──────────────────────────────────────────────────
    summary = runner.summary()
    summary["tigergraph_mode"] = tg.mode
    summary["llm_model"]       = llm.model
    summary["llm_provider"]    = llm.provider
    _banner("BENCHMARK SUMMARY")
    print(f"  Accounts tested       : {summary['total_accounts']}")
    print(f"  Total wall time       : {elapsed:.1f}s")
    print()
    print(f"  {'Pipeline':<18} {'Accuracy':>10} {'Avg Tokens':>12} {'BERTScore':>12} {'Judge':>8}")
    print(f"  {'-'*62}")
    print(
        f"  {'Baseline LLM':<18} "
        f"{summary['baseline_accuracy_pct']:>9.1f}% "
        f"{summary['total_baseline_tokens'] // summary['total_accounts']:>11} "
        f"{summary['avg_baseline_bert_score']:>12.3f} "
        f"{summary['avg_baseline_judge_score']:>7.1f}"
    )
    print(
        f"  {'Basic RAG':<18} "
        f"{summary['basic_rag_accuracy_pct']:>9.1f}% "
        f"{summary['total_basic_rag_tokens'] // summary['total_accounts']:>11} "
        f"{summary['avg_basic_rag_bert_score']:>12.3f} "
        f"{summary['avg_basic_rag_judge_score']:>7.1f}"
    )
    print(
        f"  {'GraphRAG':<18} "
        f"{summary['graphrag_accuracy_pct']:>9.1f}% "
        f"{summary['total_graphrag_tokens'] // summary['total_accounts']:>11} "
        f"{summary['avg_graphrag_bert_score']:>12.3f} "
        f"{summary['avg_graphrag_judge_score']:>7.1f}"
    )
    print()
    print(f"  Hallucinations caught by GraphRAG : {summary['hallucination_cases']}")
    print(f"  Hallucinations caught vs Basic RAG: {summary['basic_rag_hallucination_cases']}")
    print(f"  Avg token savings (Baseline→Graph): {summary['avg_token_savings_pct']}%")
    print(f"  Avg latency speedup               : {summary['avg_latency_improvement_pct']}%")

    # ── Save ─────────────────────────────────────────────────────
    runner.save(args.out)

    # Also copy to dashboard/public for Vite's dev server
    public_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "dashboard", "public", "results.json"
    )
    with open(public_path, "w") as f:
        json.dump({"summary": summary, "records": [r.to_dict() for r in runner.results]}, f, indent=2)
    print(f"  Also saved → {public_path}")

    _banner("Done ✓")


if __name__ == "__main__":
    main()
