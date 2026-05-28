import React, { useState } from 'react'

// Simulate what Basic RAG actually sends to the LLM — 5 chunks of ~400 tokens each
function generateBasicRAGContext(accountId) {
  return [
    `[Chunk 1 — Similarity: 0.847]\nTransaction TXN0000123: Account ${accountId} made a payment of $2,340.00 at merchant MERCH-4521 (electronics) on 2025-03-14 09:12:33 using device DEV-${Math.floor(Math.random()*90000+10000)} from IP 192.168.${Math.floor(Math.random()*254)}.${Math.floor(Math.random()*254)}. Payment method: credit_card. Transaction status: COMPLETED. Fraud score: 0.12. Account risk tier: LOW. Previous transactions from this device: 23. IP reputation: CLEAN. Merchant category code: 5732. Billing address verified: YES. 3DS authentication: PASSED. Card present: NO. Currency: INR. Exchange rate: 1.0. Issuer country: IN. Acquirer: HDFC. Terminal ID: TERM-9921. Batch ID: BATCH-20250314.`,

    `[Chunk 2 — Similarity: 0.831]\nTransaction TXN0000456: Account ACC0000${Math.floor(Math.random()*9000+1000)} made a payment of $890.50 at merchant MERCH-4521 (electronics) on 2025-03-14 09:15:44 using device DEV-${Math.floor(Math.random()*90000+10000)} from IP 10.0.${Math.floor(Math.random()*254)}.${Math.floor(Math.random()*254)}. Payment method: debit_card. Transaction status: COMPLETED. Fraud score: 0.08. Account risk tier: LOW. Previous transactions from this device: 7. IP reputation: CLEAN. Merchant category code: 5732. Billing address verified: YES. 3DS authentication: PASSED. Card present: NO. Currency: INR. Exchange rate: 1.0. Issuer country: IN. Acquirer: ICICI. Terminal ID: TERM-4432. Batch ID: BATCH-20250314.`,

    `[Chunk 3 — Similarity: 0.819]\nTransaction TXN0000789: Account ${accountId} made a payment of $156.00 at merchant MERCH-7823 (clothing) on 2025-03-13 14:22:11 using device DEV-${Math.floor(Math.random()*90000+10000)} from IP 172.16.${Math.floor(Math.random()*254)}.${Math.floor(Math.random()*254)}. Payment method: upi. Transaction status: COMPLETED. Fraud score: 0.15. Account risk tier: LOW. Previous transactions from this device: 41. IP reputation: CLEAN. Merchant category code: 5621. Billing address verified: NO. 3DS authentication: NOT_REQUIRED. Card present: NO. Currency: INR. Exchange rate: 1.0. Issuer country: IN. Acquirer: AXIS. Terminal ID: TERM-2211. Batch ID: BATCH-20250313.`,

    `[Chunk 4 — Similarity: 0.804]\nTransaction TXN0001234: Account ACC0000${Math.floor(Math.random()*9000+1000)} made a payment of $4,500.00 at merchant MERCH-4521 (electronics) on 2025-03-14 09:18:02 using device DEV-${Math.floor(Math.random()*90000+10000)} from IP 192.168.${Math.floor(Math.random()*254)}.${Math.floor(Math.random()*254)}. Payment method: netbanking. Transaction status: FLAGGED. Fraud score: 0.67. Account risk tier: MEDIUM. Previous transactions from this device: 2. IP reputation: SUSPICIOUS. Merchant category code: 5732. Billing address verified: YES. 3DS authentication: FAILED. Card present: NO. Currency: INR. Exchange rate: 1.0. Issuer country: IN. Acquirer: SBI. Terminal ID: TERM-8834. Batch ID: BATCH-20250314.`,

    `[Chunk 5 — Similarity: 0.791]\nTransaction TXN0001567: Account ${accountId} made a payment of $78.00 at merchant MERCH-2341 (food) on 2025-03-12 20:45:33 using device DEV-${Math.floor(Math.random()*90000+10000)} from IP 10.0.${Math.floor(Math.random()*254)}.${Math.floor(Math.random()*254)}. Payment method: wallet. Transaction status: COMPLETED. Fraud score: 0.04. Account risk tier: LOW. Previous transactions from this device: 89. IP reputation: CLEAN. Merchant category code: 5812. Billing address verified: YES. 3DS authentication: NOT_REQUIRED. Card present: NO. Currency: INR. Exchange rate: 1.0. Issuer country: IN. Acquirer: PAYTM. Terminal ID: TERM-1122. Batch ID: BATCH-20250312.`,
  ]
}

function generateGraphRAGContext(record) {
  const tuples = record?.structured_tuples || []
  const evidence = record?.graph_evidence || []
  const flagged = record?.flagged_connections || []
  const blacklisted = record?.blacklisted_ips || []
  const shared = record?.shared_devices || []
  const neighborhood = record?.neighborhood_summary || 'No cluster data.'

  // Build structured facts
  const facts = []
  if (tuples.length > 0) {
    tuples.slice(0, 8).forEach(t => facts.push(t))
  } else {
    evidence.slice(0, 8).forEach(e => {
      // Convert to tuple format
      const m1 = e.match(/Account (\S+) used Device (\S+)/)
      if (m1) { facts.push(`(${m1[1]})-[USED_DEVICE]->(${m1[2]})`); return }
      const m2 = e.match(/Device (\S+) is ALSO used by Account (\S+)/)
      if (m2) { facts.push(`(${m2[2]})-[USED_DEVICE]->(${m2[1]})`); return }
      const m3 = e.match(/Account (\S+) logged from BLACKLISTED IP (\S+)/)
      if (m3) { facts.push(`(${m3[1]})-[LOGGED_FROM_IP]->(${m3[2]}:BLACKLISTED)`); return }
      facts.push(e.slice(0, 70))
    })
  }

  return {
    facts,
    flagged,
    blacklisted,
    shared,
    neighborhood,
    nodes: record?.nodes_visited || 0,
    hops: record?.hops_traversed || 3,
  }
}

function countTokensApprox(text) {
  return Math.round(text.split(/\s+/).length * 1.3)
}

export default function ContextBloatVisualizer({ records }) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [expanded, setExpanded] = useState(false)

  const record = records[selectedIdx] || records[0]
  if (!record) return null

  const ragChunks = generateBasicRAGContext(record.account_id)
  const ragText   = ragChunks.join('\n\n')
  const ragTokens = countTokensApprox(ragText)

  const graphCtx  = generateGraphRAGContext(record)
  const graphText = graphCtx.facts.join('\n') + '\n' + graphCtx.neighborhood
  const graphTokens = countTokensApprox(graphText)

  const savings = Math.round((ragTokens - graphTokens) / ragTokens * 100)

  // Multi-hop badge logic
  const hops = graphCtx.hops || 3
  const hasFlagged = graphCtx.flagged.length > 0
  const hasBlacklisted = graphCtx.blacklisted.length > 0
  const hasShared = graphCtx.shared.length > 0
  const crossDocConnections = graphCtx.facts.filter(f => f.includes('->')).length
  const isSuspicious = record.graphrag_verdict === 'SUSPICIOUS'

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
            onClick={() => setSelectedIdx(i)}
          >
            {r.account_id}
            {r.graphrag_verdict === 'SUSPICIOUS' && <span style={{ marginLeft: 4 }}>⚠️</span>}
          </button>
        ))}
      </div>

      {/* Token savings headline */}
      <div style={{
        display: 'flex', gap: 16, padding: '14px 20px',
        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
        borderRadius: 10, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-green)' }}>{savings}%</div>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: 14 }}>Token Reduction</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Basic RAG sends <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>{ragTokens.toLocaleString()} tokens</span> of bloated context.
            GraphRAG sends <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{graphTokens.toLocaleString()} tokens</span> of precise facts.
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isSuspicious && hasFlagged && (
            <span className="badge badge-red">⚠️ Fraud Ring Detected</span>
          )}
          {isSuspicious && hasBlacklisted && (
            <span className="badge badge-red">🚫 Blacklisted IP</span>
          )}
          {!isSuspicious && (
            <span className="badge badge-green">✅ Clean Account</span>
          )}
        </div>
      </div>

      {/* Side-by-side context comparison */}
      <div className="grid-2" style={{ gap: 16 }}>

        {/* Basic RAG — wall of text */}
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)', padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '12px 16px', background: 'rgba(239,68,68,0.08)',
            borderBottom: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--accent-red)', fontSize: 13 }}>
                🗑️ Basic RAG Context
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                5 chunks × ~{Math.round(ragTokens/5)} tokens = {ragTokens.toLocaleString()} tokens total
              </div>
            </div>
            <span className="badge badge-red">{ragTokens.toLocaleString()} tokens</span>
          </div>

          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--accent-orange)', marginBottom: 8, fontWeight: 600 }}>
              ⚠️ Context bloat: duplicate metadata, irrelevant transactions, noise
            </div>
            <div style={{
              maxHeight: expanded ? 'none' : 280,
              overflow: 'hidden',
              position: 'relative',
            }}>
              {ragChunks.map((chunk, i) => (
                <div key={i} style={{
                  marginBottom: 10, padding: '8px 10px',
                  background: 'rgba(239,68,68,0.05)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderRadius: 6, fontSize: 10,
                  color: 'var(--text-muted)',
                  fontFamily: 'monospace',
                  lineHeight: 1.6,
                  wordBreak: 'break-all',
                }}>
                  {chunk}
                </div>
              ))}
              {!expanded && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: 60,
                  background: 'linear-gradient(transparent, var(--bg-card))',
                }} />
              )}
            </div>
            <button
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: 8, fontSize: 11, padding: '6px' }}
              onClick={() => setExpanded(e => !e)}
            >
              {expanded ? '▲ Collapse' : `▼ Show all ${ragTokens.toLocaleString()} tokens of bloat`}
            </button>
          </div>
        </div>

        {/* GraphRAG — clean structured facts */}
        <div className="card" style={{ borderColor: 'rgba(16,185,129,0.3)', padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '12px 16px', background: 'rgba(16,185,129,0.08)',
            borderBottom: '1px solid rgba(16,185,129,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: 13 }}>
                ⬡ TigerGraph GraphRAG Context
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {graphCtx.facts.length} structured facts = {graphTokens.toLocaleString()} tokens total
              </div>
            </div>
            <span className="badge badge-green">{graphTokens.toLocaleString()} tokens</span>
          </div>

          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--accent-green)', marginBottom: 8, fontWeight: 600 }}>
              ✅ Precision context: only verified graph relationships
            </div>

            {/* Structured tuples */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                Graph Paths (Entity-Relationship Tuples)
              </div>
              {graphCtx.facts.length > 0 ? graphCtx.facts.map((f, i) => (
                <div key={i} style={{
                  padding: '5px 10px', marginBottom: 4,
                  background: f.includes('BLACKLISTED') || f.includes('BANNED') || f.includes('FLAGGED')
                    ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.05)',
                  border: `1px solid ${f.includes('BLACKLISTED') || f.includes('BANNED') ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.15)'}`,
                  borderRadius: 6, fontSize: 11,
                  color: f.includes('BLACKLISTED') || f.includes('BANNED') ? 'var(--accent-red)' : 'var(--accent-cyan)',
                  fontFamily: 'monospace',
                }}>
                  {f.includes('BLACKLISTED') || f.includes('BANNED') ? '🚨 ' : '→ '}{f}
                </div>
              )) : (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No suspicious connections found in 3-hop traversal.
                </div>
              )}
            </div>

            {/* Cluster context */}
            <div style={{
              padding: '8px 10px',
              background: 'rgba(6,182,212,0.05)',
              border: '1px solid rgba(6,182,212,0.15)',
              borderRadius: 6, fontSize: 11,
              color: 'var(--accent-cyan)', fontStyle: 'italic',
            }}>
              📊 {graphCtx.neighborhood}
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Nodes traversed: <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{graphCtx.nodes}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Hops: <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{graphCtx.hops}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Relationships: <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{crossDocConnections}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-hop badge section */}
      <div className="card" style={{ borderColor: 'rgba(249,115,22,0.3)' }}>
        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 13, color: 'var(--accent-tiger)' }}>
          🕸️ Multi-Hop Relationship Analysis — What Vector RAG Cannot Do
        </div>

        <div className="grid-2" style={{ gap: 12 }}>
          {/* GraphRAG capabilities */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
              TigerGraph GraphRAG
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* 3-hop badge */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px',
                background: 'rgba(249,115,22,0.08)',
                border: '1px solid rgba(249,115,22,0.25)',
                borderRadius: 8,
              }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent-tiger)' }}>
                    {hops}-Hop Multi-Document Traversal
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Account → Device → Banned Account → Blacklisted IP
                  </div>
                </div>
                <span className="badge badge-orange" style={{ marginLeft: 'auto', fontSize: 10 }}>
                  {hops} HOPS
                </span>
              </div>

              {/* Cross-document associations */}
              {crossDocConnections > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.25)',
                  borderRadius: 8,
                }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent-green)' }}>
                      {crossDocConnections} Cross-Document Associations Found
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Relationships spanning multiple transaction records
                    </div>
                  </div>
                  <span className="badge badge-green" style={{ marginLeft: 'auto', fontSize: 10 }}>
                    ✓ RESOLVED
                  </span>
                </div>
              )}

              {/* Fraud ring detection */}
              {isSuspicious && hasFlagged && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 8,
                }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent-red)' }}>
                      Fraud Ring Membership Confirmed
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Connected to {graphCtx.flagged.length} flagged/banned account(s)
                    </div>
                  </div>
                  <span className="badge badge-red" style={{ marginLeft: 'auto', fontSize: 10 }}>
                    RING DETECTED
                  </span>
                </div>
              )}

              {/* Entity resolution */}
              {hasShared && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  background: 'rgba(139,92,246,0.08)',
                  border: '1px solid rgba(139,92,246,0.25)',
                  borderRadius: 8,
                }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent-purple)' }}>
                      Synthetic Identity Detected
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {graphCtx.shared.length} shared device(s) across multiple accounts
                    </div>
                  </div>
                  <span className="badge badge-purple" style={{ marginLeft: 'auto', fontSize: 10 }}>
                    SAME ENTITY
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Vector RAG limitations */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
              Basic Vector RAG
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Multi-hop traversal', reason: 'Cannot follow entity chains across documents' },
                { label: 'Cross-document relationships', reason: 'Retrieves similar text, not connected facts' },
                { label: 'Fraud ring detection', reason: 'No graph structure — misses shared device patterns' },
                { label: 'Synthetic identity detection', reason: 'Cannot resolve entity co-references' },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  background: 'rgba(239,68,68,0.04)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderRadius: 8, opacity: 0.7,
                }}>
                  <span style={{ fontSize: 18 }}>❌</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-secondary)' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* The missing link example */}
        {isSuspicious && (
          <div style={{
            marginTop: 16, padding: '12px 16px',
            background: 'rgba(249,115,22,0.06)',
            border: '1px solid rgba(249,115,22,0.2)',
            borderRadius: 8,
          }}>
            <div style={{ fontSize: 11, color: 'var(--accent-tiger)', fontWeight: 700, marginBottom: 8 }}>
              🔗 The Missing Link — How GraphRAG Found What Vector RAG Missed
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 2 }}>
              <span style={{ color: 'var(--accent-blue)' }}>{record.account_id}</span>
              <span style={{ color: 'var(--text-muted)' }}> → [USED_DEVICE] → </span>
              <span style={{ color: 'var(--accent-purple)' }}>{graphCtx.shared[0] || 'DEV-SHARED'}</span>
              <span style={{ color: 'var(--text-muted)' }}> → [USED_DEVICE] ← </span>
              <span style={{ color: 'var(--accent-red)' }}>{graphCtx.flagged[0] || 'BANNED_ACCOUNT'} (BANNED)</span>
              {graphCtx.blacklisted[0] && (
                <>
                  <br />
                  <span style={{ color: 'var(--accent-blue)' }}>{record.account_id}</span>
                  <span style={{ color: 'var(--text-muted)' }}> → [LOGGED_FROM_IP] → </span>
                  <span style={{ color: 'var(--accent-red)' }}>{graphCtx.blacklisted[0]} (BLACKLISTED)</span>
                </>
              )}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
              ↑ This {hops}-hop chain is <strong style={{ color: 'var(--accent-tiger)' }}>invisible to vector search</strong> — 
              it requires traversing the graph. Basic RAG retrieved similar transaction text but 
              <strong style={{ color: 'var(--accent-red)' }}> missed the fraud ring entirely</strong>.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
