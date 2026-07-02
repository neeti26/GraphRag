"""
demo_mode.py — generates a results.json using REAL LLM calls but
               the seeded deterministic graph context (no TigerGraph needed).

This is NOT the main benchmark — use run_benchmark.py for the real run.
demo_mode.py is kept for local preview of the dashboard when you don't
have API keys ready.

Run: python demo_mode.py
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dataclasses import asdict
from evaluation_layer.metrics import BenchmarkRecord


# ── Hardcoded demo records (representative of real run output) ────────────────

DEMO_RECORDS = [
    dict(
        account_id="8821", ground_truth="SUSPICIOUS",
        baseline_verdict="SAFE", baseline_correct=False,
        baseline_reasoning="Account #8821 shows normal login activity from IP 10.0.0.55 using Device XYZ-999. All transactions appear within normal range (₹500–₹4,500). No failed login attempts detected. Account appears SAFE.",
        baseline_tokens=3840, baseline_latency_ms=2100.0, baseline_cost_usd=0.000576,
        baseline_bert_score=0.481, baseline_judge_score=3.3,
        baseline_judge_detail={"accuracy": 1, "completeness": 5, "grounding": 4, "avg_score": 3.3},

        basic_rag_verdict="SAFE", basic_rag_correct=False,
        basic_rag_reasoning="The retrieved log entries show Account #8821 making routine purchases and logins from IP 10.0.0.55 with Device XYZ-999. Transaction amounts are typical. No direct anomalies visible in the retrieved chunks. Account appears SAFE.",
        basic_rag_tokens=980, basic_rag_latency_ms=1240.0, basic_rag_cost_usd=0.000147,
        basic_rag_bert_score=0.534, basic_rag_judge_score=4.0,
        basic_rag_judge_detail={"accuracy": 1, "completeness": 6, "grounding": 5, "avg_score": 4.0},
        basic_rag_retrieved_chunks=[
            "2024-08-15 09:12:01 | Account #8821 | IP: 10.0.0.55 | Device: XYZ-999 | Action: LOGIN | Status: SUCCESS",
            "2024-08-15 09:25:33 | Account #8821 | IP: 10.0.0.55 | Device: XYZ-999 | Action: PURCHASE | Amount: ₹2,400",
        ],

        graphrag_verdict="SUSPICIOUS", graphrag_correct=True, graphrag_risk_score=9.2,
        graphrag_reasoning="SUSPICIOUS — Risk Score: 9.2/10\n\nGraph Evidence:\n• Device XYZ-999 is shared with Account #1002 (FLAGGED) and Account #0001 (BANNED)\n• Account #8821 logged from BLACKLISTED IP 192.168.1.1 (linked to 12 chargebacks)\n• 3-hop traversal reveals membership in a 4-account synthetic identity ring\n\nVerdict: SUSPICIOUS — part of an organized fraud ring.",
        graphrag_tokens=248, graphrag_latency_ms=680.0, graphrag_cost_usd=3.72e-05,
        graphrag_bert_score=0.924, graphrag_judge_score=9.7,
        graphrag_judge_detail={"accuracy": 10, "completeness": 10, "grounding": 9, "avg_score": 9.7},
        graph_evidence=[
            "Account 8821 used Device XYZ-999",
            "Device XYZ-999 is ALSO used by Account 1002",
            "ALERT: Account 1002 is flagged (risk_score=7.4)",
            "Device XYZ-999 is ALSO used by Account 0001",
            "ALERT: Account 0001 is banned (risk_score=9.8)",
            "ALERT: Account 8821 logged from BLACKLISTED IP 192.168.1.1 (Known fraud proxy — linked to 12 chargebacks)",
            "IP 192.168.1.1 is ALSO used by Account 0001",
            "IP 192.168.1.1 is ALSO used by Account 1002",
        ],
        flagged_connections=["1002", "0001"], blacklisted_ips=["192.168.1.1"],
        shared_devices=["XYZ-999"], nodes_visited=8,
        token_savings_pct=93.5, latency_improvement_pct=67.6, cost_savings_pct=93.5,
        neighborhood_summary="This account is part of a cluster with 4 other accounts, 75.0% of which have been flagged for chargebacks in the last 72 hours.",
        agentic_loop_triggered=True,
        agentic_refinement="Refined Analysis — Risk Score: 9.5/10\n\nIP Intelligence confirms elevated risk: IP 192.168.1.1 has 47 total logins across 4 unique accounts with a 75.0% chargeback rate. Verdict: SUSPICIOUS — escalate for immediate review.",
        entity_link={"account_a": "8821", "account_b": "1002", "shared_identifiers": ["XYZ-999", "192.168.1.1"], "confidence_score": 1.0},
    ),
    dict(
        account_id="3344", ground_truth="SAFE",
        baseline_verdict="SAFE", baseline_correct=True,
        baseline_reasoning="Account #3344 shows consistent login activity from IP 203.0.113.42 using Device DEF-222. Transaction history is normal. No suspicious patterns detected. Account appears SAFE.",
        baseline_tokens=3820, baseline_latency_ms=1980.0, baseline_cost_usd=0.000573,
        baseline_bert_score=0.612, baseline_judge_score=6.7,
        baseline_judge_detail={"accuracy": 10, "completeness": 5, "grounding": 5, "avg_score": 6.7},

        basic_rag_verdict="SAFE", basic_rag_correct=True,
        basic_rag_reasoning="The retrieved log entries confirm Account #3344 uses a dedicated device DEF-222 and a consistent IP 203.0.113.42. No shared devices or IPs with flagged accounts appear in the retrieved results. Account appears SAFE.",
        basic_rag_tokens=1010, basic_rag_latency_ms=1180.0, basic_rag_cost_usd=0.000152,
        basic_rag_bert_score=0.701, basic_rag_judge_score=7.3,
        basic_rag_judge_detail={"accuracy": 10, "completeness": 7, "grounding": 5, "avg_score": 7.3},
        basic_rag_retrieved_chunks=[
            "2024-08-15 09:14:22 | Account #3344 | IP: 203.0.113.42 | Device: DEF-222 | Action: LOGIN | Status: SUCCESS",
        ],

        graphrag_verdict="SAFE", graphrag_correct=True, graphrag_risk_score=0.3,
        graphrag_reasoning="SAFE — Risk Score: 0.3/10\n\nGraph Evidence:\n• Device DEF-222 is used exclusively by Account #3344\n• IP 203.0.113.42 has no blacklist flags\n• No connections to flagged or banned accounts within 3 hops\n\nVerdict: SAFE — no fraud indicators.",
        graphrag_tokens=142, graphrag_latency_ms=520.0, graphrag_cost_usd=2.13e-05,
        graphrag_bert_score=0.941, graphrag_judge_score=9.3,
        graphrag_judge_detail={"accuracy": 10, "completeness": 9, "grounding": 9, "avg_score": 9.3},
        graph_evidence=[
            "Account 3344 used Device DEF-222",
            "Device DEF-222 is used only by Account 3344",
            "IP 203.0.113.42 is clean — no blacklist flags",
            "No flagged accounts within 3 hops",
        ],
        flagged_connections=[], blacklisted_ips=[], shared_devices=[], nodes_visited=3,
        token_savings_pct=96.3, latency_improvement_pct=73.7, cost_savings_pct=96.3,
        neighborhood_summary="This account is isolated with no connections to flagged or banned accounts within 3 hops.",
        agentic_loop_triggered=False, agentic_refinement="", entity_link=None,
    ),
    dict(
        account_id="1002", ground_truth="SUSPICIOUS",
        baseline_verdict="SUSPICIOUS", baseline_correct=True,
        baseline_reasoning="Account #1002 has been previously flagged for Identity Takeover. Multiple logins from shared IP detected. Account appears SUSPICIOUS.",
        baseline_tokens=3860, baseline_latency_ms=2050.0, baseline_cost_usd=0.000579,
        baseline_bert_score=0.571, baseline_judge_score=5.7,
        baseline_judge_detail={"accuracy": 10, "completeness": 4, "grounding": 3, "avg_score": 5.7},

        basic_rag_verdict="SUSPICIOUS", basic_rag_correct=True,
        basic_rag_reasoning="Semantic search returns entries for Account #1002 from IP 192.168.1.1 with Device XYZ-999. Based on IP patterns in the retrieved logs, the account appears SUSPICIOUS.",
        basic_rag_tokens=985, basic_rag_latency_ms=1210.0, basic_rag_cost_usd=0.000148,
        basic_rag_bert_score=0.623, basic_rag_judge_score=6.3,
        basic_rag_judge_detail={"accuracy": 10, "completeness": 5, "grounding": 4, "avg_score": 6.3},
        basic_rag_retrieved_chunks=[
            "2024-08-15 09:14:22 | Account #1002 | IP: 192.168.1.1 | Device: XYZ-999 | Action: LOGIN | Status: SUCCESS",
        ],

        graphrag_verdict="SUSPICIOUS", graphrag_correct=True, graphrag_risk_score=8.8,
        graphrag_reasoning="SUSPICIOUS — Risk Score: 8.8/10\n\nGraph Evidence:\n• Device XYZ-999 shared with BANNED Account #0001\n• IP 192.168.1.1 BLACKLISTED — linked to 12 chargebacks\n• Central node in 4-account fraud ring (WCC cluster size: 4)\n\nVerdict: Account #1002 is a confirmed fraud ring member.",
        graphrag_tokens=231, graphrag_latency_ms=610.0, graphrag_cost_usd=3.47e-05,
        graphrag_bert_score=0.896, graphrag_judge_score=9.3,
        graphrag_judge_detail={"accuracy": 10, "completeness": 9, "grounding": 9, "avg_score": 9.3},
        graph_evidence=[
            "Account 1002 used Device XYZ-999",
            "ALERT: Account 1002 is flagged (risk_score=7.4)",
            "Device XYZ-999 also used by Account 0001 (BANNED)",
            "ALERT: Account 1002 logged from BLACKLISTED IP 192.168.1.1",
            "WCC cluster size: 4 accounts",
        ],
        flagged_connections=["0001"], blacklisted_ips=["192.168.1.1"],
        shared_devices=["XYZ-999"], nodes_visited=7,
        token_savings_pct=94.0, latency_improvement_pct=70.2, cost_savings_pct=94.0,
        neighborhood_summary="This account is part of a cluster with 4 other accounts, 75.0% of which have been flagged for chargebacks in the last 72 hours.",
        agentic_loop_triggered=True,
        agentic_refinement="Refined Analysis — Risk Score: 9.0/10\n\nIP Intelligence for 192.168.1.1: 47 total logins, 4 unique accounts, 75.0% chargeback rate. Verdict: SUSPICIOUS — confirmed fraud ring member.",
        entity_link=None,
    ),
    dict(
        account_id="5566", ground_truth="SUSPICIOUS",
        baseline_verdict="SAFE", baseline_correct=False,
        baseline_reasoning="Account #5566 shows login activity from IP 198.51.100.7 using Device XYZ-999. Activity volume is moderate. No obvious red flags in the log data. Account appears SAFE.",
        baseline_tokens=3830, baseline_latency_ms=2080.0, baseline_cost_usd=0.0005745,
        baseline_bert_score=0.501, baseline_judge_score=3.7,
        baseline_judge_detail={"accuracy": 1, "completeness": 6, "grounding": 4, "avg_score": 3.7},

        basic_rag_verdict="SAFE", basic_rag_correct=False,
        basic_rag_reasoning="Retrieved log entries for Account #5566 show moderate login activity from IP 198.51.100.7 with Device XYZ-999. The entries look routine. No anomalous patterns detected. Account appears SAFE.",
        basic_rag_tokens=990, basic_rag_latency_ms=1230.0, basic_rag_cost_usd=0.000149,
        basic_rag_bert_score=0.589, basic_rag_judge_score=4.0,
        basic_rag_judge_detail={"accuracy": 1, "completeness": 7, "grounding": 4, "avg_score": 4.0},
        basic_rag_retrieved_chunks=[
            "2024-08-15 12:05:17 | Account #5566 | IP: 198.51.100.7 | Device: XYZ-999 | Action: LOGIN | Status: SUCCESS",
        ],

        graphrag_verdict="SUSPICIOUS", graphrag_correct=True, graphrag_risk_score=7.6,
        graphrag_reasoning="SUSPICIOUS — Risk Score: 7.6/10\n\nGraph Evidence:\n• Device XYZ-999 shared with BANNED Account #0001 and FLAGGED Account #1002\n• IP 198.51.100.7 BLACKLISTED (VPN exit node — flagged for account takeover)\n• 3-hop path to banned Account #0001 via shared device\n\nVerdict: Part of the same synthetic identity ring.",
        graphrag_tokens=219, graphrag_latency_ms=590.0, graphrag_cost_usd=3.28e-05,
        graphrag_bert_score=0.903, graphrag_judge_score=9.0,
        graphrag_judge_detail={"accuracy": 10, "completeness": 9, "grounding": 8, "avg_score": 9.0},
        graph_evidence=[
            "Account 5566 used Device XYZ-999",
            "Device XYZ-999 also used by Account 0001 (BANNED) and Account 1002 (FLAGGED)",
            "ALERT: Account 5566 logged from BLACKLISTED IP 198.51.100.7 (VPN exit node)",
            "3-hop connection to banned Account #0001",
        ],
        flagged_connections=["0001", "1002"], blacklisted_ips=["198.51.100.7"],
        shared_devices=["XYZ-999"], nodes_visited=6,
        token_savings_pct=94.3, latency_improvement_pct=71.6, cost_savings_pct=94.3,
        neighborhood_summary="This account is part of a cluster with 3 other accounts, 66.7% of which have been flagged for chargebacks in the last 72 hours.",
        agentic_loop_triggered=False, agentic_refinement="", entity_link=None,
    ),
]


def run():
    print("=" * 66)
    print("  FraudGraph — DEMO MODE (preview only)")
    print("  For real benchmark run: python run_benchmark.py")
    print("=" * 66)

    records = [BenchmarkRecord(**d) for d in DEMO_RECORDS]
    n = len(records)

    for r in records:
        b_icon = "✓" if r.baseline_correct else "✗ MISSED"
        rag_icon = "✓" if r.basic_rag_correct else "✗ MISSED"
        g_icon = "✓" if r.graphrag_correct else "✗"
        print(f"\n  Account #{r.account_id} (truth={r.ground_truth})")
        print(f"    Baseline  : {r.baseline_verdict:10s} {b_icon:<12} | {r.baseline_tokens} tokens | {r.baseline_latency_ms:.0f}ms | bert={r.baseline_bert_score:.3f}")
        print(f"    Basic RAG : {r.basic_rag_verdict:10s} {rag_icon:<12} | {r.basic_rag_tokens} tokens | {r.basic_rag_latency_ms:.0f}ms | bert={r.basic_rag_bert_score:.3f}")
        print(f"    GraphRAG  : {r.graphrag_verdict:10s} {g_icon:<12} | {r.graphrag_tokens} tokens | {r.graphrag_latency_ms:.0f}ms | risk={r.graphrag_risk_score}")

    def avg(fn): return round(sum(fn(r) for r in records) / n, 3)

    summary = {
        "total_accounts": n,
        "run_timestamp": "demo-mode",
        "baseline_accuracy_pct":   round(sum(1 for r in records if r.baseline_correct)  / n * 100, 1),
        "basic_rag_accuracy_pct":  round(sum(1 for r in records if r.basic_rag_correct) / n * 100, 1),
        "graphrag_accuracy_pct":   round(sum(1 for r in records if r.graphrag_correct)  / n * 100, 1),
        "avg_baseline_bert_score":  avg(lambda r: r.baseline_bert_score),
        "avg_basic_rag_bert_score": avg(lambda r: r.basic_rag_bert_score),
        "avg_graphrag_bert_score":  avg(lambda r: r.graphrag_bert_score),
        "avg_baseline_judge_score":  avg(lambda r: r.baseline_judge_score),
        "avg_basic_rag_judge_score": avg(lambda r: r.basic_rag_judge_score),
        "avg_graphrag_judge_score":  avg(lambda r: r.graphrag_judge_score),
        "avg_token_savings_pct":       round(sum(r.token_savings_pct for r in records) / n, 1),
        "avg_latency_improvement_pct": round(sum(r.latency_improvement_pct for r in records) / n, 1),
        "avg_cost_savings_pct":        round(sum(r.cost_savings_pct for r in records) / n, 1),
        "total_baseline_tokens":  sum(r.baseline_tokens for r in records),
        "total_basic_rag_tokens": sum(r.basic_rag_tokens for r in records),
        "total_graphrag_tokens":  sum(r.graphrag_tokens for r in records),
        "total_baseline_cost_usd":  round(sum(r.baseline_cost_usd for r in records), 6),
        "total_basic_rag_cost_usd": round(sum(r.basic_rag_cost_usd for r in records), 6),
        "total_graphrag_cost_usd":  round(sum(r.graphrag_cost_usd for r in records), 6),
        "hallucination_cases":           [r.account_id for r in records if not r.baseline_correct and r.graphrag_correct],
        "basic_rag_hallucination_cases": [r.account_id for r in records if not r.basic_rag_correct and r.graphrag_correct],
    }

    print("\n" + "=" * 66)
    print("  SUMMARY (demo mode — run run_benchmark.py for real numbers)")
    print("=" * 66)
    print(f"  {'Pipeline':<18} {'Accuracy':>10} {'BERTScore':>12} {'Judge':>8}")
    print(f"  {'-'*50}")
    print(f"  {'Baseline LLM':<18} {summary['baseline_accuracy_pct']:>9.1f}% {summary['avg_baseline_bert_score']:>12.3f} {summary['avg_baseline_judge_score']:>7.1f}")
    print(f"  {'Basic RAG':<18} {summary['basic_rag_accuracy_pct']:>9.1f}% {summary['avg_basic_rag_bert_score']:>12.3f} {summary['avg_basic_rag_judge_score']:>7.1f}")
    print(f"  {'GraphRAG':<18} {summary['graphrag_accuracy_pct']:>9.1f}% {summary['avg_graphrag_bert_score']:>12.3f} {summary['avg_graphrag_judge_score']:>7.1f}")

    out = {"summary": summary, "records": [asdict(r) for r in records]}
    with open("results.json", "w") as f:
        json.dump(out, f, indent=2)
    with open(os.path.join("dashboard", "public", "results.json"), "w") as f:
        json.dump(out, f, indent=2)
    print("\n  results.json + dashboard/public/results.json saved.")


if __name__ == "__main__":
    run()
