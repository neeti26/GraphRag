import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from 'recharts'

const STAGE_COLORS = {
  'Graph Traversal':    'var(--accent-tiger)',
  'Relevance Ranking':  'var(--accent-purple)',
  'Prompt Build':       'var(--accent-cyan)',
  'LLM Inference':      'var(--accent-green)',
  'Self-Correction':    'var(--accent-orange)',
}

export default function LatencyBreakdown({ records }) {
  if (!records || records.length === 0) return null

  // Average latency profiles across all records
  const profiles = records.map(r => r.latency_profile).filter(Boolean)
  if (profiles.length === 0) return null

  const avg = key => Math.round(profiles.reduce((s, p) => s + (p[key] || 0), 0) / profiles.length)

  const stages = [
    { name: 'Graph Traversal',   ms: avg('graph_traversal_ms') },
    { name: 'Relevance Ranking', ms: avg('relevance_ranking_ms') },
    { name: 'Prompt Build',      ms: avg('prompt_build_ms') },
    { name: 'LLM Inference',     ms: avg('llm_inference_ms') },
    { name: 'Self-Correction',   ms: avg('self_correction_ms') },
  ].filter(s => s.ms > 0)

  const total = stages.reduce((s, st) => s + st.ms, 0)

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null
    const ms = payload[0]?.value || 0
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
        <div style={{ color: 'var(--accent-cyan)' }}>{ms}ms ({total > 0 ? ((ms/total)*100).toFixed(1) : 0}%)</div>
      </div>
    )
  }

  return (
    <div className="card">
      <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>GraphRAG Latency Breakdown</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
        Time per stage — avg across {profiles.length} queries
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {stages.map(s => (
          <div key={s.name} style={{ textAlign: 'center', minWidth: 80 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: STAGE_COLORS[s.name] || 'var(--text-primary)' }}>{s.ms}ms</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>{s.name}</div>
          </div>
        ))}
        <div style={{ textAlign: 'center', minWidth: 80 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{total}ms</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>Total</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={stages} layout="vertical" barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="ms" radius={[0, 4, 4, 0]}>
            {stages.map((s, i) => (
              <Cell key={i} fill={STAGE_COLORS[s.name] || 'var(--accent-blue)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Self-correction indicator */}
      {profiles.some(p => p.self_correction_ms > 0) && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(249,115,22,0.08)', borderRadius: 8, border: '1px solid rgba(249,115,22,0.2)', fontSize: 12, color: 'var(--accent-orange)' }}>
          🔄 Self-correction layer active — verifying answers against graph paths
        </div>
      )}
    </div>
  )
}
