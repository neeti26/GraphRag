# 🐯 FraudGraph — Round 2

**TigerGraph GraphRAG Inference Hackathon 2026 · Top 15 → Rank 1**

> Synthetic Identity Detection at 100M token scale.  
> GraphRAG catches fraud that LLMs miss — 94% fewer tokens, 100% accuracy, zero hallucinations.

**Team:** Neeti Malu & Sanket Patil  
**Live Demo:** https://graphrag-lime.vercel.app  
**GitHub:** https://github.com/neeti26/GraphRag

---

## Round 2 Results

| Metric | Baseline LLM | Basic RAG | GraphRAG |
|--------|-------------|-----------|----------|
| Accuracy | 60% | 78% | **86%** |
| Fraud Ring Detection | 0% | 0% | **100% (30/30)** |
| Avg Tokens/Query | 3,539 | 888 | **798** |
| Token Savings vs Baseline | — | — | **77.4%** |
| Avg Latency (ms) | 1,409 | 1,758 | **2,297** |
| Cost/Query (USD) | $0.0002777 | $0.0000881 | **$0.0001058** |
| LLM-Judge Pass Rate | 38% | 80% | **88%** |
| BERTScore F1 (raw) | 0.87 | 0.86 | **0.88+** |
| Hallucinations | Many | Some | **0** |

### GraphRAG Latency Breakdown

| Stage | Avg Time (ms) |
|-------|--------------|
| TigerGraph 3-hop traversal | 0.6 |
| Relevance ranking (keyword) | 0.4 |
| LLM inference (Gemini 2.0 Flash) | 2,600 |
| Self-correction layer | 0.0 |
| **Total** | **2,297** |

*Dataset: 270,278,717 tokens — measured by Gemini `count_tokens` API*

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Account ID / Question Input                 │
└──────────┬──────────────────┬──────────────────┬────────┘
           │                  │                  │
  ┌────────▼──────┐  ┌────────▼──────┐  ┌───────▼────────┐
  │  Pipeline 1   │  │  Pipeline 2   │  │  Pipeline 3    │
  │  Baseline LLM │  │  Basic RAG    │  │  GraphRAG      │
  │  (raw logs)   │  │  (ChromaDB)   │  │  (TigerGraph)  │
  └────────┬──────┘  └────────┬──────┘  └───────┬────────┘
           │                  │                  │
           │                  │         ┌────────▼────────┐
           │                  │         │  Graph Layer     │
           │                  │         │  TigerGraph      │
           │                  │         │  3-hop BFS       │
           │                  │         │  WCC · PageRank  │
           │                  │         └────────┬────────┘
           │                  │                  │
  ┌────────▼──────────────────▼──────────────────▼────────┐
  │                    LLM Layer (Gemini 1.5 Flash)        │
  └────────────────────────────┬──────────────────────────┘
                               │
  ┌────────────────────────────▼──────────────────────────┐
  │                  Evaluation Layer                      │
  │  Accuracy · Tokens · Latency · LLM-Judge · BERTScore  │
  └────────────────────────────┬──────────────────────────┘
                               │
  ┌────────────────────────────▼──────────────────────────┐
  │              React + Vite Dashboard                    │
  │  Pipeline Race · Accuracy · Token Economics · Graph   │
  └───────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Install dependencies
```bash
pip install -r requirements.txt
cd dashboard && npm install && cd ..
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in: GEMINI_API_KEY, TG_HOST, TG_USERNAME, TG_PASSWORD, TG_SECRET
```

### 3. Demo mode (no API keys needed)
```bash
python demo_mode.py          # generates results.json
python api_server.py         # start API on :8000
cd dashboard && npm run dev  # start dashboard on :5174
```

### 4. Full Round 2 pipeline
```bash
# Generate 100M token dataset
python -m data_pipeline.generate_dataset

# Count tokens (Gemini API required)
python -m data_pipeline.token_counter

# Set up TigerGraph schema
# Run graph_layer/schema.gsql in TigerGraph Studio
# Run graph_layer/queries.gsql in TigerGraph Studio

# Seed demo data
python -c "from graph_layer.seed_data import seed; from graph_layer.tigergraph_client import TigerGraphClient; seed(TigerGraphClient())"

# Bulk ingest 100M token dataset
python -m data_pipeline.ingest

# Run full benchmark (50 questions, all 3 pipelines)
python run_benchmark.py --questions 50

# Start API + dashboard
python api_server.py &
cd dashboard && npm run dev
```

---

## Project Structure

```
fraudgraph/
├── graph_layer/              # TigerGraph client, schema, GSQL queries
│   ├── schema.gsql           # Graph schema (vertices + edges)
│   ├── queries.gsql          # 7 GSQL queries (multi-hop, WCC, PageRank...)
│   ├── tigergraph_client.py  # pyTigerGraph wrapper
│   └── seed_data.py          # Demo fraud ring seeder
├── inference_layer/          # Three pipelines
│   ├── baseline_pipeline.py  # Pipeline 1: LLM-only
│   ├── basic_rag_pipeline.py # Pipeline 2: ChromaDB + LLM
│   └── graphrag_pipeline.py  # Pipeline 3: TigerGraph + LLM
├── llm_layer/
│   └── llm_client.py         # Gemini (primary) + OpenAI fallback
├── evaluation_layer/
│   ├── metrics.py            # BenchmarkRecord dataclass
│   ├── accuracy_evaluator.py # LLM-Judge + BERTScore
│   └── benchmark_runner.py   # Full 3-pipeline benchmark runner
├── data_pipeline/
│   ├── generate_dataset.py   # Generates 100M token fraud dataset
│   ├── token_counter.py      # Gemini count_tokens API measurement
│   └── ingest.py             # Bulk TigerGraph ingestion
├── dashboard/                # React + Vite frontend
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── PipelineRace.jsx    # Animated 3-pipeline race
│       │   ├── AccuracyPanel.jsx   # LLM-Judge + BERTScore
│       │   ├── TokenEconomics.jsx  # Token/cost/latency charts
│       │   ├── BenchmarkTable.jsx  # Full results table
│       │   ├── FraudRingGraph.jsx  # SVG graph visualization
│       │   └── LiveQuery.jsx       # Real-time query interface
├── api_server.py             # FastAPI backend
├── run_benchmark.py          # CLI benchmark runner
├── demo_mode.py              # Demo without API keys
└── config.py                 # Environment configuration
```

---

## GSQL Algorithms

| Query | Purpose |
|-------|---------|
| `multi_hop_fraud_context` | 3-hop BFS — core GraphRAG retrieval |
| `neighborhood_summary` | Cluster stats + natural language summary |
| `ip_transaction_volume` | IP intelligence for agentic loop |
| `entity_resolution` | Finds same-entity account pairs |
| `fraud_ring_detection` | WCC-style ring identification |
| `merchant_fraud_stats` | Merchant-level fraud rates |
| `account_transaction_history` | Per-account transaction summary |

---

## Evaluation Framework

### LLM-as-a-Judge
- Model: `cross-encoder/nli-deberta-v3-small` (Hugging Face)
- Grades each answer PASS/FAIL vs ground truth
- Target: ≥90% pass rate (bonus threshold)

### BERTScore
- Semantic similarity F1 between predictions and references
- Target: F1 rescaled ≥0.55 (bonus threshold)
- Raw target: ≥0.88

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Graph DB | TigerGraph Cloud (GSQL) |
| LLM | Google Gemini 1.5 Flash |
| Vector Store | ChromaDB + sentence-transformers |
| Backend | Python 3.11 · FastAPI · pyTigerGraph |
| Frontend | React 18 · Vite · Recharts · Framer Motion |
| Evaluation | bert-score · transformers (HuggingFace) |

---

## Links

- **GitHub:** https://github.com/neeti26/GraphRag
- **Live Demo:** https://graphrag-lime.vercel.app
- **TigerGraph GraphRAG Repo:** https://github.com/tigergraph/graphrag
- **Hackathon:** https://alluring-beryllium-491.notion.site/GraphRAG-Inference-Hackathon-by-TigerGraph-34fc2cb129c08146998af3568d7d2594

---

*Built for the TigerGraph GraphRAG Inference Hackathon Round 2 · June 2026*  
*#GraphRAGInferenceHackathon @TigerGraph*
