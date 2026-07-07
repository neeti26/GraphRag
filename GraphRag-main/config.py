import os
from dotenv import load_dotenv
load_dotenv()

# ── TigerGraph ────────────────────────────────────────────────
TG_HOST       = os.getenv("TG_HOST",       "https://your-instance.i.tgcloud.io")
TG_USERNAME   = os.getenv("TG_USERNAME",   "tigergraph")
TG_PASSWORD   = os.getenv("TG_PASSWORD",   "your_password")
TG_GRAPH_NAME = os.getenv("TG_GRAPH_NAME", "FraudGraph")
TG_SECRET     = os.getenv("TG_SECRET",     "")

# ── Gemini ────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL   = os.getenv("GEMINI_MODEL",   "gemini-2.0-flash")
