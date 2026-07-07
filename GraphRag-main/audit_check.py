import json

d = json.load(open("results.json"))
s = d["summary"]
records = d["records"]

print("\n" + "="*70)
print("  JUDGE REQUIREMENTS AUDIT")
print("="*70)

print("\n✅ POINT 1 — Three pipelines present in results.json:")
for r in records:
    b = "✓" if r["baseline_correct"] else "✗"
    rg = "✓" if r["basic_rag_correct"] else "✗"
    g = "✓" if r["graphrag_correct"] else "✓" if r["graphrag_correct"] else "✗"
    print(f"  #{r['account_id']} GT={r['ground_truth']:10s}  Baseline:{r['baseline_verdict']}({b})  BasicRAG:{r['basic_rag_verdict']}({rg})  GraphRAG:{r['graphrag_verdict']}({'✓' if r['graphrag_correct'] else '✗'})")

print(f"\n  Accuracy — Baseline:{s['baseline_accuracy_pct']}%  BasicRAG:{s['basic_rag_accuracy_pct']}%  GraphRAG:{s['graphrag_accuracy_pct']}%")
print(f"  Tokens   — Baseline:{s['total_baseline_tokens']}  BasicRAG:{s['total_basic_rag_tokens']}  GraphRAG:{s['total_graphrag_tokens']}")

print("\n✅ POINT 2 — Real metrics (NOT hardcoded):")
print(f"  run_timestamp  : {s.get('run_timestamp', 'MISSING')}")
print(f"  llm_model      : {s.get('llm_model', 'MISSING — need to check')}")
print(f"  BERTScore avg  — Baseline:{s['avg_baseline_bert_score']:.3f}  BasicRAG:{s['avg_basic_rag_bert_score']:.3f}  GraphRAG:{s['avg_graphrag_bert_score']:.3f}")
print(f"  LLM Judge avg  — Baseline:{s['avg_baseline_judge_score']:.1f}  BasicRAG:{s['avg_basic_rag_judge_score']:.1f}  GraphRAG:{s['avg_graphrag_judge_score']:.1f}")
print(f"  Per-record token counts (not identical = real):")
for r in records:
    print(f"    #{r['account_id']}: baseline={r['baseline_tokens']}tok/{r['baseline_latency_ms']}ms  basic_rag={r['basic_rag_tokens']}tok/{r['basic_rag_latency_ms']}ms  graphrag={r['graphrag_tokens']}tok/{r['graphrag_latency_ms']}ms")

print("\n✅ POINT 3 — TigerGraph mode transparency:")
print(f"  tigergraph_mode: {s.get('tigergraph_mode', 'MISSING')}")

print("\n✅ EQUAL OUTPUT LIMITS — checking max_tokens in pipeline files:")
import re
for fname in ["inference_layer/baseline_pipeline.py", "inference_layer/basic_rag_pipeline.py", "inference_layer/graphrag_pipeline.py"]:
    with open(fname) as f:
        content = f.read()
    matches = re.findall(r"max_tokens=(\d+)", content)
    print(f"  {fname.split('/')[-1]}: max_tokens = {matches}")

print("\n⚠️  POTENTIAL GAPS:")
# Check if llm_model is stamped
if not s.get("llm_model"):
    print("  - llm_model NOT in summary — need to add to benchmark_runner.summary()")
else:
    print(f"  - llm_model present: {s['llm_model']} ✓")

# Check graphrag reasoning isn't truncated (must be > 80 chars)
for r in records:
    if len(r.get("graphrag_reasoning","")) < 80:
        print(f"  - #{r['account_id']} graphrag_reasoning TOO SHORT: '{r['graphrag_reasoning'][:100]}'")
    else:
        print(f"  - #{r['account_id']} graphrag_reasoning OK ({len(r.get('graphrag_reasoning',''))} chars) ✓")
# Check risk scores parsed
for r in records:
    if r["graphrag_verdict"] == "SUSPICIOUS" and r["graphrag_risk_score"] == 0.0:
        print(f"  - #{r['account_id']} SUSPICIOUS but risk_score=0.0 — parse failed")

print("\n" + "="*70)
