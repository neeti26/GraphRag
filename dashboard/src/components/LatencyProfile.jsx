import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from 'recharts'

const STAGE_COLORS = {
  'Graph Traversal':    'var(--accent-tiger)',
  'Relevance Ranking':  'var(--accent-purple)',
  'Prompt Build':       'var(--accent-blue)',
  'LLM Inference':      'var(--accent-green)',
  'Self-Correction':    'var(--accent-cyan)',
}

function LatencyBar({ label, ms, total, color }) {
  const pct = total > 0 ? Math.round(ms / total * 100) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{ms.toFixed(0)}ms <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function LatencyProfile({ records }) {
  if (!records || records.length === 0) return null

  // Aggregate latency profiles across records
  const profiles = records
    .map(r => r.latency_profile)
    .filter(p => p && p.total_ms > 0)

  if (profiles.length === 0) return null

  const avg = key => Math.round(profiles.reduce((s, p) => s + (p[key] || 0), 0) / profiles.length)

  const stages = {
    'Graph Traversal':   avg('graph_traversal_ms'),
    'Relevance Ranking': avg('relevance_ranking_ms'),
    'Prompt Build':      avg('prompt_build_ms'),
    'LLM Inference':     avg('llm_inference_ms'),
    'Self-Correction':   avg('self_correction_ms'),
  }
  const total = Object.values(stages).reduce((a, b) => a + b, 0)

  const barData = Object.entries(stages).map(([name, ms]) => ({ name, ms }))

  // Cost at scale
  const avgCostPerQuery = records.reduce((s, r) => s + (r.graphrag_cost_usd || 0), 0) / records.length
  const baselineCost    = records.reduce((s, r) => s + (r.baseline_cost_usd || 0), 0) / records.length

  const scaleRows = [1000, 10000, 100000].map(qpd => ({
    qpd,
    baseline: (baselineCost * qpd * 30).toFixed(2),
    graphrag: (avgCostPerQuery * qpd * 30).toFixed(2),
    savings:  ((baselineCost - avgCostPerQuery) * qpd * 30).toFixed(2),
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Latency breakdown */}
      <div className="grid-2">
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 13 }}>
            GraphRAG Stage Latency Breakdown
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
            Average across {profiles.length} queries · Total: {total}ms
          </div>
          {Object.entries(stages).map(([label, ms]) => (
            <LatencyBar key={label} label={label} ms={ms} total={total} color={STAGE_COLORS[label] || 'var(--accent-blue)'} />
          ))}
        </div>

        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 13 }}>Stage Breakdown (ms)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} layout="vertical" barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={v => [`${v}ms`]} />
              <Bar dataKey="ms" radius={[0, 4, 4, 0]}>
                {barData.map((d, i) => (
                  <Cell key={i} fill={STAGE_COLORS[d.name] || 'var(--accent-blue)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost at scale */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>💰 Cost at Scale — Monthly Savings (USD)</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          Based on Gemini 1.5 Flash pricing · $0.075/1M input tokens · $0.30/1M output tokens
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Queries/day', 'Baseline/month', 'GraphRAG/month', 'Monthly Savings'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scaleRows.map(row => (
              <tr key={row.qpd} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, fontWeight: 600 }}>{row.qpd.toLocaleString()}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: 'var(--accent-red)' }}>${row.baseline}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: 'var(--accent-green)', fontWeight: 700 }}>${row.graphrag}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: 'var(--accent-cyan)', fontWeight: 700 }}>💰 ${row.savings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Self-correction stats */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 13 }}>🔍 Self-Correction Layer Stats</div>
        <div className="grid-3">
          {[
            { label: 'Queries with self-correction', value: records.filter(r => r.self_correction_triggered).length, color: 'var(--accent-cyan)' },
            { label: 'Agentic loop triggered', value: records.filter(r => r.agentic_loop_triggered).length, color: 'var(--accent-orange)' },
            { label: 'Avg relevance score', value: (records.reduce((s, r) => s + (r.relevance_score || 0), 0) / records.length).toFixed(3), color: 'var(--accent-purple)' },
          ].map(m => (
            <div key={m.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
