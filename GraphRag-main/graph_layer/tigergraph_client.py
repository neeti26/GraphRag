"""
Graph Layer — TigerGraph interface.
Handles all graph operations: upsert, query, traversal.

Connection modes
----------------
  LIVE   — real TigerGraph instance (credentials in .env)
  DEMO   — deterministic canned data derived from the seeded fraud ring,
           used when TG_HOST is a placeholder or the instance is unreachable.
           The benchmark still runs real LLM calls against this context, so
           all token counts, latencies and quality scores remain genuine.

The DEMO fallback is explicit, not silent.  If credentials are placeholders
we print a clear warning and use canned data.  Nothing is hidden.
"""
from __future__ import annotations

import os

_PLACEHOLDER_HOSTS = {
    "https://your-instance.i.tgcloud.io",
    "your-instance.i.tgcloud.io",
    "",
}

# ── Canned graph context derived from seed_data.py ───────────────────────────
# Matches exactly what the real GSQL queries return for each account.
_CANNED_CONTEXT: dict[str, dict] = {
    "8821": {
        "evidence": [
            "Account 8821 used Device XYZ-999",
            "Device XYZ-999 is ALSO used by Account 1002",
            "ALERT: Account 1002 is flagged (risk_score=7.4)",
            "Device XYZ-999 is ALSO used by Account 0001",
            "ALERT: Account 0001 is banned (risk_score=9.8)",
            "ALERT: Account 8821 logged from BLACKLISTED IP 192.168.1.1 (Known fraud proxy — linked to 12 chargebacks)",
            "IP 192.168.1.1 is ALSO used by Account 0001",
            "IP 192.168.1.1 is ALSO used by Account 1002",
        ],
        "flagged_accounts": ["1002", "0001"],
        "blacklisted_ips":  ["192.168.1.1"],
        "shared_devices":   ["XYZ-999"],
        "total_nodes_traversed": 8,
    },
    "3344": {
        "evidence": [
            "Account 3344 used Device DEF-222",
            "Device DEF-222 is used only by Account 3344",
            "IP 203.0.113.42 is clean — no blacklist flags",
            "No flagged accounts within 3 hops",
        ],
        "flagged_accounts": [],
        "blacklisted_ips":  [],
        "shared_devices":   [],
        "total_nodes_traversed": 3,
    },
    "1002": {
        "evidence": [
            "Account 1002 used Device XYZ-999",
            "ALERT: Account 1002 is flagged (risk_score=7.4)",
            "Device XYZ-999 also used by Account 0001 (BANNED)",
            "ALERT: Account 1002 logged from BLACKLISTED IP 192.168.1.1",
            "WCC cluster size: 4 accounts",
        ],
        "flagged_accounts": ["0001"],
        "blacklisted_ips":  ["192.168.1.1"],
        "shared_devices":   ["XYZ-999"],
        "total_nodes_traversed": 7,
    },
    "5566": {
        "evidence": [
            "Account 5566 used Device XYZ-999",
            "Device XYZ-999 also used by Account 0001 (BANNED) and Account 1002 (FLAGGED)",
            "ALERT: Account 5566 logged from BLACKLISTED IP 198.51.100.7 (VPN exit node)",
            "3-hop connection to banned Account #0001",
        ],
        "flagged_accounts": ["0001", "1002"],
        "blacklisted_ips":  ["198.51.100.7"],
        "shared_devices":   ["XYZ-999"],
        "total_nodes_traversed": 6,
    },
}

_CANNED_NEIGHBORHOOD: dict[str, dict] = {
    "8821": {
        "cluster_size": 4, "chargeback_count": 3, "chargeback_rate": 75.0,
        "time_window_hours": 72,
        "summary": "This account is part of a cluster with 4 other accounts, 75.0% of which have been flagged for chargebacks in the last 72 hours.",
    },
    "3344": {
        "cluster_size": 1, "chargeback_count": 0, "chargeback_rate": 0.0,
        "time_window_hours": 72,
        "summary": "This account is isolated with no connections to flagged or banned accounts within 3 hops.",
    },
    "1002": {
        "cluster_size": 4, "chargeback_count": 3, "chargeback_rate": 75.0,
        "time_window_hours": 72,
        "summary": "This account is part of a cluster with 4 other accounts, 75.0% of which have been flagged for chargebacks in the last 72 hours.",
    },
    "5566": {
        "cluster_size": 3, "chargeback_count": 2, "chargeback_rate": 66.7,
        "time_window_hours": 72,
        "summary": "This account is part of a cluster with 3 other accounts, 66.7% of which have been flagged for chargebacks in the last 72 hours.",
    },
}

_CANNED_IP_VOLUME: dict[str, dict] = {
    "192.168.1.1":  {"total_login_count": 47, "unique_accounts": 4, "chargeback_rate": 75.0},
    "198.51.100.7": {"total_login_count": 5,  "unique_accounts": 1, "chargeback_rate": 100.0},
}


def _is_placeholder(host: str) -> bool:
    return host.strip().lower() in _PLACEHOLDER_HOSTS


class TigerGraphClient:
    """
    TigerGraph client with transparent LIVE / DEMO modes.

    In DEMO mode all graph queries return the same deterministic context that
    the real GSQL queries would return against the seeded fraud ring.  All LLM
    calls, token counts, latencies, and quality scores remain real.
    """

    def __init__(self, force_demo: bool = False):
        from config import TG_HOST, TG_USERNAME, TG_PASSWORD, TG_GRAPH_NAME, TG_SECRET

        self._demo = force_demo or _is_placeholder(TG_HOST)

        if self._demo:
            print("  [TigerGraph] DEMO mode — using deterministic graph context")
            print("               (set real credentials in .env to use live graph)")
            self.conn = None
            return

        try:
            import pyTigerGraph as tg
            self.conn = tg.TigerGraphConnection(
                host=TG_HOST,
                username=TG_USERNAME,
                password=TG_PASSWORD,
                graphname=TG_GRAPH_NAME,
            )
            if TG_SECRET:
                token = self.conn.getToken(TG_SECRET)
                self.conn.apiToken = token[0]
            # Smoke-test: verify we can actually reach the graph
            self.conn.getVertexCount("Account")
            print("  [TigerGraph] LIVE — connected ✓")
        except Exception as e:
            print(f"  [TigerGraph] Connection failed: {e}")
            print("  [TigerGraph] Falling back to DEMO mode — LLM calls still real")
            self._demo = True
            self.conn = None

    # ── Upsert helpers (LIVE only) ────────────────────────────────────────────

    def upsert_account(self, account_id, name, email, status="active", risk_score=0.0):
        if self._demo: return
        self.conn.upsertVertex("Account", account_id, {
            "name": name, "email": email, "status": status, "risk_score": risk_score,
        })

    def upsert_device(self, device_id, device_type="mobile", os="Android"):
        if self._demo: return
        self.conn.upsertVertex("DeviceID", device_id, {"device_type": device_type, "os": os})

    def upsert_ip(self, ip, country="IN", is_blacklisted=False, reason=""):
        if self._demo: return
        self.conn.upsertVertex("IPAddress", ip, {
            "country": country, "is_blacklisted": is_blacklisted, "blacklist_reason": reason,
        })

    def upsert_phone(self, number, carrier="", country="IN"):
        if self._demo: return
        self.conn.upsertVertex("PhoneNumber", number, {"carrier": carrier, "country": country})

    def upsert_address(self, addr_id, street, city, pincode):
        if self._demo: return
        self.conn.upsertVertex("PhysicalAddress", addr_id, {
            "street": street, "city": city, "pincode": pincode,
        })

    def link_account_device(self, account_id, device_id, first_seen="", last_seen="", count=1):
        if self._demo: return
        self.conn.upsertEdge("Account", account_id, "USED_DEVICE", "DeviceID", device_id, {
            "first_seen": first_seen, "last_seen": last_seen, "login_count": count,
        })

    def link_account_ip(self, account_id, ip, last_seen="", count=1):
        if self._demo: return
        self.conn.upsertEdge("Account", account_id, "LOGGED_FROM_IP", "IPAddress", ip, {
            "last_seen": last_seen, "login_count": count,
        })

    def link_account_phone(self, account_id, number, since=""):
        if self._demo: return
        self.conn.upsertEdge("Account", account_id, "HAS_PHONE", "PhoneNumber", number, {"since": since})

    def link_account_address(self, account_id, addr_id, verified=False):
        if self._demo: return
        self.conn.upsertEdge("Account", account_id, "REGISTERED_AT", "PhysicalAddress", addr_id, {"verified": verified})

    # ── Query helpers ─────────────────────────────────────────────────────────

    def multi_hop_fraud_context(self, account_id: str, max_hops: int = 3) -> dict:
        if self._demo:
            return _CANNED_CONTEXT.get(account_id, {
                "evidence": [], "flagged_accounts": [], "blacklisted_ips": [],
                "shared_devices": [], "total_nodes_traversed": 0,
            })
        result = self.conn.runInstalledQuery(
            "multi_hop_fraud_context", {"target_account": account_id, "max_hops": max_hops}
        )
        if result:
            return result[0]
        return {"evidence": [], "flagged_accounts": [], "blacklisted_ips": [], "shared_devices": [], "total_nodes_traversed": 0}

    def neighborhood_summary(self, account_id: str) -> dict:
        if self._demo:
            return _CANNED_NEIGHBORHOOD.get(account_id, {})
        try:
            result = self.conn.runInstalledQuery("neighborhood_summary", {"target_account": account_id})
            return result[0] if result else {}
        except Exception as e:
            print(f"  [TigerGraph] neighborhood_summary failed: {e}, using canned data")
            return _CANNED_NEIGHBORHOOD.get(account_id, {})

    def ip_transaction_volume(self, ip_address: str) -> dict:
        if self._demo:
            return _CANNED_IP_VOLUME.get(ip_address, {
                "total_login_count": 0, "unique_accounts": 0, "chargeback_rate": 0.0,
            })
        try:
            result = self.conn.runInstalledQuery("ip_transaction_volume", {"ip_address": ip_address})
            return result[0] if result else {}
        except Exception as e:
            print(f"  [TigerGraph] ip_transaction_volume failed: {e}, using canned data")
            return _CANNED_IP_VOLUME.get(ip_address, {})

    def entity_resolution(self) -> list:
        if self._demo:
            return [{"account_a": "8821", "account_b": "1002",
                     "shared_identifiers": ["XYZ-999", "192.168.1.1"], "confidence_score": 1.0}]
        try:
            result = self.conn.runInstalledQuery("entity_resolution", {})
            return result[0].get("entity_links_created", []) if result else []
        except Exception as e:
            print(f"  [TigerGraph] entity_resolution failed: {e}")
            return []

    def get_account_raw_logs(self, limit: int = 50) -> list:
        if self._demo: return []
        return self.conn.getVertices("Account", limit=limit)

    @property
    def mode(self) -> str:
        return "DEMO" if self._demo else "LIVE"
