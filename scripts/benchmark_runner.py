"""
scripts/benchmark_runner.py — Improvement #4

Feeds 50 questions through all 3 pipelines and outputs a Markdown table
with avg latency breakdown, token count, and cost per pipeline.

Run: python scripts/benchmark_runner.py
Output: scripts/benchmark_results.md  (paste into README)
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import json, time

def run():
    from llm_layer.llm_client import get_llm_client
    from graph_layer.tigergraph_client import TigerGraphClient
    from inference_layer.baseline_pipeline import BaselinePipeline
    from inference_layer.basic_rag_pipeline import BasicRAGPipeline
    from inference_layer.graphrag_pipeline import GraphRAGPipeline
    from evaluation_layer.benchmark_runner import BenchmarkRunner, load_benchmark_questions

    llm = get_llm_client()
    tg  = TigerGraphClient()

    baseline  = BaselinePipeline(llm)
    basic_rag = BasicRAGPipeline(llm)
    graphrag  = GraphRAGPipeline(llm, tg)

    questions = load_benchmark_questions()[:50]
    runner    = BenchmarkRunner(baseline, basic_rag, graphrag)
    runner.run_suite(questions, max_questions=50)
    data = runner.save("results.json")

    s  = data["summary"]
    b  = s["pipeline_1_baseline"]
    br = s["pipeline_2_basic_rag"]
    g  = s["pipeline_3_graphrag"]
    vs = s["graphrag_vs_baseline"]

    # Latency breakdown from records
    records = data["records"]
    def avg_stage(stage):
        vals = [r.get("latency_profile", {}).get(stage, 0) for r in records if r.get("latency_profile")]
        return round(sum(vals)/len(vals), 1) if vals else 0

    graph_ms   = avg_stage("graph_traversal_ms")
    rank_ms    = avg_stage("relevance_ranking_ms")
    llm_ms     = avg_stage("llm_inference_ms")
    correct_ms = avg_stage("self_correction_ms")

    md = f"""# FraudGraph Round 2 — Benchmark Results

**Dataset:** {s['dataset_tokens']}  
**Tokenizer:** {s['tokenizer']}  
**Questions:** {s['total_questions']}

## Pipeline Comparison

| Metric | Baseline LLM | Basic RAG | GraphRAG |
|--------|-------------|-----------|----------|
| Accuracy | {b['accuracy_pct']}% | {br['accuracy_pct']}% | **{g['accuracy_pct']}%** |
| Avg Tokens | {b['avg_tokens']} | {br['avg_tokens']} | **{g['avg_tokens']}** |
| Token Savings vs Baseline | — | — | **{vs['token_savings_pct']}%** |
| Avg Latency (ms) | {b['avg_latency_ms']} | {br['avg_latency_ms']} | **{g['avg_latency_ms']}** |
| Avg Cost/query (USD) | ${b['avg_cost_usd']:.7f} | ${br['avg_cost_usd']:.7f} | **${g['avg_cost_usd']:.7f}** |
| LLM-Judge Pass Rate | {b['llm_judge_pass_rate_pct']}% | {br['llm_judge_pass_rate_pct']}% | **{g['llm_judge_pass_rate_pct']}%** |
| BERTScore F1 (raw) | {b['bertscore_f1_mean']} | {br['bertscore_f1_mean']} | **{g['bertscore_f1_mean']}** |

## GraphRAG Latency Breakdown

| Stage | Avg Time (ms) |
|-------|--------------|
| TigerGraph 3-hop traversal | {graph_ms} |
| Relevance ranking (cross-encoder) | {rank_ms} |
| LLM inference (Gemini) | {llm_ms} |
| Self-correction layer | {correct_ms} |
| **Total** | **{g['avg_latency_ms']}** |

## Cost at Scale (Estimated Monthly)

| Queries/day | Baseline | Basic RAG | GraphRAG | Savings |
|-------------|----------|-----------|----------|---------|
| 1,000 | ${b['avg_cost_usd']*1000*30:.2f} | ${br['avg_cost_usd']*1000*30:.2f} | ${g['avg_cost_usd']*1000*30:.2f} | ${(br['avg_cost_usd']-g['avg_cost_usd'])*1000*30:.2f} |
| 10,000 | ${b['avg_cost_usd']*10000*30:.2f} | ${br['avg_cost_usd']*10000*30:.2f} | ${g['avg_cost_usd']*10000*30:.2f} | ${(br['avg_cost_usd']-g['avg_cost_usd'])*10000*30:.2f} |
| 100,000 | ${b['avg_cost_usd']*100000*30:.2f} | ${br['avg_cost_usd']*100000*30:.2f} | ${g['avg_cost_usd']*100000*30:.2f} | ${(br['avg_cost_usd']-g['avg_cost_usd'])*100000*30:.2f} |

*Pricing: Gemini 2.0 Flash — $0.075/1M input tokens, $0.30/1M output tokens*

## Bonus Thresholds

| Threshold | Target | GraphRAG | Status |
|-----------|--------|----------|--------|
| LLM-Judge pass rate | ≥90% | {g['llm_judge_pass_rate_pct']}% | {'✅ HIT' if g['llm_judge_pass_rate_pct'] >= 90 else '❌'} |
| BERTScore F1 raw | ≥0.88 | {g['bertscore_f1_mean']} | {'✅ HIT' if g['bertscore_f1_mean'] >= 0.88 else '❌'} |
| Both bonuses | — | — | {'✅ UNLOCKED' if s['bonus_thresholds']['both_bonuses_unlocked'] else '❌'} |
"""

    os.makedirs("scripts", exist_ok=True)
    with open("scripts/benchmark_results.md", "w", encoding="utf-8") as f:
        f.write(md)

    print(md)
    print("\nSaved → scripts/benchmark_results.md")

if __name__ == "__main__":
    run()
