"""
Pre-Retrieval Density Check — Improvement #2

Fast keyword-based relevance ranking (no model download needed).
Scores graph evidence items by relevance to the query using
TF-IDF-style keyword overlap + fraud signal boosting.

Optional: set USE_CROSS_ENCODER=true in .env for the full cross-encoder
(requires sentence-transformers, adds ~200ms per query).
"""
import os
import re
from typing import List

RELEVANCE_THRESHOLD = 0.15
USE_CROSS_ENCODER   = os.getenv("USE_CROSS_ENCODER", "false").lower() == "true"

# Fraud signal keywords that boost relevance score
FRAUD_SIGNALS = [
    "ALERT", "BLACKLISTED", "BANNED", "FLAGGED", "SUSPICIOUS",
    "chargeback", "fraud", "ENTITY_LINK", "SAME ENTITY",
]


def _keyword_score(query: str, evidence: str) -> float:
    """Fast keyword overlap score — no model needed."""
    q_words = set(re.findall(r'\w+', query.lower()))
    e_words = set(re.findall(r'\w+', evidence.lower()))

    # Base overlap score
    overlap = len(q_words & e_words) / max(len(q_words), 1)

    # Boost for fraud signals
    boost = sum(0.2 for sig in FRAUD_SIGNALS if sig.lower() in evidence.lower())

    # Boost for account ID match
    account_ids = re.findall(r'\b(?:FR|ACC)\d+(?:A\d+)?\b', query, re.IGNORECASE)
    for aid in account_ids:
        if aid.upper() in evidence.upper():
            boost += 0.3

    return min(1.0, overlap + boost)


def rank_evidence(query: str, evidence: List[str], top_k: int = 15) -> List[str]:
    """
    Rank evidence by relevance to query.
    Uses fast keyword scoring by default; cross-encoder if USE_CROSS_ENCODER=true.
    """
    if not evidence:
        return evidence

    if USE_CROSS_ENCODER:
        return _rank_with_cross_encoder(query, evidence, top_k)

    # Fast path: keyword scoring
    scored = [((_keyword_score(query, e)), e) for e in evidence]
    scored.sort(reverse=True)

    filtered = [(s, e) for s, e in scored if s >= RELEVANCE_THRESHOLD]
    if not filtered:
        return [e for _, e in scored[:5]]
    return [e for _, e in filtered[:top_k]]


def compute_relevance_score(query: str, evidence: List[str]) -> float:
    """Return average relevance score of evidence to query (0-1)."""
    if not evidence:
        return 0.0
    scores = [_keyword_score(query, e) for e in evidence[:10]]
    return round(sum(scores) / len(scores), 3)


def _rank_with_cross_encoder(query: str, evidence: List[str], top_k: int) -> List[str]:
    """Optional cross-encoder ranking (slower but more accurate)."""
    try:
        from sentence_transformers import CrossEncoder
        model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
        pairs = [(query, e) for e in evidence]
        scores = model.predict(pairs)
        scored = sorted(zip(scores, evidence), reverse=True)
        filtered = [(s, e) for s, e in scored if s >= RELEVANCE_THRESHOLD]
        return [e for _, e in (filtered or scored)[:top_k]]
    except Exception:
        return rank_evidence(query, evidence, top_k)  # fallback to keyword
