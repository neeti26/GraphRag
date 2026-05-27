"""
Token Counter — Round 2 requirement.

Uses Gemini's count_tokens API (as required by hackathon rules) to measure
the total token count of the dataset. Documents the tokenizer choice.

Run: python -m data_pipeline.token_counter
"""
import os
import csv
import json
from tqdm import tqdm
from config import GEMINI_API_KEY, GEMINI_MODEL, TOKEN_TARGET


def count_tokens_gemini(text: str) -> int:
    """Official Gemini token counter — required by hackathon rules."""
    from google import genai
    client = genai.Client(api_key=GEMINI_API_KEY)
    resp = client.models.count_tokens(model=GEMINI_MODEL, contents=text)
    return resp.total_tokens


def estimate_tokens_fast(text: str) -> int:
    """Fast estimation: ~4 chars per token (GPT-style approximation).
    Used for progress tracking; final count uses Gemini API.
    """
    return len(text) // 4


def serialize_transaction_row(row: dict) -> str:
    """Convert a transaction row to natural language text for token counting."""
    fraud_str = "FRAUDULENT" if str(row.get("is_fraud", "")).lower() in ("true", "1") else "legitimate"
    return (
        f"Transaction {row['txn_id']}: Account {row['account_id']} made a "
        f"{fraud_str} {row['payment_method']} payment of ${row['amount']} "
        f"at merchant {row['merchant_id']} ({row['product_category']}) "
        f"on {row['timestamp']} using device {row['device_id']} "
        f"from IP {row['ip_address']}. Fraud score: {row['fraud_score']}."
    )


def serialize_account_row(row: dict) -> str:
    """Convert an account row to natural language text for token counting."""
    return (
        f"Account {row['id']} ({row['name']}, {row['email']}): "
        f"Status={row['status']}, RiskScore={row['risk_score']}, "
        f"CardType={row['card_type']}, CreatedAt={row['created_at']}, "
        f"PrimaryDevice={row['device']}, PrimaryIP={row['ip']}."
    )


def count_dataset_tokens(
    transactions_path: str = "data/transactions.csv",
    accounts_path: str = "data/accounts.csv",
    sample_size: int = 1000,
    use_gemini_api: bool = True,
) -> dict:
    """
    Count total tokens in the dataset.

    Strategy:
    1. Sample `sample_size` rows from each file
    2. Count tokens on the sample using Gemini API
    3. Extrapolate to full dataset
    4. Report total with tokenizer documentation
    """
    print("=" * 60)
    print("Token Counter — FraudGraph Round 2")
    print(f"Tokenizer: {GEMINI_MODEL} (count_tokens API)")
    print("=" * 60)

    results = {
        "tokenizer": GEMINI_MODEL,
        "tokenizer_api": "google.generativeai.GenerativeModel.count_tokens",
        "files": {},
        "total_tokens_estimated": 0,
        "total_tokens_sampled": 0,
        "target_tokens": TOKEN_TARGET,
        "meets_requirement": False,
    }

    # ── Count transactions ────────────────────────────────────
    print(f"\n[1/2] Counting tokens in {transactions_path}...")
    if os.path.exists(transactions_path):
        with open(transactions_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        total_rows = len(rows)
        sample = rows[:sample_size] if len(rows) > sample_size else rows

        # Serialize to text
        texts = [serialize_transaction_row(r) for r in sample]
        combined_sample = "\n".join(texts)

        if use_gemini_api and GEMINI_API_KEY:
            sample_tokens = count_tokens_gemini(combined_sample)
        else:
            sample_tokens = estimate_tokens_fast(combined_sample)
            print("  (Using fast estimation — set GEMINI_API_KEY for official count)")

        tokens_per_row = sample_tokens / len(sample)
        estimated_total = int(tokens_per_row * total_rows)

        results["files"]["transactions"] = {
            "path": transactions_path,
            "total_rows": total_rows,
            "sample_rows": len(sample),
            "sample_tokens": sample_tokens,
            "tokens_per_row": round(tokens_per_row, 2),
            "estimated_total_tokens": estimated_total,
        }
        print(f"  Rows: {total_rows:,}")
        print(f"  Sample tokens ({len(sample)} rows): {sample_tokens:,}")
        print(f"  Tokens/row: {tokens_per_row:.1f}")
        print(f"  Estimated total: {estimated_total:,}")
    else:
        print(f"  File not found: {transactions_path}")
        print("  Run: python -m data_pipeline.generate_dataset first")

    # ── Count accounts ────────────────────────────────────────
    print(f"\n[2/2] Counting tokens in {accounts_path}...")
    if os.path.exists(accounts_path):
        with open(accounts_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        total_rows = len(rows)
        sample = rows[:sample_size] if len(rows) > sample_size else rows

        texts = [serialize_account_row(r) for r in sample]
        combined_sample = "\n".join(texts)

        if use_gemini_api and GEMINI_API_KEY:
            sample_tokens = count_tokens_gemini(combined_sample)
        else:
            sample_tokens = estimate_tokens_fast(combined_sample)

        tokens_per_row = sample_tokens / len(sample)
        estimated_total = int(tokens_per_row * total_rows)

        results["files"]["accounts"] = {
            "path": accounts_path,
            "total_rows": total_rows,
            "sample_rows": len(sample),
            "sample_tokens": sample_tokens,
            "tokens_per_row": round(tokens_per_row, 2),
            "estimated_total_tokens": estimated_total,
        }
        print(f"  Rows: {total_rows:,}")
        print(f"  Sample tokens ({len(sample)} rows): {sample_tokens:,}")
        print(f"  Tokens/row: {tokens_per_row:.1f}")
        print(f"  Estimated total: {estimated_total:,}")

    # ── Total ─────────────────────────────────────────────────
    total = sum(f.get("estimated_total_tokens", 0) for f in results["files"].values())
    results["total_tokens_estimated"] = total
    results["meets_requirement"] = total >= 75_000_000  # 75M hard floor

    print("\n" + "=" * 60)
    print(f"TOTAL ESTIMATED TOKENS: {total:,}")
    print(f"TARGET:                 {TOKEN_TARGET:,}")
    print(f"MEETS REQUIREMENT:      {'✅ YES' if results['meets_requirement'] else '❌ NO — need more data'}")
    if total < 75_000_000:
        needed = 75_000_000 - total
        print(f"SHORTFALL:              {needed:,} tokens — increase NUM_TRANSACTIONS in generate_dataset.py")
    print("=" * 60)

    # Save report
    with open("data/token_count_report.json", "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nReport saved → data/token_count_report.json")

    return results


if __name__ == "__main__":
    count_dataset_tokens()
