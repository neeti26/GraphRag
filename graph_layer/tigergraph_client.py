"""
Graph Layer — TigerGraph interface with automatic local fallback.

Priority:
  1. TigerGraph Cloud (if credentials are set and connection succeeds)
  2. LocalGraphEngine (in-memory BFS on the generated CSV dataset)

This means the system works fully without a TigerGraph account,
while being ready to plug in real TigerGraph credentials instantly.
"""
from config import TG_HOST, TG_USERNAME, TG_PASSWORD, TG_GRAPH_NAME, TG_SECRET


def _is_configured() -> bool:
    """Check if real TigerGraph credentials are set."""
    return (
        TG_HOST and "your-instance" not in TG_HOST
        and TG_PASSWORD and TG_PASSWORD != "your_password"
    )


class TigerGraphClient:
    """
    Unified graph client.
    Uses real TigerGraph Cloud when configured, otherwise LocalGraphEngine.
    """

    def __init__(self):
        self._real_conn = None
        self._local     = None
        self._mode      = "local"

        if _is_configured():
            try:
                import pyTigerGraph as tg
                conn = tg.TigerGraphConnection(
                    host=TG_HOST,
                    username=TG_USERNAME,
                    password=TG_PASSWORD,
                    graphname=TG_GRAPH_NAME,
                )
                if TG_SECRET:
                    token = conn.getToken(TG_SECRET)
                    conn.apiToken = token[0]
                self._real_conn = conn
                self._mode = "tigergraph"
                print("[TigerGraph] ✅ Connected to TigerGraph Cloud")
            except Exception as e:
                print(f"[TigerGraph] Connection failed: {e} — using local graph engine")
                self._init_local()
        else:
            self._init_local()

    def _init_local(self):
        from graph_layer.local_graph_engine import get_local_engine
        self._local = get_local_engine()
        self._mode  = "local"
        print(f"[TigerGraph] Using LocalGraphEngine (in-memory BFS on CSV dataset)")

    # ── Core queries ──────────────────────────────────────────

    def multi_hop_fraud_context(self, account_id: str, max_hops: int = 3) -> dict:
        if self._mode == "tigergraph":
            try:
                result = self._real_conn.runInstalledQuery(
                    "multi_hop_fraud_context",
                    {"target_account": account_id, "max_hops": max_hops},
                )
                if result:
                    return result[0]
            except Exception as e:
                print(f"[TG] Query failed, falling back to local: {e}")
        return self._local.multi_hop_fraud_context(account_id, max_hops)

    def neighborhood_summary(self, account_id: str) -> dict:
        if self._mode == "tigergraph":
            try:
                result = self._real_conn.runInstalledQuery(
                    "neighborhood_summary", {"target_account": account_id}
                )
                if result:
                    return result[0]
            except Exception as e:
                print(f"[TG] neighborhood_summary failed, falling back: {e}")
        return self._local.neighborhood_summary(account_id)

    def ip_transaction_volume(self, ip_address: str) -> dict:
        if self._mode == "tigergraph":
            try:
                result = self._real_conn.runInstalledQuery(
                    "ip_transaction_volume", {"ip_address": ip_address}
                )
                if result:
                    return result[0]
            except Exception as e:
                print(f"[TG] ip_transaction_volume failed, falling back: {e}")
        return self._local.ip_transaction_volume(ip_address)

    def entity_resolution(self) -> list:
        if self._mode == "tigergraph":
            try:
                result = self._real_conn.runInstalledQuery("entity_resolution", {})
                if result:
                    return result[0].get("entity_links_created", [])
            except Exception as e:
                print(f"[TG] entity_resolution failed, falling back: {e}")
        return self._local.entity_resolution()

    def fraud_ring_detection(self, min_cluster_size: int = 3) -> list:
        if self._mode == "tigergraph":
            try:
                result = self._real_conn.runInstalledQuery(
                    "fraud_ring_detection", {"min_cluster_size": min_cluster_size}
                )
                if result:
                    return result[0].get("high_risk_accounts", [])
            except Exception as e:
                print(f"[TG] fraud_ring_detection failed, falling back: {e}")
        # Local fallback: find accounts with flagged/banned status
        if self._local:
            return [
                acc_id for acc_id, data in self._local.accounts.items()
                if data.get("status") in ("flagged", "banned")
            ][:50]
        return []

    def get_account_raw_logs(self, limit: int = 50) -> list:
        if self._mode == "tigergraph":
            try:
                return self._real_conn.getVertices("Account", limit=limit)
            except Exception:
                pass
        if self._local:
            return self._local.get_account_raw_logs(limit)
        return []

    def get_graph_stats(self) -> dict:
        if self._mode == "tigergraph":
            try:
                return self._real_conn.getStatistics()
            except Exception:
                pass
        if self._local:
            return self._local.get_graph_stats()
        return {}

    # ── Upsert helpers (TigerGraph Cloud only) ────────────────

    def upsert_account(self, account_id, name="", email="", status="active",
                       risk_score=0.0, transaction_count=0, total_amount=0.0,
                       card_type="", created_at=""):
        if self._mode == "tigergraph":
            self._real_conn.upsertVertex("Account", account_id, {
                "name": name, "email": email, "status": status,
                "risk_score": risk_score, "transaction_count": transaction_count,
                "total_amount": total_amount, "card_type": card_type,
                "created_at": created_at,
            })

    def upsert_device(self, device_id, device_type="mobile", os="Android", browser=""):
        if self._mode == "tigergraph":
            self._real_conn.upsertVertex("DeviceID", device_id, {
                "device_type": device_type, "os": os, "browser": browser,
            })

    def upsert_ip(self, ip, country="IN", is_blacklisted=False, reason="", login_count=0):
        if self._mode == "tigergraph":
            self._real_conn.upsertVertex("IPAddress", ip, {
                "country": country, "is_blacklisted": is_blacklisted,
                "blacklist_reason": reason, "login_count": login_count,
            })

    def upsert_merchant(self, merchant_id, name="", category="", fraud_rate=0.0, txn_count=0):
        if self._mode == "tigergraph":
            self._real_conn.upsertVertex("Merchant", merchant_id, {
                "name": name, "category": category,
                "fraud_rate": fraud_rate, "transaction_count": txn_count,
            })

    def upsert_transaction(self, txn_id, amount=0.0, timestamp="",
                           is_fraud=False, fraud_score=0.0,
                           product_category="", payment_method=""):
        if self._mode == "tigergraph":
            self._real_conn.upsertVertex("Transaction", txn_id, {
                "amount": amount, "timestamp": timestamp,
                "is_fraud": is_fraud, "fraud_score": fraud_score,
                "product_category": product_category, "payment_method": payment_method,
            })

    def link_account_device(self, account_id, device_id, first_seen="", last_seen="", count=1):
        if self._mode == "tigergraph":
            self._real_conn.upsertEdge("Account", account_id, "USED_DEVICE", "DeviceID", device_id, {
                "first_seen": first_seen, "last_seen": last_seen, "login_count": count,
            })

    def link_account_ip(self, account_id, ip, last_seen="", count=1):
        if self._mode == "tigergraph":
            self._real_conn.upsertEdge("Account", account_id, "LOGGED_FROM_IP", "IPAddress", ip, {
                "last_seen": last_seen, "login_count": count,
            })

    def link_account_transaction(self, account_id, txn_id, timestamp=""):
        if self._mode == "tigergraph":
            self._real_conn.upsertEdge("Account", account_id, "MADE_TRANSACTION", "Transaction", txn_id, {
                "timestamp": timestamp,
            })

    def link_transaction_merchant(self, txn_id, merchant_id, timestamp=""):
        if self._mode == "tigergraph":
            self._real_conn.upsertEdge("Transaction", txn_id, "AT_MERCHANT", "Merchant", merchant_id, {
                "timestamp": timestamp,
            })

    def batch_upsert_vertices(self, vertex_type: str, vertices: list):
        if self._mode == "tigergraph":
            vertex_dict = {v[0]: v[1] for v in vertices}
            self._real_conn.upsertVertices(vertex_type, vertex_dict)

    def batch_upsert_edges(self, from_type, edge_type, to_type, edges: list):
        if self._mode == "tigergraph":
            self._real_conn.upsertEdges(from_type, edge_type, to_type, edges)
