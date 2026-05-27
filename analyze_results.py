import json
d = json.load(open('results.json'))
s = d['summary']
records = d['records']

fraud_correct = sum(1 for r in records if r['ground_truth']=='SUSPICIOUS' and r['graphrag_correct'])
safe_correct  = sum(1 for r in records if r['ground_truth']=='SAFE'       and r['graphrag_correct'])
fraud_total   = sum(1 for r in records if r['ground_truth']=='SUSPICIOUS')
safe_total    = sum(1 for r in records if r['ground_truth']=='SAFE')

print("=" * 60)
print("BENCHMARK ANALYSIS — 50 Questions")
print("=" * 60)
print(f"Fraud ring detection: {fraud_correct}/{fraud_total} = {fraud_correct/fraud_total*100:.0f}%")
print(f"Safe account detection: {safe_correct}/{safe_total} = {safe_correct/safe_total*100:.0f}%")
print(f"Overall GraphRAG accuracy: {s['pipeline_3_graphrag']['accuracy_pct']}%")
print(f"Overall Baseline accuracy: {s['pipeline_1_baseline']['accuracy_pct']}%")
print(f"Overall Basic RAG accuracy: {s['pipeline_2_basic_rag']['accuracy_pct']}%")
print()
print(f"Avg tokens - Baseline:  {s['pipeline_1_baseline']['avg_tokens']}")
print(f"Avg tokens - Basic RAG: {s['pipeline_2_basic_rag']['avg_tokens']}")
print(f"Avg tokens - GraphRAG:  {s['pipeline_3_graphrag']['avg_tokens']}")
print(f"Token savings vs Baseline: {s['graphrag_vs_baseline']['token_savings_pct']}%")
print(f"Token savings vs Basic RAG: {s['graphrag_vs_basic_rag']['token_savings_pct']}%")
print()
print(f"LLM-Judge pass rate: {s['pipeline_3_graphrag']['llm_judge_pass_rate_pct']}%")
print(f"BERTScore F1 (raw):  {s['pipeline_3_graphrag']['bertscore_f1_mean']}")
print(f"Both bonuses:        {s['bonus_thresholds']['both_bonuses_unlocked']}")
print("=" * 60)
