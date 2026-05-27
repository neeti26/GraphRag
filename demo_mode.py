"""
Demo Mode — runs the full benchmark without requiring live TigerGraph/LLM connections.

Generates realistic results.json for the dashboard to display.
Perfect for testing the UI before API keys arrive.

Run: python demo_mode.py
"""
import json
import random
import time

random.seed(42)

DEMO_ACCOUNTS = [
    {
        "account_id": "FR0000A00",
        "ground_truth": "SUSPICIOUS",
        "question": "Is account FR0000A00 part of a fraud ring? Analyze its device sharing and IP connections.",
        "ground_truth_answer": "Account FR0000A00 is SUSPICIOUS. It shares device DEV-55123 with 4 other accounts and uses blacklisted IP 45.33.32.156 linked to 12 chargebacks. This is a synthetic identity fraud ring.",
        "ring_id": 0,
        "shared_device": "DEV-55123",
        "shared_ip": "45.33.32.156",
        "ring_members": ["FR0000A00", "FR0000A01", "FR0000A02", "FR0000A03"],
    },
    {
        "account_id": "ACC0000042",
        "ground_truth": "SAFE",
        "question": "Is account ACC0000042 suspicious? Check its network connections.",
        "ground_truth_answer": "Account ACC0000042 is SAFE with no connections to flagged accounts, no shared devices with banned users, and no blacklisted IPs.",
        "ring_id": -1,
        "shared_device": None,
        "shared_ip": None,
        "ring_members": [],
    },
    {
        "account_id": "FR0001A01",
        "ground_truth": "SUSPICIOUS",
        "question": "Is account FR0001A01 suspicious? Analyze its transaction patterns.",
        "ground_truth_answer": "Account FR0001A01 is SUSPICIOUS. It is flagged and shares device DEV-67890 with banned account FR0001A00 and uses blacklisted IP 198.51.100.42.",
        "ring_id": 1,
        "shared_device": "DEV-67890",
        "shared_ip": "198.51.100.42",
        "ring_members": ["FR0001A00", "FR0001A01", "FR0001A02"],
    },
    {
        "account_id": "ACC0001337",
        "ground_truth": "SAFE",
        "question": "Is account ACC0001337 part of any fraud ring?",
        "ground_truth_answer": "Account ACC0001337 is SAFE. Graph traversal shows no connections to flagged or banned accounts within 3 hops.",
        "ring_id": -1,
        "shared_device": None,
        "shared_ip": None,
        "ring_members": [],
    },
    {
        "account_id": "FR0002A00",
        "ground_truth": "SUSPICIOUS",
        "question": "Analyze account FR0002A00 for synthetic identity fraud.",
        "ground_truth_answer": "Account FR0002A00 is SUSPICIOUS. It is banned and is the root node of a 5-account fraud ring sharing device DEV-11111 and blacklisted IP 203.0.113.99.",
        "ring_id": 2,
        "shared_device": "DEV-11111",
        "shared_ip": "203.0.113.99",
        "ring_members": ["FR0002A00", "FR0002A01", "FR0002A02", "FR0002A03", "FR0002A04"],
    },
]


def make_baseline_result(acc):
    """Simulate baseline LLM — high tokens, misses fraud rings."""
    is_fraud = acc["ground_truth"] == "SUSPICIOUS"
    # Baseline misses ~50% of fraud cases (hallucination)
    missed = is_fraud and random.random() < 0.5
    verdict = "SAFE" if missed else ("SUSPICIOUS" if is_fraud else "SAFE")
    tokens = random.randint(3600, 4200)
    latency = random.uniform(1800, 2400)
    cost = tokens * 0.075 / 1_000_000 + random.randint(200, 350) * 0.30 / 1_000_000

    reasoning = (
        f"Account {acc['account_id']} shows {'normal' if verdict == 'SAFE' else 'suspicious'} "
        f"login activity. {'No failed login attempts detected. Account appears SAFE.' if verdict == 'SAFE' else 'Multiple high-value transactions detected. Account flagged for review.'}"
    )
    if missed:
        reasoning = (
            f"Account {acc['account_id']} shows normal login activity from various IPs "
            f"using device {acc.get('shared_device', 'DEV-XXXXX')}. "
            f"All transactions appear within normal range. No failed login attempts detected. "
            f"Account appears SAFE."
        )
    return {
        "verdict": verdict,
        "reasoning": reasoning,
        "tokens": tokens,
        "latency_ms": round(latency, 1),
        "cost_usd": round(cost, 7),
        "correct": verdict == acc["ground_truth"],
        "llm_judge": "FAIL" if missed else "PASS",
        "bertscore": round(random.uniform(0.72, 0.82) if missed else random.uniform(0.85, 0.92), 4),
    }


def make_basic_rag_result(acc):
    """Simulate Basic RAG — medium tokens, better than baseline but still misses some."""
    is_fraud = acc["ground_truth"] == "SUSPICIOUS"
    missed = is_fraud and random.random() < 0.25
    verdict = "SAFE" if missed else ("SUSPICIOUS" if is_fraud else "SAFE")
    tokens = random.randint(1900, 2400)
    latency = random.uniform(1400, 2000)
    cost = tokens * 0.075 / 1_000_000 + random.randint(150, 280) * 0.30 / 1_000_000

    reasoning = (
        f"Based on retrieved transaction context, account {acc['account_id']} "
        f"{'appears to be involved in suspicious activity with multiple high-risk transactions.' if verdict == 'SUSPICIOUS' else 'shows normal transaction patterns consistent with legitimate usage.'}"
    )
    return {
        "verdict": verdict,
        "reasoning": reasoning,
        "tokens": tokens,
        "latency_ms": round(latency, 1),
        "cost_usd": round(cost, 7),
        "correct": verdict == acc["ground_truth"],
        "retrieved_chunks": [f"Chunk {i+1}: transaction context for {acc['account_id']}" for i in range(5)],
        "llm_judge": "FAIL" if missed else "PASS",
        "bertscore": round(random.uniform(0.78, 0.86) if missed else random.uniform(0.87, 0.93), 4),
    }


def make_graphrag_result(acc):
    """Simulate GraphRAG — low tokens, catches all fraud via graph traversal."""
    is_fraud = acc["ground_truth"] == "SUSPICIOUS"
    verdict = "SUSPICIOUS" if is_fraud else "SAFE"
    tokens = random.randint(190, 280)
    latency = random.uniform(450, 750)
    cost = tokens * 0.075 / 1_000_000 + random.randint(80, 150) * 0.30 / 1_000_000
    risk_score = round(random.uniform(8.5, 9.8), 1) if is_fraud else round(random.uniform(0.5, 2.0), 1)

    evidence = []
    flagged = []
    blacklisted = []
    shared_devices = []

    if is_fraud and acc.get("shared_device"):
        shared_devices = [acc["shared_device"]]
        for member in acc.get("ring_members", []):
            if member != acc["account_id"]:
                evidence.append(f"Device {acc['shared_device']} is ALSO used by Account {member}")
                if "A00" in member or "A01" in member:
                    flagged.append(member)
                    evidence.append(f"ALERT: Account {member} is banned (risk_score=9.5)")
        if acc.get("shared_ip"):
            blacklisted = [acc["shared_ip"]]
            evidence.append(f"ALERT: Account {acc['account_id']} logged from BLACKLISTED IP {acc['shared_ip']} (12 chargebacks)")

    reasoning = (
        f"SUSPICIOUS — Risk Score: {risk_score}/10\n\nGraph Evidence:\n"
        + "\n".join(f"• {e}" for e in evidence[:5])
        + f"\n\nVerdict: Account {acc['account_id']} is a synthetic identity — "
        f"part of an organized fraud ring with {len(acc.get('ring_members', []))} members."
    ) if is_fraud else (
        f"SAFE — Risk Score: {risk_score}/10\n\n"
        f"Graph traversal (3 hops) found no connections to flagged accounts, "
        f"no shared devices with banned users, and no blacklisted IPs. "
        f"Account {acc['account_id']} appears legitimate."
    )

    agentic = is_fraud and risk_score <= 8.5
    return {
        "verdict": verdict,
        "reasoning": reasoning,
        "tokens": tokens,
        "latency_ms": round(latency, 1),
        "cost_usd": round(cost, 7),
        "correct": True,
        "risk_score": risk_score,
        "graph_evidence": evidence,
        "flagged_connections": flagged,
        "blacklisted_ips": blacklisted,
        "shared_devices": shared_devices,
        "nodes_visited": random.randint(6, 18),
        "neighborhood_summary": (
            f"This account is part of a cluster with {len(acc.get('ring_members', []))} other accounts, "
            f"75.0% of which have been flagged for chargebacks in the last 72 hours."
        ) if is_fraud else "No suspicious cluster detected.",
        "agentic_loop_triggered": agentic,
        "agentic_refinement": f"Refined analysis confirms SUSPICIOUS verdict. IP intelligence shows {random.randint(30,60)} unique accounts using this IP with {random.randint(60,85)}% chargeback rate." if agentic else "",
        "llm_judge": "PASS",
        "bertscore": round(random.uniform(0.91, 0.97), 4),
    }


def generate_demo_results():
    print("=" * 60)
    print("FraudGraph Round 2 — Demo Mode")
    print("Generating benchmark results (no API keys needed)")
    print("=" * 60)

    records = []
    for acc in DEMO_ACCOUNTS:
        b  = make_baseline_result(acc)
        br = make_basic_rag_result(acc)
        g  = make_graphrag_result(acc)

        def savings(base, rag):
            return round((base - rag) / base * 100, 1) if base else 0.0

        records.append({
            "account_id": acc["account_id"],
            "ground_truth": acc["ground_truth"],
            "question": acc["question"],

            "baseline_verdict": b["verdict"],
            "baseline_reasoning": b["reasoning"],
            "baseline_tokens": b["tokens"],
            "baseline_latency_ms": b["latency_ms"],
            "baseline_cost_usd": b["cost_usd"],
            "baseline_correct": b["correct"],
            "baseline_llm_judge": b["llm_judge"],
            "baseline_bertscore": b["bertscore"],

            "basic_rag_verdict": br["verdict"],
            "basic_rag_reasoning": br["reasoning"],
            "basic_rag_tokens": br["tokens"],
            "basic_rag_latency_ms": br["latency_ms"],
            "basic_rag_cost_usd": br["cost_usd"],
            "basic_rag_correct": br["correct"],
            "basic_rag_chunks": br["retrieved_chunks"],
            "basic_rag_llm_judge": br["llm_judge"],
            "basic_rag_bertscore": br["bertscore"],

            "graphrag_verdict": g["verdict"],
            "graphrag_reasoning": g["reasoning"],
            "graphrag_tokens": g["tokens"],
            "graphrag_latency_ms": g["latency_ms"],
            "graphrag_cost_usd": g["cost_usd"],
            "graphrag_correct": g["correct"],
            "graphrag_risk_score": g["risk_score"],
            "graph_evidence": g["graph_evidence"],
            "flagged_connections": g["flagged_connections"],
            "blacklisted_ips": g["blacklisted_ips"],
            "shared_devices": g["shared_devices"],
            "nodes_visited": g["nodes_visited"],
            "neighborhood_summary": g["neighborhood_summary"],
            "agentic_loop_triggered": g["agentic_loop_triggered"],
            "agentic_refinement": g["agentic_refinement"],
            "graphrag_llm_judge": g["llm_judge"],
            "graphrag_bertscore": g["bertscore"],

            "token_savings_vs_basic_rag_pct": savings(br["tokens"], g["tokens"]),
            "latency_improvement_pct": savings(br["latency_ms"], g["latency_ms"]),
            "cost_savings_vs_basic_rag_pct": savings(br["cost_usd"], g["cost_usd"]),
        })

    n = len(records)

    def avg(key):
        return round(sum(r[key] for r in records) / n, 1)

    b_correct  = sum(1 for r in records if r["baseline_correct"])
    br_correct = sum(1 for r in records if r["basic_rag_correct"])
    g_correct  = sum(1 for r in records if r["graphrag_correct"])
    g_judge    = sum(1 for r in records if r["graphrag_llm_judge"] == "PASS")
    g_bert     = round(sum(r["graphrag_bertscore"] for r in records) / n, 4)

    summary = {
        "total_questions": n,
        "dataset_tokens": "~100M tokens (500K accounts, 2M transactions)",
        "tokenizer": "gemini-1.5-flash count_tokens API",
        "pipeline_1_baseline": {
            "accuracy_pct": round(b_correct / n * 100, 1),
            "llm_judge_pass_rate_pct": round(sum(1 for r in records if r["baseline_llm_judge"] == "PASS") / n * 100, 1),
            "bertscore_f1_mean": round(sum(r["baseline_bertscore"] for r in records) / n, 4),
            "avg_tokens": avg("baseline_tokens"),
            "avg_latency_ms": avg("baseline_latency_ms"),
            "avg_cost_usd": round(sum(r["baseline_cost_usd"] for r in records) / n, 7),
        },
        "pipeline_2_basic_rag": {
            "accuracy_pct": round(br_correct / n * 100, 1),
            "llm_judge_pass_rate_pct": round(sum(1 for r in records if r["basic_rag_llm_judge"] == "PASS") / n * 100, 1),
            "bertscore_f1_mean": round(sum(r["basic_rag_bertscore"] for r in records) / n, 4),
            "avg_tokens": avg("basic_rag_tokens"),
            "avg_latency_ms": avg("basic_rag_latency_ms"),
            "avg_cost_usd": round(sum(r["basic_rag_cost_usd"] for r in records) / n, 7),
        },
        "pipeline_3_graphrag": {
            "accuracy_pct": round(g_correct / n * 100, 1),
            "llm_judge_pass_rate_pct": round(g_judge / n * 100, 1),
            "bertscore_f1_mean": g_bert,
            "avg_tokens": avg("graphrag_tokens"),
            "avg_latency_ms": avg("graphrag_latency_ms"),
            "avg_cost_usd": round(sum(r["graphrag_cost_usd"] for r in records) / n, 7),
        },
        "graphrag_vs_basic_rag": {
            "token_savings_pct": avg("token_savings_vs_basic_rag_pct"),
            "latency_improvement_pct": avg("latency_improvement_pct"),
            "cost_savings_pct": avg("cost_savings_vs_basic_rag_pct"),
            "hallucination_cases_fixed": [r["account_id"] for r in records if not r["basic_rag_correct"] and r["graphrag_correct"]],
        },
        "bonus_thresholds": {
            "llm_judge_ge_90pct": round(g_judge / n * 100, 1) >= 90.0,
            "bertscore_rescaled_ge_055": g_bert >= 0.55,
            "both_bonuses_unlocked": round(g_judge / n * 100, 1) >= 90.0 and g_bert >= 0.55,
        },
    }

    output = {"summary": summary, "records": records}
    with open("results.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"\n✅ results.json generated with {n} benchmark records")
    print(f"\n{'='*60}")
    print("DEMO RESULTS SUMMARY")
    print(f"{'='*60}")
    print(f"  Baseline  accuracy: {summary['pipeline_1_baseline']['accuracy_pct']}% | avg {summary['pipeline_1_baseline']['avg_tokens']} tokens")
    print(f"  Basic RAG accuracy: {summary['pipeline_2_basic_rag']['accuracy_pct']}% | avg {summary['pipeline_2_basic_rag']['avg_tokens']} tokens")
    print(f"  GraphRAG  accuracy: {summary['pipeline_3_graphrag']['accuracy_pct']}% | avg {summary['pipeline_3_graphrag']['avg_tokens']} tokens")
    print(f"  Token savings vs Basic RAG: {summary['graphrag_vs_basic_rag']['token_savings_pct']}%")
    print(f"  LLM-Judge pass rate: {summary['pipeline_3_graphrag']['llm_judge_pass_rate_pct']}%")
    print(f"  BERTScore F1: {summary['pipeline_3_graphrag']['bertscore_f1_mean']}")
    print(f"  Both bonuses unlocked: {'✅' if summary['bonus_thresholds']['both_bonuses_unlocked'] else '❌'}")
    print(f"{'='*60}")
    print("\nStart the dashboard: cd dashboard && npm install && npm run dev")
    print("Start the API:       python api_server.py")

    return output


if __name__ == "__main__":
    generate_demo_results()
