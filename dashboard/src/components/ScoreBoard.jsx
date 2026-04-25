import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'

function useCountUp(target, delay = 0) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => {
      let s = null
      const step = ts => {
        if (!s) s = ts
        const p = Math.min((ts - s) / 1400, 1)
        setVal(+(target * (1 - Math.pow(1 - p, 4))).toFixed(1))
        if (p < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, delay)
    return () => clearTimeout(t)
  }, [target])
  return val
}

function KpiCard({ icon, label, baseline, graphrag, unit = '', color, delay = 0 }) {
  const bNum = parseFloat(baseline) || 0
  const gNum = parseFloat(graphrag) || 0
  const bAnim = useCountUp(bNum, delay * 1000)
  const gAnim = useCountUp(gNum, delay * 1000 + 150)
  const improvement = bNum > 0 ? (((bNum - gNum) / bNum) * 100).toFixed(0) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, boxShadow: `0 12px 40px ${color}25` }}
      className="card"
      style={{ padding: '22px 20px', borderTop: `2px solid ${color}`, cursor: 'default', transition: 'box-shadow 0.3s' }}
    >
      <div style={{ position: 'absolute', top: -24, right: -24, width: 90, height: 90, borderRadius: '50%', background: `radial-gradient(circle,${color}18 0%,transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ fontSize: 20, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14, fontFamily: 'var(--mono)' }}>{label}</div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, textAlign: 'center', padding: '10px 6px', background: 'rgba(255,59,92,0.08)', borderRadius: 8, border: '1px solid rgba(255,59,92,0.2)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Baseline</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--red)', fontFamily: 'var(--mono)', letterSpacing: '-1px' }}>{bAnim}{unit}</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', padding: '10px 6px', background: 'rgba(0,230,118,0.08)', borderRadius: 8, border: '1px solid rgba(0,230,118,0.2)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>GraphRAG</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--mono)', letterSpacing: '-1px' }}>{gAnim}{unit}</div>
        </div>
      </div>
      {improvement && parseFloat(improvement) > 0 && (
        <div style={{ marginTop: 10, textAlign: 'center', fontSize: 10, color, fontFamily: 'var(--mono)', fontWeight: 700 }}>
          ↓ {improvement}% better
        </div>
      )}
    </motion.div>
  )
}

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(2,9,18,0.97)', border: '1px solid var(--border2)', borderRadius: 10, padding: '12px 16px', fontSize: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.7)' }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'var(--mono)', fontSize: 11 }}>Account #{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 4 }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <strong style={{ fontFamily: 'var(--mono)', color: p.color }}>{p.value.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  )
}

export default function ScoreBoard({ summary, records }) {
  const tokenData   = records.map(r => ({ id: r.account_id, Baseline: r.baseline_tokens, GraphRAG: r.graphrag_tokens }))
  const latencyData = records.map(r => ({ id: r.account_id, Baseline: Math.round(r.baseline_latency_ms), GraphRAG: Math.round(r.graphrag_latency_ms) }))
  const accuracyData = [
    { name: 'GraphRAG', value: summary.graphrag_accuracy_pct, fill: '#00e676' },
    { name: 'Baseline', value: summary.baseline_accuracy_pct, fill: '#ff3b5c' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="card" style={{ padding: '32px 36px', borderTop: '2px solid var(--red)', position: 'relative', overflow: 'hidden' }}>
        <div className="scan-line" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 40, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {[['SYNTHETIC IDENTITY DETECTION', 'var(--red)'], ['TIGERGRAPH HACKATHON 2025', 'var(--green)'], ['AI FACTORY MODEL', 'var(--cyan)']].map(([l, c]) => (
                <span key={l} style={{ padding: '3px 12px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: `${c}12`, color: c, border: `1px solid ${c}30`, fontFamily: 'var(--mono)', letterSpacing: 1.5 }}>{l}</span>
              ))}
            </div>
            <h1 style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-2.5px', lineHeight: 1.05, marginBottom: 12, background: 'linear-gradient(135deg,#fff 0%,var(--red2) 45%,var(--orange) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              FraudGraph
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', maxWidth: 520, lineHeight: 1.7, marginBottom: 20 }}>
              TigerGraph 3-hop traversal catches synthetic identity rings that fool baseline LLMs.
              Account <strong style={{ color: 'var(--cyan)', fontFamily: 'var(--mono)' }}>#8821</strong> looks innocent in raw logs —
              the graph reveals it shares a device with a <strong style={{ color: 'var(--red)' }}>banned fraudster</strong> and a <strong style={{ color: 'var(--red)' }}>blacklisted IP</strong>.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[['50% → 100%', 'Detection Accuracy', 'var(--green)'], ['94.5%', 'Token Savings', 'var(--cyan)'], ['2 Caught', 'Hallucinations Fixed', 'var(--orange)'], ['70%', 'Latency Speedup', 'var(--yellow)']].map(([v, l, c]) => (
                <div key={l} style={{ padding: '10px 16px', background: `${c}10`, borderRadius: 10, border: `1px solid ${c}25` }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: c, fontFamily: 'var(--mono)', letterSpacing: '-0.5px' }}>{v}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Accuracy radial */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, fontFamily: 'var(--mono)' }}>Detection Accuracy</div>
            <ResponsiveContainer width={180} height={180}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="40%" outerRadius="90%" data={accuracyData} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={6} />
                <text x="50%" y="44%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 28, fontWeight: 900, fill: '#00e676', fontFamily: 'var(--mono)' }}>100%</text>
                <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 11, fill: '#3d5a7a', fontFamily: 'var(--mono)' }}>GraphRAG</text>
              </RadialBarChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'var(--mono)', fontWeight: 700 }}>Baseline: 50%</div>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Cards ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        <KpiCard delay={0}    icon="🎯" label="Detection Accuracy" baseline={summary.baseline_accuracy_pct} graphrag={summary.graphrag_accuracy_pct} unit="%" color="var(--green)" />
        <KpiCard delay={0.08} icon="🔢" label="Avg Tokens / Query"  baseline={Math.round(summary.total_baseline_tokens / summary.total_accounts)} graphrag={Math.round(summary.total_graphrag_tokens / summary.total_accounts)} color="var(--cyan)" />
        <KpiCard delay={0.16} icon="⚡" label="Avg Latency"         baseline={Math.round(records.reduce((s, r) => s + r.baseline_latency_ms, 0) / records.length)} graphrag={Math.round(records.reduce((s, r) => s + r.graphrag_latency_ms, 0) / records.length)} unit="ms" color="var(--yellow)" />
        <KpiCard delay={0.24} icon="💰" label="Cost / Query ($)"    baseline={(summary.total_baseline_cost_usd / summary.total_accounts).toFixed(5)} graphrag={(summary.total_graphrag_cost_usd / summary.total_accounts).toFixed(5)} color="var(--purple)" />
      </div>

      {/* ── Charts ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="card" style={{ padding: '20px 20px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Token Usage per Account</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>GraphRAG uses <span style={{ color: 'var(--cyan)', fontFamily: 'var(--mono)', fontWeight: 700 }}>~94%</span> fewer tokens</div>
            </div>
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 9, fontWeight: 800, background: 'rgba(0,180,216,0.12)', color: 'var(--cyan)', border: '1px solid rgba(0,180,216,0.3)', fontFamily: 'var(--mono)', letterSpacing: 1 }}>TOKENS</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tokenData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,46,74,0.4)" vertical={false} />
              <XAxis dataKey="id" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--mono)' }} tickFormatter={v => `#${v}`} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--mono)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(0,180,216,0.04)' }} />
              <Bar dataKey="Baseline" fill="var(--red)"  radius={[5, 5, 0, 0]} maxBarSize={36} fillOpacity={0.85} name="Baseline" />
              <Bar dataKey="GraphRAG" fill="var(--cyan)" radius={[5, 5, 0, 0]} maxBarSize={36} fillOpacity={0.85} name="GraphRAG" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }} className="card" style={{ padding: '20px 20px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Response Latency</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>GraphRAG responds <span style={{ color: 'var(--green)', fontFamily: 'var(--mono)', fontWeight: 700 }}>~70%</span> faster</div>
            </div>
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 9, fontWeight: 800, background: 'rgba(0,230,118,0.12)', color: 'var(--green)', border: '1px solid rgba(0,230,118,0.3)', fontFamily: 'var(--mono)', letterSpacing: 1 }}>LATENCY</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={latencyData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,46,74,0.4)" vertical={false} />
              <XAxis dataKey="id" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--mono)' }} tickFormatter={v => `#${v}`} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--mono)' }} axisLine={false} tickLine={false} unit="ms" />
              <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(0,230,118,0.04)' }} />
              <Bar dataKey="Baseline" fill="var(--red)"   radius={[5, 5, 0, 0]} maxBarSize={36} fillOpacity={0.85} name="Baseline" />
              <Bar dataKey="GraphRAG" fill="var(--green)" radius={[5, 5, 0, 0]} maxBarSize={36} fillOpacity={0.85} name="GraphRAG" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* ── Per-account table ────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card" style={{ padding: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>Per-Account Detection Results</div>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 110px 110px 110px 130px', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: 'var(--mono)', padding: '0 14px 12px', borderBottom: '1px solid var(--border)' }}>
          <span>Account</span><span>Baseline</span><span>GraphRAG</span><span>Tokens ↓</span><span>Latency ↓</span><span>Risk</span><span>Outcome</span>
        </div>
        {records.map((r, i) => {
          const isHallucination = !r.baseline_correct && r.graphrag_correct
          return (
            <motion.div key={r.account_id}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 + i * 0.07 }}
              style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 110px 110px 110px 130px', padding: '14px 14px', borderBottom: '1px solid var(--border)', alignItems: 'center', background: isHallucination ? 'rgba(255,159,10,0.04)' : 'transparent', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,59,92,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = isHallucination ? 'rgba(255,159,10,0.04)' : 'transparent'}
            >
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--cyan)', fontSize: 14 }}>#{r.account_id}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: r.baseline_verdict === 'SUSPICIOUS' ? 'rgba(255,59,92,0.15)' : 'rgba(0,230,118,0.1)', color: r.baseline_verdict === 'SUSPICIOUS' ? 'var(--red)' : 'var(--green)', border: `1px solid ${r.baseline_verdict === 'SUSPICIOUS' ? 'rgba(255,59,92,0.3)' : 'rgba(0,230,118,0.2)'}` }}>{r.baseline_verdict}</span>
                {!r.baseline_correct && <span style={{ fontSize: 9, color: 'var(--orange)', fontWeight: 800, fontFamily: 'var(--mono)', padding: '1px 6px', background: 'rgba(255,159,10,0.15)', borderRadius: 6 }}>WRONG</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: r.graphrag_verdict === 'SUSPICIOUS' ? 'rgba(255,59,92,0.15)' : 'rgba(0,230,118,0.1)', color: r.graphrag_verdict === 'SUSPICIOUS' ? 'var(--red)' : 'var(--green)', border: `1px solid ${r.graphrag_verdict === 'SUSPICIOUS' ? 'rgba(255,59,92,0.3)' : 'rgba(0,230,118,0.2)'}` }}>{r.graphrag_verdict}</span>
                {r.graphrag_correct && <span style={{ fontSize: 9, color: 'var(--green)', fontWeight: 800, fontFamily: 'var(--mono)' }}>✓</span>}
              </div>
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--cyan)', fontSize: 12, fontWeight: 700 }}>{r.token_savings_pct}%</span>
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--green)', fontSize: 12, fontWeight: 700 }}>{r.latency_improvement_pct}%</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 32, height: 4, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${r.graphrag_risk_score * 10}%`, background: r.graphrag_risk_score > 5 ? 'var(--red)' : 'var(--green)', borderRadius: 2 }} />
                </div>
                <span style={{ fontFamily: 'var(--mono)', color: r.graphrag_risk_score > 5 ? 'var(--red)' : 'var(--green)', fontSize: 12, fontWeight: 700 }}>{r.graphrag_risk_score}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>{isHallucination ? '⚠️' : r.graphrag_correct ? '✅' : '❌'}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: isHallucination ? 'var(--orange)' : r.graphrag_correct ? 'var(--green)' : 'var(--red)' }}>
                  {isHallucination ? 'Hallucination' : r.graphrag_correct ? 'Correct' : 'Missed'}
                </span>
              </div>
            </motion.div>
          )
        })}

        {/* Summary footer */}
        <div style={{ display: 'flex', gap: 24, padding: '16px 14px 0', marginTop: 4 }}>
          {[
            [`${records.filter(r => r.graphrag_correct).length}/${records.length}`, 'GraphRAG correct', 'var(--green)'],
            [`${records.filter(r => r.baseline_correct).length}/${records.length}`, 'Baseline correct', 'var(--red)'],
            [`${records.filter(r => !r.baseline_correct && r.graphrag_correct).length}`, 'Hallucinations caught', 'var(--orange)'],
          ].map(([v, l, c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: c, fontFamily: 'var(--mono)' }}>{v}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
