"""
Pipeline 1 — Baseline LLM Only.

The LLM receives raw transaction logs with NO graph context.
At 100M token scale this is extremely expensive and inaccurate —
that's exactly the point we're proving.
"""
import csv
import random
from dataclasses import dataclass
from llm_layer.llm_client import LLMClient, LLMResponse

SYSTEM_PROMPT = """You are a Fraud Analyst at a major fintech company.
You will be given a list of recent transaction logs.
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


def load_raw_logs(account_id: str, path: str = "data/transactions.csv",
                  limit: int = 50) -> list:
    """Load raw transaction rows for the baseline prompt — no graph context."""
    rows = []
    try:
        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                rows.append(row)
                if len(rows) >= limit * 10:
                    break
    except FileNotFoundError:
        # Demo fallback
        return [
            f"TXN{i:06d}: Account {random.choice(['ACC001','ACC002','ACC003',account_id])} | "
            f"${random.randint(10,5000)} | merchant MERCH-{random.randint(100,999)} | "
            f"device DEV-{random.randint(1000,9999)} | IP 192.168.{random.randint(1,254)}.{random.randint(1,254)}"
            for i in range(limit)
        ]

    # Return 50 rows — mix of target account and random others (no graph context)
    target_rows = [r for r in rows if r.get("account_id") == account_id][:10]
    other_rows = [r for r in rows if r.get("account_id") != account_id][:40]
    selected = (target_rows + other_rows)[:limit]
    random.shuffle(selected)

    return [
        f"{r['txn_id']}: Account {r['account_id']} | ${r['amount']} | "
        f"{r['product_category']} | {r['payment_method']} | "
        f"device {r['device_id']} | IP {r['ip_address']} | {r['timestamp']}"
        for r in selected
    ]


class BaselinePipeline:
    def __init__(self, llm: LLMClient):
        self.llm = llm

    def run(self, account_id: str) -> BaselineResult:
        logs = load_raw_logs(account_id)
        logs_text = "\n".join(logs)

        prompt = (
            f"You are a Fraud Analyst. Below is a list of {len(logs)} recent transaction logs "
            f"containing Account IDs, amounts, merchants, devices, and IPs. "
            f"Analyze these logs and identify if Account {account_id} is suspicious "
            f"or part of a fraud ring.\n\n"
            f"TRANSACTION LOGS:\n{logs_text}\n\n"
            f"Target Account: {account_id}\n"
            f"Answer 'SAFE' or 'SUSPICIOUS' with reasoning."
        )

        response = self.llm.complete_with_metrics(
            prompt, system=SYSTEM_PROMPT, max_tokens=300
        )
        content = response.content.strip()
        verdict = "SUSPICIOUS" if "SUSPICIOUS" in content.upper() else "SAFE"

        return BaselineResult(
            account_id=account_id,
            verdict=verdict,
            reasoning=content,
            llm_response=response,
        )
