"""
Demo mode — runs the full benchmark with simulated responses.
No API keys needed. Generates results.json for the dashboard.

Run: python demo_mode.py
"""
import json, random, time, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dataclasses import asdict
from evaluation_layer.metrics import BenchmarkRecord

ACCOUNTS = [
    {
        "id": "8821", "gt": "SUSPICIOUS",
        "baseline_verdict": "SAFE",   # THE HALLUCINATION — baseline misses it
        "graphrag_verdict": "SUSPICIOUS",
        "baseline_reasoning": "Account #8821 shows normal login activity from IP 10.0.0.55 using Device XYZ-999. All transactions appear within normal range (₹500–₹4,500). No failed login attempts detected. Account appears SAFE.",
        "graphrag_reasoning": "SUSPICIOUS — Risk Score: 9.2/10\n\nGraph Evidence:\n• Device XYZ-999 is shared with Account #1002 (FLAGGED: Identity Takeover) and Account #0001 (BANNED)\n• Account #8821 logged from IP 192.168.1.1 which is BLACKLISTED (linked to 12 chargebacks)\n• 3-hop traversal reveals membership in a 4-account synthetic identity ring\n• Shared physical address with banned Account #0001\n\nVerdict: Account #8821 is a synthetic identity — part of an organized fraud ring.",
        "graph_evidence": [
            "Account 8821 used Device XYZ-999",
            "Device XYZ-999 is ALSO used by Account 1002",
            "ALERT: Account 1002 is flagged (risk_score=7.4)",
            "Device XYZ-999 is ALSO used by Account 0001",
            "ALERT: Account 0001 is banned (risk_score=9.8)",
            "ALERT: Account 8821 logged from BLACKLISTED IP 192.168.1.1 (Known fraud proxy — linked to 12 chargebacks)",
            "IP 192.168.1.1 is ALSO used by Account 0001",
            "IP 192.168.1.1 is ALSO used by Account 1002",
        ],
        "flagged": ["1002", "0001"], "blacklisted": ["192.168.1.1"],
        "shared_devices": ["XYZ-999"], "nodes": 8, "risk_score": 9.2,
        "base_tokens": 3840, "rag_tokens": 248,
        "base_ms": 2100, "rag_ms": 680,
        "neighborhood_summary": "This account is part of a cluster with 4 other accounts, 75.0% of which have been flagged for chargebacks in the last 72 hours.",
        "agentic_loop_triggered": True,
        "agentic_refinement": "Refined Analysis — Risk Score: 9.5/10\n\nIP Intelligence confirms elevated risk: IP 192.168.1.1 has 47 total logins across 4 unique accounts with a 75.0% chargeback rate. Combined with device sharing and fraud ring membership, this account is a high-confidence synthetic identity. Verdict: SUSPICIOUS — escalate for immediate review.",
        "entity_link": {"account_a": "8821", "account_b": "1002", "shared_identifiers": ["XYZ-999", "192.168.1.1"], "confidence_score": 1.0},
    },
    {
        "id": "3344", "gt": "SAFE",
        "baseline_verdict": "SAFE",
        "graphrag_verdict": "SAFE",
        "baseline_reasoning": "Account #3344 shows consistent login activity from IP 203.0.113.42 using Device DEF-222. Transaction history is normal. No suspicious patterns detected. Account appears SAFE.",
        "graphrag_reasoning": "SAFE — Risk Score: 0.3/10\n\nGraph Evidence:\n• Device DEF-222 is used exclusively by Account #3344\n• IP 203.0.113.42 has no blacklist flags\n• No connections to flagged or banned accounts within 3 hops\n• Verified physical address\n\nVerdict: Account #3344 shows no fraud indicators. Clean network.",
        "graph_evidence": [
            "Account 3344 used Device DEF-222",
            "Device DEF-222 is used only by Account 3344",
            "IP 203.0.113.42 is clean — no blacklist flags",
            "No flagged accounts within 3 hops",
        ],
        "flagged": [], "blacklisted": [], "shared_devices": [],
        "nodes": 3, "risk_score": 0.3,
        "base_tokens": 3820, "rag_tokens": 142,
        "base_ms": 1980, "rag_ms": 520,
        "neighborhood_summary": "This account is isolated with no connections to flagged or banned accounts within 3 hops.",
        "agentic_loop_triggered": False,
        "agentic_refinement": "",
        "entity_link": None,
    },
    {
        "id": "1002", "gt": "SUSPICIOUS",
        "baseline_verdict": "SUSPICIOUS",
        "graphrag_verdict": "SUSPICIOUS",
        "baseline_reasoning": "Account #1002 has been previously flagged for Identity Takeover. Multiple logins from shared IP detected. Account appears SUSPICIOUS.",
        "graphrag_reasoning": "SUSPICIOUS — Risk Score: 8.8/10\n\nGraph Evidence:\n• Device XYZ-999 shared with BANNED Account #0001 and TARGET Account #8821\n• IP 192.168.1.1 BLACKLISTED — linked to 12 chargebacks\n• Central node in 4-account fraud ring (WCC cluster size: 4)\n• PageRank risk score elevated due to connections to banned node\n\nVerdict: Account #1002 is a confirmed fraud ring member.",
        "graph_evidence": [
            "Account 1002 used Device XYZ-999",
            "ALERT: Account 1002 is flagged (risk_score=7.4)",
            "Device XYZ-999 also used by Account 0001 (BANNED)",
            "ALERT: Account 1002 logged from BLACKLISTED IP 192.168.1.1",
            "WCC cluster size: 4 accounts",
        ],
        "flagged": ["0001"], "blacklisted": ["192.168.1.1"],
        "shared_devices": ["XYZ-999"], "nodes": 7, "risk_score": 8.8,
        "base_tokens": 3860, "rag_tokens": 231,
        "base_ms": 2050, "rag_ms": 610,
        "neighborhood_summary": "This account is part of a cluster with 4 other accounts, 75.0% of which have been flagged for chargebacks in the last 72 hours.",
        "agentic_loop_triggered": True,
        "agentic_refinement": "Refined Analysis — Risk Score: 9.0/10\n\nIP Intelligence for 192.168.1.1: 47 total logins, 4 unique accounts, 75.0% chargeback rate. This IP is a confirmed fraud proxy. Account #1002 is a central node in the fraud ring — immediate action recommended. Verdict: SUSPICIOUS — confirmed fraud ring member.",
        "entity_link": None,
    },
    {
        "id": "5566", "gt": "SUSPICIOUS",
        "baseline_verdict": "SAFE",   # Another hallucination
        "graphrag_verdict": "SUSPICIOUS",
        "baseline_reasoning": "Account #5566 shows login activity from IP 198.51.100.7 using Device XYZ-999. Activity volume is moderate. No obvious red flags in the log data. Account appears SAFE.",
        "graphrag_reasoning": "SUSPICIOUS — Risk Score: 7.6/10\n\nGraph Evidence:\n• Device XYZ-999 shared with BANNED Account #0001 and FLAGGED Account #1002\n• IP 198.51.100.7 BLACKLISTED (VPN exit node — flagged for account takeover)\n• 3-hop path to banned Account #0001 via shared device\n\nVerdict: Account #5566 is part of the same synthetic identity ring.",
        "graph_evidence": [
            "Account 5566 used Device XYZ-999",
            "Device XYZ-999 also used by Account 0001 (BANNED) and Account 1002 (FLAGGED)",
            "ALERT: Account 5566 logged from BLACKLISTED IP 198.51.100.7 (VPN exit node)",
            "3-hop connection to banned Account #0001",
        ],
        "flagged": ["0001", "1002"], "blacklisted": ["198.51.100.7"],
        "shared_devices": ["XYZ-999"], "nodes": 6, "risk_score": 7.6,
        "base_tokens": 3830, "rag_tokens": 219,
        "base_ms": 2080, "rag_ms": 590,
        "neighborhood_summary": "This account is part of a cluster with 3 other accounts, 66.7% of which have been flagged for chargebacks in the last 72 hours.",
        "agentic_loop_triggered": False,
        "agentic_refinement": "",
        "entity_link": None,
    },
]


def make_record(a) -> BenchmarkRecord:
    def savings(b, r): return round((b - r) / b * 100, 1) if b else 0
    base_cost = round(a["base_tokens"] / 1000 * 0.00015, 7)
    rag_cost  = round(a["rag_tokens"]  / 1000 * 0.00015, 7)
    return BenchmarkRecord(
        account_id=a["id"], ground_truth=a["gt"],
        baseline_verdict=a["baseline_verdict"],
        baseline_reasoning=a["baseline_reasoning"],
        baseline_tokens=a["base_tokens"],
        baseline_latency_ms=float(a["base_ms"]),
        baseline_cost_usd=base_cost,
        baseline_correct=(a["baseline_verdict"] == a["gt"]),
        graphrag_verdict=a["graphrag_verdict"],
        graphrag_reasoning=a["graphrag_reasoning"],
        graphrag_tokens=a["rag_tokens"],
        graphrag_latency_ms=float(a["rag_ms"]),
        graphrag_cost_usd=rag_cost,
        graphrag_correct=(a["graphrag_verdict"] == a["gt"]),
        graphrag_risk_score=a["risk_score"],
        graph_evidence=a["graph_evidence"],
        flagged_connections=a["flagged"],
        blacklisted_ips=a["blacklisted"],
        shared_devices=a["shared_devices"],
        nodes_visited=a["nodes"],
        token_savings_pct=savings(a["base_tokens"], a["rag_tokens"]),
        latency_improvement_pct=savings(a["base_ms"], a["rag_ms"]),
        cost_savings_pct=savings(base_cost, rag_cost),
        neighborhood_summary=a.get("neighborhood_summary", ""),
        agentic_loop_triggered=a.get("agentic_loop_triggered", False),
        agentic_refinement=a.get("agentic_refinement", ""),
        entity_link=a.get("entity_link", None),
    )


def run():
    print("=" * 62)
    print("  FraudGraph Benchmark — DEMO MODE")
    print("  Synthetic Identity Detection via TigerGraph GraphRAG")
    print("=" * 62)

    records = []
    for a in ACCOUNTS:
        time.sleep(0.1)
        r = make_record(a)
        records.append(r)
        b_icon = "✓" if r.baseline_correct else "✗ HALLUCINATION"
        g_icon = "✓" if r.graphrag_correct else "✗"
        print(f"\n  Account #{a['id']} (truth={a['gt']})")
        print(f"    Baseline : {r.baseline_verdict:10s} {b_icon} | {r.baseline_tokens} tokens | {r.baseline_latency_ms:.0f}ms")
        print(f"    GraphRAG : {r.graphrag_verdict:10s} {g_icon} | {r.graphrag_tokens} tokens | {r.graphrag_latency_ms:.0f}ms | risk={r.graphrag_risk_score}")
        print(f"    Savings  : {r.token_savings_pct}% tokens | {r.latency_improvement_pct}% latency")

    n = len(records)
    b_acc = sum(1 for r in records if r.baseline_correct) / n * 100
    g_acc = sum(1 for r in records if r.graphrag_correct) / n * 100
    hallucinations = [r.account_id for r in records if not r.baseline_correct and r.graphrag_correct]

    summary = {
        "total_accounts": n,
        "baseline_accuracy_pct": round(b_acc, 1),
        "graphrag_accuracy_pct": round(g_acc, 1),
        "avg_token_savings_pct": round(sum(r.token_savings_pct for r in records) / n, 1),
        "avg_latency_improvement_pct": round(sum(r.latency_improvement_pct for r in records) / n, 1),
        "avg_cost_savings_pct": round(sum(r.cost_savings_pct for r in records) / n, 1),
        "total_baseline_tokens": sum(r.baseline_tokens for r in records),
        "total_graphrag_tokens": sum(r.graphrag_tokens for r in records),
        "total_baseline_cost_usd": round(sum(r.baseline_cost_usd for r in records), 6),
        "total_graphrag_cost_usd": round(sum(r.graphrag_cost_usd for r in records), 6),
        "hallucination_cases": hallucinations,
    }

    print("\n" + "=" * 62)
    print("  BENCHMARK SUMMARY")
    print("=" * 62)
    print(f"  Detection Accuracy  : Baseline {b_acc}%  →  GraphRAG {g_acc}%")
    print(f"  Avg Token Savings   : {summary['avg_token_savings_pct']}%")
    print(f"  Avg Latency Speedup : {summary['avg_latency_improvement_pct']}%")
    print(f"  Hallucinations fixed: {hallucinations} (baseline said SAFE, GraphRAG caught them)")
    print("=" * 62)

    with open("results.json", "w") as f:
        json.dump({"summary": summary, "records": [asdict(r) for r in records]}, f, indent=2)
    print("\n  results.json saved.")


if __name__ == "__main__":
    run()
