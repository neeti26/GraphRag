import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'

// Gemini 2.0 Flash pricing
const INPUT_PRICE  = 0.075 / 1_000_000   // per token
const OUTPUT_PRICE = 0.30  / 1_000_000   // per token

function calcMonthlyCost(avgCostPerQuery, queriesPerDay) {
  return (avgCostPerQuery * queriesPerDay * 30).toFixed(2)
}

const QUERY_SCALES = [
  { label: '1K/day',   value: 1_000 },
  { label: '10K/day',  value: 10_000 },
  { label: '100K/day', value: 100_000 },
]

export default function CostMetrics({ summary }) {
  const [scale, setScale] = useState(10_000)

  const b  = summary?.pipeline_1_baseline  || {}
  const br = summary?.pipeline_2_basic_rag || {}
  const g  = summary?.pipeline_3_graphrag  || {}

  const bCost  = b.avg_cost_usd  || 0
  const brCost = br.avg_cost_usd || 0
  const gCost  = g.avg_cost_usd  || 0

  const scaleData = QUERY_SCALES.map(s => ({
    name: s.label,
    Baseline:  parseFloat(calcMonthlyCost(bCost,  s.value)),
    'Basic RAG': parseFloat(calcMonthlyCost(brCost, s.value)),
    GraphRAG:  parseFloat(calcMonthlyCost(gCost,  s.value)),
  }))

  const saving = parseFloat(calcMonthlyCost(brCost - gCost, scale))
  const savingPct = brCost > 0 ? Math.round((brCost - gCost) / brCost * 100) : 0

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>{p.name}: ${p.value.toFixed(2)}/mo</div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Per-query cost */}
      <div className="grid-3">
        {[
          { label: 'Baseline LLM',  cost: bCost,  color: 'var(--accent-red)' },
          { label: 'Basic RAG',     cost: brCost, color: 'var(--accent-blue)' },
          { label: 'GraphRAG',      cost: gCost,  color: 'var(--accent-green)' },
        ].map(p => (
          <div key={p.label} className="card" style={{ textAlign: 'center', borderColor: `${p.color}44` }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>{p.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: p.color }}>${(p.cost * 1_000_000).toFixed(2)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>per million queries (μ$)</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>${p.cost.toFixed(7)} / query</div>
          </div>
        ))}
      </div>

      {/* Scale selector + savings */}
      <div className="card" style={{ borderColor: 'rgba(16,185,129,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Monthly Cost at Scale</div>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            {QUERY_SCALES.map(s => (
              <button
                key={s.value}
                className={`btn ${scale === s.value ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 12px', fontSize: 11 }}
                onClick={() => setScale(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid-3" style={{ marginBottom: 16 }}>
          {[
            { label: 'Baseline',  cost: calcMonthlyCost(bCost,  scale), color: 'var(--accent-red)' },
            { label: 'Basic RAG', cost: calcMonthlyCost(brCost, scale), color: 'var(--accent-blue)' },
            { label: 'GraphRAG',  cost: calcMonthlyCost(gCost,  scale), color: 'var(--accent-green)' },
          ].map(p => (
            <div key={p.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: p.color }}>${p.cost}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{p.label}/month</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.08)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-green)' }}>${saving > 0 ? saving : 0}</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 8 }}>
            saved per month vs Basic RAG ({savingPct}% reduction) at {QUERY_SCALES.find(s => s.value === scale)?.label}
          </span>
        </div>
      </div>

      {/* Scale chart */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>Monthly Cost Across All Scales (USD)</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          Pricing: Gemini 2.0 Flash — $0.075/1M input · $0.30/1M output
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={scaleData} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
            <Bar dataKey="Baseline"   fill="var(--accent-red)"   radius={[4,4,0,0]} />
            <Bar dataKey="Basic RAG"  fill="var(--accent-blue)"  radius={[4,4,0,0]} />
            <Bar dataKey="GraphRAG"   fill="var(--accent-green)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Token delta formula */}
      <div className="card" style={{ background: 'var(--bg-secondary)' }}>
        <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>Token Efficiency Formula</div>
        <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--accent-cyan)', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
          % Reduction = (Basic RAG Tokens − GraphRAG Tokens) / Basic RAG Tokens × 100
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Basic RAG avg: <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{br.avg_tokens} tokens</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            GraphRAG avg: <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{g.avg_tokens} tokens</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            = <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>
              {br.avg_tokens > 0 ? Math.round((br.avg_tokens - g.avg_tokens) / br.avg_tokens * 100) : 0}% reduction
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
