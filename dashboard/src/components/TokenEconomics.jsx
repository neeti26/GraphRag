import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, LineChart, Line, Legend, ReferenceLine } from 'recharts'

export default function TokenEconomics({ summary, records }) {
  const g  = summary?.pipeline_3_graphrag || {}
  const br = summary?.pipeline_2_basic_rag || {}
  const b  = summary?.pipeline_1_baseline || {}
  const vs = summary?.graphrag_vs_basic_rag || {}

  const tokenData = [
    { name: 'Baseline LLM', tokens: b.avg_tokens || 0,  fill: '#ef4444' },
    { name: 'Basic RAG',    tokens: br.avg_tokens || 0, fill: '#3b82f6' },
    { name: 'GraphRAG',     tokens: g.avg_tokens || 0,  fill: '#10b981' },
  ]

  const costData = [
    { name: 'Baseline', cost: ((b.avg_cost_usd || 0) * 1000000).toFixed(2),  fill: '#ef4444' },
    { name: 'Basic RAG', cost: ((br.avg_cost_usd || 0) * 1000000).toFixed(2), fill: '#3b82f6' },
    { name: 'GraphRAG',  cost: ((g.avg_cost_usd || 0) * 1000000).toFixed(2),  fill: '#10b981' },
  ]

  const latencyData = [
    { name: 'Baseline', ms: b.avg_latency_ms || 0,  fill: '#ef4444' },
    { name: 'Basic RAG', ms: br.avg_latency_ms || 0, fill: '#3b82f6' },
    { name: 'GraphRAG',  ms: g.avg_latency_ms || 0,  fill: '#10b981' },
  ]

  // Per-record token trend
  const trendData = records.map((r, i) => ({
    name: r.account_id,
    Baseline: r.baseline_tokens,
    'Basic RAG': r.basic_rag_tokens,
    GraphRAG: r.graphrag_tokens,
  }))

  // Scale economics
  const queriesPerDay = [100, 1000, 10000, 100000]
  const scaleData = queriesPerDay.map(q => ({
    name: q >= 1000 ? `${q/1000}K/day` : `${q}/day`,
    Baseline:  +((b.avg_cost_usd || 0) * q * 30).toFixed(2),
    'Basic RAG': +((br.avg_cost_usd || 0) * q * 30).toFixed(2),
    GraphRAG:  +((g.avg_cost_usd || 0) * q * 30).toFixed(2),
  }))

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Headline savings */}
      <div className="grid-3">
        <div className="card" style={{ borderColor: 'rgba(16,185,129,0.3)', textAlign: 'center' }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--accent-green)' }}>{vs.token_savings_pct || 0}%</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Token Reduction</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>GraphRAG vs Basic RAG</div>
        </div>
        <div className="card" style={{ borderColor: 'rgba(6,182,212,0.3)', textAlign: 'center' }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--accent-cyan)' }}>{vs.latency_improvement_pct || 0}%</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Faster Inference</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>GraphRAG vs Basic RAG</div>
        </div>
        <div className="card" style={{ borderColor: 'rgba(139,92,246,0.3)', textAlign: 'center' }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--accent-purple)' }}>{vs.cost_savings_pct || 0}%</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Cost Savings</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>GraphRAG vs Basic RAG</div>
        </div>
      </div>

      {/* Token + latency bar charts */}
      <div className="grid-2">
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 13 }}>Avg Tokens per Query</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tokenData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="tokens" radius={[4,4,0,0]}>
                {tokenData.map((d, i) => (
                  <rect key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 13 }}>Avg Latency (ms)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={latencyData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="ms" radius={[4,4,0,0]}>
                {latencyData.map((d, i) => (
                  <rect key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-record token trend */}
      {trendData.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 13 }}>Token Usage per Query — All Pipelines</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              <Line type="monotone" dataKey="Baseline"  stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Basic RAG" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="GraphRAG"  stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Scale economics */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>Monthly Cost at Scale (USD)</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>GraphRAG savings compound dramatically at production scale</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={scaleData} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
            <Bar dataKey="Baseline"  fill="#ef4444" radius={[4,4,0,0]} />
            <Bar dataKey="Basic RAG" fill="#3b82f6" radius={[4,4,0,0]} />
            <Bar dataKey="GraphRAG"  fill="#10b981" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Context window load */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 13 }}>Context Window Efficiency</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Baseline LLM',  tokens: b.avg_tokens || 0,  max: 8192, color: 'var(--accent-red)' },
            { label: 'Basic RAG',     tokens: br.avg_tokens || 0, max: 8192, color: 'var(--accent-blue)' },
            { label: 'GraphRAG',      tokens: g.avg_tokens || 0,  max: 8192, color: 'var(--accent-green)' },
          ].map(p => (
            <div key={p.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: p.color }}>{p.tokens} tokens ({((p.tokens / p.max) * 100).toFixed(1)}% of 8K window)</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.min((p.tokens / p.max) * 100, 100)}%`, background: p.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
