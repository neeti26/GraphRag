import React, { useState } from 'react'

function VerdictBadge({ verdict, correct }) {
  const color = verdict === 'SUSPICIOUS' ? 'var(--accent-red)' : 'var(--accent-green)'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ color, fontWeight: 700, fontSize: 12 }}>{verdict}</span>
      {correct !== undefined && (
        <span style={{ fontSize: 11 }}>{correct ? '✅' : '❌'}</span>
      )}
    </span>
  )
}

function JudgeBadge({ value }) {
  if (!value || value === 'PENDING') return <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: value === 'PASS' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
      color: value === 'PASS' ? 'var(--accent-green)' : 'var(--accent-red)',
      border: `1px solid ${value === 'PASS' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
    }}>{value}</span>
  )
}

export default function BenchmarkTable({ records }) {
  const [expanded, setExpanded] = useState(null)
  const [sortKey, setSortKey] = useState('token_savings_vs_basic_rag_pct')
  const [sortDir, setSortDir] = useState('desc')

  const sorted = [...records].sort((a, b) => {
    const av = a[sortKey] ?? 0
    const bv = b[sortKey] ?? 0
    return sortDir === 'desc' ? bv - av : av - bv
  })

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const Th = ({ label, k }) => (
    <th
      onClick={() => k && toggleSort(k)}
      style={{
        padding: '10px 12px', textAlign: 'center', fontSize: 11,
        color: sortKey === k ? 'var(--accent-blue)' : 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600,
        cursor: k ? 'pointer' : 'default', whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {label} {k && sortKey === k ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </th>
  )

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Full Benchmark Results</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{records.length} questions · Click row to expand</div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--bg-secondary)' }}>
            <tr>
              <Th label="Account" />
              <Th label="Ground Truth" />
              <Th label="Baseline" />
              <Th label="Basic RAG" />
              <Th label="GraphRAG" />
              <Th label="B Tokens" k="baseline_tokens" />
              <Th label="RAG Tokens" k="basic_rag_tokens" />
              <Th label="GR Tokens" k="graphrag_tokens" />
              <Th label="Savings %" k="token_savings_vs_basic_rag_pct" />
              <Th label="Judge" k="graphrag_llm_judge" />
              <Th label="BERTScore" k="graphrag_bertscore" />
              <Th label="Risk" k="graphrag_risk_score" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <React.Fragment key={i}>
                <tr
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: expanded === i ? 'var(--bg-card-hover)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = expanded === i ? 'var(--bg-card-hover)' : 'transparent'}
                >
                  <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{r.account_id}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ color: r.ground_truth === 'SUSPICIOUS' ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: 700, fontSize: 12 }}>{r.ground_truth}</span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}><VerdictBadge verdict={r.baseline_verdict} correct={r.baseline_correct} /></td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}><VerdictBadge verdict={r.basic_rag_verdict} correct={r.basic_rag_correct} /></td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}><VerdictBadge verdict={r.graphrag_verdict} correct={r.graphrag_correct} /></td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: 'var(--accent-red)' }}>{r.baseline_tokens}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: 'var(--accent-blue)' }}>{r.basic_rag_tokens}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: 'var(--accent-green)' }}>{r.graphrag_tokens}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: (r.token_savings_vs_basic_rag_pct || 0) > 50 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                      {r.token_savings_vs_basic_rag_pct || 0}%
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}><JudgeBadge value={r.graphrag_llm_judge} /></td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {r.graphrag_bertscore ? r.graphrag_bertscore.toFixed(3) : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: (r.graphrag_risk_score || 0) > 7 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                      {r.graphrag_risk_score || 0}
                    </span>
                  </td>
                </tr>
                {expanded === i && (
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    <td colSpan={12} style={{ padding: '16px 20px' }}>
                      <div className="grid-2" style={{ gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>GraphRAG Reasoning</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{r.graphrag_reasoning}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Graph Evidence ({r.graph_evidence?.length || 0} items)</div>
                          {(r.graph_evidence || []).map((e, j) => (
                            <div key={j} style={{ fontSize: 12, color: 'var(--accent-orange)', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>• {e}</div>
                          ))}
                          {r.neighborhood_summary && (
                            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--accent-cyan)', fontStyle: 'italic' }}>{r.neighborhood_summary}</div>
                          )}
                          {r.agentic_loop_triggered && (
                            <div style={{ marginTop: 10 }}>
                              <span className="badge badge-orange">🔄 AGENTIC LOOP TRIGGERED</span>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{r.agentic_refinement}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
