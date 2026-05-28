import React, { useState } from 'react'
import { runQuery } from '../api.js'
import GSQLViewer from './GSQLViewer.jsx'

const DEMO_ACCOUNTS = [
  { id: 'FR0000A00', label: '⚠️ Fraud Ring Member', hint: 'Shares device + blacklisted IP' },
  { id: 'ACC0000042', label: '✅ Clean Account', hint: 'No suspicious connections' },
  { id: 'FR0001A01', label: '⚠️ Flagged Account', hint: 'Connected to banned accounts' },
  { id: 'FR0002A00', label: '⚠️ Ring Leader', hint: '5-account fraud ring' },
]

function PipelineResult({ title, color, result, loading }) {
  if (loading) return (
    <div className="card" style={{ flex: 1, borderColor: `${color}44` }}>
      <div style={{ fontWeight: 700, color, marginBottom: 12, fontSize: 13 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="pulse" style={{ height: 12, background: 'var(--border)', borderRadius: 6, width: `${60 + i * 10}%` }} />
        ))}
      </div>
    </div>
  )

  if (!result) return (
    <div className="card" style={{ flex: 1, borderColor: 'var(--border)' }}>
      <div style={{ fontWeight: 700, color, marginBottom: 12, fontSize: 13 }}>{title}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Enter an account ID and click Run</div>
    </div>
  )

  const verdictColor = result.verdict === 'SUSPICIOUS' ? 'var(--accent-red)' : 'var(--accent-green)'

  return (
    <div className="card slide-in" style={{ flex: 1, borderColor: `${color}44` }}>
      <div style={{ fontWeight: 700, color, marginBottom: 12, fontSize: 13 }}>{title}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: verdictColor }}>{result.verdict}</span>
        {result.risk_score !== undefined && (
          <span style={{ fontSize: 14, fontWeight: 700, color: result.risk_score > 7 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
            {result.risk_score}/10
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color }}>{result.tokens}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>tokens</div>
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{Math.round(result.latency_ms)}ms</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>latency</div>
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>${(result.cost_usd * 1000000).toFixed(2)}μ</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>cost</div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, maxHeight: 120, overflowY: 'auto' }}>
        {result.reasoning}
      </div>

      {result.graph_evidence && result.graph_evidence.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Graph Evidence</div>
          {result.graph_evidence.slice(0, 4).map((e, i) => (
            <div key={i} style={{ fontSize: 11, color: e.startsWith('ALERT') ? 'var(--accent-red)' : 'var(--accent-orange)', padding: '2px 0' }}>
              {e.startsWith('ALERT') ? '🚨' : '•'} {e}
            </div>
          ))}
        </div>
      )}

      {result.agentic_loop_triggered && (
        <div style={{ marginTop: 10 }}>
          <span className="badge badge-orange">🔄 AGENTIC LOOP TRIGGERED</span>
        </div>
      )}
    </div>
  )
}

export default function LiveQuery() {
  const [accountId, setAccountId] = useState('')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState(null)

  async function handleRun() {
    const id = accountId.trim()
    if (!id) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await runQuery(id)
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function selectDemo(id) {
    setAccountId(id)
    setResult(null)
    setError(null)
  }

  const b  = result?.pipeline_1_baseline
  const br = result?.pipeline_2_basic_rag
  const g  = result?.pipeline_3_graphrag
  const cmp = result?.comparison

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Input */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 13 }}>🔍 Live Query — Run All 3 Pipelines</div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <input
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRun()}
            placeholder="Enter Account ID (e.g. FR0000A00)"
            style={{
              flex: 1, minWidth: 200,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '10px 14px',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <button
            className="btn btn-tiger"
            onClick={handleRun}
            disabled={loading || !accountId.trim()}
            style={{ opacity: loading || !accountId.trim() ? 0.6 : 1 }}
          >
            {loading ? '⏳ Running...' : '▶ Run All Pipelines'}
          </button>
        </div>

        {/* Demo account shortcuts */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>Quick select:</span>
          {DEMO_ACCOUNTS.map(a => (
            <button
              key={a.id}
              className="btn btn-ghost"
              style={{ padding: '5px 12px', fontSize: 11 }}
              onClick={() => selectDemo(a.id)}
              title={a.hint}
            >
              {a.label} <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{a.id}</span>
            </button>
          ))}
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 12, color: 'var(--accent-red)' }}>
            ⚠️ {error}
            <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 11 }}>
              Make sure the API server is running: <code>python api_server.py</code>
            </div>
          </div>
        )}
      </div>

      {/* Three pipeline results */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <PipelineResult title="Pipeline 1 — Baseline LLM" color="var(--accent-red)"   result={b}  loading={loading} />
        <PipelineResult title="Pipeline 2 — Basic RAG"    color="var(--accent-blue)"  result={br} loading={loading} />
        <PipelineResult title="Pipeline 3 — GraphRAG"     color="var(--accent-green)" result={g}  loading={loading} />
      </div>

      {/* GSQL Viewer — shows live-injected traversal query after result */}
      {g && !loading && (
        <GSQLViewer
          accountId={accountId.trim()}
          record={{
            account_id: accountId.trim(),
            hops_traversed: 3,
            nodes_visited: g.nodes_visited || 0,
            flagged_connections: g.flagged_connections || [],
            blacklisted_ips: g.blacklisted_ips || [],
            graph_evidence: g.graph_evidence || [],
            structured_tuples: g.structured_tuples || [],
          }}
          autoExpand={true}
        />
      )}

      {/* Comparison summary */}
      {cmp && (
        <div className="card slide-in" style={{ borderColor: 'rgba(16,185,129,0.3)' }}>
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 13, color: 'var(--accent-green)' }}>
            📊 GraphRAG vs Basic RAG — Live Comparison
          </div>
          <div className="grid-3">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-green)' }}>{cmp.token_savings_vs_basic_rag_pct}%</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Token Savings</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-cyan)' }}>{cmp.latency_improvement_pct}%</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Faster</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-purple)' }}>{cmp.cost_savings_pct}%</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cost Savings</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
