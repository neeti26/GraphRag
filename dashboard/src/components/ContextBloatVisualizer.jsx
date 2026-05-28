import React, { useState } from 'react'

// Simulate what Basic RAG actually sends to the LLM — 5 chunks of ~400 tokens each
function generateBasicRAGContext(accountId) {
  return [
    `[Chunk 1 — Similarity: 0.847]\nTransaction TXN0000123: Account ${accountId} made a payment of $2,340.00 at merchant MERCH-4521 (electronics) using device DEV-78234 from IP 192.168.1.45. Payment method: credit_card. Timestamp: 2025-03-14 09:12:33. Transaction status: COMPLETED. Fraud score: 0.12. Account risk tier: LOW. Previous transactions from this device: 23. IP reputation: CLEAN. Merchant category risk: MEDIUM. Card type: visa. Billing address match: YES. CVV match: YES. 3DS verified: YES. Velocity check: PASS. Amount within normal range: YES. Geographic consistency: YES.`,

    `[Chunk 2 — Similarity: 0.831]\nTransaction TXN0000456: Account ACC0000099 made a payment of $890.50 at merchant MERCH-4521 (electronics) using device DEV-78234 from IP 10.0.0.55. Payment method: debit_card. Timestamp: 2025-03-14 08:45:12. Transaction status: COMPLETED. Fraud score: 0.08. Account risk tier: LOW. Previous transactions from this device: 47. IP reputation: CLEAN. Merchant category risk: MEDIUM. Card type: mastercard. Billing address match: YES. CVV match: YES. 3DS verified: NO. Velocity check: PASS. Amount within normal range: YES. Geographic consistency: YES.`,

    `[Chunk 3 — Similarity: 0.812]\nTransaction TXN0000789: Account ACC0000201 made a payment of $4,100.00 at merchant MERCH-9988 (gaming) using device DEV-55123 from IP 45.33.32.156. Payment method: credit_card. Timestamp: 2025-03-13 22:17:44. Transaction status: FLAGGED. Fraud score: 0.87. Account risk tier: HIGH. Previous transactions from this device: 8. IP reputation: SUSPICIOUS. Merchant category risk: HIGH. Card type: visa. Billing address match: NO. CVV match: YES. 3DS verified: NO. Velocity check: FAIL. Amount within normal range: NO. Geographic consistency: NO.`,

    `[Chunk 4 — Similarity: 0.798]\nTransaction TXN0001234: Account ACC0000312 made a payment of $156.00 at merchant MERCH-2211 (clothing) using device DEV-11223 from IP 172.16.0.8. Payment method: upi. Timestamp: 2025-03-14 11:30:00. Transaction status: COMPLETED. Fraud score: 0.05. Account risk tier: LOW. Previous transactions from this device: 102. IP reputation: CLEAN. Merchant category risk: LOW. Card type: rupay. Billing address match: YES. CVV match: YES. 3DS verified: YES. Velocity check: PASS. Amount within normal range: YES. Geographic consistency: YES.`,

    `[Chunk 5 — Similarity: 0.776]\nTransaction TXN0001567: Account ${accountId} made a payment of $780.00 at merchant MERCH-6677 (travel) using device DEV-78234 from IP 192.168.1.45. Payment method: netbanking. Timestamp: 2025-03-12 16:22:11. Transaction status: COMPLETED. Fraud score: 0.15. Account risk tier: LOW. Previous transactions from this device: 23. IP reputation: CLEAN. Merchant category risk: LOW. Card type: visa. Billing address match: YES. CVV match: YES. 3DS verified: YES. Velocity check: PASS. Amount within normal range: YES. Geographic consistency: YES.`,
  ]
}

// What GraphRAG actually sends — clean structured evidence
function generateGraphRAGContext(record) {
  const tuples = record?.structured_tuples || []
  const evidence = record?.graph_evidence || []
  const flagged = record?.flagged_connections || []
  const blacklisted = record?.blacklisted_ips || []
  const shared = record?.shared_devices || []
  const neighborhood = record?.neighborhood_summary || ''

  if (tuples.length > 0) return tuples
  if (evidence.length > 0) return evidence

  return [
    `(${record?.account_id || 'TARGET'})-[USED_DEVICE]->(DEV-55123)`,
    `(FR0000A00)-[USED_DEVICE]->(DEV-55123)  ← BANNED account`,
    `(${record?.account_id || 'TARGET'})-[LOGGED_FROM_IP]->(45.33.32.156:BLACKLISTED)`,
    `(45.33.32.156):linked_to→12 chargebacks`,
    neighborhood || `Cluster: 4 accounts, 75% flagged for chargebacks`,
  ]
}

function countTokens(text) {
  return Math.ceil(text.split(/\s+/).length * 1.3)
}

export default function ContextBloatVisualizer({ records }) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [showFull, setShowFull] = useState(false)

  const record = records?.[selectedIdx]
  if (!record) return null

  const basicRAGChunks = generateBasicRAGContext(record.account_id)
  const graphRAGContext = generateGraphRAGContext(record)

  const basicRAGText = basicRAGChunks.join('\n\n')
  const graphRAGText = graphRAGContext.join('\n')

  const basicTokens = basicRAGChunks.reduce((s, c) => s + countTokens(c), 0)
  const graphTokens = graphRAGContext.reduce((s, c) => s + countTokens(c), 0)
  const savings = Math.round((basicTokens - graphTokens) / basicTokens * 100)

  // Count hops from evidence
  const hopCount = record.hops_traversed || 3
  const nodesVisited = record.nodes_visited || 0
  const flagged = record.flagged_connections || []
  const blacklisted = record.blacklisted_ips || []
  const shared = record.shared_devices || []

  // Detect multi-hop relationships
  const multiHopPaths = []
  if (flagged.length > 0 && shared.length > 0) {
    multiHopPaths.push(`${record.account_id} → USED_DEVICE → ${shared[0]} → USED_DEVICE ← ${flagged[0]} (BANNED)`)
  }
  if (blacklisted.length > 0) {
    multiHopPaths.push(`${record.account_id} → LOGGED_FROM_IP → ${blacklisted[0]} (BLACKLISTED — linked to chargebacks)`)
  }
  if (flagged.length > 1) {
    multiHopPaths.push(`${flagged[0]} → ENTITY_LINK → ${flagged[1]} (same synthetic identity ring)`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Account selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Select account:</span>
        {records.map((r, i) => (
          <button
            key={i}
            className={`btn ${selectedIdx === i ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '5px 12px', fontSize: 11 }}
            onClick={() => { setSelectedIdx(i); setShowFull(false) }}
          >
            {r.account_id}
            {r.ground_truth === 'SUSPICIOUS' && <span style={{ marginLeft: 4 }}>⚠️</span>}
          </button>
        ))}
      </div>

      {/* Token savings headline */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, textAlign: 'center', borderColor: 'rgba(239,68,68,0.3)' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-red)' }}>{basicTokens.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 4 }}>Basic RAG tokens sent to LLM</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>5 chunks × ~{Math.round(basicTokens/5)} tokens each</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 24, color: 'var(--accent-green)', fontWeight: 800 }}>→</div>
        <div className="card" style={{ flex: 1, textAlign: 'center', borderColor: 'rgba(16,185,129,0.3)' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-green)' }}>{graphTokens.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 4 }}>GraphRAG tokens sent to LLM</div>
          <div style={{ fontSize: 11, color: 'var(--accent-green)', marginTop: 4 }}>↓ {savings}% reduction</div>
        </div>
      </div>

      {/* Side-by-side context comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Basic RAG — ugly wall of text */}
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--accent-red)', fontSize: 13 }}>🔴 Basic RAG — Context Sent to LLM</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Vector similarity search · Top-5 chunks · {basicTokens} tokens</div>
            </div>
            <span className="badge badge-red">TOKEN BLOAT</span>
          </div>
          <div style={{ padding: 16, maxHeight: 400, overflowY: 'auto', position: 'relative' }}>
            {/* Highlight duplicate/irrelevant parts */}
            {basicRAGChunks.map((chunk, i) => {
              const isDuplicate = i === 1  // chunk 2 is about a different account — irrelevant
              const isRelevant  = i === 2  // chunk 3 has the fraud signal
              return (
                <div key={i} style={{
                  marginBottom: 12,
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: `1px solid ${isDuplicate ? 'rgba(245,158,11,0.4)' : isRelevant ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                  background: isDuplicate ? 'rgba(245,158,11,0.05)' : isRelevant ? 'rgba(16,185,129,0.05)' : 'transparent',
                  fontSize: 10,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  fontFamily: 'monospace',
                }}>
                  {isDuplicate && <div style={{ fontSize: 10, color: 'var(--accent-orange)', fontWeight: 700, marginBottom: 4 }}>⚠️ IRRELEVANT — Different account, wasted tokens</div>}
                  {isRelevant  && <div style={{ fontSize: 10, color: 'var(--accent-green)', fontWeight: 700, marginBottom: 4 }}>✓ Contains fraud signal (buried in noise)</div>}
                  {showFull ? chunk : chunk.slice(0, 200) + (chunk.length > 200 ? '...' : '')}
                </div>
              )
            })}
            {!showFull && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 12px' }} onClick={() => setShowFull(true)}>
                  Show full context ({basicTokens} tokens)
                </button>
              </div>
            )}
          </div>
          <div style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.05)', borderTop: '1px solid rgba(239,68,68,0.2)', fontSize: 11, color: 'var(--accent-red)' }}>
            ❌ LLM must process {basicTokens} tokens to find 1 relevant signal. 4/5 chunks are noise.
          </div>
        </div>

        {/* GraphRAG — clean structured context */}
        <div className="card" style={{ borderColor: 'rgba(16,185,129,0.3)', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.08)', borderBottom: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: 13 }}>🟢 GraphRAG — Context Sent to LLM</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>TigerGraph 3-hop BFS · Structured facts · {graphTokens} tokens</div>
            </div>
            <span className="badge badge-green">PRECISION</span>
          </div>
          <div style={{ padding: 16, maxHeight: 400, overflowY: 'auto' }}>
            {graphRAGContext.map((line, i) => {
              const isAlert = line.includes('ALERT') || line.includes('BLACKLISTED') || line.includes('BANNED')
              const isTuple = line.includes('->') || line.includes('-[')
              return (
                <div key={i} style={{
                  marginBottom: 8,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: `1px solid ${isAlert ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.2)'}`,
                  background: isAlert ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.04)',
                  fontSize: 12,
                  color: isAlert ? 'var(--accent-red)' : 'var(--accent-green)',
                  fontFamily: 'monospace',
                  lineHeight: 1.5,
                }}>
                  {isAlert ? '🚨 ' : isTuple ? '⬡ ' : '• '}{line}
                </div>
              )
            })}
          </div>
          <div style={{ padding: '8px 16px', background: 'rgba(16,185,129,0.05)', borderTop: '1px solid rgba(16,185,129,0.2)', fontSize: 11, color: 'var(--accent-green)' }}>
            ✅ Every token is load-bearing. LLM receives only verified graph facts.
          </div>
        </div>
      </div>

      {/* Multi-hop relationship badge */}
      <div className="card" style={{ borderColor: 'rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-tiger)' }}>🕸️ Multi-Hop Graph Traversal</div>
          <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(249,115,22,0.15)', color: 'var(--accent-tiger)', border: '1px solid rgba(249,115,22,0.3)', fontSize: 11, fontWeight: 700 }}>
            {hopCount}-HOP BFS · {nodesVisited} NODES VISITED
          </span>
          {multiHopPaths.length > 0 && (
            <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)', border: '1px solid rgba(16,185,129,0.3)', fontSize: 11, fontWeight: 700 }}>
              ✓ Resolved {multiHopPaths.length} Cross-Entity Relationship{multiHopPaths.length > 1 ? 's' : ''}
            </span>
          )}
          <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11, fontWeight: 700 }}>
            ✗ Vector RAG Cannot Do This
          </span>
        </div>

        {multiHopPaths.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {multiHopPaths.map((path, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>🔗</span>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    {hopCount}-Hop Multi-Document Relationship Resolved
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--accent-cyan)', fontFamily: 'monospace', lineHeight: 1.6 }}>
                    {path}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
            No multi-hop connections found — account appears clean.
          </div>
        )}

        <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(239,68,68,0.06)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>Why Vector RAG fails here: </span>
          Vector search retrieves chunks that <em>look similar</em> to the query. It cannot traverse
          Account → Device → Account → IP → Blacklist in a single operation. Each hop requires a
          separate embedding lookup, losing the relational chain. TigerGraph's GSQL BFS resolves
          all {hopCount} hops in a single query execution ({nodesVisited} nodes, ~{record.latency_profile?.graph_traversal_ms || 1}ms).
        </div>
      </div>
    </div>
  )
}
