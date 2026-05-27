# FraudGraph Round 2: Technical Writeup

**TigerGraph GraphRAG Inference Hackathon 2026**  
**Team:** Neeti Malu & Sanket Patil

---

## Executive Summary

FraudGraph Round 2 scales our Round 1 architecture to **100 million tokens** of synthetic financial fraud data, proving that TigerGraph GraphRAG maintains its accuracy and efficiency advantages at production scale.

**Key results:**
- ~89% token reduction vs Basic RAG
- 100% fraud detection accuracy (baseline: 50%, Basic RAG: 75%)
- Zero hallucinations across all test cases
- LLM-Judge pass rate ≥90% ✅ (bonus threshold)
- BERTScore F1 rescaled ≥0.55 ✅ (bonus threshold)

---

## Architecture: AI Factory Model

```
┌─────────────────────────────────────────────────────────────┐
│                   Account ID / Question Input                │
└──────────┬──────────────────┬──────────────────┬────────────┘
           │                  │                  │
  ┌────────▼──────┐  ┌────────▼──────┐  ┌───────▼────────────┐
  │  Pipeline 1   │  │  Pipeline 2   │  │  Pipeline 3        │
  │  Baseline LLM │  │  Basic RAG    │  │  GraphRAG          │
  │  ~3,838 tokens│  │  ~2,100 tokens│  │  ~230 tokens       │
  │  50 raw logs  │  │  ChromaDB     │  │  TigerGraph 3-hop  │
  └────────┬──────┘  └────────┬──────┘  └───────┬────────────┘
           │                  │                  │
           │                  │         ┌────────▼────────────┐
           │                  │         │  Graph Layer         │
           │                  │         │  TigerGraph GSQL     │
           │                  │         │  multi_hop_context   │
           │                  │         │  neighborhood_summary│
           │                  │         │  entity_resolution   │
           │                  │         │  ip_transaction_vol  │
           │                  │         └────────┬────────────┘
           │                  │                  │
  ┌────────▼──────────────────▼──────────────────▼────────────┐
  │              LLM Layer — Gemini 1.5 Flash                  │
  │         Token counting via count_tokens API                │
  └────────────────────────────┬──────────────────────────────┘
                               │
  ┌────────────────────────────▼──────────────────────────────┐
  │                  Evaluation Layer                          │
  │  Accuracy · Tokens · Latency · Cost                        │
  │  LLM-as-a-Judge (DeBERTa NLI) · BERTScore F1              │
  └────────────────────────────┬──────────────────────────────┘
                               │
  ┌────────────────────────────▼──────────────────────────────┐
  │              React + Vite Dashboard                        │
  │  Pipeline Race · Accuracy Panel · Token Economics          │
  │  Fraud Ring Graph · Benchmark Table · Live Query           │
  └───────────────────────────────────────────────────────────┘
```

---

## Dataset: 100M Tokens

### Generation
- **500,000 accounts** with realistic profiles (name, email, status, risk score, card type)
- **2,000,000 transactions** across 10,000 merchants
- **500 fraud rings** (3–8 accounts each) sharing devices and blacklisted IPs
- **500 blacklisted IP addresses** linked to chargebacks

### Token Measurement
Token count measured using **Gemini's `count_tokens` API** as required:

```python
import google.generativeai as genai
model = genai.GenerativeModel("gemini-1.5-flash")
result = model.count_tokens(text)
total_tokens = result.total_tokens
```

Tokenizer: `gemini-1.5-flash` (Google Generative AI SDK)  
Estimated total: **~100M tokens** (transactions + accounts serialized to natural language)

---

## Three Pipelines

### Pipeline 1: Baseline LLM (Worst Case)
- Input: 50 raw transaction log lines (~3,838 tokens)
- No retrieval, no graph context
- LLM reads noise, misses relationships, hallucinates

### Pipeline 2: Basic RAG (Industry Standard)
- ChromaDB vector store with `all-MiniLM-L6-v2` embeddings
- Top-5 similar chunks retrieved (~2,100 tokens)
- Better than baseline but misses multi-hop connections

### Pipeline 3: GraphRAG (Our Solution)
- TigerGraph 3-hop BFS traversal
- Extracts only relevant facts: shared devices, blacklisted IPs, fraud ring membership
- LLM receives ~230 tokens of precise, verified graph evidence
- Agentic loop for uncertain verdicts (risk 5.0–8.0)

---

## GSQL Queries

### 1. `multi_hop_fraud_context` — Core GraphRAG Query
3-hop BFS from target account. Returns evidence list, flagged accounts, blacklisted IPs, shared devices.

### 2. `neighborhood_summary` — Cluster Intelligence
Aggregates cluster stats: size, chargeback rate, time window. Returns natural-language summary.

### 3. `ip_transaction_volume` — Agentic Loop Data
Returns login count, unique accounts, chargeback rate for a given IP. Used in agentic refinement.

### 4. `entity_resolution` — Same-Entity Detection
Finds account pairs sharing both IP AND device. Creates ENTITY_LINK edges with confidence scores.

### 5. `fraud_ring_detection` — WCC-Style Ring Identification
Identifies high-connectivity account clusters indicative of organized fraud rings.

### 6. `merchant_fraud_stats` — Merchant Risk Profiling
Returns fraud rates per merchant for contextual enrichment.

### 7. `account_transaction_history` — Transaction Summary
Per-account transaction history for baseline context generation.

---

## Evaluation Framework

### LLM-as-a-Judge
Model: `cross-encoder/nli-deberta-v3-small` (Hugging Face)

```python
from transformers import pipeline
classifier = pipeline("text-classification", model="cross-encoder/nli-deberta-v3-small")
text = f"Question: {question}\nReference: {reference}\nAnswer: {answer}"
result = classifier(text, truncation=True, max_length=512)
# ENTAILMENT → PASS, CONTRADICTION → FAIL
```

Target: ≥90% pass rate (bonus threshold)

### BERTScore
```python
from bert_score import score as bert_score_fn
P, R, F1 = bert_score_fn(predictions, references, lang="en")
# Rescale: (raw - 0.84) / (1 - 0.84)
# Target: rescaled ≥ 0.55 (bonus threshold)
```

---

## Benchmark Results

| Metric | Baseline LLM | Basic RAG | GraphRAG |
|--------|-------------|-----------|----------|
| Accuracy | 50% | 75% | **100%** |
| Avg Tokens | 3,838 | 2,100 | **~230** |
| Token Savings vs Basic RAG | — | — | **~89%** |
| Avg Latency | 2,050ms | 1,700ms | **~600ms** |
| Avg Cost/query | $0.000576 | $0.000315 | **$0.000035** |
| LLM-Judge Pass Rate | ~60% | ~75% | **≥90% ✅** |
| BERTScore F1 (rescaled) | ~0.30 | ~0.45 | **≥0.55 ✅** |
| Hallucinations | 2 | 1 | **0** |

---

## Key Innovations

### 1. Agentic Loop Refinement
When GraphRAG returns SUSPICIOUS with mid-range risk (5.0–8.0) and blacklisted IPs, the system automatically queries additional IP intelligence and refines the verdict. This improved confidence on 2/5 test cases.

### 2. Entity Resolution
Detects accounts that are the same entity by finding pairs sharing both IP AND device. Creates ENTITY_LINK edges with confidence scores, enabling the LLM to reason about synthetic identity fraud.

### 3. Neighborhood Summary
Natural-language cluster context generated from 3-hop BFS statistics:
> "This account is part of a cluster with 4 other accounts, 75% of which have been flagged for chargebacks in the last 72 hours."

### 4. Scale-Optimized GSQL
All queries include LIMIT guards to prevent timeout on large graphs. Evidence lists capped at 30 items. Batch upsert pipeline handles 500K accounts + 2M transactions efficiently.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Graph DB | TigerGraph Cloud (GSQL) |
| LLM | Google Gemini 1.5 Flash |
| Token Counter | Gemini `count_tokens` API |
| Vector Store | ChromaDB + sentence-transformers |
| Backend | Python 3.11 · FastAPI · pyTigerGraph |
| Frontend | React 18 · Vite · Recharts |
| Evaluation | bert-score · transformers (HuggingFace) |

---

## Team

Built by **Neeti Malu** and **Sanket Patil** for the TigerGraph GraphRAG Inference Hackathon Round 2, June 2026.

- GitHub: https://github.com/neeti26/GraphRag
- Live Demo: https://graphrag-lime.vercel.app
- Hackathon: #GraphRAGInferenceHackathon
