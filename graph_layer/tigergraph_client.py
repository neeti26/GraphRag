"""
Graph Layer — TigerGraph interface.
Handles all graph operations: upsert, query, traversal.
"""
import pyTigerGraph as tg
from config import TG_HOST, TG_USERNAME, TG_PASSWORD, TG_GRAPH_NAME, TG_SECRET


class TigerGraphClient:
    def __init__(self):
        self.conn = tg.TigerGraphConnection(
            host=TG_HOST,
            username=TG_USERNAME,
            password=TG_PASSWORD,
            graphname=TG_GRAPH_NAME,
        )
        if TG_SECRET:
            token = self.conn.getToken(TG_SECRET)
            self.conn.apiToken = token[0]

    # ── Upsert helpers ────────────────────────────────────────
    def upsert_account(self, account_id, name, email, status="active", risk_score=0.0):
        self.conn.upsertVertex("Account", account_id, {
            "name": name, "email": email,
            "status": status, "risk_score": risk_score,
        })

    def upsert_device(self, device_id, device_type="mobile", os="Android"):
        self.conn.upsertVertex("DeviceID", device_id, {"device_type": device_type, "os": os})

    def upsert_ip(self, ip, country="IN", is_blacklisted=False, reason=""):
        self.conn.upsertVertex("IPAddress", ip, {
            "country": country,
            "is_blacklisted": is_blacklisted,
            "blacklist_reason": reason,
        })

    def upsert_phone(self, number, carrier="", country="IN"):
        self.conn.upsertVertex("PhoneNumber", number, {"carrier": carrier, "country": country})

    def upsert_address(self, addr_id, street, city, pincode):
        self.conn.upsertVertex("PhysicalAddress", addr_id, {
            "street": street, "city": city, "pincode": pincode,
        })

    def link_account_device(self, account_id, device_id, first_seen="", last_seen="", count=1):
        self.conn.upsertEdge("Account", account_id, "USED_DEVICE", "DeviceID", device_id, {
            "first_seen": first_seen, "last_seen": last_seen, "login_count": count,
        })

    def link_account_ip(self, account_id, ip, last_seen="", count=1):
        self.conn.upsertEdge("Account", account_id, "LOGGED_FROM_IP", "IPAddress", ip, {
            "last_seen": last_seen, "login_count": count,
        })

    def link_account_phone(self, account_id, number, since=""):
        self.conn.upsertEdge("Account", account_id, "HAS_PHONE", "PhoneNumber", number, {"since": since})

    def link_account_address(self, account_id, addr_id, verified=False):
        self.conn.upsertEdge("Account", account_id, "REGISTERED_AT", "PhysicalAddress", addr_id, {"verified": verified})

    # ── Queries ───────────────────────────────────────────────
    def multi_hop_fraud_context(self, account_id: str, max_hops: int = 3) -> dict:
        result = self.conn.runInstalledQuery("multi_hop_fraud_context", {
            "target_account": account_id, "max_hops": max_hops,
        })
        if result:
            return result[0]
        return {"evidence": [], "flagged_accounts": [], "blacklisted_ips": [], "shared_devices": [], "total_nodes_traversed": 0}

    def get_account_raw_logs(self, limit: int = 50) -> list:
        """Returns raw account data for the baseline prompt (no graph context)."""
        accounts = self.conn.getVertices("Account", limit=limit)
        return accounts
