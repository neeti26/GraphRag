"""
FastAPI backend for the FraudGraph Round 2 dashboard.

Endpoints:
  GET  /api/results          — full benchmark results from results.json
  GET  /api/summary          — summary stats only
  POST /api/query            — run live 3-pipeline query on an account
  POST /api/query/stream     — streaming version (SSE)
  GET  /api/graph/stats      — TigerGraph graph statistics
  GET  /api/token-count      — dataset token count report
  GET  /health               — health check

Run: python api_server.py
"""
import json
import asyncio
import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="FraudGraph Round 2 API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:4173",
        "https://graphrag-lime.vercel.app",
        "*",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ────────────────────────────────────────────────────
class QueryRequest(BaseModel):
    account_id: str
    run_all_pipelines: bool = True


# ── Helpers ───────────────────────────────────────────────────
def load_results() -> dict:
    p = Path("results.json")
    if not p.exists():
        raise HTTPException(
            404,
            "results.json not found. Run: python demo_mode.py  (or python api_server.py after full benchmark)"
        )
    return json.loads(p.read_text(encoding="utf-8"))


def get_pipelines():
    """Lazy-load all three pipelines."""
    from llm_layer.llm_client import get_llm_client
    from graph_layer.tigergraph_client import TigerGraphClient
    from inference_layer.baseline_pipeline import BaselinePipeline
    from inference_layer.basic_rag_pipeline import BasicRAGPipeline
    from inference_layer.graphrag_pipeline import GraphRAGPipeline

    llm = get_llm_client()
    tg  = TigerGraphClient()
    return (
        BaselinePipeline(llm),
        BasicRAGPipeline(llm),
        GraphRAGPipeline(llm, tg),
    )


# ── Routes ────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0", "round": 2}


@app.get("/api/results")
def get_results():
    return load_results()


@app.get("/api/summary")
def get_summary():
    data = load_results()
    return data.get("summary", {})


@app.get("/api/token-count")
def get_token_count():
    p = Path("data/token_count_report.json")
    if not p.exists():
        return {"message": "Run: python -m data_pipeline.token_counter to generate report"}
    return json.loads(p.read_text(encoding="utf-8"))


@app.get("/api/graph/stats")
def get_graph_stats():
    try:
        from graph_layer.tigergraph_client import TigerGraphClient
        tg = TigerGraphClient()
        return tg.get_graph_stats()
    except Exception as e:
        return {"error": str(e), "message": "TigerGraph not connected"}


@app.post("/api/query")
def run_query(req: QueryRequest):
    """Run all 3 pipelines on a single account and return comparison."""
    try:
        baseline, basic_rag, graphrag = get_pipelines()

        b  = baseline.run(req.account_id)
        br = basic_rag.run(req.account_id)
        g  = graphrag.run(req.account_id)

        def savings(base, rag):
            return round((base - rag) / base * 100, 1) if base else 0.0

        return {
            "account_id": req.account_id,
            "pipeline_1_baseline": {
                "verdict": b.verdict,
                "reasoning": b.reasoning,
                "tokens": b.llm_response.total_tokens,
                "latency_ms": b.llm_response.latency_ms,
                "cost_usd": b.llm_response.cost_usd,
            },
            "pipeline_2_basic_rag": {
                "verdict": br.verdict,
                "reasoning": br.reasoning,
                "tokens": br.llm_response.total_tokens,
                "latency_ms": br.llm_response.latency_ms,
                "cost_usd": br.llm_response.cost_usd,
            },
            "pipeline_3_graphrag": {
                "verdict": g.verdict,
                "risk_score": g.risk_score,
                "reasoning": g.reasoning,
                "tokens": g.llm_response.total_tokens,
                "latency_ms": g.llm_response.latency_ms,
                "cost_usd": g.llm_response.cost_usd,
                "graph_evidence": g.graph_evidence,
                "flagged_connections": g.flagged_connections,
                "blacklisted_ips": g.blacklisted_ips,
                "shared_devices": g.shared_devices,
                "nodes_visited": g.nodes_visited,
                "neighborhood_summary": g.neighborhood_summary,
                "agentic_loop_triggered": g.agentic_loop_triggered,
                "agentic_refinement": g.agentic_refinement,
            },
            "comparison": {
                "token_savings_vs_basic_rag_pct": savings(br.llm_response.total_tokens, g.llm_response.total_tokens),
                "latency_improvement_pct": savings(br.llm_response.latency_ms, g.llm_response.latency_ms),
                "cost_savings_pct": savings(br.llm_response.cost_usd, g.llm_response.cost_usd),
            },
        }
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/query/stream")
async def run_query_stream(req: QueryRequest):
    """Server-Sent Events stream — sends each pipeline result as it completes."""
    async def event_generator():
        try:
            baseline, basic_rag, graphrag = get_pipelines()

            # Pipeline 1
            yield f"data: {json.dumps({'pipeline': 1, 'status': 'running'})}\n\n"
            b = baseline.run(req.account_id)
            yield f"data: {json.dumps({'pipeline': 1, 'status': 'done', 'verdict': b.verdict, 'tokens': b.llm_response.total_tokens, 'latency_ms': b.llm_response.latency_ms})}\n\n"

            # Pipeline 2
            yield f"data: {json.dumps({'pipeline': 2, 'status': 'running'})}\n\n"
            br = basic_rag.run(req.account_id)
            yield f"data: {json.dumps({'pipeline': 2, 'status': 'done', 'verdict': br.verdict, 'tokens': br.llm_response.total_tokens, 'latency_ms': br.llm_response.latency_ms})}\n\n"

            # Pipeline 3
            yield f"data: {json.dumps({'pipeline': 3, 'status': 'running'})}\n\n"
            g = graphrag.run(req.account_id)
            yield f"data: {json.dumps({'pipeline': 3, 'status': 'done', 'verdict': g.verdict, 'risk_score': g.risk_score, 'tokens': g.llm_response.total_tokens, 'latency_ms': g.llm_response.latency_ms, 'graph_evidence': g.graph_evidence})}\n\n"

            yield f"data: {json.dumps({'status': 'complete'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
