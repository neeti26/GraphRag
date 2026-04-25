"""
Pipeline 1 — Baseline (LLM Only).

The LLM receives raw login logs with no graph context.
Account #8821 looks completely normal in isolation —
the LLM will say "Safe". This is the hallucination test.
"""
from dataclasses import dataclass
from llm_layer.llm_client import LLMClient, LLMResponse
from data.raw_logs import RAW_LOGS


SYSTEM_PROMPT = """You are a Fraud Analyst at a major Indian fintech company.
You will be given a list of recent login logs containing Account IDs, IPs, and Device IDs.
Analyze the logs and determine if the target account is suspicious.
Respond with either SAFE or SUSPICIOUS followed by your reasoning.
Be concise — 3-4 sentences maximum."""


@dataclass
class BaselineResult:
    account_id: str
    verdict: str          # "SAFE" or "SUSPICIOUS"
    reasoning: str
    llm_response: LLMResponse
    pipeline: str = "baseline"


class BaselinePipeline:
    def __init__(self, llm: LLMClient):
        self.llm = llm

    def run(self, account_id: str) -> BaselineResult:
        logs_text = "\n".join(RAW_LOGS[:50])  # 50 raw log lines — lots of tokens

        prompt = f"""You are a Fraud Analyst. Below is a list of 50 recent login logs containing Account IDs, IPs, and Device IDs. Analyze these logs and identify if Account #{account_id} is suspicious or part of a fraud ring.

LOGIN LOGS:
{logs_text}

Target Account: #{account_id}
Answer 'SAFE' or 'SUSPICIOUS' with reasoning."""

        response = self.llm.complete_with_metrics(prompt, system=SYSTEM_PROMPT, max_tokens=300)

        content = response.content.strip()
        verdict = "SUSPICIOUS" if "SUSPICIOUS" in content.upper() else "SAFE"

        return BaselineResult(
            account_id=account_id,
            verdict=verdict,
            reasoning=content,
            llm_response=response,
        )
