import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts"

function useCountUp(target, delay=0) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => {
      let s=null
      const step = ts => { if(!s)s=ts; const p=Math.min((ts-s)/1400,1); setVal(+(target*(1-Math.pow(1-p,4))).toFixed(1)); if(p<1)requestAnimationFrame(step) }
      requestAnimationFrame(step)
    }, delay)
    return () => clearTimeout(t)
  }, [target])
  return val
}

const Tip = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null
  return (
    <div style={{ background:"rgba(2,9,18,0.97)", border:"1px solid var(--border2)", borderRadius:10, padding:"12px 16px", fontSize:12, boxShadow:"0 16px 48px rgba(0,0,0,0.7)" }}>
      <div style={{ color:"var(--text-muted)", marginBottom:8, fontFamily:"var(--mono)", fontSize:11 }}>Account #{label}</div>
      {payload.map(p=>(
        <div key={p.name} style={{ display:"flex", justifyContent:"space-between", gap:20, marginBottom:4 }}>
          <span style={{ color:p.color }}>{p.name}</span>
          <strong style={{ fontFamily:"var(--mono)", color:p.color }}>{p.value?.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  )
}

export default function ScoreBoard({ summary, records }) {
  const tokenData   = records.map(r=>({ id:r.account_id, Baseline:r.baseline_tokens, GraphRAG:r.graphrag_tokens }))
  const latencyData = records.map(r=>({ id:r.account_id, Baseline:Math.round(r.baseline_latency_ms), GraphRAG:Math.round(r.graphrag_latency_ms) }))
  const radialData  = [{ name:"GraphRAG", value:summary.graphrag_accuracy_pct, fill:"#00e676" }, { name:"Baseline", value:summary.baseline_accuracy_pct, fill:"#ff3b5c" }]

  const kpis = [
    { icon:"🎯", label:"Detection Accuracy", bVal:summary.baseline_accuracy_pct, gVal:summary.graphrag_accuracy_pct, unit:"%", color:"var(--green)" },
    { icon:"🔢", label:"Avg Tokens / Query",  bVal:Math.round(summary.total_baseline_tokens/summary.total_accounts), gVal:Math.round(summary.total_graphrag_tokens/summary.total_accounts), unit:"", color:"var(--cyan)" },
    { icon:"⚡", label:"Avg Latency",         bVal:Math.round(records.reduce((s,r)=>s+r.baseline_latency_ms,0)/records.length), gVal:Math.round(records.reduce((s,r)=>s+r.graphrag_latency_ms,0)/records.length), unit:"ms", color:"var(--yellow)" },
    { icon:"💰", label:"Cost / Query ($)",    bVal:parseFloat((summary.total_baseline_cost_usd/summary.total_accounts).toFixed(5)), gVal:parseFloat((summary.total_graphrag_cost_usd/summary.total_accounts).toFixed(5)), unit:"", color:"var(--purple)" },
  ]

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>

      {/* Hero */}
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} className="card"
        style={{ padding:"28px 32px", borderTop:"2px solid var(--red)", position:"relative", overflow:"hidden" }}>
        <div className="scan-line" />
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:32, alignItems:"center" }}>
          <div>
            <h2 style={{ fontSize:28, fontWeight:900, letterSpacing:"-1px", marginBottom:10, background:"linear-gradient(135deg,#fff 0%,var(--red2) 50%,var(--orange) 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              Full Benchmark Results
            </h2>
            <p style={{ fontSize:13, color:"var(--text-dim)", maxWidth:500, lineHeight:1.7 }}>
              Across all 4 test accounts, GraphRAG achieves <strong style={{color:"var(--green)"}}>100% detection accuracy</strong> vs baseline 50%.
              The graph catches 2 hallucinations the LLM completely misses.
            </p>
            <div style={{ display:"flex", gap:10, marginTop:16, flexWrap:"wrap" }}>
              {[
                [`${summary.graphrag_accuracy_pct}% vs ${summary.baseline_accuracy_pct}%`,"Accuracy","var(--green)"],
                [`${summary.avg_token_savings_pct}%`,"Token Savings","var(--cyan)"],
                [`${summary.hallucination_cases?.length}`,"Hallucinations Caught","var(--orange)"],
                [`${summary.avg_latency_improvement_pct}%`,"Latency Speedup","var(--yellow)"],
              ].map(([v,l,c])=>(
                <div key={l} style={{ padding:"8px 14px", background:`${c}10`, borderRadius:10, border:`1px solid ${c}25` }}>
                  <div style={{ fontSize:16, fontWeight:900, color:c, fontFamily:"var(--mono)" }}>{v}</div>
                  <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:1.5, marginBottom:8, fontFamily:"var(--mono)" }}>Detection Accuracy</div>
            <ResponsiveContainer width={160} height={160}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="40%" outerRadius="90%" data={radialData} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0,100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={6} />
                <text x="50%" y="44%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize:26, fontWeight:900, fill:"#00e676", fontFamily:"var(--mono)" }}>100%</text>
                <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize:10, fill:"#3d5a7a", fontFamily:"var(--mono)" }}>GraphRAG</text>
              </RadialBarChart>
            </ResponsiveContainer>
            <div style={{ fontSize:11, color:"var(--red)", fontFamily:"var(--mono)", fontWeight:700 }}>Baseline: 50%</div>
          </div>
        </div>
      </motion.div>

      {/* KPI cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
        {kpis.map((k,i)=>{
          const bAnim = useCountUp(k.bVal, i*80)
          const gAnim = useCountUp(k.gVal, i*80+150)
          const imp = k.bVal>0 ? (((k.bVal-k.gVal)/k.bVal)*100).toFixed(0) : null
          return (
            <motion.div key={k.label} initial={{ opacity:0, y:20, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }} transition={{ delay:i*0.08, duration:0.5 }}
              whileHover={{ y:-4 }} className="card" style={{ padding:"20px 18px", borderTop:`2px solid ${k.color}`, cursor:"default" }}>
              <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:`radial-gradient(circle,${k.color}18 0%,transparent 70%)`, pointerEvents:"none" }} />
              <div style={{ fontSize:18, marginBottom:10 }}>{k.icon}</div>
              <div style={{ fontSize:9, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:1.5, marginBottom:12, fontFamily:"var(--mono)" }}>{k.label}</div>
              <div style={{ display:"flex", gap:8 }}>
                <div style={{ flex:1, textAlign:"center", padding:"8px 4px", background:"rgba(255,59,92,0.08)", borderRadius:8, border:"1px solid rgba(255,59,92,0.2)" }}>
                  <div style={{ fontSize:9, color:"var(--text-muted)", marginBottom:3 }}>Baseline</div>
                  <div style={{ fontSize:18, fontWeight:800, color:"var(--red)", fontFamily:"var(--mono)", letterSpacing:"-0.5px" }}>{bAnim}{k.unit}</div>
                </div>
                <div style={{ flex:1, textAlign:"center", padding:"8px 4px", background:"rgba(0,230,118,0.08)", borderRadius:8, border:"1px solid rgba(0,230,118,0.2)" }}>
                  <div style={{ fontSize:9, color:"var(--text-muted)", marginBottom:3 }}>GraphRAG</div>
                  <div style={{ fontSize:18, fontWeight:800, color:"var(--green)", fontFamily:"var(--mono)", letterSpacing:"-0.5px" }}>{gAnim}{k.unit}</div>
                </div>
              </div>
              {imp && parseFloat(imp)>0 && <div style={{ marginTop:8, textAlign:"center", fontSize:10, color:k.color, fontFamily:"var(--mono)", fontWeight:700 }}>↓ {imp}% better</div>}
            </motion.div>
          )
        })}
      </div>

      {/* Charts */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
        {[
          { title:"Token Usage per Account", sub:"~94% fewer tokens with GraphRAG", data:tokenData, color:"var(--cyan)", tag:"TOKENS", gColor:"var(--cyan)" },
          { title:"Response Latency", sub:"~70% faster with GraphRAG", data:latencyData, color:"var(--green)", tag:"LATENCY", unit:"ms", gColor:"var(--green)" },
        ].map((c,ci)=>(
          <motion.div key={c.title} initial={{ opacity:0, x:ci===0?-20:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.3 }}
            className="card" style={{ padding:"20px 20px 14px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--text)" }}>{c.title}</div>
                <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:2 }}>{c.sub}</div>
              </div>
              <span style={{ padding:"3px 10px", borderRadius:20, fontSize:9, fontWeight:800, background:`${c.color}12`, color:c.color, border:`1px solid ${c.color}30`, fontFamily:"var(--mono)", letterSpacing:1 }}>{c.tag}</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={c.data} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,46,74,0.4)" vertical={false} />
                <XAxis dataKey="id" tick={{ fill:"var(--text-muted)", fontSize:11, fontFamily:"var(--mono)" }} tickFormatter={v=>`#${v}`} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:"var(--text-muted)", fontSize:11, fontFamily:"var(--mono)" }} axisLine={false} tickLine={false} unit={c.unit||""} />
                <Tooltip content={<Tip />} cursor={{ fill:"rgba(255,59,92,0.04)" }} />
                <Bar dataKey="Baseline" fill="var(--red)"  radius={[5,5,0,0]} maxBarSize={36} fillOpacity={0.85} name="Baseline" />
                <Bar dataKey="GraphRAG" fill={c.gColor}    radius={[5,5,0,0]} maxBarSize={36} fillOpacity={0.85} name="GraphRAG" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        ))}
      </div>

      {/* Results table */}
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }} className="card" style={{ padding:24 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"var(--text)", marginBottom:18 }}>Per-Account Detection Results</div>
        <div style={{ display:"grid", gridTemplateColumns:"90px 1fr 1fr 110px 110px 100px 140px", fontSize:9, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:1.2, fontFamily:"var(--mono)", padding:"0 14px 12px", borderBottom:"1px solid var(--border)" }}>
          <span>Account</span><span>Baseline</span><span>GraphRAG</span><span>Tokens ↓</span><span>Latency ↓</span><span>Risk</span><span>Outcome</span>
        </div>
        {records.map((r,i)=>{
          const isH = !r.baseline_correct && r.graphrag_correct
          return (
            <motion.div key={r.account_id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.45+i*0.07 }}
              style={{ display:"grid", gridTemplateColumns:"90px 1fr 1fr 110px 110px 100px 140px", padding:"13px 14px", borderBottom:"1px solid var(--border)", alignItems:"center", background:isH?"rgba(255,159,10,0.04)":"transparent", transition:"background 0.2s", cursor:"default" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,59,92,0.04)"}
              onMouseLeave={e=>e.currentTarget.style.background=isH?"rgba(255,159,10,0.04)":"transparent"}>
              <span style={{ fontFamily:"var(--mono)", fontWeight:700, color:"var(--cyan)", fontSize:14 }}>#{r.account_id}</span>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ padding:"3px 10px", borderRadius:12, fontSize:11, fontWeight:700, background:r.baseline_verdict==="SUSPICIOUS"?"rgba(255,59,92,0.15)":"rgba(0,230,118,0.1)", color:r.baseline_verdict==="SUSPICIOUS"?"var(--red)":"var(--green)", border:`1px solid ${r.baseline_verdict==="SUSPICIOUS"?"rgba(255,59,92,0.3)":"rgba(0,230,118,0.2)"}` }}>{r.baseline_verdict}</span>
                {!r.baseline_correct && <span style={{ fontSize:9, color:"var(--orange)", fontWeight:800, fontFamily:"var(--mono)", padding:"1px 6px", background:"rgba(255,159,10,0.15)", borderRadius:6 }}>WRONG</span>}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ padding:"3px 10px", borderRadius:12, fontSize:11, fontWeight:700, background:r.graphrag_verdict==="SUSPICIOUS"?"rgba(255,59,92,0.15)":"rgba(0,230,118,0.1)", color:r.graphrag_verdict==="SUSPICIOUS"?"var(--red)":"var(--green)", border:`1px solid ${r.graphrag_verdict==="SUSPICIOUS"?"rgba(255,59,92,0.3)":"rgba(0,230,118,0.2)"}` }}>{r.graphrag_verdict}</span>
                {r.graphrag_correct && <span style={{ fontSize:9, color:"var(--green)", fontWeight:800, fontFamily:"var(--mono)" }}>✓</span>}
              </div>
              <span style={{ fontFamily:"var(--mono)", color:"var(--cyan)", fontSize:12, fontWeight:700 }}>{r.token_savings_pct}%</span>
              <span style={{ fontFamily:"var(--mono)", color:"var(--green)", fontSize:12, fontWeight:700 }}>{r.latency_improvement_pct}%</span>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:28, height:4, background:"var(--surface3)", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${r.graphrag_risk_score*10}%`, background:r.graphrag_risk_score>5?"var(--red)":"var(--green)", borderRadius:2 }} />
                </div>
                <span style={{ fontFamily:"var(--mono)", color:r.graphrag_risk_score>5?"var(--red)":"var(--green)", fontSize:12, fontWeight:700 }}>{r.graphrag_risk_score}</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:14 }}>{isH?"⚠️":r.graphrag_correct?"✅":"❌"}</span>
                <span style={{ fontSize:11, fontWeight:700, color:isH?"var(--orange)":r.graphrag_correct?"var(--green)":"var(--red)" }}>
                  {isH?"Hallucination":r.graphrag_correct?"Correct":"Missed"}
                </span>
              </div>
            </motion.div>
          )
        })}
        <div style={{ display:"flex", gap:24, padding:"14px 14px 0" }}>
          {[[`${records.filter(r=>r.graphrag_correct).length}/${records.length}`,"GraphRAG correct","var(--green)"],[`${records.filter(r=>r.baseline_correct).length}/${records.length}`,"Baseline correct","var(--red)"],[`${records.filter(r=>!r.baseline_correct&&r.graphrag_correct).length}`,"Hallucinations caught","var(--orange)"]].map(([v,l,c])=>(
            <div key={l} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:16, fontWeight:900, color:c, fontFamily:"var(--mono)" }}>{v}</span>
              <span style={{ fontSize:11, color:"var(--text-muted)" }}>{l}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
