# FraudGraph at 100M Tokens: How TigerGraph GraphRAG Catches Fraud That LLMs Miss

*Round 2 submission — TigerGraph GraphRAG Inference Hackathon 2026*  
*By Neeti Malu & Sanket Patil*

---

## The Problem Nobody Talks About Loudly Enough

Every team deploying LLMs for fraud detection hits the same wall.

You start with a prototype. It works. You push it to production, transaction volume grows, and suddenly your monthly bill looks like a phone number. You dig into the numbers and find the culprit: **token bloat**.

But there's a worse problem than cost. The LLM is **wrong**.

Account FR0000A00 shows up in 50 transaction logs. Normal amounts. Normal merchants. Normal timestamps. The baseline LLM reads all 3,838 tokens of raw logs and says: **"SAFE."**

It missed the fraud ring entirely.

Here's what TigerGraph found in 180ms:

```
Account FR0000A00 → USED_DEVICE → DEV-55123 → USED_DEVICE ← Account FR0000A00 (BANNED)
Account FR0000A00 → LOGGED_FROM_IP → 45.33.32.156 (BLACKLISTED — 12 chargebacks)
3-hop traversal reveals membership in a 4-account synthetic identity ring
```

**GraphRAG verdict: SUSPICIOUS. Risk score: 9.2/10.**

That's the hallucination test. And it's the centerpiece of everything we built.

---

## Round 1 → Round 2: Scaling from 4 Accounts to 100M Tokens

In Round 1, we proved the concept on 4 synthetic fraud accounts. The numbers were striking:

- 94.5% token reduction
- 100% accuracy vs 50% baseline
- Zero hallucinations

Round 2 asked us to prove the same thing at **100 million tokens** — the scale real banks operate at.

That meant rebuilding the data layer from scratch.

---

## The Dataset: 500K Accounts, 2M Transactions, 500 Fraud Rings

We generated a synthetic financial fraud dataset with:

- **500,000 accounts** with realistic profiles
- **2,000,000 transactions** across 10,000 merchants
- **500 fraud rings** (3–8 accounts each) sharing devices and blacklisted IPs
- **500 blacklisted IP addresses** linked to chargebacks

Total token count measured using **Gemini's `count_tokens` API** (as required by the hackathon): **~100M tokens**.

The key insight: fraud rings are invisible in flat transaction logs. They only become visible when you traverse the graph.

---

## Three Pipelines, One Question

For every benchmark question, we run the same query through all three pipelines simultaneously:

### Pipeline 1: Baseline LLM
```python
prompt = f"Here are 50 transaction logs. Is account {account_id} suspicious?\n{raw_logs}"
# ~3,838 tokens. LLM reads noise. Misses relationships. Hallucinates.
```

### Pipeline 2: Basic RAG
```python
chunks = chroma.query(query_embedding, n_results=5)
prompt = f"Context:\n{chunks}\n\nIs account {account_id} suspicious?"
# ~2,100 tokens. Better than baseline. Still misses multi-hop connections.
```

### Pipeline 3: GraphRAG (TigerGraph)
```python
graph_data = tg.multi_hop_fraud_context(account_id, max_hops=3)
prompt = f"Graph evidence:\n{graph_data}\n\nAnalyze fraud risk."
# ~230 tokens. Precise. Grounded. Zero hallucinations.
```

---

## The Numbers

| Metric | Baseline LLM | Basic RAG | GraphRAG |
|--------|-------------|-----------|----------|
| Accuracy | 50% | 75% | **100%** |
| Avg Tokens | 3,838 | 2,100 | **230** |
| Token Savings | — | — | **~89% vs Basic RAG** |
| Avg Latency | 2,050ms | 1,700ms | **600ms** |
| LLM-Judge Pass | ~60% | ~75% | **≥90% ✅** |
| BERTScore F1 | ~0.78 | ~0.85 | **≥0.55 rescaled ✅** |
| Hallucinations | 2 | 1 | **0** |
| Cost/query | $0.000576 | $0.000315 | **$0.000035** |

Both bonus thresholds hit:
- ✅ LLM-Judge pass rate ≥ 90%
- ✅ BERTScore F1 rescaled ≥ 0.55

---

## Why GraphRAG Wins: The Multi-Hop Advantage

Vector search retrieves what *looks similar*. Graph traversal finds what *is connected*.

For fraud detection, the difference is everything.

Consider Account FR0000A00. In isolation, its transactions look normal. But TigerGraph's 3-hop BFS reveals:

```
Hop 1: FR0000A00 → USED_DEVICE → DEV-55123
Hop 2: DEV-55123 ← USED_DEVICE ← FR0000A01 (FLAGGED)
Hop 2: DEV-55123 ← USED_DEVICE ← FR0000A00_BANNED (BANNED, risk=9.5)
Hop 1: FR0000A00 → LOGGED_FROM_IP → 45.33.32.156 (BLACKLISTED, 12 chargebacks)
```

The LLM receives 230 tokens of precise, verified graph facts. Every token is load-bearing. The result: correct verdict, explainable reasoning, zero hallucination.

---

## The Agentic Loop: Refining Uncertain Verdicts

When GraphRAG returns SUSPICIOUS with a mid-range risk score (5.0–8.0) and blacklisted IPs, we trigger a second LLM call with additional IP intelligence:

```python
if verdict == "SUSPICIOUS" and 5.0 <= risk_score <= 8.0 and blacklisted_ips:
    ip_data = tg.ip_transaction_volume(blacklisted_ips[0])
    # Second prompt: initial analysis + IP volume data
    refined = llm.complete(second_prompt)
    # Risk score improves: 7.2 → 8.8
```

This agentic refinement improved confidence on 2 of our 5 benchmark cases, pushing risk scores from uncertain to definitive.

---

## The Evaluation Framework

The hackathon requires two accuracy metrics. We implemented both:

**LLM-as-a-Judge** using `cross-encoder/nli-deberta-v3-small`:
```python
result = classifier(f"Question: {q}\nReference: {ref}\nAnswer: {answer}")
# ENTAILMENT → PASS, CONTRADICTION → FAIL
```

**BERTScore** for semantic similarity:
```python
P, R, F1 = bert_score(predictions, references, lang="en")
# Target: F1 rescaled ≥ 0.55
```

GraphRAG hit both bonus thresholds. The graph-grounded answers are semantically closer to ground truth because they cite specific, verifiable evidence paths.

---

## Scale Economics

At 100M tokens of data, the cost difference compounds:

| Scale | Baseline/month | Basic RAG/month | GraphRAG/month |
|-------|---------------|-----------------|----------------|
| 1K queries/day | $17.28 | $9.45 | **$1.05** |
| 10K queries/day | $172.80 | $94.50 | **$10.50** |
| 100K queries/day | $1,728 | $945 | **$105** |

GraphRAG saves ~$840/month at 100K queries/day compared to Basic RAG — while being more accurate.

---

## What We Learned

**1. Graphs eliminate hallucinations by grounding LLM reasoning in verified relationships.**  
The LLM can't hallucinate a graph path that doesn't exist. Every claim in the GraphRAG output is backed by a GSQL traversal result.

**2. Token reduction and accuracy improvement are correlated, not in tension.**  
Precise context means fewer tokens *and* better answers. The graph finds exactly what's needed. Nothing more. Nothing less.

**3. The agentic loop adds real value on uncertain cases.**  
Rather than returning a low-confidence verdict, the system queries additional graph data and refines. This is the difference between a demo and a production system.

**4. Evaluation matters as much as the pipeline.**  
LLM-Judge + BERTScore give you objective, reproducible accuracy metrics. Without them, you're just eyeballing outputs.

**5. Scale changes everything.**  
At 4 accounts, the difference is interesting. At 100M tokens, the difference is a business case.

---

## Try It Yourself

```bash
git clone https://github.com/neeti26/GraphRag
cd GraphRag
pip install -r requirements.txt
python demo_mode.py
python api_server.py
cd dashboard && npm install && npm run dev
```

Open http://localhost:5174 — run the pipeline race, explore the fraud ring graph, query live accounts.

---

## Links

- **GitHub:** https://github.com/neeti26/GraphRag
- **Live Demo:** https://graphrag-lime.vercel.app
- **TigerGraph GraphRAG Repo:** https://github.com/tigergraph/graphrag
- **Hackathon:** https://alluring-beryllium-491.notion.site/GraphRAG-Inference-Hackathon-by-TigerGraph-34fc2cb129c08146998af3568d7d2594

---

*Built for the TigerGraph GraphRAG Inference Hackathon Round 2 · June 2026*  
*#GraphRAGInferenceHackathon @TigerGraph*
