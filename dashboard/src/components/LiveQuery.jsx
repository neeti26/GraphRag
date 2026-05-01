import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import GhostButton from './GhostButton'

const SAMPLES = [
  { q:'8821', label:'Account #8821 — The Hallucination Case', icon:'🎯' },
  { q:'3344', label:'Account #3344 — Innocent Bystander',     icon:'✅' },
  { q:'1002', label:'Account #1002 — Known Flagged Account',  icon:'⚠️' },
  { q:'5566', label:'Account #5566 — Ring Member',            icon:'🔗' },
]

export default function LiveQuery() {
  const [accountId, setAccountId] = useState('')
  const [result, setResult]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [stage, setStage]         = useState(-1)

  const run = async (id) => {
    const aid = id || accountId
    if (!aid.trim()) return
    setLoading(true); setResult(null); setError(null); setStage(0)
    const stages = [0,1,2,3]
    stages.forEach((_, i) => setTimeout(() => setStage(i), i * 600))
    try {
      const res = await fetch('/api/query', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ account_id: aid }) })
      if (!res.ok) throw new Error(await res.text())
      setResult(await res.json())
    } catch(e) {
      setError(e.message.includes('fetch') || e.message.includes('Failed')
        ? '⚡ Live queries require the local API server. Run: python api_server.py — or try the demo accounts above to see pre-computed results.'
        : e.message)
    } finally { setLoading(false); setStage(-1) }
  }

  const STAGES = [
    { label:'Graph Traversal',   desc:'TigerGraph 3-hop BFS',         icon:'⬡',  color:'var(--cyan)' },
    { label:'Evidence Assembly', desc:'Collecting fraud signals',      icon:'🔍', color:'var(--yellow)' },
    { label:'Baseline LLM',      desc:'Raw log analysis (no graph)',   icon:'🔴', color:'var(--red)' },
    { label:'GraphRAG LLM',      desc:'Graph-augmented inference',     icon:'🟢', color:'var(--green)' },
  ]

  return (
    <div style={{ maxWidth:960 }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:18, fontWeight:800, letterSpacing:'-0.5px', marginBottom:6, background:'linear-gradient(135deg,#fff,var(--red2),var(--orange))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Live Account Investigation</div>
        <div style={{ fontSize:12, color:'var(--text-muted)' }}>Enter an Account ID — both pipelines run simultaneously and results are compared in real time.</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
        {SAMPLES.map(({ q, label, icon }) => (
          <motion.button key={q} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            whileHover={{ borderColor:'var(--red)', background:'rgba(255,77,77,0.05)' }} whileTap={{ scale:0.98 }}
            onClick={() => { setAccountId(q); run(q) }}
            style={{ textAlign:'left', padding:'12px 16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', color:'var(--text-dim)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)', transition:'all 0.15s', display:'flex', gap:10, alignItems:'center' }}>
            <span style={{ fontSize:18 }}>{icon}</span><span>{label}</span>
          </motion.button>
        ))}
      </div>

      <div style={{ display:'flex', gap:10, marginBottom:24 }}>
        <input value={accountId} onChange={e=>setAccountId(e.target.value)} onKeyDown={e=>e.key==='Enter'&&run()}
          placeholder="Enter Account ID (e.g. 8821)…"
          style={{ flex:1, padding:'13px 18px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', color:'var(--text)', fontSize:13, outline:'none', fontFamily:'var(--mono)', transition:'border-color 0.2s, box-shadow 0.2s' }}
          onFocus={e=>{e.target.style.borderColor='var(--red)';e.target.style.boxShadow='0 0 0 3px rgba(255,77,77,0.1)'}}
          onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none'}} />
        <GhostButton accent="var(--red)" onClick={()=>run()} disabled={loading}>
          {loading ? 'SCANNING…' : '🔍 SCAN'}
        </GhostButton>
      </div>

      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:24 }}>
            {STAGES.map((s,i) => (
              <div key={s.label} style={{ padding:'14px 16px', background:i===stage?`${s.color}10`:i<stage?'rgba(0,245,255,0.05)':'var(--surface)', border:`1px solid ${i===stage?s.color+'50':i<stage?'rgba(0,245,255,0.3)':'var(--border)'}`, borderRadius:'var(--radius-sm)', transition:'all 0.3s' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:16 }}>{i<stage?'✓':s.icon}</span>
                  <div style={{ fontSize:11, fontWeight:700, color:i===stage?s.color:i<stage?'var(--green)':'var(--text-muted)' }}>{s.label}</div>
                </div>
                <div style={{ fontSize:9, color:'var(--text-muted)', marginBottom:8 }}>{s.desc}</div>
                <div style={{ height:3, background:'var(--surface3)', borderRadius:2, overflow:'hidden' }}>
                  {i===stage && <motion.div initial={{ x:'-100%' }} animate={{ x:'100%' }} transition={{ repeat:Infinity, duration:1, ease:'easeInOut' }} style={{ height:'100%', width:'50%', background:s.color, borderRadius:2 }} />}
                  {i<stage && <div style={{ height:'100%', width:'100%', background:'var(--green)' }} />}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ background:'rgba(255,77,77,0.08)', border:'1px solid rgba(255,77,77,0.3)', borderLeft:'3px solid var(--red)', borderRadius:'0 10px 10px 0', padding:'12px 16px', fontSize:12, color:'var(--red)', marginBottom:16 }}>
            ⚠️ {error}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:18 }}>
              {[
                ['Baseline',        result.baseline_verdict,          result.baseline_verdict==='SUSPICIOUS'?'var(--red)':'var(--green)'],
                ['GraphRAG',        result.graphrag_verdict,          result.graphrag_verdict==='SUSPICIOUS'?'var(--red)':'var(--green)'],
                ['Token Savings',   `${result.token_savings_pct}%`,   'var(--cyan)'],
                ['Risk Score',      `${result.graphrag_risk_score}/10`,'var(--orange)'],
              ].map(([l,v,c],i)=>(
                <motion.div key={l} initial={{ opacity:0, scale:0.85 }} animate={{ opacity:1, scale:1 }} transition={{ delay:i*0.07 }}
                  className="card" style={{ padding:'14px 16px', textAlign:'center', borderTop:`2px solid ${c}` }}>
                  <div style={{ fontSize:20, fontWeight:900, color:c, fontFamily:'var(--mono)', letterSpacing:'-1px', textShadow:`0 0 16px ${c}60` }}>{v}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4 }}>{l}</div>
                </motion.div>
              ))}
            </div>

            {!result.baseline_correct && result.graphrag_correct && (
              <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
                style={{ padding:'14px 18px', background:'rgba(255,159,10,0.1)', border:'2px solid rgba(255,159,10,0.4)', borderRadius:12, marginBottom:16, fontSize:13, color:'var(--orange)', fontWeight:700 }}>
                🧪 HALLUCINATION DETECTED — Baseline said SAFE, GraphRAG correctly identified SUSPICIOUS via 3-hop graph traversal
              </motion.div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {[
                { label:'Baseline', sub:'LLM Only — No Graph', answer:result.baseline_reasoning, tokens:result.baseline_tokens, latency:result.baseline_latency_ms, accent:'var(--red)', bg:'rgba(255,77,77,0.06)', border:'rgba(255,77,77,0.2)', icon:'🔴', correct:result.baseline_correct },
                { label:'GraphRAG', sub:'TigerGraph 3-hop + LLM', answer:result.graphrag_reasoning, tokens:result.graphrag_tokens, latency:result.graphrag_latency_ms, accent:'var(--green)', bg:'rgba(0,245,255,0.05)', border:'rgba(0,245,255,0.2)', icon:'🟢', correct:result.graphrag_correct, winner:true },
              ].map(p=>(
                <motion.div key={p.label} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
                  style={{ background:p.bg, border:`1px solid ${p.border}`, borderRadius:12, padding:18, position:'relative' }}>
                  {p.winner && <div style={{ position:'absolute', top:12, right:12, padding:'3px 10px', borderRadius:10, fontSize:9, fontWeight:900, background:p.accent, color:'var(--bg)', boxShadow:`0 0 10px ${p.accent}60` }}>✓ WINNER</div>}
                  <div style={{ fontSize:12, fontWeight:800, color:p.accent, marginBottom:10 }}>{p.icon} {p.label} <span style={{ fontSize:10, fontWeight:400, color:'var(--text-muted)' }}>— {p.sub}</span></div>
                  <div style={{ fontSize:11.5, fontFamily:'var(--mono)', color:'var(--text)', lineHeight:1.7, marginBottom:12, whiteSpace:'pre-wrap' }}>{p.answer}</div>
                  <div style={{ display:'flex', gap:12, fontSize:11, color:'var(--text-muted)', borderTop:`1px solid ${p.border}`, paddingTop:10, fontFamily:'var(--mono)' }}>
                    <span>🔢 {p.tokens} tokens</span><span>⚡ {p.latency?.toFixed(0)}ms</span>
                    <span style={{ color:p.correct?'var(--green)':'var(--red)', fontWeight:700 }}>{p.correct?'✓ CORRECT':'✗ WRONG'}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
