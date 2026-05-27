"""
LLM Layer — unified client using the new google-genai SDK (v2.x).

Round 2: Gemini is the primary LLM (TigerGraph-provided credits).
Token counting uses Gemini's count_tokens API as required by the hackathon.
"""
import time
from dataclasses import dataclass
from typing import Optional

from config import (
    GEMINI_API_KEY,
    GEMINI_MODEL,
    OPENAI_API_KEY,
    COST_PER_INPUT_TOKEN,
    COST_PER_OUTPUT_TOKEN,
)


@dataclass
class LLMResponse:
    content: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: float
    cost_usd: float
    model: str


class GeminiClient:
    """Primary LLM client for Round 2 — uses google-genai SDK v2."""

    def __init__(self, model: str = None):
        from google import genai
        from google.genai import types

        self._genai  = genai
        self._types  = types
        self.model_name = model or GEMINI_MODEL or "gemini-2.0-flash"
        self.client  = genai.Client(api_key=GEMINI_API_KEY)

    def count_tokens(self, text: str) -> int:
        """Official Gemini token counter — required by hackathon rules."""
        try:
            resp = self.client.models.count_tokens(
                model=self.model_name,
                contents=text,
            )
            return resp.total_tokens
        except Exception:
            # Fast fallback: ~4 chars per token
            return max(1, len(text) // 4)

    def complete_with_metrics(
        self,
        prompt: str,
        system: str = "",
        max_tokens: int = 400,
    ) -> LLMResponse:
        full_prompt = f"{system}\n\n{prompt}" if system else prompt

        # Count input tokens
        prompt_tokens = self.count_tokens(full_prompt)

        start = time.time()
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=full_prompt,
            config=self._types.GenerateContentConfig(
                max_output_tokens=max_tokens,
                temperature=0.1,
            ),
        )
        latency_ms = (time.time() - start) * 1000

        content = response.text.strip() if response.text else ""
        completion_tokens = self.count_tokens(content)
        total_tokens = prompt_tokens + completion_tokens
        cost = (prompt_tokens * COST_PER_INPUT_TOKEN) + (completion_tokens * COST_PER_OUTPUT_TOKEN)

        return LLMResponse(
            content=content,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            latency_ms=latency_ms,
            cost_usd=cost,
            model=self.model_name,
        )


# Alias — always use Gemini for Round 2
LLMClient = GeminiClient


def get_llm_client() -> GeminiClient:
    """Factory — returns Gemini client."""
    if GEMINI_API_KEY:
        return GeminiClient()
    raise ValueError("GEMINI_API_KEY not set in .env")
