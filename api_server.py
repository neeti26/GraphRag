"""
FastAPI backend for the FraudGraph dashboard.
Run: python api_server.py
"""
import json, os, sys
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="FraudGraph API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5174","http://localhost:4173"], allow_methods=["*"], allow_headers=["*"])

@app.get("/api/results")
def get_results():
    p = Path("results.json")
    if not p.exists():
        raise HTTPException(404, "Run demo_mode.py first to generate results.json")
    return json.loads(p.read_text())

class QueryRequest(BaseModel):
    account_id: str

@app.post("/api/query")
def run_query(req: QueryRequest):
    try:
        from llm_layer.llm_client import LLMClient
        from graph_layer.tigergraph_client import TigerGraphClient
        from inference_layer.baseline_pipeline import BaselinePipeline
        from inference_layer.graphrag_pipeline import GraphRAGPipeline
        from evaluation_layer.metrics import build_record, GROUND_TRUTH
        from evaluation_layer.benchmark_runner import GROUND_TRUTH

        llm = LLMClient(); tg = TigerGraphClient()
        b = BaselinePipeline(llm).run(req.account_id)
        g = GraphRAGPipeline(llm, tg).run(req.account_id)
        gt = GROUND_TRUTH.get(req.account_id, "UNKNOWN")
        record = build_record(req.account_id, gt, b, g)
        return record.to_dict()
    except Exception as e:
        raise HTTPException(500, str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
