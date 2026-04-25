"""
LLM Layer — unified client for Groq / OpenAI.
Tracks tokens, latency, and cost on every call.
"""
import time
from dataclasses import dataclass
from config import LLM_PROVIDER, OPENAI_API_KEY, GROQ_API_KEY, OPENAI_MODEL, GROQ_MODEL

COST_PER_1K = {
    "gpt-4o-mini":      {"in": 0.00015, "out": 0.0006},
    "gpt-4o":           {"in": 0.005,   "out": 0.015},
    "llama3-8b-8192":   {"in": 0.0,     "out": 0.0},
    "llama3-70b-8192":  {"in": 0.00059, "out": 0.00079},
    "mixtral-8x7b-32768":{"in": 0.00027,"out": 0.00027},
}


@dataclass
class LLMResponse:
    content: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: float
    model: str
    cost_usd: float = 0.0


def _calc_cost(model, prompt_tokens, completion_tokens):
    r = COST_PER_1K.get(model, {"in": 0.001, "out": 0.002})
    return (prompt_tokens / 1000 * r["in"]) + (completion_tokens / 1000 * r["out"])


class LLMClient:
    def __init__(self):
        self.provider = LLM_PROVIDER
        self.model = GROQ_MODEL if self.provider == "groq" else OPENAI_MODEL
        if self.provider == "groq":
            from groq import Groq
            self._client = Groq(api_key=GROQ_API_KEY)
        else:
            from openai import OpenAI
            self._client = OpenAI(api_key=OPENAI_API_KEY)

    def complete(self, prompt: str, system: str = "You are a helpful assistant.",
                 max_tokens: int = 1024, temperature: float = 0.1) -> str:
        return self.complete_with_metrics(prompt, system, max_tokens, temperature).content

    def complete_with_metrics(self, prompt: str, system: str = "You are a helpful assistant.",
                               max_tokens: int = 1024, temperature: float = 0.1) -> LLMResponse:
        messages = [{"role": "system", "content": system}, {"role": "user", "content": prompt}]
        start = time.time()
        resp = self._client.chat.completions.create(
            model=self.model, messages=messages,
            max_tokens=max_tokens, temperature=temperature,
        )
        latency_ms = (time.time() - start) * 1000
        u = resp.usage
        return LLMResponse(
            content=resp.choices[0].message.content,
            prompt_tokens=u.prompt_tokens,
            completion_tokens=u.completion_tokens,
            total_tokens=u.total_tokens,
            latency_ms=round(latency_ms, 2),
            model=self.model,
            cost_usd=round(_calc_cost(self.model, u.prompt_tokens, u.completion_tokens), 7),
        )
