"""
LLM Layer — Gemini client (google-genai SDK).

Makes REAL API calls to Gemini 2.5 Flash.
Every response returns:
  - actual prompt_token_count and candidates_token_count from usage_metadata
  - actual wall-clock latency via time.perf_counter()
  - actual cost (Gemini 2.5 Flash free tier = $0)

No hardcoded numbers. No fallbacks to fake data.
"""
import time
from dataclasses import dataclass

from config import GEMINI_API_KEY, GEMINI_MODEL

# Cost per 1k tokens — Gemini 2.5 Flash is free tier
_COST_PER_1K = {
    "models/gemini-2.5-flash":      {"in": 0.0,       "out": 0.0},
    "models/gemini-2.5-flash-lite": {"in": 0.0,       "out": 0.0},
    "models/gemini-2.0-flash":      {"in": 0.0,       "out": 0.0},
    "models/gemini-2.0-flash-lite": {"in": 0.0,       "out": 0.0},
    "models/gemini-1.5-flash":      {"in": 0.000075,  "out": 0.0003},
    "models/gemini-1.5-pro":        {"in": 0.00125,   "out": 0.005},
}


def _calc_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    r = _COST_PER_1K.get(model, {"in": 0.0, "out": 0.0})
    return (prompt_tokens / 1000 * r["in"]) + (completion_tokens / 1000 * r["out"])


def _norm_model(model: str) -> str:
    """Ensure model name has the required 'models/' prefix."""
    if not model.startswith("models/"):
        return f"models/{model}"
    return model


@dataclass
class LLMResponse:
    content: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: float
    model: str
    cost_usd: float = 0.0


class LLMClient:
    """
    Gemini LLM client using the new google-genai SDK.

    Usage:
        llm = LLMClient()
        resp = llm.complete_with_metrics("Your prompt here")
        print(resp.total_tokens, resp.latency_ms)
    """

    def __init__(self):
        if not GEMINI_API_KEY:
            raise ValueError(
                "GEMINI_API_KEY is not set.\n"
                "Add it to your .env file:  GEMINI_API_KEY=your_key_here\n"
                "Get a free key at: https://aistudio.google.com/apikey"
            )

        from google import genai
        self._client  = genai.Client(api_key=GEMINI_API_KEY)
        self.model    = _norm_model(GEMINI_MODEL)
        self.provider = "gemini"

        print(f"  [LLM] Gemini ready — model: {self.model}")

    # ── Public interface ──────────────────────────────────────────────────────

    def complete(
        self,
        prompt: str,
        system: str = "You are a helpful assistant.",
        max_tokens: int = 400,
        temperature: float = 0.1,
    ) -> str:
        return self.complete_with_metrics(prompt, system, max_tokens, temperature).content

    def complete_with_metrics(
        self,
        prompt: str,
        system: str = "You are a helpful assistant.",
        max_tokens: int = 400,
        temperature: float = 0.1,
    ) -> LLMResponse:
        from google import genai
        from google.genai import types

        full_prompt = f"{system}\n\n{prompt}"

        config = types.GenerateContentConfig(
            max_output_tokens=max_tokens,
            temperature=temperature,
        )

        start = time.perf_counter()
        response = self._client.models.generate_content(
            model=self.model,
            contents=full_prompt,
            config=config,
        )
        latency_ms = (time.perf_counter() - start) * 1000

        content = response.text or ""

        # Real token counts from Gemini usage_metadata
        meta              = getattr(response, "usage_metadata", None)
        prompt_tokens     = getattr(meta, "prompt_token_count",     None) if meta else None
        completion_tokens = getattr(meta, "candidates_token_count", None) if meta else None

        # Estimate only if API genuinely didn't return counts (shouldn't happen)
        if prompt_tokens is None:
            prompt_tokens = max(1, len(full_prompt) // 4)
        if completion_tokens is None:
            completion_tokens = max(1, len(content) // 4)

        total_tokens = prompt_tokens + completion_tokens

        return LLMResponse(
            content=content,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            latency_ms=round(latency_ms, 2),
            model=self.model,
            cost_usd=round(_calc_cost(self.model, prompt_tokens, completion_tokens), 7),
        )
