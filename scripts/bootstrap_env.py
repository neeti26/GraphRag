"""
scripts/bootstrap_env.py — Improvement #4

Unified seeding script. Connects to a fresh TigerGraph instance,
creates the schema, installs queries, and streams the dataset.

Run: python scripts/bootstrap_env.py [--demo] [--full]

  --demo  : Seeds only the 12 demo fraud ring accounts (fast, no CSV needed)
  --full  : Generates + ingests the full 270M token dataset (takes ~10 min)
"""
import sys
import os
import argparse
import json
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


def check_env():
    """Verify required environment variables are set."""
    from config import TG_HOST, TG_PASSWORD, GEMINI_API_KEY
    issues = []
    if "your-instance" in TG_HOST:
        issues.append("TG_HOST not set — update .env with your TigerGraph Cloud URL")
    if not TG_PASSWORD or TG_PASSWORD == "your_password":
        issues.append("TG_PASSWORD not set — update .env")
    if not GEMINI_API_KEY:
        issues.append("GEMINI_API_KEY not set — update .env")
    return issues


def create_schema(tg_conn):
    """Create the FraudGraph schema via pyTigerGraph."""
    print("[Schema] Creating FraudGraph schema...")
    schema_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "graph_layer", "schema.gsql")
    with open(schema_path, "r") as f:
        schema_gsql = f.read()
    try:
        result = tg_conn.gsql(schema_gsql)
        print(f"[Schema] ✅ Schema created: {result[:100] if result else 'OK'}")
    except Exception as e:
        print(f"[Schema] ⚠️  Schema may already exist: {e}")


def install_queries(tg_conn):
    """Install all GSQL queries."""
    print("[Queries] Installing GSQL queries...")
    for fname in ["queries.gsql", "weighted_queries.gsql"]:
        qpath = os.path.join(os.path.dirname(os.path.dirname(__file__)), "graph_layer", fname)
        if not os.path.exists(qpath):
            continue
        with open(qpath, "r") as f:
            gsql = f.read()
        try:
            result = tg_conn.gsql(gsql)
            print(f"[Queries] ✅ {fname} installed")
        except Exception as e:
            print(f"[Queries] ⚠️  {fname}: {e}")

    # Install all queries
    try:
        tg_conn.gsql("INSTALL QUERY ALL")
        print("[Queries] ✅ All queries installed")
    except Exception as e:
        print(f"[Queries] ⚠️  Install: {e}")


def seed_demo(tg_conn):
    """Seed the 12 demo fraud ring accounts."""
    print("[Seed] Seeding demo fraud rings...")
    from graph_layer.seed_data import seed
    from graph_layer.tigergraph_client import TigerGraphClient
    tg = TigerGraphClient()
    tg._real_conn = tg_conn
    tg._mode = "tigergraph"
    seed(tg)
    print("[Seed] ✅ Demo data seeded")


def seed_full():
    """Generate and ingest the full 270M token dataset."""
    print("[Full] Generating 270M token dataset...")
    from data_pipeline.generate_dataset import generate
    stats = generate()
    print(f"[Full] ✅ Dataset generated: {stats}")

    print("[Full] Counting tokens with Gemini API...")
    from data_pipeline.token_counter import count_dataset_tokens
    token_stats = count_dataset_tokens()
    print(f"[Full] ✅ Total tokens: {token_stats['total_tokens_estimated']:,}")

    print("[Full] Ingesting into TigerGraph...")
    from data_pipeline.ingest import ingest_all
    ingest_stats = ingest_all()
    print(f"[Full] ✅ Ingestion complete: {ingest_stats}")


def verify_setup():
    """Run a quick smoke test to verify everything works."""
    print("\n[Verify] Running smoke test...")
    from graph_layer.tigergraph_client import TigerGraphClient
    tg = TigerGraphClient()

    # Test graph query
    result = tg.multi_hop_fraud_context("FR0000A00", max_hops=3)
    nodes = result.get("total_nodes_traversed", 0)
    print(f"[Verify] ✅ Graph query: {nodes} nodes traversed for FR0000A00")

    # Test LLM
    from llm_layer.llm_client import get_llm_client
    llm = get_llm_client()
    resp = llm.complete_with_metrics("Reply with: OK", max_tokens=5)
    print(f"[Verify] ✅ LLM: {resp.content.strip()} ({resp.total_tokens} tokens)")

    print("[Verify] ✅ All systems operational\n")


def main():
    parser = argparse.ArgumentParser(description="FraudGraph Bootstrap")
    parser.add_argument("--demo", action="store_true", help="Seed demo data only (fast)")
    parser.add_argument("--full", action="store_true", help="Generate + ingest full 270M dataset")
    parser.add_argument("--skip-schema", action="store_true", help="Skip schema creation")
    parser.add_argument("--verify-only", action="store_true", help="Only run smoke test")
    args = parser.parse_args()

    print("=" * 60)
    print("FraudGraph Bootstrap — Round 2")
    print("=" * 60)

    if args.verify_only:
        verify_setup()
        return

    # Check environment
    issues = check_env()
    if issues:
        print("\n⚠️  Environment issues found:")
        for issue in issues:
            print(f"  • {issue}")
        print("\nUpdate your .env file and re-run.")
        print("For demo mode (no TigerGraph needed): python scripts/bootstrap_env.py --demo")
        if not args.demo:
            sys.exit(1)

    if args.demo or (not args.full and not args.skip_schema):
        # Demo mode — use local graph engine, no TigerGraph needed
        print("\n[Mode] Demo mode — using LocalGraphEngine (no TigerGraph Cloud needed)")
        print("[Mode] To use real TigerGraph: set credentials in .env and run --full\n")

        # Generate demo results
        print("[Demo] Generating benchmark results...")
        from demo_mode import generate_demo_results
        generate_demo_results()

        verify_setup()

        print("=" * 60)
        print("✅ Bootstrap complete (demo mode)")
        print("  Dashboard: cd dashboard && npm run dev")
        print("  API:       python api_server.py")
        print("=" * 60)
        return

    # Full mode — requires TigerGraph credentials
    try:
        import pyTigerGraph as tg_lib
        from config import TG_HOST, TG_USERNAME, TG_PASSWORD, TG_GRAPH_NAME, TG_SECRET
        conn = tg_lib.TigerGraphConnection(
            host=TG_HOST, username=TG_USERNAME,
            password=TG_PASSWORD, graphname=TG_GRAPH_NAME,
        )
        if TG_SECRET:
            token = conn.getToken(TG_SECRET)
            conn.apiToken = token[0]
        print(f"[TigerGraph] ✅ Connected to {TG_HOST}")
    except Exception as e:
        print(f"[TigerGraph] ❌ Connection failed: {e}")
        sys.exit(1)

    if not args.skip_schema:
        create_schema(conn)
        install_queries(conn)

    if args.full:
        seed_full()
    else:
        seed_demo(conn)

    verify_setup()

    print("=" * 60)
    print("✅ Bootstrap complete")
    print("  Run benchmark: python run_benchmark.py --questions 50")
    print("  Dashboard:     cd dashboard && npm run dev")
    print("  API:           python api_server.py")
    print("=" * 60)


if __name__ == "__main__":
    main()
