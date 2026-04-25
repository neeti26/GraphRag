import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function useCountUp(target, delay = 0) {
  const [v, setV] = [0, null]
  const [val, setVal] = require('react').useState(0)
  require('react').useEffect(() => {
    const t = setTimeout(() => {
      let s = null
      const step = ts => { if (!s) s = ts; const p = Math.min((ts-s)/1200,1); setVal(+(target*(1-Math.pow(1-p,4))).toFixed(1)); if(p<1) requestAnimationFrame(step) }
      requestAnimationFrame(step)
    }, delay)
    return () => clearTimeout(t)
  }, [target])
  return val
}

function KpiCard({ icon, label, baseline, graphrag, unit='', color, delay=0, highlight=false }) {
  const bAnim = useCountUp(parseFloat(baseline)||0, delay*1000)
  const gAnim = useCountUp(parseFloat(graphrag)||0, delay*1000+200)
  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay, duration:0.5 }}
      whileHover={{ y:-3 }} className="card"
      style={{ padding:'20px 22px', borderTop:`2px solid ${color}`, boxShadow:`0 4px 24px rgba(0,0,0,0.3),0 0 0 1px ${color}15 inset` }}>
      <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%', background:`radial-gradient(circle,${color}18 0%,transparent 70%)`, pointerEvents:'none' }} />
      <div style={{ fontSize:18, marginBottom:10 }}>{icon}</div>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12, fontFamily:'var(--mono)' }}>{label}</div>
      <div style={{ display:'flex', gap:12 }}>
        <div style={{ flex:1, textAlign:'center', padding:'10px 8px', background:'rgba(255,59,92,0.08)', borderRadius:8, border:'1px solid rgba(255,59,92,0.2)' }}>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Baseline</div>
          <div style={{ fontSize:22, fontWeight:800, color:'var(--red)', fontFamily:'var(--mono)', letterSpacing:'-1px' }}>{bAnim}{unit}</div>
        </div>
        <div style={{ flex:1, textAlign:'center', padding:'10px 8px', background:'rgba(0,230,118,0.08)', borderRadius:8, border:'1px solid rgba(0,230,118,0.2)' }}>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>GraphRAG</div>
          <div style={{ fontSize:22, fontWeight:800, color:'var(--green)', fontFamily:'var(--mono)', letterSpacing:'-1px' }}>{gAnim}{unit}</div>
        </div>
      </div>
    </motion.div>
  )
}

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'rgba(2,9,18,0.97)', border:'1px solid var(--border2)', borderRadius:10, padding:'12px 16px', fontSize:12, boxShadow:'0 16px 48px rgba(0,0,0,0.7)' }}>
      <div style={{ color:'var(--text-muted)', marginBottom:8, fontFamily:'var(--mono)', fontSize:11 }}>Account #{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display:'flex', justifyContent:'space-between', gap:20, marginBottom:4 }}>
          <span style={{ color:p.color }}>{p.name}</span>
          <strong style={{ fontFamily:'var(--mono)', color:p.color }}>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

export default function ScoreBoard({ summary, records }) {
  const tokenData = records.map(r => ({ id: r.account_id, Baseline: r.baseline_tokens, GraphRAG: r.graphrag_tokens }))
  const latencyData = records.map(r => ({ id: r.account_id, Baseline: Math.round(r.baseline_latency_ms), GraphRAG: Math.round(r.graphrag_latency_ms) }))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
      {/* Hero banner */}
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
        className="card" style={{ padding:'28px 32px', borderTop:'2px solid var(--red)', position:'relative', overflow:'hidden' }}>
        <div className="scan-line" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:32, alignItems:'center' }}>
          <div>
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              <span style={{ padding:'3px 12px', borderRadius:20, fontSize:10, fontWeight:700, background:'rgba(255,59,92,0.1)', color:'var(--red)', border:'1px solid rgba(255,59,92,0.3)', fontFamily:'var(--mono)', letterSpacing:1.5 }}>SYNTHETIC IDENTITY DETECTION</span>
              <span style={{ padding:'3px 12px', borderRadius:20, fontSize:10, fontWeight:700, background:'rgba(0,230,118,0.1)', color:'var(--green)', border:'1px solid rgba(0,230,118,0.3)', fontFamily:'var(--mono)', letterSpacing:1.5 }}>TIGERGRAPH HACKATHON 2025</span>
            </div>
            <h1 style={{ fontSize:38, fontWeight:900, letterSpacing:'-2px', lineHeight:1.1, marginBottom:10, background:'linear-gradient(135deg,#fff 0%,var(--red2) 50%,var(--orange) 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>FraudGraph</h1>
            <p style={{ fontSize:14, color:'var(--text-dim)', maxWidth:500, lineHeight:1.6 }}>
              TigerGraph 3-hop traversal catches synthetic identity rings that fool baseline LLMs.
              The graph sees what raw logs hide.
            </p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              [`${summary.graphrag_accuracy_pct}%`, 'GraphRAG Accuracy', 'var(--green)'],
              [`${summary.baseline_accuracy_pct}%`, 'Baseline Accuracy', 'var(--red)'],
              [`${summary.hallucination_cases?.length}`, 'Hallucinations Caught', 'var(--orange)'],
              [`${summary.avg_token_savings_pct}%`, 'Token Savings', 'var(--cyan)'],
            ].map(([val, lbl, color]) => (
              <div key={lbl} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 16px', background:`${color}10`, borderRadius:10, border:`1px solid ${color}25` }}>
                <span style={{ fontSize:20, fontWeight:900, color, fontFamily:'var(--mono)', minWidth:60, textAlign:'right' }}>{val}</span>
                <span style={{ fontSize:11, color:'var(--text-muted)' }}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* KPI grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
        <KpiCard delay={0}    icon="🎯" label="Detection Accuracy" baseline={`${summary.baseline_accuracy_pct}`} graphrag={`${summary.graphrag_accuracy_pct}`} unit="%" color="var(--green)" />
        <KpiCard delay={0.08} icon="🔢" label="Avg Token Usage"    baseline={Math.round(summary.total_baseline_tokens/summary.total_accounts)} graphrag={Math.round(summary.total_graphrag_tokens/summary.total_accounts)} unit="" color="var(--cyan)" />
        <KpiCard delay={0.16} icon="⚡" label="Avg Latency (ms)"   baseline={Math.round(records.reduce((s,r)=>s+r.baseline_latency_ms,0)/records.length)} graphrag={Math.round(records.reduce((s,r)=>s+r.graphrag_latency_ms,0)/records.length)} unit="ms" color="var(--yellow)" />
        <KpiCard delay={0.24} icon="💰" label="Cost per Query ($)" baseline={(summary.total_baseline_cost_usd/summary.total_accounts).toFixed(5)} graphrag={(summary.total_graphrag_cost_usd/summary.total_accounts).toFixed(5)} unit="" color="var(--purple)" />
      </div>

      {/* Charts */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
        <motion.div initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.3 }} className="card" style={{ padding:'20px 20px 14px' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Token Usage per Account</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:16 }}>GraphRAG uses <span style={{ color:'var(--cyan)', fontFamily:'var(--mono)', fontWeight:700 }}>~94%</span> fewer tokens</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tokenData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,46,74,0.4)" vertical={false} />
              <XAxis dataKey="id" tick={{ fill:'var(--text-muted)', fontSize:11, fontFamily:'var(--mono)' }} tickFormatter={v=>`#${v}`} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'var(--text-muted)', fontSize:11, fontFamily:'var(--mono)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} cursor={{ fill:'rgba(0,180,216,0.04)' }} />
              <Bar dataKey="Baseline" fill="var(--red)" radius={[5,5,0,0]} maxBarSize={36} fillOpacity={0.85} />
              <Bar dataKey="GraphRAG" fill="var(--cyan)" radius={[5,5,0,0]} maxBarSize={36} fillOpacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.35 }} className="card" style={{ padding:'20px 20px 14px' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Response Latency</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:16 }}>GraphRAG responds <span style={{ color:'var(--green)', fontFamily:'var(--mono)', fontWeight:700 }}>~70%</span> faster</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={latencyData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,46,74,0.4)" vertical={false} />
              <XAxis dataKey="id" tick={{ fill:'var(--text-muted)', fontSize:11, fontFamily:'var(--mono)' }} tickFormatter={v=>`#${v}`} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'var(--text-muted)', fontSize:11, fontFamily:'var(--mono)' }} axisLine={false} tickLine={false} unit="ms" />
              <Tooltip content={<Tip />} cursor={{ fill:'rgba(0,230,118,0.04)' }} />
              <Bar dataKey="Baseline" fill="var(--red)" radius={[5,5,0,0]} maxBarSize={36} fillOpacity={0.85} />
              <Bar dataKey="GraphRAG" fill="var(--green)" radius={[5,5,0,0]} maxBarSize={36} fillOpacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Per-account table */}
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }} className="card" style={{ padding:22 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:16 }}>Per-Account Detection Results</div>
        <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr 100px 100px 100px 100px', gap:0, fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, fontFamily:'var(--mono)', padding:'0 12px 10px', borderBottom:'1px solid var(--border)' }}>
          <span>Account</span><span>Baseline Verdict</span><span>GraphRAG Verdict</span><span>Tokens ↓</span><span>Latency ↓</span><span>Risk Score</span><span>Result</span>
        </div>
        {records.map((r, i) => {
          const isHallucination = !r.baseline_correct && r.graphrag_correct
          return (
            <motion.div key={r.account_id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.45+i*0.06 }}
              style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr 100px 100px 100px 100px', gap:0, padding:'12px 12px', borderBottom:'1px solid var(--border)', alignItems:'center', background: isHallucination ? 'rgba(255,159,10,0.04)' : 'transparent' }}>
              <span style={{ fontFamily:'var(--mono)', fontWeight:700, color:'var(--cyan)', fontSize:13 }}>#{r.account_id}</span>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ padding:'3px 10px', borderRadius:12, fontSize:11, fontWeight:700, background: r.baseline_verdict==='SUSPICIOUS' ? 'rgba(255,59,92,0.15)' : 'rgba(0,230,118,0.1)', color: r.baseline_verdict==='SUSPICIOUS' ? 'var(--red)' : 'var(--green)', border:`1px solid ${r.baseline_verdict==='SUSPICIOUS' ? 'rgba(255,59,92,0.3)' : 'rgba(0,230,118,0.2)'}` }}>{r.baseline_verdict}</span>
                {!r.baseline_correct && <span style={{ fontSize:9, color:'var(--orange)', fontWeight:700, fontFamily:'var(--mono)' }}>WRONG</span>}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ padding:'3px 10px', borderRadius:12, fontSize:11, fontWeight:700, background: r.graphrag_verdict==='SUSPICIOUS' ? 'rgba(255,59,92,0.15)' : 'rgba(0,230,118,0.1)', color: r.graphrag_verdict==='SUSPICIOUS' ? 'var(--red)' : 'var(--green)', border:`1px solid ${r.graphrag_verdict==='SUSPICIOUS' ? 'rgba(255,59,92,0.3)' : 'rgba(0,230,118,0.2)'}` }}>{r.graphrag_verdict}</span>
                {r.graphrag_correct && <span style={{ fontSize:9, color:'var(--green)', fontWeight:700, fontFamily:'var(--mono)' }}>✓</span>}
              </div>
              <span style={{ fontFamily:'var(--mono)', color:'var(--cyan)', fontSize:12 }}>{r.token_savings_pct}%</span>
              <span style={{ fontFamily:'var(--mono)', color:'var(--green)', fontSize:12 }}>{r.latency_improvement_pct}%</span>
              <span style={{ fontFamily:'var(--mono)', color: r.graphrag_risk_score > 5 ? 'var(--red)' : 'var(--green)', fontSize:13, fontWeight:700 }}>{r.graphrag_risk_score}/10</span>
              <span style={{ fontSize:11, fontWeight:700, color: isHallucination ? 'var(--orange)' : r.graphrag_correct ? 'var(--green)' : 'var(--red)' }}>
                {isHallucination ? '⚠️ Hallucination' : r.graphrag_correct ? '✓ Correct' : '✗ Missed'}
              </span>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
