"""
Pipeline 2 — Basic RAG (Vector Search + LLM).

Embeds all 50 login-log entries into a FAISS-style numpy vector index.
For a given account, retrieves the top-k most similar entries by
cosine similarity and feeds them to the LLM.

This is the genuine "middle tier" comparison:
  - More context-aware than raw-log Baseline (fewer tokens)
  - But blind to cross-account graph relationships (GraphRAG's edge)

No graph traversal. No graph credentials needed. Pure semantic retrieval.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List

import numpy as np

from data.raw_logs import RAW_LOGS
from llm_layer.llm_client import LLMClient, LLMResponse


SYSTEM_PROMPT = """You are a Fraud Analyst at a major Indian fintech company.
You are given login-log entries retrieved by semantic vector search.
These are the most relevant log lines for the target account.
Analyze ONLY the provided entries and decide if the target account
looks suspicious based on login patterns, IPs, and device usage.
Reply with: SAFE or SUSPICIOUS, then explain in 3-4 sentences."""


# ── Deterministic character-bigram vector embedding ──────────────────────────

def _embed(texts: List[str], dim: int = 512) -> np.ndarray:
    """
    Character-bigram bag-of-words embedding.
    Entries sharing account IDs, IPs, or device IDs will have high cosine
    similarity — exactly the right signal for fraud log retrieval.
    dim=512 gives more resolution than 256 to reduce hash collisions.
    """
    vecs = []
    for text in texts:
        vec = np.zeros(dim, dtype=np.float32)
        tokens = text.lower().replace("|", " ").replace(":", " ").split()
        for tok in tokens:
            for i in range(len(tok) - 1):
                idx = hash(tok[i: i + 2]) % dim
                vec[idx] += 1.0
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec /= norm
        vecs.append(vec)
    return np.array(vecs, dtype=np.float32)


class VectorStore:
    """Cosine-similarity vector store backed by numpy — no external service."""

    def __init__(self, texts: List[str]):
        self.texts   = texts
        self.vectors = _embed(texts)

    def search(self, query: str, top_k: int = 15) -> List[str]:
        q = _embed([query])[0]
        scores  = self.vectors @ q
        top_idx = np.argsort(scores)[::-1][:top_k]
        return [self.texts[i] for i in top_idx]


_STORE: VectorStore | None = None

def _get_store() -> VectorStore:
    global _STORE
    if _STORE is None:
        _STORE = VectorStore(RAW_LOGS)
    return _STORE


# ── Result dataclass ──────────────────────────────────────────────────────────

@dataclass
class BasicRAGResult:
    account_id:      str
    verdict:         str          # "SAFE" or "SUSPICIOUS"
    reasoning:       str
    retrieved_chunks: List[str]   = field(default_factory=list)
    llm_response:    LLMResponse  = None
    pipeline:        str          = "basic_rag"


# ── Pipeline ──────────────────────────────────────────────────────────────────

class BasicRAGPipeline:
    """
    Basic RAG — 3 steps:
      1. Build query from account ID → retrieve top-k log lines by cosine sim
      2. Filter to keep only entries that mention the account (primary) plus
         top shared-signal entries (so the LLM sees the most relevant context)
      3. Call LLM with retrieved context → parse verdict
    """

    def __init__(self, llm: LLMClient, top_k: int = 15):
        self.llm   = llm
        self.top_k = top_k
        self.store = _get_store()

    def run(self, account_id: str) -> BasicRAGResult:
        # ── Step 1: retrieve by vector similarity ─────────────────
        query     = f"Account {account_id} login IP device action"
        retrieved = self.store.search(query, top_k=self.top_k)

        # ── Step 2: prioritise entries that directly mention this account
        # Put account-specific entries first, then fill with other top results
        direct  = [l for l in retrieved if f"Account #{account_id}" in l or
                                            f"Account {account_id}" in l]
        context = [l for l in retrieved if l not in direct]
        final   = (direct + context)[:10]   # cap at 10 lines for prompt budget

        chunks_text = "\n".join(f"  {line}" for line in final)

        prompt = (
            f"Target Account: #{account_id}\n\n"
            f"RETRIEVED LOG ENTRIES (top-10 by vector similarity):\n"
            f"{chunks_text}\n\n"
            f"Based ONLY on these log entries, is Account #{account_id} "
            f"SAFE or SUSPICIOUS? Explain your reasoning in 3-4 sentences."
        )

        response = self.llm.complete_with_metrics(
            prompt, system=SYSTEM_PROMPT, max_tokens=400
        )

        content = response.content.strip()
        verdict = "SUSPICIOUS" if "SUSPICIOUS" in content.upper() else "SAFE"

        return BasicRAGResult(
            account_id=account_id,
            verdict=verdict,
            reasoning=content,
            retrieved_chunks=final,
            llm_response=response,
        )
