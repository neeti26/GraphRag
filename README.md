# FraudGraph — Synthetic Identity Detection via TigerGraph GraphRAG

> **TigerGraph Hackathon 2025** · Proving graphs catch fraud that LLMs miss.

## The Core Idea

A baseline LLM reads 50 raw login logs and says Account #8821 is **SAFE**.  
TigerGraph runs a 3-hop traversal and finds:

```
Account #8821 → USED_DEVICE → XYZ-999 → USED_DEVICE ← Account #1002 (FLAGGED)
Account #8821 → LOGGED_FROM_IP → 192.168.1.1 (BLACKLISTED — 12 chargebacks)
```

GraphRAG correctly flags it as **SUSPICIOUS** with risk score 9.2/10.  
This is the hallucination test — and it's the centerpiece of the demo.

## Benchmark Results

| Metric | Baseline (LLM Only) | GraphRAG (TigerGraph + LLM) |
|--------|--------------------|-----------------------------|
| Detection Accuracy | **50%** (missed 2/4) | **100%** (caught all) |
| Avg Token Usage | ~3,838 tokens | ~210 tokens |
| Token Savings | — | **94.5%** |
| Avg Latency | ~2,050ms | ~600ms |
| Hallucinations | 2 (said SAFE for fraud) | **0** |
| Cost per Query | $0.000576 | $0.000032 |

## Architecture (AI Factory Model)

```
┌─────────────────────────────────────────────────────────┐
│                   Account ID Input                       │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
    ┌──────────▼──────────┐  ┌────────▼────────────────┐
    │  Pipeline 1         │  │  Pipeline 2              │
    │  Baseline LLM       │  │  GraphRAG                │
    │  (50 raw log lines) │  │  (3-hop graph context)   │
    └──────────┬──────────┘  └────────┬────────────────┘
               │                      │
               │              ┌───────▼──────────────┐
               │              │  Graph Layer          │
               │              │  TigerGraph           │
               │              │  WCC · PageRank · BFS │
               │              └───────┬──────────────┘
               │                      │
    ┌──────────▼──────────────────────▼────────────────┐
    │              LLM Layer (Groq / OpenAI)            │
    └──────────────────────┬────────────────────────────┘
                           │
    ┌──────────────────────▼────────────────────────────┐
    │           Evaluation Layer                         │
    │  Accuracy · Tokens · Latency · Hallucinations      │
    └──────────────────────┬────────────────────────────┘
                           │
    ┌──────────────────────▼────────────────────────────┐
    │           Vite + React Dashboard                   │
    │  Scoreboard · Hallucination Test · Fraud Ring Graph│
    └───────────────────────────────────────────────────┘
```

## GSQL Algorithms Used

- **Weakly Connected Components (WCC)** — identifies fraud ring clusters
- **PageRank** — ranks most influential nodes in the fraud network
- **Shortest Path** — finds connection between any two accounts
- **3-hop BFS** — `multi_hop_fraud_context` query traverses up to 3 hops

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure environment
cp .env.example .env
# Fill in TigerGraph + Groq API keys

# 3. Set up TigerGraph (free tier at tgcloud.io)
# Run graph_layer/schema.gsql in TigerGraph Studio
# Install queries from graph_layer/queries.gsql

# 4. Seed the fraud ring data
python -c "from graph_layer.seed_data import seed; from graph_layer.tigergraph_client import TigerGraphClient; seed(TigerGraphClient())"

# 5. Run demo benchmark (no API keys needed)
python demo_mode.py

# 6. Start API server
python api_server.py

# 7. Start dashboard
cd dashboard && npm install && npm run dev
# Open http://localhost:5174
```

## Project Structure

```
fraudgraph/
├── graph_layer/          # TigerGraph client, schema, GSQL queries, seed data
├── inference_layer/      # Baseline pipeline + GraphRAG pipeline
├── llm_layer/            # Unified LLM client (Groq + OpenAI) with metrics
├── evaluation_layer/     # Benchmark runner, metrics, accuracy scoring
├── data/                 # Raw login logs (what baseline drowns in)
├── dashboard/            # Vite + React dashboard
├── api_server.py         # FastAPI backend
├── demo_mode.py          # Run without API keys
└── config.py             # Environment configuration
```
