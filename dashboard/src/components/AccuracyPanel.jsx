import React from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'

function BonusBadge({ hit, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px',
      background: hit ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
      border: `1px solid ${hit ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
      borderRadius: 10,
    }}>
      <span style={{ fontSize: 22 }}>{hit ? '✅' : '⏳'}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: hit ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
          {hit ? 'BONUS UNLOCKED' : 'NOT YET'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
      </div>
    </div>
  )
}

function JudgeRow({ record }) {
  const judgeColor = v => v === 'PASS' ? 'var(--accent-green)' : v === 'FAIL' ? 'var(--accent-red)' : 'var(--text-muted)'
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{record.account_id}</td>
      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
        <span style={{ color: record.ground_truth === 'SUSPICIOUS' ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: 600, fontSize: 12 }}>
          {record.ground_truth}
        </span>
      </td>
      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
        <span style={{ color: judgeColor(record.baseline_llm_judge), fontWeight: 700, fontSize: 12 }}>{record.baseline_llm_judge || '—'}</span>
      </td>
      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
        <span style={{ color: judgeColor(record.basic_rag_llm_judge), fontWeight: 700, fontSize: 12 }}>{record.basic_rag_llm_judge || '—'}</span>
      </td>
      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
        <span style={{ color: judgeColor(record.graphrag_llm_judge), fontWeight: 700, fontSize: 12 }}>{record.graphrag_llm_judge || '—'}</span>
      </td>
      <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
        {record.graphrag_bertscore ? record.graphrag_bertscore.toFixed(3) : '—'}
      </td>
    </tr>
  )
}

export default function AccuracyPanel({ summary, records }) {
  const g  = summary?.pipeline_3_graphrag || {}
  const br = summary?.pipeline_2_basic_rag || {}
  const b  = summary?.pipeline_1_baseline || {}
  const bonus = summary?.bonus_thresholds || {}

  const radarData = [
    { metric: 'LLM-Judge', Baseline: b.llm_judge_pass_rate_pct || 0, BasicRAG: br.llm_judge_pass_rate_pct || 0, GraphRAG: g.llm_judge_pass_rate_pct || 0 },
    { metric: 'Accuracy',  Baseline: b.accuracy_pct || 0,            BasicRAG: br.accuracy_pct || 0,            GraphRAG: g.accuracy_pct || 0 },
    { metric: 'BERTScore', Baseline: (b.bertscore_f1_mean || 0) * 100, BasicRAG: (br.bertscore_f1_mean || 0) * 100, GraphRAG: (g.bertscore_f1_mean || 0) * 100 },
  ]

  const barData = [
    { name: 'Baseline',  judge: b.llm_judge_pass_rate_pct || 0, bert: ((b.bertscore_f1_mean || 0) * 100).toFixed(1) },
    { name: 'Basic RAG', judge: br.llm_judge_pass_rate_pct || 0, bert: ((br.bertscore_f1_mean || 0) * 100).toFixed(1) },
    { name: 'GraphRAG',  judge: g.llm_judge_pass_rate_pct || 0, bert: ((g.bertscore_f1_mean || 0) * 100).toFixed(1) },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Bonus status */}
      <div className="grid-2">
        <BonusBadge hit={bonus.llm_judge_ge_90pct} label="LLM-Judge pass rate ≥ 90%" />
        <BonusBadge hit={bonus.bertscore_rescaled_ge_055} label="BERTScore F1 rescaled ≥ 0.55" />
      </div>

      {/* Score cards */}
      <div className="grid-3">
        {[
          { label: 'Baseline LLM', judge: b.llm_judge_pass_rate_pct, bert: b.bertscore_f1_mean, color: 'var(--accent-red)' },
          { label: 'Basic RAG',    judge: br.llm_judge_pass_rate_pct, bert: br.bertscore_f1_mean, color: 'var(--accent-blue)' },
          { label: 'GraphRAG',     judge: g.llm_judge_pass_rate_pct, bert: g.bertscore_f1_mean, color: 'var(--accent-green)' },
        ].map(p => (
          <div key={p.label} className="card" style={{ borderColor: `${p.color}44` }}>
            <div style={{ fontWeight: 700, color: p.color, marginBottom: 14, fontSize: 13 }}>{p.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>LLM-Judge Pass Rate</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: (p.judge || 0) >= 90 ? 'var(--accent-green)' : 'var(--text-primary)' }}>{p.judge || 0}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${p.judge || 0}%`, background: p.color }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Target: ≥90%</div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>BERTScore F1</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: (p.bert || 0) >= 0.55 ? 'var(--accent-green)' : 'var(--text-primary)' }}>{(p.bert || 0).toFixed ? (p.bert || 0).toFixed(3) : p.bert}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min((p.bert || 0) * 100, 100)}%`, background: p.color }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Target: ≥0.55 rescaled</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 13 }}>LLM-Judge Pass Rate Comparison (%)</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="judge" name="LLM-Judge %" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-record judge table */}
      {records.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 13 }}>Per-Question Accuracy Breakdown</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Account', 'Ground Truth', 'Baseline Judge', 'Basic RAG Judge', 'GraphRAG Judge', 'GraphRAG BERTScore'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => <JudgeRow key={i} record={r} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
