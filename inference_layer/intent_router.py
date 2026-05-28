"""
Cost-Aware Intent Router — Improvement #1

Classifies query complexity BEFORE touching TigerGraph.
Routes to the cheapest query that can answer the question:

  POINT_LOOKUP  → 1-hop, single entity fact  (~0.5ms, minimal tokens)
  RELATIONSHIP  → 2-hop, direct connection   (~2ms, low tokens)
  MULTI_HOP     → 3-hop, fraud ring / chain  (~5ms, standard tokens)
  FULL_GRAPH    → WCC / PageRank analytics   (~50ms, rich context)

This directly minimizes unnecessary traversals and protects context windows.
"""
import re
from dataclasses import dataclass
from typing import Tuple


@dataclass
class RouteDecision:
    intent: str          # POINT_LOOKUP | RELATIONSHIP | MULTI_HOP | FULL_GRAPH
    hops: int            # 1, 2, 3, or 4
    query_fn: str        # which GSQL query to call
    reason: str          # human-readable explanation
    estimated_tokens: int
    estimated_cost_usd: float
    router_confidence: float  # 0-1


# Token estimates per route (based on benchmark data)
ROUTE_TOKEN_ESTIMATES = {
    "POINT_LOOKUP":  150,
    "RELATIONSHIP":  280,
    "MULTI_HOP":     800,
    "FULL_GRAPH":   1200,
}

# Cost per token (Gemini 2.0 Flash)
COST_PER_TOKEN = 0.075 / 1_000_000

# ── Keyword patterns for each intent ─────────────────────────

POINT_LOOKUP_PATTERNS = [
    r'\bstatus\b', r'\brisk.?score\b', r'\bwhat is\b', r'\bwho is\b',
    r'\bcheck account\b', r'\blook up\b', r'\bget info\b', r'\bdetails of\b',
    r'\bsingle\b', r'\bone account\b', r'\bjust\b.*\baccount\b',
]

RELATIONSHIP_PATTERNS = [
    r'\bconnected to\b', r'\blinked to\b', r'\bshares? device\b',
    r'\bsame ip\b', r'\bdirect connection\b', r'\bneighbor\b',
    r'\brelated\b', r'\bassociated\b', r'\btwo accounts\b',
]

MULTI_HOP_PATTERNS = [
    r'\bfraud ring\b', r'\bsynthetic identity\b', r'\bfraud network\b',
    r'\bpart of\b', r'\bmembership\b', r'\bchain\b', r'\bpath\b',
    r'\bblacklisted\b', r'\bbanned\b', r'\bflagged\b',
    r'\bshared.*device.*account\b', r'\baccount.*device.*account\b',
    r'\b3.?hop\b', r'\bmulti.?hop\b', r'\btraversal\b',
    r'\bsuspicious\b', r'\bfraud\b', r'\bdetect\b',
]

FULL_GRAPH_PATTERNS = [
    r'\ball accounts\b', r'\bentire graph\b', r'\bglobal\b',
    r'\bpagerank\b', r'\bwcc\b', r'\bclustering\b', r'\bcommunity\b',
    r'\btop.?\d+\b', r'\branking\b', r'\bmost influential\b',
    r'\bnetwork analysis\b', r'\bgraph analytics\b',
]


def classify_intent(query: str) -> Tuple[str, float]:
    """
    Classify query intent using keyword pattern matching.
    Returns (intent, confidence).
    """
    q = query.lower()

    # Score each intent
    scores = {
        "POINT_LOOKUP": sum(1 for p in POINT_LOOKUP_PATTERNS  if re.search(p, q)),
        "RELATIONSHIP": sum(1 for p in RELATIONSHIP_PATTERNS  if re.search(p, q)),
        "MULTI_HOP":    sum(1 for p in MULTI_HOP_PATTERNS     if re.search(p, q)),
        "FULL_GRAPH":   sum(1 for p in FULL_GRAPH_PATTERNS    if re.search(p, q)),
    }

    # Account ID patterns boost MULTI_HOP
    account_ids = re.findall(r'\b(?:FR|ACC)\d+(?:A\d+)?\b', query, re.IGNORECASE)
    if len(account_ids) >= 2:
        scores["RELATIONSHIP"] += 2
    if len(account_ids) >= 1 and scores["MULTI_HOP"] == 0:
        scores["MULTI_HOP"] += 1  # default for single account queries

    # Pick winner
    if all(v == 0 for v in scores.values()):
        # Default: MULTI_HOP for fraud domain
        return "MULTI_HOP", 0.6

    winner = max(scores, key=scores.get)
    total  = sum(scores.values()) or 1
    confidence = scores[winner] / total

    return winner, round(confidence, 2)


def route(query: str, account_id: str = "") -> RouteDecision:
    """
    Main routing function. Returns a RouteDecision with the optimal query strategy.
    """
    intent, confidence = classify_intent(query)

    # Map intent → execution plan
    plans = {
        "POINT_LOOKUP": {
            "hops": 1,
            "query_fn": "account_transaction_history",
            "reason": "Single entity fact — 1-hop point lookup sufficient. No traversal needed.",
        },
        "RELATIONSHIP": {
            "hops": 2,
            "query_fn": "multi_hop_fraud_context",
            "reason": "Direct relationship query — 2-hop traversal covers device/IP sharing.",
        },
        "MULTI_HOP": {
            "hops": 3,
            "query_fn": "multi_hop_fraud_context",
            "reason": "Fraud ring / chain detection — full 3-hop BFS required.",
        },
        "FULL_GRAPH": {
            "hops": 4,
            "query_fn": "fraud_ring_detection",
            "reason": "Graph-wide analytics — WCC/PageRank traversal across all nodes.",
        },
    }

    plan = plans[intent]
    tokens = ROUTE_TOKEN_ESTIMATES[intent]
    cost   = tokens * COST_PER_TOKEN

    return RouteDecision(
        intent=intent,
        hops=plan["hops"],
        query_fn=plan["query_fn"],
        reason=plan["reason"],
        estimated_tokens=tokens,
        estimated_cost_usd=round(cost, 8),
        router_confidence=confidence,
    )


def router_efficiency_factor(decisions: list) -> dict:
    """
    Compute the Router Efficiency Factor for a batch of decisions.
    Shows how much compute was saved by routing vs always using MULTI_HOP.
    """
    if not decisions:
        return {}

    baseline_tokens = ROUTE_TOKEN_ESTIMATES["MULTI_HOP"] * len(decisions)
    actual_tokens   = sum(ROUTE_TOKEN_ESTIMATES[d.intent] for d in decisions)
    savings_pct     = round((baseline_tokens - actual_tokens) / baseline_tokens * 100, 1)

    intent_counts = {}
    for d in decisions:
        intent_counts[d.intent] = intent_counts.get(d.intent, 0) + 1

    return {
        "total_queries":        len(decisions),
        "baseline_tokens":      baseline_tokens,
        "actual_tokens":        actual_tokens,
        "tokens_saved":         baseline_tokens - actual_tokens,
        "router_efficiency_pct": savings_pct,
        "intent_distribution":  intent_counts,
        "avg_confidence":       round(sum(d.router_confidence for d in decisions) / len(decisions), 2),
    }
