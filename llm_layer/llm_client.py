"""
LLM Layer — unified client for Groq / OpenAI / Gemini.
Tracks real token counts, latency, and cost on every call.
"""
import time
from dataclasses import dataclass
from config import LLM_PROVIDER, OPENAI_API_KEY, GROQ_API_KEY, OPENAI_MODEL, GROQ_MODEL

# Cost per 1k tokens (input, output) in USD
COST_PER_1K = {
    "gpt-4o-mini":            {"in": 0.00015,  "out": 0.0006},
    "gpt-4o":                 {"in": 0.005,    "out": 0.015},
    "llama3-8b-8192":         {"in": 0.0,      "out": 0.0},
    "llama3-70b-8192":        {"in": 0.00059,  "out": 0.00079},
    "mixtral-8x7b-32768":     {"in": 0.00027,  "out": 0.00027},
    "gemini-1.5-flash":       {"in": 0.000075, "out": 0.0003},
    "gemini-1.5-pro":         {"in": 0.00125,  "out": 0.005},
    "gemini-2.0-flash":       {"in": 0.0,      "out": 0.0},   # free tier
    "gemini-2.0-flash-lite":  {"in": 0.0,      "out": 0.0},
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


def _calc_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    r = COST_PER_1K.get(model, {"in": 0.001, "out": 0.002})
    return (prompt_tokens / 1000 * r["in"]) + (completion_tokens / 1000 * r["out"])


class LLMClient:
    """
    Unified LLM client supporting Groq, OpenAI, and Gemini.

    Set LLM_PROVIDER in .env to one of: groq | openai | gemini
    For Gemini, also set GEMINI_API_KEY and GEMINI_MODEL.
    """

    def __init__(self):
        self.provider = LLM_PROVIDER
        self._init_client()

    def _init_client(self):
        import os
        if self.provider == "groq":
            from groq import Groq
            self.model = GROQ_MODEL
            self._client = Groq(api_key=GROQ_API_KEY)

        elif self.provider == "gemini":
            import google.generativeai as genai  # type: ignore
            api_key = os.getenv("GEMINI_API_KEY", "")
            genai.configure(api_key=api_key)
            self.model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
            self._gemini_model = genai.GenerativeModel(self.model)
            self._client = None  # Gemini uses its own API style

        else:  # openai (default)
            from openai import OpenAI
            self.model = OPENAI_MODEL
            self._client = OpenAI(api_key=OPENAI_API_KEY)

    # ── public interface ──────────────────────────────────────────────────────

    def complete(self, prompt: str, system: str = "You are a helpful assistant.",
                 max_tokens: int = 1024, temperature: float = 0.1) -> str:
        return self.complete_with_metrics(prompt, system, max_tokens, temperature).content

    def complete_with_metrics(self, prompt: str,
                               system: str = "You are a helpful assistant.",
                               max_tokens: int = 1024,
                               temperature: float = 0.1) -> LLMResponse:
        if self.provider == "gemini":
            return self._complete_gemini(prompt, system, max_tokens, temperature)
        return self._complete_openai_style(prompt, system, max_tokens, temperature)

    # ── Groq / OpenAI ─────────────────────────────────────────────────────────

    def _complete_openai_style(self, prompt, system, max_tokens, temperature) -> LLMResponse:
        messages = [
            {"role": "system", "content": system},
            {"role": "user",   "content": prompt},
        ]
        start = time.time()
        resp = self._client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
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

    # ── Gemini ────────────────────────────────────────────────────────────────

    def _complete_gemini(self, prompt, system, max_tokens, temperature) -> LLMResponse:
        import google.generativeai as genai  # type: ignore

        full_prompt = f"{system}\n\n{prompt}"
        gen_config = genai.types.GenerationConfig(
            max_output_tokens=max_tokens,
            temperature=temperature,
        )
        start = time.time()
        response = self._gemini_model.generate_content(full_prompt, generation_config=gen_config)
        latency_ms = (time.time() - start) * 1000

        content = response.text if hasattr(response, "text") else str(response)

        # Gemini returns token counts in usage_metadata
        meta = getattr(response, "usage_metadata", None)
        prompt_tokens     = getattr(meta, "prompt_token_count",     0) if meta else _estimate_tokens(full_prompt)
        completion_tokens = getattr(meta, "candidates_token_count", 0) if meta else _estimate_tokens(content)
        total_tokens      = prompt_tokens + completion_tokens

        return LLMResponse(
            content=content,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            latency_ms=round(latency_ms, 2),
            model=self.model,
            cost_usd=round(_calc_cost(self.model, prompt_tokens, completion_tokens), 7),
        )


def _estimate_tokens(text: str) -> int:
    """Rough token estimate: ~4 chars per token."""
    return max(1, len(text) // 4)
