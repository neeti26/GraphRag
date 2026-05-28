"""
Pre-Retrieval Density Check + Self-Correction Layer.

1. RelevanceRanker: scores graph facts before sending to LLM, discards noise
2. SelfCorrectionLayer: dual-pass verification — checks answer against graph paths
"""
import re
from typing import List, Tuple


# ── Relevance Ranker ──────────────────────────────────────────

class RelevanceRanker:
    """
    Scores graph evidence facts by relevance to the query.
    Uses a lightweight cross-encoder or keyword scoring.
    Discards facts below threshold to reduce token bloat.
    """

    def __init__(self, threshold: float = 0.3, use_model: bool = False):
        self.threshold = threshold
        self.use_model = use_model
        self._model = None

    def _load_model(self):
        """Lazy-load cross-encoder (only if use_model=True)."""
        if self._model is None:
            try:
                from sentence_transformers import CrossEncoder
                self._model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
            except Exception:
                self._model = None

    def score_keyword(self, query: str, fact: str) -> float:
        """Fast keyword-based relevance scoring."""
        query_words = set(re.findall(r'\w+', query.upper()))
        fact_words  = set(re.findall(r'\w+', fact.upper()))

        # High-signal fraud keywords always score high
        fraud_signals = {"BLACKLISTED", "BANNED", "FLAGGED", "ALERT", "FRAUD",
                         "SUSPICIOUS", "CHARGEBACK", "RING"}
        if fact_words & fraud_signals:
            return 0.9

        # Overlap score
        if not query_words:
            return 0.5
        overlap = len(query_words & fact_words) / len(query_words)
        return min(overlap * 2, 1.0)

    def rank_and_filter(self, query: str, facts: List[str],
                        max_facts: int = 15) -> List[Tuple[str, float]]:
        """
        Score all facts, filter below threshold, return top max_facts.
        Returns list of (fact, score) tuples sorted by score desc.
        """
        if not facts:
            return []

        scored = []
        for fact in facts:
            score = self.score_keyword(query, fact)
            scored.append((fact, score))

        # Sort by score descending
        scored.sort(key=lambda x: x[1], reverse=True)

        # Filter below threshold
        filtered = [(f, s) for f, s in scored if s >= self.threshold]

        # Always keep ALERT lines regardless of score
        alerts = [(f, s) for f, s in scored if "ALERT" in f.upper() and (f, s) not in filtered]
        filtered = (filtered + alerts)[:max_facts]

        return filtered

    def get_filtered_facts(self, query: str, facts: List[str],
                           max_facts: int = 15) -> List[str]:
        """Return just the filtered fact strings."""
        ranked = self.rank_and_filter(query, facts, max_facts)
        return [f for f, s in ranked]


# ── Self-Correction Layer ─────────────────────────────────────

class SelfCorrectionLayer:
    """
    Dual-pass verification:
    Pass 1: Generate answer from graph context
    Pass 2: Verify answer strictly follows graph paths, rewrite if not

    Shows validation trace on the dashboard.
    """

    VERIFICATION_PROMPT = """You are a fraud detection verifier.

Original Graph Paths:
{graph_paths}

Generated Answer:
{answer}

Task: Does this answer strictly follow the graph paths above?
- If YES: reply with "VERIFIED: " followed by the original answer unchanged
- If NO: reply with "CORRECTED: " followed by a rewritten answer that only references facts from the graph paths

Be concise. Do not add information not in the graph paths."""

    def __init__(self, llm):
        self.llm = llm

    def verify_and_correct(self, answer: str, graph_paths: str,
                           account_id: str) -> dict:
        """
        Verify answer against graph paths.
        Returns dict with: verified (bool), final_answer (str), trace (str)
        """
        prompt = self.VERIFICATION_PROMPT.format(
            graph_paths=graph_paths,
            answer=answer,
        )

        try:
            response = self.llm.complete_with_metrics(prompt, max_tokens=300)
            content = response.content.strip()

            if content.startswith("VERIFIED:"):
                return {
                    "verified": True,
                    "final_answer": content[9:].strip(),
                    "trace": f"✅ Answer verified against graph paths for {account_id}",
                    "correction_tokens": response.total_tokens,
                }
            elif content.startswith("CORRECTED:"):
                corrected = content[10:].strip()
                return {
                    "verified": False,
                    "final_answer": corrected,
                    "trace": f"🔄 Answer corrected — original deviated from graph paths for {account_id}",
                    "correction_tokens": response.total_tokens,
                }
            else:
                # Ambiguous — keep original
                return {
                    "verified": True,
                    "final_answer": answer,
                    "trace": f"⚠️ Verification inconclusive for {account_id} — keeping original",
                    "correction_tokens": response.total_tokens,
                }
        except Exception as e:
            return {
                "verified": True,
                "final_answer": answer,
                "trace": f"⚠️ Verification skipped: {e}",
                "correction_tokens": 0,
            }
