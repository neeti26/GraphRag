import os
from dotenv import load_dotenv
load_dotenv()

TG_HOST       = os.getenv("TG_HOST",       "https://your-instance.i.tgcloud.io")
TG_USERNAME   = os.getenv("TG_USERNAME",   "tigergraph")
TG_PASSWORD   = os.getenv("TG_PASSWORD",   "your_password")
TG_GRAPH_NAME = os.getenv("TG_GRAPH_NAME", "FraudGraph")
TG_SECRET     = os.getenv("TG_SECRET",     "")

LLM_PROVIDER  = os.getenv("LLM_PROVIDER",  "groq")   # groq | openai | gemini
OPENAI_API_KEY= os.getenv("OPENAI_API_KEY","")
GROQ_API_KEY  = os.getenv("GROQ_API_KEY",  "")
OPENAI_MODEL  = os.getenv("OPENAI_MODEL",  "gpt-4o-mini")
GROQ_MODEL    = os.getenv("GROQ_MODEL",    "llama3-8b-8192")
GEMINI_API_KEY= os.getenv("GEMINI_API_KEY","")
GEMINI_MODEL  = os.getenv("GEMINI_MODEL",  "gemini-2.0-flash")
