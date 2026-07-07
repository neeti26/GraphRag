"""
FastAPI backend for the FraudGraph dashboard.

Endpoints
---------
  GET  /api/results          — returns results.json (last benchmark run)
  POST /api/query            — runs all 3 pipelines live for a given account_id
  POST /api/run-benchmark    — runs the full benchmark suite and saves results.json

Run: python api_server.py
"""
import json
import os
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="FraudGraph API — 3-Pipeline Benchmark")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── GET /api/results ──────────────────────────────────────────────────────────

@app.get("/api/results")
def get_results():
    p = Path("results.json")
    if not p.exists():
        raise HTTPException(404, "Run `python run_benchmark.py` first to generate results.json")
    return json.loads(p.read_text())


# ── POST /api/query ───────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    account_id: str


@app.post("/api/query")
def run_query(req: QueryRequest):
    """Runs all three pipelines live and returns the BenchmarkRecord."""
    try:
        from llm_layer.llm_client import LLMClient
        from graph_layer.tigergraph_client import TigerGraphClient
        from inference_layer.baseline_pipeline import BaselinePipeline
        from inference_layer.basic_rag_pipeline import BasicRAGPipeline
        from inference_layer.graphrag_pipeline import GraphRAGPipeline
        from evaluation_layer.benchmark_runner import GROUND_TRUTH
        from evaluation_layer.metrics import build_record
        from evaluation_layer.quality_scorer import score_answer, llm_judge, GOLD_ANSWERS

        llm = LLMClient()

        # Try live TigerGraph; fall back gracefully
        try:
            tg = TigerGraphClient()
        except Exception:
            tg = TigerGraphClient.__new__(TigerGraphClient)
            tg.conn = None

        baseline  = BaselinePipeline(llm)
        basic_rag = BasicRAGPipeline(llm)
        graphrag  = GraphRAGPipeline(llm, tg)

        b = baseline.run(req.account_id)
        r = basic_rag.run(req.account_id)
        g = graphrag.run(req.account_id)

        gt  = GROUND_TRUTH.get(req.account_id, "UNKNOWN")
        ref = GOLD_ANSWERS.get(req.account_id, gt)

        qs = {
            "baseline_bert":  score_answer(b.reasoning, ref),
            "basic_rag_bert": score_answer(r.reasoning, ref),
            "graphrag_bert":  score_answer(g.reasoning, ref),
        }
        bj = llm_judge(llm, req.account_id, b.reasoning, gt)
        rj = llm_judge(llm, req.account_id, r.reasoning, gt)
        gj = llm_judge(llm, req.account_id, g.reasoning, gt)
        qs.update({
            "baseline_judge": bj["avg_score"], "baseline_judge_detail": bj,
            "basic_rag_judge": rj["avg_score"], "basic_rag_judge_detail": rj,
            "graphrag_judge": gj["avg_score"], "graphrag_judge_detail": gj,
        })

        record = build_record(req.account_id, gt, b, r, g, qs)
        return record.to_dict()
    except Exception as e:
        raise HTTPException(500, str(e))


# ── POST /api/run-benchmark ───────────────────────────────────────────────────

@app.post("/api/run-benchmark")
def trigger_benchmark(background_tasks: BackgroundTasks):
    """Triggers the full benchmark in the background and returns immediately."""
    def _run():
        import subprocess
        subprocess.run([sys.executable, "run_benchmark.py"], cwd=os.path.dirname(__file__))
    background_tasks.add_task(_run)
    return {"status": "started", "message": "Benchmark running in background. Poll /api/results."}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
