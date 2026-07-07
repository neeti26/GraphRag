"""
run_benchmark.py — Real 3-pipeline benchmark.

Runs all three pipelines with real Gemini API calls, measures real
token counts / latency, scores with real BERTScore + LLM Judge,
then saves results.json (root + dashboard/public/).

Usage
-----
  python run_benchmark.py              # auto-detects TigerGraph from .env
  python run_benchmark.py --demo-graph # use seeded graph context (real LLM)
  python run_benchmark.py --no-judge   # skip LLM judge (faster)
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from llm_layer.llm_client import LLMClient
from inference_layer.baseline_pipeline import BaselinePipeline
from inference_layer.basic_rag_pipeline import BasicRAGPipeline
from inference_layer.graphrag_pipeline import GraphRAGPipeline
from evaluation_layer.benchmark_runner import BenchmarkRunner, GROUND_TRUTH


def banner(text: str):
    print("\n" + "=" * 66)
    print(f"  {text}")
    print("=" * 66)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--demo-graph", action="store_true",
                        help="Use deterministic seeded graph context (real LLM calls)")
    parser.add_argument("--no-judge",   action="store_true",
                        help="Skip LLM judge to save API calls")
    parser.add_argument("--accounts",   nargs="+", default=None)
    parser.add_argument("--out",        default="results.json")
    args = parser.parse_args()

    banner("FraudGraph — 3-Pipeline Real Benchmark")
    print(f"  Pipelines : Baseline LLM  |  Basic RAG (FAISS)  |  GraphRAG (TigerGraph)")
    print(f"  Accounts  : {args.accounts or list(GROUND_TRUTH.keys())}")
    print(f"  Quality   : BERTScore (sentence-transformers) + {'LLM Judge' if not args.no_judge else 'no judge'}")
    print(f"  Graph     : {'DEMO (seeded context)' if args.demo_graph else 'Live TigerGraph (auto-detect)'}")

    # ── LLM ──────────────────────────────────────────────────────
    banner("Initialising Gemini")
    llm = LLMClient()

    # ── TigerGraph ───────────────────────────────────────────────
    banner("Initialising TigerGraph")
    from graph_layer.tigergraph_client import TigerGraphClient
    tg = TigerGraphClient(force_demo=args.demo_graph)
    print(f"  Mode: {tg.mode}")

    # ── Pipelines ────────────────────────────────────────────────
    baseline  = BaselinePipeline(llm)
    basic_rag = BasicRAGPipeline(llm)
    graphrag  = GraphRAGPipeline(llm, tg)

    runner = BenchmarkRunner(
        baseline         = baseline,
        basic_rag        = basic_rag,
        graphrag         = graphrag,
        llm              = None if args.no_judge else llm,
        run_quality_scoring = True,
        llm_model        = llm.model,
        llm_provider     = llm.provider,
        tigergraph_mode  = tg.mode,
    )

    # ── Run ──────────────────────────────────────────────────────
    banner("Running benchmark — real LLM calls")
    t0 = time.time()
    runner.run_suite(args.accounts)
    elapsed = time.time() - t0

    # ── Print summary ─────────────────────────────────────────────
    s = runner.summary()
    banner("RESULTS")
    print(f"  Run timestamp  : {s['run_timestamp']}")
    print(f"  LLM model      : {s['llm_model']}")
    print(f"  TigerGraph     : {s['tigergraph_mode']}")
    print(f"  Wall time      : {elapsed:.1f}s")
    print()
    print(f"  {'Pipeline':<18} {'Accuracy':>9} {'AvgTok':>8} {'BERTScore':>10} {'Judge':>7}")
    print(f"  {'-'*55}")
    rows = [
        ("Baseline LLM",  "baseline_accuracy_pct",  "total_baseline_tokens",  "avg_baseline_bert_score",  "avg_baseline_judge_score"),
        ("Basic RAG",     "basic_rag_accuracy_pct",  "total_basic_rag_tokens", "avg_basic_rag_bert_score", "avg_basic_rag_judge_score"),
        ("GraphRAG",      "graphrag_accuracy_pct",   "total_graphrag_tokens",  "avg_graphrag_bert_score",  "avg_graphrag_judge_score"),
    ]
    for name, acc_k, tok_k, bert_k, judge_k in rows:
        print(
            f"  {name:<18} {s[acc_k]:>8.1f}%"
            f" {s[tok_k]//s['total_accounts']:>8}"
            f" {s[bert_k]:>10.3f}"
            f" {s[judge_k]:>7.1f}"
        )
    print()
    print(f"  Hallucinations caught (GraphRAG vs Baseline) : {s['hallucination_cases']}")
    print(f"  Hallucinations caught (GraphRAG vs BasicRAG) : {s['basic_rag_hallucination_cases']}")
    print(f"  Token savings (Baseline→GraphRAG)            : {s['avg_token_savings_pct']}%")
    print(f"  Latency improvement                          : {s['avg_latency_improvement_pct']}%")

    # ── Save ─────────────────────────────────────────────────────
    data = runner.save(args.out)          # saves root results.json

    # Also write to dashboard/public/ so Vercel serves fresh numbers
    public = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          "dashboard", "public", "results.json")
    with open(public, "w") as f:
        json.dump(data, f, indent=2)
    print(f"  Also saved → {public}")

    banner("Done ✓")


if __name__ == "__main__":
    main()
