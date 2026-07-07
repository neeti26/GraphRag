"""
Evaluation Layer — Answer-Quality Scoring.

TWO real quality metrics:

  1. BERTScore  — cosine similarity via sentence-transformers all-MiniLM-L6-v2.
                  Falls back to token-overlap F1 if library not installed.

  2. LLM Judge  — Gemini scores each answer on Accuracy / Completeness /
                  Grounding (1-10 each). Returns avg_score.
                  Uses max_tokens=200 so there is room for JSON + preamble.
"""
from __future__ import annotations

import json
import re

# ── Gold reference answers (ideal output per account) ────────────────────────
GOLD_ANSWERS: dict[str, str] = {
    "8821": (
        "Verdict: SUSPICIOUS. Risk Score: 9/10. "
        "Account 8821 shares Device XYZ-999 with banned Account 0001 and "
        "flagged Account 1002. It also logged from blacklisted IP 192.168.1.1, "
        "a known fraud proxy linked to 12 chargebacks. "
        "3-hop graph traversal confirms membership in a 4-account synthetic "
        "identity fraud ring. Escalate immediately."
    ),
    "3344": (
        "Verdict: SAFE. Risk Score: 0/10. "
        "Account 3344 uses Device DEF-222 exclusively. "
        "IP 203.0.113.42 has no blacklist flags. "
        "No connections to flagged or banned accounts within 3 hops. "
        "Verified physical address. No fraud indicators."
    ),
    "1002": (
        "Verdict: SUSPICIOUS. Risk Score: 9/10. "
        "Account 1002 is flagged for Identity Takeover. "
        "Shares Device XYZ-999 with banned Account 0001. "
        "Logged from blacklisted IP 192.168.1.1 linked to 12 chargebacks. "
        "Central node in a 4-account WCC fraud cluster. "
        "Confirmed fraud ring member."
    ),
    "5566": (
        "Verdict: SUSPICIOUS. Risk Score: 8/10. "
        "Account 5566 shares Device XYZ-999 with banned Account 0001 and "
        "flagged Account 1002. Logged from blacklisted IP 198.51.100.7 "
        "a VPN exit node flagged for account takeover. "
        "3-hop path to banned Account 0001 via shared device. "
        "Part of the same synthetic identity ring."
    ),
}


# ── BERTScore ─────────────────────────────────────────────────────────────────

def _token_f1(hypothesis: str, reference: str) -> float:
    """Token-overlap F1 fallback when sentence-transformers is unavailable."""
    h = set(hypothesis.lower().split())
    r = set(reference.lower().split())
    if not h or not r:
        return 0.0
    common = h & r
    p = len(common) / len(h)
    rec = len(common) / len(r)
    if p + rec == 0:
        return 0.0
    return round(2 * p * rec / (p + rec), 4)


def score_answer(hypothesis: str, reference: str) -> float:
    """
    Returns BERTScore (0–1). Uses sentence-transformers when available,
    otherwise falls back to token-overlap F1.
    """
    try:
        from sentence_transformers import SentenceTransformer
        import numpy as np

        if not hasattr(score_answer, "_model"):
            score_answer._model = SentenceTransformer("all-MiniLM-L6-v2")
        embs = score_answer._model.encode(
            [hypothesis, reference], normalize_embeddings=True
        )
        return float(round(float(embs[0] @ embs[1]), 4))
    except ImportError:
        return _token_f1(hypothesis, reference)


# ── LLM Judge ─────────────────────────────────────────────────────────────────

_JUDGE_SYSTEM = (
    "You are a strict fraud-detection evaluation judge. "
    "You will receive a ground-truth label and a pipeline answer. "
    "Score the answer on three dimensions (each 1-10):\n"
    "  Accuracy:     Does the SAFE/SUSPICIOUS verdict match the ground truth?\n"
    "  Completeness: Does the reasoning mention key fraud signals?\n"
    "  Grounding:    Is the reasoning backed by specific evidence?\n\n"
    "You MUST respond with ONLY this JSON and nothing else:\n"
    '{"accuracy": <int>, "completeness": <int>, "grounding": <int>}'
)


def llm_judge(llm, account_id: str, answer: str, ground_truth: str) -> dict:
    """
    Ask the LLM to judge pipeline answer quality.
    Returns {"accuracy", "completeness", "grounding", "avg_score"}.
    """
    prompt = (
        f"Account: {account_id}\n"
        f"Ground Truth: {ground_truth}\n\n"
        f"Pipeline Answer:\n{answer}\n\n"
        "Return ONLY the JSON object."
    )
    try:
        raw = llm.complete(prompt, system=_JUDGE_SYSTEM, max_tokens=200)
        # Strip markdown fences and find the JSON object
        clean = re.sub(r"```[a-z]*", "", raw).strip()
        m = re.search(r"\{[^}]+\}", clean, re.DOTALL)
        if m:
            data = json.loads(m.group())
            acc  = max(1, min(10, int(data.get("accuracy",     5))))
            comp = max(1, min(10, int(data.get("completeness", 5))))
            gnd  = max(1, min(10, int(data.get("grounding",    5))))
            return {
                "accuracy":     acc,
                "completeness": comp,
                "grounding":    gnd,
                "avg_score":    round((acc + comp + gnd) / 3, 2),
            }
    except Exception:
        pass

    # Rule-based fallback — never crashes
    verdict = "SUSPICIOUS" if "SUSPICIOUS" in answer.upper() else "SAFE"
    acc = 10 if verdict == ground_truth else 1
    return {
        "accuracy":     acc,
        "completeness": 5,
        "grounding":    5,
        "avg_score":    round((acc + 5 + 5) / 3, 2),
    }
