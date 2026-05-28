"""
Hybrid Entity Extractor — Improvement #1

Combines:
1. LLM-based extraction (Gemini fast call) to pull named entities from query
2. Fuzzy matching against the local graph to resolve entity IDs

Returns clean entity IDs that can be used directly in GSQL traversal.
"""
import re
from difflib import get_close_matches
from typing import List, Tuple


EXTRACT_PROMPT = """Extract all account IDs, device IDs, IP addresses, and merchant IDs 
from the following query. Return ONLY a JSON array of strings, nothing else.
Example: ["FR0001A00", "DEV-55123", "192.168.1.1"]

Query: {query}"""


def extract_entities_llm(query: str, llm) -> List[str]:
    """Use Gemini to extract entities from a natural language query."""
    try:
        prompt = EXTRACT_PROMPT.format(query=query)
        resp = llm.complete_with_metrics(prompt, max_tokens=100)
        content = resp.content.strip()
        # Parse JSON array
        match = re.search(r'\[.*?\]', content, re.DOTALL)
        if match:
            import json
            return json.loads(match.group())
    except Exception:
        pass
    return []


def extract_entities_regex(query: str) -> List[str]:
    """Fast regex extraction for known entity patterns."""
    entities = []
    # Account IDs: FR0001A00, ACC0000042
    entities += re.findall(r'\b(?:FR|ACC)\d{4,7}(?:A\d{2})?\b', query)
    # Device IDs: DEV-55123, MOB-12345
    entities += re.findall(r'\b(?:DEV|MOB|TAB|DSK)-\d{4,6}\b', query)
    # IPs
    entities += re.findall(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', query)
    # Merchant IDs
    entities += re.findall(r'\bMERCH-\d{3,6}\b', query)
    return list(set(entities))


def fuzzy_match_account(entity: str, graph_engine) -> str:
    """Fuzzy match an entity string against known account IDs."""
    if not graph_engine or not hasattr(graph_engine, 'accounts'):
        return entity
    known = list(graph_engine.accounts.keys())[:10000]
    matches = get_close_matches(entity.upper(), [k.upper() for k in known], n=1, cutoff=0.8)
    if matches:
        # Return the original-case match
        idx = [k.upper() for k in known].index(matches[0])
        return known[idx]
    return entity


def extract_and_resolve(query: str, llm=None, graph_engine=None) -> List[str]:
    """
    Full hybrid extraction pipeline:
    1. Regex (fast, zero cost)
    2. LLM extraction (if regex finds nothing)
    3. Fuzzy resolution against graph
    """
    entities = extract_entities_regex(query)

    if not entities and llm:
        entities = extract_entities_llm(query, llm)

    # Fuzzy resolve account IDs
    if graph_engine:
        resolved = []
        for e in entities:
            if re.match(r'^(FR|ACC)', e, re.IGNORECASE):
                resolved.append(fuzzy_match_account(e, graph_engine))
            else:
                resolved.append(e)
        return list(set(resolved))

    return list(set(entities))
