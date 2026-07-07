import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import EvidenceString from './EvidenceString'
import EvidenceTrace from './EvidenceTrace'
import NeighborhoodSummaryCallout from './NeighborhoodSummaryCallout'

export default function HallucinationTest({ records }) {
  const hallucinations = records.filter(r => !r.baseline_correct && r.graphrag_correct)
  const [selected, setSelected] = useState(0)
  const rec = hallucinations[selected]

  if (!rec) return <div style={{ color:'var(--text-dim)', padding:40, textAlign:'center' }}>No hallucination cases found.</div>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Explainer */}
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} className="card"
        style={{ padding:'24px 28px', borderTop:'2px solid var(--orange)', position:'relative', overflow:'hidden' }}>
        <div className="scan-line" />
        <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
          <div style={{ fontSize:36, flexShrink:0 }}>🧪</div>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:'var(--orange)', marginBottom:6 }}>The Hallucination Test</div>
            <p style={{ fontSize:13, color:'var(--text-dim)', lineHeight:1.7, maxWidth:700 }}>
              This is the most powerful demo in the submission. The baseline LLM reads 50 raw login logs and says Account #{rec.account_id} is <strong style={{ color:'var(--cyan)' }}>SAFE</strong> — because in isolation, it looks normal.
              TigerGraph's 3-hop traversal reveals it's connected to a banned fraudster via a shared device and a blacklisted IP.
              The graph sees what the LLM cannot.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Case selector */}
      {hallucinations.length > 1 && (
        <div style={{ display:'flex', gap:8 }}>
          {hallucinations.map((r, i) => (
            <motion.button key={r.account_id} onClick={() => setSelected(i)} whileHover={{ scale:1.05 }} whileTap={{ scale:0.97 }}
              style={{ padding:'7px 18px', borderRadius:20, fontSize:12, cursor:'pointer', fontFamily:'var(--mono)', fontWeight:700,
                background: selected===i ? 'linear-gradient(90deg,var(--surface4),var(--red))' : 'var(--surface2)',
                color: selected===i ? '#fff' : 'var(--text-muted)',
                border:`1px solid ${selected===i ? 'var(--red)' : 'var(--border)'}`,
                boxShadow: selected===i ? '0 1px 3px rgba(0,0,0,0.4)' : 'none',
                transition:'all 0.2s' }}>
              Account #{r.account_id}
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={rec.account_id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }} transition={{ duration:0.22 }}>
          {/* Side by side */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>
            {/* Baseline — WRONG */}
            <div className="card" style={{ padding:22, borderTop:'2px solid var(--red)', position:'relative' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,var(--red),transparent)' }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:'var(--red)' }}>🔴 Baseline LLM — No Graph</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)', marginTop:2 }}>Reading 50 raw log lines · {rec.baseline_tokens} tokens</div>
                </div>
                <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', delay:0.3 }}
                  style={{ padding:'4px 12px', borderRadius:10, background:'rgba(255,77,77,0.2)', border:'1px solid rgba(255,77,77,0.4)', fontSize:11, fontWeight:900, color:'var(--red)' }}>
                  ✗ WRONG
                </motion.div>
              </div>

              <div style={{ padding:'14px 16px', background:'rgba(0,245,255,0.08)', border:'1px solid rgba(0,245,255,0.2)', borderRadius:10, marginBottom:14 }}>
                <div style={{ fontSize:11, color:'var(--text-dim)', marginBottom:4, fontFamily:'var(--mono)' }}>VERDICT</div>
                <div style={{ fontSize:22, fontWeight:900, color:'var(--cyan)' }}>✓ SAFE</div>
                <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>← This is the hallucination</div>
              </div>

              <div style={{ fontSize:12, color:'var(--text-dim)', lineHeight:1.65, fontStyle:'italic', padding:'12px 14px', background:'rgba(0,0,0,0.2)', borderRadius:8, borderLeft:'3px solid rgba(255,77,77,0.4)' }}>
                "{rec.baseline_reasoning}"
              </div>

              <div style={{ marginTop:14, padding:'10px 14px', background:'rgba(255,184,0,0.08)', border:'1px solid rgba(255,184,0,0.2)', borderRadius:8, fontSize:11, color:'var(--orange)' }}>
                ⚠️ The LLM sees normal transactions and a clean IP — it cannot see the 3-hop connection to a banned fraudster.
              </div>
            </div>

            {/* GraphRAG — CORRECT */}
            <div className="card" style={{ padding:22, borderTop:'2px solid var(--green)', position:'relative' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,var(--green),transparent)' }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:'var(--green)' }}>🟢 GraphRAG — TigerGraph 3-hop</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)', marginTop:2 }}>Graph traversal · {rec.graphrag_tokens} tokens · {rec.nodes_visited} nodes visited</div>
                </div>
                <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', delay:0.4 }}
                  style={{ padding:'4px 12px', borderRadius:10, background:'rgba(0,245,255,0.2)', border:'1px solid rgba(0,245,255,0.4)', fontSize:11, fontWeight:900, color:'var(--green)' }}>
                  ✓ CORRECT
                </motion.div>
              </div>

              <div style={{ padding:'14px 16px', background:'rgba(255,77,77,0.08)', border:'1px solid rgba(255,77,77,0.2)', borderRadius:10, marginBottom:14 }}>
                <div style={{ fontSize:11, color:'var(--text-dim)', marginBottom:4, fontFamily:'var(--mono)' }}>VERDICT · Risk {rec.graphrag_risk_score}/10</div>
                <div style={{ fontSize:22, fontWeight:900, color:'var(--red)' }}>⚠️ SUSPICIOUS</div>
                <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>Fraud ring detected via graph</div>
              </div>

              {/* Graph evidence */}
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:8, fontFamily:'var(--mono)' }}>Graph Evidence ({rec.graph_evidence?.length} signals)</div>
                <NeighborhoodSummaryCallout summary={rec.neighborhood_summary} />
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {rec.graph_evidence?.map((e, i) => (
                    <motion.div key={i} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.3+i*0.07 }}
                      style={{ padding:'5px 10px', background:'var(--bg)', borderRadius:6, borderLeft:`2px solid var(--border)` }}>
                      <EvidenceString text={e} />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Hop path visualization */}
          <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }} className="card" style={{ padding:22 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:16 }}>3-Hop Traversal Path — How TigerGraph Found the Ring</div>
            <EvidenceTrace
              accountId={rec.account_id}
              sharedDevice={rec.shared_devices?.[0]}
              bannedAccount={rec.flagged_connections?.[0]}
              blacklistedIp={rec.blacklisted_ips?.[0]}
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function HopPath({ accountId, sharedDevices, flagged, blacklisted }) {
  const steps = [
    { hop:0, label:`Account #${accountId}`, sub:'Target (looks innocent)', color:'var(--cyan)', icon:'👤' },
    { hop:1, label:`Device ${sharedDevices[0] || 'XYZ-999'}`, sub:'Hop 1: Shared device', color:'var(--yellow)', icon:'📱' },
    { hop:2, label:`Account #${flagged[0] || '1002'}`, sub:'Hop 2: Flagged account', color:'var(--orange)', icon:'⚠️' },
    { hop:3, label:`IP ${blacklisted[0] || '192.168.1.1'}`, sub:'Hop 3: Blacklisted IP', color:'var(--red)', icon:'🚫' },
  ]
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, overflowX:'auto', padding:'8px 0' }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center' }}>
          <motion.div initial={{ opacity:0, scale:0.7 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.1+i*0.15, type:'spring' }}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, minWidth:120 }}>
            <div style={{ width:56, height:56, borderRadius:14, background:`${s.color}18`, border:`2px solid ${s.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, boxShadow:`0 0 16px ${s.color}40` }}>{s.icon}</div>
            <div style={{ fontSize:11, fontWeight:700, color:s.color, textAlign:'center', fontFamily:'var(--mono)' }}>{s.label}</div>
            <div style={{ fontSize:9, color:'var(--text-dim)', textAlign:'center' }}>{s.sub}</div>
            <div style={{ padding:'2px 8px', borderRadius:10, fontSize:9, fontWeight:700, background:`${s.color}15`, color:s.color, border:`1px solid ${s.color}30`, fontFamily:'var(--mono)' }}>HOP {s.hop}</div>
          </motion.div>
          {i < steps.length-1 && (
            <motion.div initial={{ scaleX:0 }} animate={{ scaleX:1 }} transition={{ delay:0.25+i*0.15, duration:0.4 }}
              style={{ width:60, display:'flex', flexDirection:'column', alignItems:'center', gap:4, transformOrigin:'left' }}>
              <div style={{ width:'100%', height:2, background:`linear-gradient(90deg,${steps[i].color},${steps[i+1].color})`, borderRadius:1 }} />
              <div style={{ fontSize:8, color:'var(--text-dim)', fontFamily:'var(--mono)' }}>linked</div>
            </motion.div>
          )}
        </div>
      ))}
    </div>
  )
}
