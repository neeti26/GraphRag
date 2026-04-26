"""
Seeds TigerGraph with a realistic synthetic identity fraud ring.

The Ring:
  Account #0001 — known banned fraudster
  Account #1002 — flagged for Identity Takeover
  Account #8821 — TARGET (looks innocent in isolation)
  Account #3344 — innocent bystander

  Shared Device: XYZ-999  (used by #0001, #1002, #8821)
  Shared IP:     192.168.1.1  (blacklisted, used by #0001 and #1002)
  #8821 also logged from 192.168.1.1 once

This is the "smoking gun" — #8821 looks clean alone,
but 3-hop traversal reveals it's in the same fraud ring.
"""
from graph_layer.tigergraph_client import TigerGraphClient


def seed(tg: TigerGraphClient):
    print("Seeding fraud graph...")

    # ── Devices ──────────────────────────────────────────────
    tg.upsert_device("XYZ-999",   "mobile",  "Android 13")
    tg.upsert_device("ABC-111",   "desktop", "Windows 11")
    tg.upsert_device("DEF-222",   "mobile",  "iOS 17")
    tg.upsert_device("GHI-333",   "tablet",  "Android 12")

    # ── IPs ───────────────────────────────────────────────────
    tg.upsert_ip("192.168.1.1",  "IN", is_blacklisted=True,  reason="Known fraud proxy — linked to 12 chargebacks")
    tg.upsert_ip("10.0.0.55",   "IN", is_blacklisted=False)
    tg.upsert_ip("203.0.113.42","IN", is_blacklisted=False)
    tg.upsert_ip("198.51.100.7","IN", is_blacklisted=True,   reason="VPN exit node — flagged for account takeover")

    # ── Phones ───────────────────────────────────────────────
    tg.upsert_phone("+91-9000000001", "Jio",    "IN")
    tg.upsert_phone("+91-9000000002", "Airtel", "IN")
    tg.upsert_phone("+91-9000000003", "Vi",     "IN")
    tg.upsert_phone("+91-9000000004", "BSNL",   "IN")

    # ── Addresses ────────────────────────────────────────────
    tg.upsert_address("ADDR-1", "12 MG Road",      "Bengaluru", "560001")
    tg.upsert_address("ADDR-2", "45 Linking Road",  "Mumbai",    "400050")
    tg.upsert_address("ADDR-3", "7 Park Street",    "Kolkata",   "700016")

    # ── Accounts ─────────────────────────────────────────────
    # The known fraudster
    tg.upsert_account("0001", "Raj Kumar",    "raj.k@tempmail.xyz",   status="banned",  risk_score=9.8)
    # Flagged for identity takeover
    tg.upsert_account("1002", "Priya Sharma", "priya.s@fakemail.net", status="flagged", risk_score=7.4)
    # TARGET — looks innocent in isolation
    tg.upsert_account("8821", "Amit Verma",   "amit.v@gmail.com",     status="active",  risk_score=0.1)
    # Innocent bystander (no shared device/IP with ring)
    tg.upsert_account("3344", "Sunita Rao",   "sunita.r@yahoo.com",   status="active",  risk_score=0.0)
    # Another ring member
    tg.upsert_account("5566", "Vikram Das",   "vikram.d@proton.me",   status="flagged", risk_score=6.1)

    # ── Edges: The Fraud Ring ─────────────────────────────────
    # All three share Device XYZ-999 — the smoking gun
    tg.link_account_device("0001", "XYZ-999", "2024-01-10", "2024-06-01", 47)
    tg.link_account_device("1002", "XYZ-999", "2024-03-15", "2024-07-20", 23)
    tg.link_account_device("8821", "XYZ-999", "2024-05-01", "2024-08-10", 8)   # TARGET uses same device!

    # #0001 and #1002 share the blacklisted IP
    tg.link_account_ip("0001", "192.168.1.1", "2024-06-01", 31)
    tg.link_account_ip("1002", "192.168.1.1", "2024-07-20", 14)
    tg.link_account_ip("8821", "192.168.1.1", "2024-08-10", 2)   # TARGET also logged from blacklisted IP!
    tg.link_account_ip("8821", "10.0.0.55",   "2024-08-15", 19)  # Normal IP too (makes it look innocent)

    # #5566 shares device with #1002 (extends the ring)
    tg.link_account_device("5566", "XYZ-999", "2024-04-01", "2024-07-01", 11)
    tg.link_account_ip("5566", "198.51.100.7", "2024-07-01", 5)

    # Innocent bystander — completely separate
    tg.link_account_device("3344", "DEF-222", "2024-01-01", "2024-08-01", 120)
    tg.link_account_ip("3344", "203.0.113.42", "2024-08-01", 88)

    # Phones
    tg.link_account_phone("0001", "+91-9000000001", "2024-01-10")
    tg.link_account_phone("1002", "+91-9000000002", "2024-03-15")
    tg.link_account_phone("8821", "+91-9000000003", "2024-05-01")
    tg.link_account_phone("3344", "+91-9000000004", "2024-01-01")

    # Addresses
    tg.link_account_address("0001", "ADDR-1", verified=False)
    tg.link_account_address("1002", "ADDR-1", verified=False)  # Same address as #0001!
    tg.link_account_address("8821", "ADDR-2", verified=True)
    tg.link_account_address("3344", "ADDR-3", verified=True)

    print("✓ Fraud ring seeded successfully.")
    print("  Ring members: #0001 (banned), #1002 (flagged), #8821 (TARGET), #5566 (flagged)")
    print("  Shared device: XYZ-999")
    print("  Blacklisted IP: 192.168.1.1")


def seed_entity_links(tg: TigerGraphClient):
    """Seeds ENTITY_LINK edges for confirmed same-entity account pairs."""
    print("Seeding entity links...")

    # Account 8821 ↔ Account 1002: share device XYZ-999 and IP 192.168.1.1
    tg.conn.upsertEdge(
        "Account", "8821", "ENTITY_LINK", "Account", "1002",
        {"shared_identifiers": ["XYZ-999", "192.168.1.1"], "confidence_score": 1.0}
    )

    # Account 0001 ↔ Account 5566: share device XYZ-999
    tg.conn.upsertEdge(
        "Account", "0001", "ENTITY_LINK", "Account", "5566",
        {"shared_identifiers": ["XYZ-999"], "confidence_score": 0.5}
    )

    print("✓ Entity links seeded: 8821↔1002 (confidence=1.0), 0001↔5566 (confidence=0.5)")


if __name__ == "__main__":
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    from graph_layer.tigergraph_client import TigerGraphClient
    seed(TigerGraphClient())
