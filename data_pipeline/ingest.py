"""
Bulk Ingestion Pipeline — Round 2 (100M token scale)

Reads generated CSVs and batch-upserts everything into TigerGraph.
Handles 500K accounts + 2M transactions efficiently with batching.

Run: python -m data_pipeline.ingest
"""
import csv
import json
import time
from tqdm import tqdm
from graph_layer.tigergraph_client import TigerGraphClient

BATCH_SIZE = 500   # TigerGraph upsert batch size


def ingest_accounts(tg: TigerGraphClient, path: str = "data/accounts.csv"):
    print(f"\n[1/4] Ingesting accounts from {path}...")
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    total = len(rows)
    ingested = 0

    for i in tqdm(range(0, total, BATCH_SIZE), desc="  accounts"):
        batch = rows[i : i + BATCH_SIZE]
        for row in batch:
            try:
                tg.upsert_account(
                    account_id=row["id"],
                    name=row["name"],
                    email=row["email"],
                    status=row["status"],
                    risk_score=float(row["risk_score"]),
                    card_type=row.get("card_type", ""),
                    created_at=row.get("created_at", ""),
                )
            except Exception as e:
                print(f"  [WARN] account {row['id']}: {e}")
        ingested += len(batch)

    print(f"  ✅ Ingested {ingested:,} accounts")
    return ingested


def ingest_devices_and_ips(tg: TigerGraphClient, path: str = "data/accounts.csv"):
    """Extract unique devices and IPs from accounts CSV and upsert them."""
    print(f"\n[2/4] Ingesting devices and IPs...")
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    seen_devices = set()
    seen_ips = set()

    # Load blacklisted IPs
    blacklisted = {}
    try:
        with open("data/blacklisted_ips.csv", "r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                blacklisted[row["ip"]] = row
    except FileNotFoundError:
        pass

    for row in tqdm(rows, desc="  devices/IPs"):
        device_id = row.get("device", "")
        ip = row.get("ip", "")

        if device_id and device_id not in seen_devices:
            try:
                tg.upsert_device(device_id=device_id)
                tg.link_account_device(row["id"], device_id)
                seen_devices.add(device_id)
            except Exception:
                pass

        if ip and ip not in seen_ips:
            bl = blacklisted.get(ip, {})
            try:
                tg.upsert_ip(
                    ip=ip,
                    country=bl.get("country", "IN"),
                    is_blacklisted=bool(bl),
                    reason=bl.get("reason", ""),
                )
                tg.link_account_ip(row["id"], ip)
                seen_ips.add(ip)
            except Exception:
                pass

    print(f"  ✅ Ingested {len(seen_devices):,} devices, {len(seen_ips):,} IPs")
    return len(seen_devices), len(seen_ips)


def ingest_transactions(tg: TigerGraphClient, path: str = "data/transactions.csv",
                        limit: int = None):
    print(f"\n[3/4] Ingesting transactions from {path}...")
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    if limit:
        rows = rows[:limit]

    total = len(rows)
    ingested = 0
    seen_merchants = set()

    for i in tqdm(range(0, total, BATCH_SIZE), desc="  transactions"):
        batch = rows[i : i + BATCH_SIZE]
        for row in batch:
            try:
                txn_id = row["txn_id"]
                acc_id = row["account_id"]
                merchant_id = row["merchant_id"]
                is_fraud = str(row["is_fraud"]).lower() in ("true", "1")

                # Upsert transaction vertex
                tg.upsert_transaction(
                    txn_id=txn_id,
                    amount=float(row["amount"]),
                    timestamp=row["timestamp"],
                    is_fraud=is_fraud,
                    fraud_score=float(row.get("fraud_score", 0)),
                    product_category=row.get("product_category", ""),
                    payment_method=row.get("payment_method", ""),
                )

                # Link account → transaction
                tg.link_account_transaction(acc_id, txn_id, row["timestamp"])

                # Upsert merchant if new
                if merchant_id not in seen_merchants:
                    tg.upsert_merchant(merchant_id=merchant_id, name=merchant_id)
                    seen_merchants.add(merchant_id)

                # Link transaction → merchant
                tg.link_transaction_merchant(txn_id, merchant_id, row["timestamp"])

                # Also link device and IP from transaction
                device_id = row.get("device_id", "")
                ip = row.get("ip_address", "")
                if device_id:
                    tg.upsert_device(device_id=device_id)
                    tg.link_account_device(acc_id, device_id)
                if ip:
                    tg.upsert_ip(ip=ip)
                    tg.link_account_ip(acc_id, ip)

            except Exception as e:
                pass  # Skip bad rows silently at scale

        ingested += len(batch)

    print(f"  ✅ Ingested {ingested:,} transactions, {len(seen_merchants):,} merchants")
    return ingested


def run_entity_resolution(tg: TigerGraphClient):
    print(f"\n[4/4] Running entity resolution (finding same-entity accounts)...")
    try:
        links = tg.entity_resolution()
        print(f"  ✅ Created {len(links):,} entity links")
        return links
    except Exception as e:
        print(f"  [WARN] Entity resolution failed: {e}")
        return []


def ingest_all(transaction_limit: int = None):
    """Full ingestion pipeline."""
    print("=" * 60)
    print("FraudGraph Round 2 — Bulk Ingestion Pipeline")
    print("=" * 60)

    tg = TigerGraphClient()
    start = time.time()

    stats = {}
    stats["accounts"] = ingest_accounts(tg)
    stats["devices"], stats["ips"] = ingest_devices_and_ips(tg)
    stats["transactions"] = ingest_transactions(tg, limit=transaction_limit)
    stats["entity_links"] = len(run_entity_resolution(tg))

    elapsed = time.time() - start
    stats["elapsed_seconds"] = round(elapsed, 1)

    print("\n" + "=" * 60)
    print("Ingestion complete!")
    for k, v in stats.items():
        print(f"  {k}: {v:,}" if isinstance(v, int) else f"  {k}: {v}")
    print("=" * 60)

    with open("data/ingestion_stats.json", "w") as f:
        json.dump(stats, f, indent=2)
    print("Stats saved → data/ingestion_stats.json")

    return stats


if __name__ == "__main__":
    ingest_all()
