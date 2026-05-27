"""
Seed Data — loads the generated dataset into TigerGraph.
For quick demo: seeds a small fraud ring for immediate testing.
For full Round 2: use data_pipeline/ingest.py for 100M token scale.
"""
from graph_layer.tigergraph_client import TigerGraphClient


FRAUD_RING = {
    "accounts": [
        {"id": "FR0000A00", "name": "Alice Fraud",   "email": "alice@fake.com",   "status": "banned",  "risk_score": 9.5},
        {"id": "FR0000A01", "name": "Bob Fraud",     "email": "bob@fake.com",     "status": "flagged", "risk_score": 8.2},
        {"id": "FR0000A02", "name": "Carol Fraud",   "email": "carol@fake.com",   "status": "active",  "risk_score": 6.1},
        {"id": "FR0000A03", "name": "Dave Fraud",    "email": "dave@fake.com",    "status": "active",  "risk_score": 5.8},
        {"id": "FR0001A00", "name": "Eve Fraud",     "email": "eve@fake.com",     "status": "banned",  "risk_score": 9.8},
        {"id": "FR0001A01", "name": "Frank Fraud",   "email": "frank@fake.com",   "status": "flagged", "risk_score": 7.9},
        {"id": "FR0001A02", "name": "Grace Fraud",   "email": "grace@fake.com",   "status": "active",  "risk_score": 5.5},
        {"id": "FR0002A00", "name": "Hank Fraud",    "email": "hank@fake.com",    "status": "banned",  "risk_score": 9.9},
        {"id": "FR0002A01", "name": "Iris Fraud",    "email": "iris@fake.com",    "status": "flagged", "risk_score": 8.7},
        {"id": "FR0002A02", "name": "Jack Fraud",    "email": "jack@fake.com",    "status": "active",  "risk_score": 6.3},
        {"id": "FR0002A03", "name": "Kate Fraud",    "email": "kate@fake.com",    "status": "active",  "risk_score": 5.9},
        {"id": "FR0002A04", "name": "Leo Fraud",     "email": "leo@fake.com",     "status": "active",  "risk_score": 5.2},
    ],
    "clean_accounts": [
        {"id": "ACC0000042", "name": "Normal User 42",   "email": "user42@gmail.com",   "status": "active", "risk_score": 0.8},
        {"id": "ACC0001337", "name": "Normal User 1337", "email": "user1337@gmail.com", "status": "active", "risk_score": 1.2},
        {"id": "ACC0009999", "name": "Normal User 9999", "email": "user9999@gmail.com", "status": "active", "risk_score": 0.5},
    ],
    "devices": [
        {"id": "DEV-55123", "ring": [0, 1, 2, 3]},   # Ring 0 shared device
        {"id": "DEV-67890", "ring": [4, 5, 6]},       # Ring 1 shared device
        {"id": "DEV-11111", "ring": [7, 8, 9, 10, 11]}, # Ring 2 shared device
        {"id": "DEV-CLEAN1", "ring": []},
        {"id": "DEV-CLEAN2", "ring": []},
    ],
    "ips": [
        {"ip": "45.33.32.156",  "blacklisted": True,  "reason": "12 chargebacks",    "ring_accounts": ["FR0000A00", "FR0000A01"]},
        {"ip": "198.51.100.42", "blacklisted": True,  "reason": "known fraud ring",  "ring_accounts": ["FR0001A00", "FR0001A01"]},
        {"ip": "203.0.113.99",  "blacklisted": True,  "reason": "identity theft",    "ring_accounts": ["FR0002A00", "FR0002A01", "FR0002A02"]},
        {"ip": "192.168.1.100", "blacklisted": False, "reason": "",                  "ring_accounts": ["ACC0000042"]},
        {"ip": "10.0.0.55",     "blacklisted": False, "reason": "",                  "ring_accounts": ["ACC0001337"]},
    ],
}


def seed(tg: TigerGraphClient):
    print("Seeding FraudGraph with demo fraud rings...")

    all_accounts = FRAUD_RING["accounts"] + FRAUD_RING["clean_accounts"]

    # Upsert accounts
    for acc in all_accounts:
        tg.upsert_account(
            account_id=acc["id"],
            name=acc["name"],
            email=acc["email"],
            status=acc["status"],
            risk_score=acc["risk_score"],
        )

    # Upsert devices and link to ring accounts
    ring_accounts = FRAUD_RING["accounts"]
    for dev in FRAUD_RING["devices"]:
        tg.upsert_device(device_id=dev["id"])
        for idx in dev["ring"]:
            if idx < len(ring_accounts):
                tg.link_account_device(ring_accounts[idx]["id"], dev["id"])

    # Link clean accounts to their own devices
    for i, acc in enumerate(FRAUD_RING["clean_accounts"]):
        dev_id = f"DEV-CLEAN{i+1}"
        tg.upsert_device(device_id=dev_id)
        tg.link_account_device(acc["id"], dev_id)

    # Upsert IPs and link
    for ip_data in FRAUD_RING["ips"]:
        tg.upsert_ip(
            ip=ip_data["ip"],
            is_blacklisted=ip_data["blacklisted"],
            reason=ip_data["reason"],
        )
        for acc_id in ip_data["ring_accounts"]:
            tg.link_account_ip(acc_id, ip_data["ip"])

    print(f"  ✅ Seeded {len(all_accounts)} accounts, {len(FRAUD_RING['devices'])} devices, {len(FRAUD_RING['ips'])} IPs")
    print("  ✅ Fraud rings: 3 rings (4+3+5 accounts)")
    print("  ✅ Clean accounts: 3")


if __name__ == "__main__":
    tg = TigerGraphClient()
    seed(tg)
