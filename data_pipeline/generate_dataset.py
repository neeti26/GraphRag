"""
Dataset Generator — Round 2 (100M tokens)

Generates a large synthetic fraud dataset that:
1. Produces ~100M tokens of text when serialized
2. Has rich entity relationships (accounts, devices, IPs, merchants)
3. Contains realistic fraud rings for GraphRAG to detect
4. Includes ground-truth labels for evaluation

Run: python -m data_pipeline.generate_dataset
Output: data/transactions.csv, data/accounts.csv, data/benchmark_questions.json
"""
import os
import csv
import json
import random
import hashlib
from datetime import datetime, timedelta
from tqdm import tqdm

random.seed(42)

# ── Config ────────────────────────────────────────────────────
NUM_ACCOUNTS       = 500_000    # 500K accounts
NUM_TRANSACTIONS   = 2_000_000  # 2M transactions
NUM_DEVICES        = 200_000
NUM_IPS            = 100_000
NUM_MERCHANTS      = 10_000
NUM_FRAUD_RINGS    = 500        # 500 fraud rings
RING_SIZE_MIN      = 3
RING_SIZE_MAX      = 8
FRAUD_RATE         = 0.03       # 3% fraud rate

OUTPUT_DIR = "data"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── Helpers ───────────────────────────────────────────────────
def rand_ip():
    return f"{random.randint(1,254)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"

def rand_device():
    prefix = random.choice(["DEV", "MOB", "TAB", "DSK"])
    return f"{prefix}-{random.randint(10000, 99999)}"

def rand_email(account_id):
    domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "proton.me"]
    return f"user{account_id}@{random.choice(domains)}"

def rand_timestamp(start_days_ago=365):
    base = datetime.now() - timedelta(days=start_days_ago)
    delta = timedelta(seconds=random.randint(0, start_days_ago * 86400))
    return (base + delta).strftime("%Y-%m-%d %H:%M:%S")

def rand_merchant():
    return f"MERCH-{random.randint(1000, NUM_MERCHANTS + 1000)}"

CATEGORIES = ["electronics", "clothing", "food", "travel", "gaming",
              "finance", "healthcare", "automotive", "home", "sports"]
PAYMENT_METHODS = ["credit_card", "debit_card", "upi", "netbanking", "wallet"]
CARD_TYPES = ["visa", "mastercard", "amex", "rupay"]
DEVICE_TYPES = ["mobile", "desktop", "tablet"]
OS_LIST = ["Android", "iOS", "Windows", "macOS", "Linux"]
COUNTRIES = ["IN", "US", "GB", "SG", "AE", "DE", "FR", "AU"]


def generate():
    print("=" * 60)
    print("FraudGraph Round 2 — Dataset Generator")
    print(f"Target: ~100M tokens | {NUM_ACCOUNTS:,} accounts | {NUM_TRANSACTIONS:,} transactions")
    print("=" * 60)

    # ── Step 1: Generate fraud rings ──────────────────────────
    print("\n[1/6] Generating fraud rings...")
    fraud_ring_accounts = set()
    fraud_rings = []
    shared_devices_pool = [rand_device() for _ in range(NUM_FRAUD_RINGS * 2)]
    blacklisted_ips = set()
    blacklisted_ip_list = [rand_ip() for _ in range(500)]
    blacklisted_ips.update(blacklisted_ip_list)

    for ring_id in range(NUM_FRAUD_RINGS):
        size = random.randint(RING_SIZE_MIN, RING_SIZE_MAX)
        ring_accounts = [f"FR{ring_id:04d}A{i:02d}" for i in range(size)]
        shared_device = shared_devices_pool[ring_id * 2]
        shared_ip = random.choice(blacklisted_ip_list)
        fraud_rings.append({
            "ring_id": ring_id,
            "accounts": ring_accounts,
            "shared_device": shared_device,
            "shared_ip": shared_ip,
        })
        fraud_ring_accounts.update(ring_accounts)

    # ── Step 2: Generate accounts ─────────────────────────────
    print(f"[2/6] Generating {NUM_ACCOUNTS:,} accounts...")
    accounts = []
    all_account_ids = []

    # Add fraud ring accounts first
    for ring in fraud_rings:
        for i, acc_id in enumerate(ring["accounts"]):
            status = "banned" if i == 0 else "flagged" if i == 1 else "active"
            risk = round(random.uniform(7.0, 10.0), 2) if status != "active" else round(random.uniform(5.0, 8.0), 2)
            accounts.append({
                "id": acc_id,
                "name": f"User {acc_id}",
                "email": rand_email(acc_id),
                "status": status,
                "risk_score": risk,
                "card_type": random.choice(CARD_TYPES),
                "created_at": rand_timestamp(730),
                "device": ring["shared_device"],
                "ip": ring["shared_ip"],
                "is_fraud_ring": True,
                "ring_id": ring["ring_id"],
            })
            all_account_ids.append(acc_id)

    # Add normal accounts
    normal_count = NUM_ACCOUNTS - len(fraud_ring_accounts)
    for i in range(normal_count):
        acc_id = f"ACC{i:07d}"
        accounts.append({
            "id": acc_id,
            "name": f"User {acc_id}",
            "email": rand_email(acc_id),
            "status": "active",
            "risk_score": round(random.uniform(0.0, 3.0), 2),
            "card_type": random.choice(CARD_TYPES),
            "created_at": rand_timestamp(730),
            "device": rand_device(),
            "ip": rand_ip(),
            "is_fraud_ring": False,
            "ring_id": -1,
        })
        all_account_ids.append(acc_id)

    # ── Step 3: Write accounts CSV ────────────────────────────
    print(f"[3/6] Writing accounts to {OUTPUT_DIR}/accounts.csv...")
    with open(f"{OUTPUT_DIR}/accounts.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "id", "name", "email", "status", "risk_score",
            "card_type", "created_at", "device", "ip", "is_fraud_ring", "ring_id"
        ])
        writer.writeheader()
        for acc in tqdm(accounts, desc="  accounts"):
            writer.writerow(acc)

    # ── Step 4: Generate transactions (vectorized with numpy/pandas) ──
    print(f"[4/6] Generating {NUM_TRANSACTIONS:,} transactions (fast vectorized)...")
    import numpy as np
    import pandas as pd

    fraud_account_list = list(fraud_ring_accounts)
    n = NUM_TRANSACTIONS

    # Decide which rows are fraud-ring accounts (15%) vs normal (85%)
    rng = np.random.default_rng(42)
    is_ring_row = rng.random(n) < 0.15

    # Sample account IDs
    ring_indices  = rng.integers(0, len(fraud_account_list), n)
    normal_indices = rng.integers(0, len(all_account_ids), n)
    account_ids = np.where(is_ring_row,
                           np.array(fraud_account_list)[ring_indices],
                           np.array(all_account_ids)[normal_indices])

    # Fraud flag
    ring_fraud   = rng.random(n) < 0.6
    normal_fraud = rng.random(n) < FRAUD_RATE
    is_fraud_arr = np.where(is_ring_row, ring_fraud, normal_fraud)

    # Build account lookup for device/ip
    acc_device = {a["id"]: a["device"] for a in accounts}
    acc_ip     = {a["id"]: a["ip"]     for a in accounts}

    # Amounts and scores
    amounts = np.where(is_fraud_arr,
                       rng.uniform(10, 50000, n),
                       rng.uniform(5, 5000, n)).round(2)
    fraud_scores = np.where(is_fraud_arr,
                            rng.uniform(0.7, 1.0, n),
                            rng.uniform(0.0, 0.3, n)).round(3)

    # Timestamps
    base_ts = pd.Timestamp("2024-11-01")
    offsets = rng.integers(0, 365 * 86400, n)
    timestamps = [(base_ts + pd.Timedelta(seconds=int(o))).strftime("%Y-%m-%d %H:%M:%S") for o in offsets]

    # Devices and IPs (70% use account's own, 30% random)
    use_own = rng.random(n) < 0.7
    rand_devs = [rand_device() for _ in range(n)]
    rand_ips  = [rand_ip()     for _ in range(n)]
    devices = [acc_device.get(aid, rand_devs[i]) if use_own[i] else rand_devs[i] for i, aid in enumerate(account_ids)]
    ips     = [acc_ip.get(aid, rand_ips[i])     if use_own[i] else rand_ips[i]  for i, aid in enumerate(account_ids)]

    cat_idx  = rng.integers(0, len(CATEGORIES),      n)
    pay_idx  = rng.integers(0, len(PAYMENT_METHODS), n)
    merch_idx = rng.integers(1000, NUM_MERCHANTS + 1000, n)

    df = pd.DataFrame({
        "txn_id":           [f"TXN{i:010d}" for i in range(n)],
        "account_id":       account_ids,
        "amount":           amounts,
        "timestamp":        timestamps,
        "merchant_id":      [f"MERCH-{m}" for m in merch_idx],
        "product_category": [CATEGORIES[c] for c in cat_idx],
        "payment_method":   [PAYMENT_METHODS[p] for p in pay_idx],
        "is_fraud":         is_fraud_arr,
        "fraud_score":      fraud_scores,
        "device_id":        devices,
        "ip_address":       ips,
    })

    print(f"  Writing {n:,} rows to CSV...")
    df.to_csv(f"{OUTPUT_DIR}/transactions.csv", index=False)

    # ── Step 5: Write blacklisted IPs ─────────────────────────
    print(f"[5/6] Writing blacklisted IPs...")
    with open(f"{OUTPUT_DIR}/blacklisted_ips.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["ip", "reason", "country"])
        writer.writeheader()
        reasons = ["12 chargebacks", "known fraud ring", "VPN abuse", "bot traffic", "identity theft"]
        for ip in blacklisted_ip_list:
            writer.writerow({
                "ip": ip,
                "reason": random.choice(reasons),
                "country": random.choice(COUNTRIES),
            })

    # ── Step 6: Generate benchmark questions ──────────────────
    print(f"[6/6] Generating benchmark questions with ground truth...")
    questions = []

    # Sample fraud ring accounts for questions
    sample_fraud = random.sample(list(fraud_ring_accounts), min(30, len(fraud_ring_accounts)))
    sample_clean = [a["id"] for a in accounts if not a["is_fraud_ring"]][:20]

    for acc_id in sample_fraud:
        ring = next((r for r in fraud_rings if acc_id in r["accounts"]), None)
        if ring:
            questions.append({
                "question_id": f"Q_FRAUD_{acc_id}",
                "question": f"Is account {acc_id} part of a fraud ring? Analyze its device sharing and IP connections.",
                "account_id": acc_id,
                "ground_truth": "SUSPICIOUS",
                "ground_truth_answer": (
                    f"Account {acc_id} is SUSPICIOUS. It shares device {ring['shared_device']} "
                    f"with {len(ring['accounts'])-1} other accounts and uses blacklisted IP {ring['shared_ip']}. "
                    f"This is a synthetic identity fraud ring with {len(ring['accounts'])} members."
                ),
                "question_type": "fraud_detection",
            })

    for acc_id in sample_clean:
        questions.append({
            "question_id": f"Q_SAFE_{acc_id}",
            "question": f"Is account {acc_id} suspicious? Check its network connections.",
            "account_id": acc_id,
            "ground_truth": "SAFE",
            "ground_truth_answer": (
                f"Account {acc_id} is SAFE. It has no connections to flagged accounts, "
                f"no shared devices with banned users, and no blacklisted IP addresses in its network."
            ),
            "question_type": "fraud_detection",
        })

    # Add multi-hop reasoning questions
    for ring in random.sample(fraud_rings, min(10, len(fraud_rings))):
        questions.append({
            "question_id": f"Q_RING_{ring['ring_id']}",
            "question": f"Which accounts share device {ring['shared_device']} and what is the fraud risk?",
            "account_id": ring["accounts"][0],
            "ground_truth": "SUSPICIOUS",
            "ground_truth_answer": (
                f"Device {ring['shared_device']} is shared by {len(ring['accounts'])} accounts: "
                f"{', '.join(ring['accounts'])}. This device sharing pattern indicates a "
                f"synthetic identity fraud ring. All accounts using this device should be flagged."
            ),
            "question_type": "device_sharing",
        })

    with open(f"{OUTPUT_DIR}/benchmark_questions.json", "w", encoding="utf-8") as f:
        json.dump(questions, f, indent=2)

    # ── Summary ───────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("Dataset generation complete!")
    print(f"  Accounts:      {len(accounts):,}")
    print(f"  Transactions:  {NUM_TRANSACTIONS:,}")
    print(f"  Fraud rings:   {NUM_FRAUD_RINGS:,}")
    print(f"  Fraud accounts:{len(fraud_ring_accounts):,}")
    print(f"  Blacklisted IPs:{len(blacklisted_ip_list):,}")
    print(f"  Benchmark Qs:  {len(questions):,}")
    print(f"\n  Files written to: {OUTPUT_DIR}/")
    print("=" * 60)

    return {
        "num_accounts": len(accounts),
        "num_transactions": NUM_TRANSACTIONS,
        "num_fraud_rings": NUM_FRAUD_RINGS,
        "num_questions": len(questions),
    }


if __name__ == "__main__":
    generate()
