"""
utils/context_compressor.py — Improvement #3

Strict token de-duplication and relationship compaction.

Converts raw TigerGraph JSON responses into clean, deduplicated
adjacency statements. Strips boilerplate metadata, collapses
duplicate paths, and produces a compact summary table.

Example input (raw):
  ["Account FR001 used Device DEV-123",
   "Account FR001 used Device DEV-123",   ← duplicate
   "Device DEV-123 is ALSO used by Account FR002",
   "Device DEV-123 is ALSO used by Account FR002",  ← duplicate
   "ALERT: Account FR002 is banned (risk_score=9.5)"]

Example output (compressed):
  Entities: FR001, FR002, DEV-123
  Relationships:
    FR001 -[USED_DEVICE]-> DEV-123
    FR002 -[USED_DEVICE]-> DEV-123  [SHARED]
  Alerts:
    FR002: BANNED (risk=9.5)
  Token reduction: 68%
"""
import re
from typing import List, Dict, Tuple
from collections import defaultdict


def compress_evidence(evidence: List[str]) -> dict:
    """
    Main compression function.
    Returns compressed context + stats.
    """
    if not evidence:
        return {
            "compressed_text": "No graph evidence found.",
            "entities": [],
            "relationships": [],
            "alerts": [],
            "original_count": 0,
            "compressed_count": 0,
            "dedup_count": 0,
            "token_reduction_pct": 0,
        }

    # ── Step 1: Deduplicate ───────────────────────────────────
    seen = set()
    unique = []
    for e in evidence:
        normalized = re.sub(r'\s+', ' ', e.strip().lower())
        if normalized not in seen:
            seen.add(normalized)
            unique.append(e.strip())
    dedup_count = len(evidence) - len(unique)

    # ── Step 2: Parse into structured facts ──────────────────
    entities: Dict[str, dict] = {}
    relationships: List[Tuple[str, str, str]] = []  # (from, rel, to)
    alerts: List[str] = []

    for line in unique:
        # ALERT: Account X logged from BLACKLISTED IP Y (reason)
        m = re.search(r'ALERT.*Account (\S+) logged from BLACKLISTED IP (\S+)', line)
        if m:
            acc, ip = m.group(1), m.group(2)
            entities[acc] = entities.get(acc, {"type": "Account"})
            entities[ip]  = {"type": "IP", "blacklisted": True}
            relationships.append((acc, "LOGGED_FROM_IP", f"{ip}:BLACKLISTED"))
            alerts.append(f"{acc} → BLACKLISTED IP {ip}")
            continue

        # ALERT: Account X is banned/flagged (risk_score=Y)
        m = re.search(r'ALERT.*Account (\S+) is (banned|flagged).*risk_score=([0-9.]+)', line, re.IGNORECASE)
        if m:
            acc, status, risk = m.group(1), m.group(2), m.group(3)
            entities[acc] = {"type": "Account", "status": status, "risk": risk}
            alerts.append(f"{acc}: {status.upper()} (risk={risk})")
            continue

        # Account X used Device Y
        m = re.search(r'Account (\S+) used Device (\S+)', line)
        if m:
            acc, dev = m.group(1), m.group(2)
            entities[acc] = entities.get(acc, {"type": "Account"})
            entities[dev] = entities.get(dev, {"type": "Device"})
            rel = (acc, "USED_DEVICE", dev)
            if rel not in relationships:
                relationships.append(rel)
            continue

        # Device X is ALSO used by Account Y
        m = re.search(r'Device (\S+) is ALSO used by Account (\S+)', line)
        if m:
            dev, acc = m.group(1), m.group(2)
            entities[dev] = entities.get(dev, {"type": "Device"})
            entities[acc] = entities.get(acc, {"type": "Account"})
            rel = (acc, "USED_DEVICE", f"{dev}[SHARED]")
            if rel not in relationships:
                relationships.append(rel)
            continue

        # IP X is ALSO used by Account Y
        m = re.search(r'IP (\S+) is ALSO used by Account (\S+)', line)
        if m:
            ip, acc = m.group(1), m.group(2)
            entities[ip]  = entities.get(ip, {"type": "IP"})
            entities[acc] = entities.get(acc, {"type": "Account"})
            rel = (acc, "LOGGED_FROM_IP", f"{ip}[SHARED]")
            if rel not in relationships:
                relationships.append(rel)
            continue

        # Hop-3: Account X also used Device Y
        m = re.search(r'Account (\S+) also used Device (\S+)', line)
        if m:
            acc, dev = m.group(1), m.group(2)
            entities[acc] = entities.get(acc, {"type": "Account"})
            entities[dev] = entities.get(dev, {"type": "Device"})
            rel = (acc, "USED_DEVICE", f"{dev}[HOP3]")
            if rel not in relationships:
                relationships.append(rel)
            continue

    # ── Step 3: Build compact summary table ──────────────────
    lines = []

    if entities:
        lines.append(f"Entities ({len(entities)}): " + ", ".join(entities.keys()))

    if relationships:
        lines.append(f"Relationships ({len(relationships)}):")
        for frm, rel, to in relationships[:12]:  # cap at 12
            lines.append(f"  {frm} -[{rel}]-> {to}")

    if alerts:
        lines.append(f"Alerts ({len(alerts)}):")
        for a in alerts:
            lines.append(f"  ⚠️  {a}")

    compressed_text = "\n".join(lines) if lines else "No structured relationships found."

    # ── Step 4: Token reduction stats ────────────────────────
    original_tokens  = sum(len(e.split()) for e in evidence)
    compressed_tokens = len(compressed_text.split())
    reduction_pct = round((original_tokens - compressed_tokens) / max(original_tokens, 1) * 100, 1)

    return {
        "compressed_text":      compressed_text,
        "entities":             list(entities.keys()),
        "relationships":        [f"{f} -[{r}]-> {t}" for f, r, t in relationships],
        "alerts":               alerts,
        "original_count":       len(evidence),
        "compressed_count":     len(unique),
        "dedup_count":          dedup_count,
        "original_tokens":      original_tokens,
        "compressed_tokens":    compressed_tokens,
        "token_reduction_pct":  reduction_pct,
    }


def compress_for_prompt(evidence: List[str], neighborhood_summary: str = "") -> str:
    """
    Returns a compact string ready to inject into the LLM prompt.
    Maximally token-efficient while preserving all fraud signals.
    """
    result = compress_evidence(evidence)

    parts = []
    if result["alerts"]:
        parts.append("FRAUD SIGNALS:\n" + "\n".join(f"  {a}" for a in result["alerts"]))
    if result["relationships"]:
        parts.append("GRAPH PATHS:\n" + "\n".join(f"  {r}" for r in result["relationships"][:10]))
    if neighborhood_summary:
        parts.append(f"CLUSTER: {neighborhood_summary}")

    return "\n\n".join(parts) if parts else "No suspicious connections found."
