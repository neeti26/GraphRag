"""Central configuration — reads from .env file."""
import os
from dotenv import load_dotenv

load_dotenv()

# ── TigerGraph ────────────────────────────────────────────────
TG_HOST       = os.getenv("TG_HOST", "https://your-instance.i.tgcloud.io")
TG_USERNAME   = os.getenv("TG_USERNAME", "tigergraph")
TG_PASSWORD   = os.getenv("TG_PASSWORD", "")
TG_GRAPH_NAME = os.getenv("TG_GRAPH_NAME", "FraudGraph")
TG_SECRET     = os.getenv("TG_SECRET", "")

# ── Gemini (Round 2 primary LLM) ─────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

# ── Fallback LLMs ─────────────────────────────────────────────
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GROQ_API_KEY   = os.getenv("GROQ_API_KEY", "")

# ── Dataset ───────────────────────────────────────────────────
DATASET_PATH  = os.getenv("DATASET_PATH", "data/transactions.csv")
TOKEN_TARGET  = int(os.getenv("TOKEN_TARGET", "100000000"))  # 100M

# ── Pricing (Gemini 1.5 Flash) ────────────────────────────────
# $0.075 per 1M input tokens, $0.30 per 1M output tokens
COST_PER_INPUT_TOKEN  = 0.075 / 1_000_000
COST_PER_OUTPUT_TOKEN = 0.30  / 1_000_000
