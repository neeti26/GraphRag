"""
scripts/run_evals.py — Improvement #4

Self-contained evaluation suite. Runs pre-set test queries against
all 3 pipelines and saves eval_results.json to workspace.

Run: python scripts/run_evals.py [--quick] [--full]

  --quick : 10 questions, fast (default)
  --full  : all 50 questions
"""
import sys, os, json, time, argparse
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

QUICK_QUESTIONS = [
    # Fraud ring accounts — should be SUSPICIOUS
    {"account_id": "FR0000A00", "ground_truth": "SUSPICIOUS",
     "question": "Is account FR0000A00 part of a fraud ring?"},
    {"account_id": "FR0001A01", "ground_truth": "SUSPICIOUS",
     "question": "Is account FR0001A01 suspicious?"},
    {"account_id": "FR0002A00", "ground_truth": "SUSPICIOUS",
     "question": "Analyze account FR0002A00 for synthetic identity fraud."},
    {"account_id": "FR0043A01", "ground_truth": "SUSPICIOUS",
     "question": "Is account FR0043A01 part of a fraud ring?"},
    {"account_id": "FR0085A02", "ground_truth": "SUSPICIOUS",
     "question": "Check account FR0085A02 for fraud ring membership."},
    # Clean accounts — should be SAFE
    {"account_id": "ACC0000042", "ground_truth": "SAFE",
     "question": "Is account ACC0000042 suspicious?"},
    {"account_id": "ACC0001337", "ground_truth": "SAFE",
     "question": "Is account ACC0001337 part of any fraud ring?"},
    {"account_id": "ACC0000004", "ground_truth": "SAFE",
     "question": "Check account ACC0000004 for suspicious activity."},
    {"account_id": "ACC0000007", "ground_truth": "SAFE",
     "question": "Is account ACC0000007 safe?"},
    {"account_id": "ACC0000013", "ground_truth": "SAFE",
     "question": "Analyze account ACC0000013 for fraud."},
]


def run_evals(questions: list, output_path: str = "eval_results.json"):
    print("=" * 60)
    print("FraudGraph — Self-Contained Evaluation Suite")
    print(f"Questions: {len(questions)}")
    print("=" * 60)

    # Init pipelines
    from llm_layer.llm_client import get_llm_client
    from graph_layer.tigergraph_client import TigerGraphClient
    from inference_layer.baseline_pipeline import BaselinePipeline
    from inference_layer.basic_rag_pipeline import BasicRAGPipeline
    from inference_layer.graphrag_pipeline import GraphRAGPipeline
    from inference_layer.intent_router import route, router_efficiency_factor
    from utils.context_compressor import compress_evidence

    llm = get_llm_client()
    tg  = TigerGraphClient()
    baseline  = BaselinePipeline(llm)
    basic_rag = BasicRAGPipeline(llm)
    graphrag  = GraphRAGPipeline(llm, tg)

    results = []
    router_decisions = []
    t_start = time.time()

    for i, q in enumerate(questions):
        acc_id = q["account_id"]
        gt     = q["ground_truth"]
        print(f"\n[{i+1}/{len(questions)}] {acc_id} (GT: {gt})")

        # Route decision
        decision = route(q["question"], acc_id)
        router_decisions.append(decision)
        print(f"  Router: {decision.intent} ({decision.hops} hops, "
              f"~{decision.estimated_tokens} tokens, confidence={decision.router_confidence})")

        # Run all 3 pipelines
        b  = baseline.run(acc_id)
        br = basic_rag.run(acc_id)
        g  = graphrag.run(acc_id)

        # Compress GraphRAG evidence
        compressed = compress_evidence(g.graph_evidence)

        b_correct  = b.verdict  == gt
        br_correct = br.verdict == gt
        g_correct  = g.verdict  == gt

        print(f"  Baseline:  {b.verdict:10s} {'✅' if b_correct else '❌'} | {b.llm_response.total_tokens} tokens")
        print(f"  Basic RAG: {br.verdict:10s} {'✅' if br_correct else '❌'} | {br.llm_response.total_tokens} tokens")
        print(f"  GraphRAG:  {g.verdict:10s} {'✅' if g_correct else '❌'} | {g.llm_response.total_tokens} tokens | risk={g.risk_score}")
        print(f"  Compressor: {compressed['original_tokens']} → {compressed['compressed_tokens']} tokens "
              f"({compressed['token_reduction_pct']}% reduction, {compressed['dedup_count']} dupes removed)")

        results.append({
            "account_id":    acc_id,
            "ground_truth":  gt,
            "question":      q["question"],
            "router": {
                "intent":             decision.intent,
                "hops":               decision.hops,
                "confidence":         decision.router_confidence,
                "estimated_tokens":   decision.estimated_tokens,
                "reason":             decision.reason,
            },
            "baseline": {
                "verdict":  b.verdict,
                "correct":  b_correct,
                "tokens":   b.llm_response.total_tokens,
                "latency_ms": round(b.llm_response.latency_ms, 1),
                "cost_usd": b.llm_response.cost_usd,
            },
            "basic_rag": {
                "verdict":  br.verdict,
                "correct":  br_correct,
                "tokens":   br.llm_response.total_tokens,
                "latency_ms": round(br.llm_response.latency_ms, 1),
                "cost_usd": br.llm_response.cost_usd,
            },
            "graphrag": {
                "verdict":    g.verdict,
                "correct":    g_correct,
                "risk_score": g.risk_score,
                "tokens":     g.llm_response.total_tokens,
                "latency_ms": round(g.llm_response.latency_ms, 1),
                "cost_usd":   g.llm_response.cost_usd,
                "nodes_visited": g.nodes_visited,
                "flagged":    g.flagged_connections,
                "blacklisted": g.blacklisted_ips,
            },
            "compressor": {
                "original_tokens":    compressed["original_tokens"],
                "compressed_tokens":  compressed["compressed_tokens"],
                "token_reduction_pct": compressed["token_reduction_pct"],
                "dedup_count":        compressed["dedup_count"],
                "entities":           compressed["entities"],
                "alerts":             compressed["alerts"],
            },
        })

    elapsed = round(time.time() - t_start, 1)
    n = len(results)

    def avg(key, sub):
        return round(sum(r[sub][key] for r in results) / n, 1)

    # Router efficiency
    router_stats = router_efficiency_factor(router_decisions)

    summary = {
        "total_questions":  n,
        "elapsed_seconds":  elapsed,
        "dataset_tokens":   "270,278,717 (Gemini count_tokens API)",
        "tokenizer":        "gemini-2.0-flash",

        "router_efficiency": router_stats,

        "pipeline_1_baseline": {
            "accuracy_pct":    round(sum(1 for r in results if r["baseline"]["correct"]) / n * 100, 1),
            "avg_tokens":      avg("tokens", "baseline"),
            "avg_latency_ms":  avg("latency_ms", "baseline"),
            "avg_cost_usd":    round(sum(r["baseline"]["cost_usd"] for r in results) / n, 7),
        },
        "pipeline_2_basic_rag": {
            "accuracy_pct":    round(sum(1 for r in results if r["basic_rag"]["correct"]) / n * 100, 1),
            "avg_tokens":      avg("tokens", "basic_rag"),
            "avg_latency_ms":  avg("latency_ms", "basic_rag"),
            "avg_cost_usd":    round(sum(r["basic_rag"]["cost_usd"] for r in results) / n, 7),
        },
        "pipeline_3_graphrag": {
            "accuracy_pct":    round(sum(1 for r in results if r["graphrag"]["correct"]) / n * 100, 1),
            "avg_tokens":      avg("tokens", "graphrag"),
            "avg_latency_ms":  avg("latency_ms", "graphrag"),
            "avg_cost_usd":    round(sum(r["graphrag"]["cost_usd"] for r in results) / n, 7),
            "fraud_ring_detection_pct": round(
                sum(1 for r in results if r["ground_truth"] == "SUSPICIOUS" and r["graphrag"]["correct"])
                / max(sum(1 for r in results if r["ground_truth"] == "SUSPICIOUS"), 1) * 100, 1
            ),
        },
        "compressor_stats": {
            "avg_token_reduction_pct": round(sum(r["compressor"]["token_reduction_pct"] for r in results) / n, 1),
            "total_dupes_removed":     sum(r["compressor"]["dedup_count"] for r in results),
        },
        "graphrag_vs_baseline": {
            "token_savings_pct": round(
                (avg("tokens", "baseline") - avg("tokens", "graphrag"))
                / avg("tokens", "baseline") * 100, 1
            ),
        },
    }

    output = {"summary": summary, "results": results}
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    # Print summary
    print("\n" + "=" * 60)
    print("EVALUATION RESULTS")
    print("=" * 60)
    g_sum = summary["pipeline_3_graphrag"]
    b_sum = summary["pipeline_1_baseline"]
    r_eff = summary["router_efficiency"]
    print(f"  Baseline  accuracy: {b_sum['accuracy_pct']}% | {b_sum['avg_tokens']} avg tokens")
    print(f"  GraphRAG  accuracy: {g_sum['accuracy_pct']}% | {g_sum['avg_tokens']} avg tokens")
    print(f"  Token savings vs baseline: {summary['graphrag_vs_baseline']['token_savings_pct']}%")
    print(f"  Fraud ring detection: {g_sum['fraud_ring_detection_pct']}%")
    print(f"  Router efficiency: {r_eff.get('router_efficiency_pct', 0)}% compute saved")
    print(f"  Compressor: {summary['compressor_stats']['avg_token_reduction_pct']}% avg reduction")
    print(f"  Elapsed: {elapsed}s")
    print(f"\n  Saved → {output_path}")
    print("=" * 60)

    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--quick", action="store_true", help="10 questions (default)")
    parser.add_argument("--full",  action="store_true", help="Load all 50 from benchmark_questions.json")
    args = parser.parse_args()

    if args.full:
        import json as _json
        try:
            with open("data/benchmark_questions.json") as f:
                questions = _json.load(f)[:50]
        except FileNotFoundError:
            print("Run python -m data_pipeline.generate_dataset first")
            sys.exit(1)
    else:
        questions = QUICK_QUESTIONS

    run_evals(questions, output_path="eval_results.json")
