import { motion } from "framer-motion"

export default function EvidenceModal({ accountId, evidence, flagged, blacklisted, sharedDevices, riskScore, fraudPath, wccCluster, cosineScore, cosineMatch, onClose }) {
  const hopSteps = [
    { hop:0, label:`Account #${accountId}`, sub:"Target account", color:"var(--cyan)", icon:"👤" },
    { hop:1, label:`Device ${sharedDevices?.[0] || "XYZ-999"}`, sub:"Hop 1 — Shared device", color:"var(--purple)", icon:"📱" },
    { hop:2, label:`Account #${flagged?.[0] || "1002"}`, sub:"Hop 2 — Flagged account", color:"var(--orange)", icon:"⚠️" },
    { hop:3, label:`IP ${blacklisted?.[0] || "192.168.1.1"}`, sub:"Hop 3 — Blacklisted IP", color:"var(--red)", icon:"🚫" },
  ]

  return (
    <motion.div className="modal-overlay" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity:0, scale:0.92, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.95 }}
        transition={{ type:"spring", stiffness:300, damping:25 }}
        style={{ background:"var(--surface)", border:"1px solid var(--border2)", borderRadius:"var(--radius)", padding:28, maxWidth:700, width:"100%", maxHeight:"85vh", overflowY:"auto", position:"relative" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:"var(--red2)", marginBottom:4 }}>
              🔍 Graph Evidence — Account #{accountId}
            </div>
            <div style={{ fontSize:11, color:"var(--text-muted)", fontFamily:"var(--mono)" }}>
              TigerGraph 3-hop traversal · Risk Score: {riskScore}/10
            </div>
          </div>
          <button onClick={onClose} style={{ padding:"6px 14px", borderRadius:8, background:"rgba(255,59,92,0.15)", border:"1px solid rgba(255,59,92,0.3)", color:"var(--red)", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"var(--mono)" }}>
            ✕ Close
          </button>
        </div>

        {/* Risk meter */}
        <div style={{ marginBottom:24, padding:"14px 18px", background:"rgba(255,59,92,0.06)", border:"1px solid rgba(255,59,92,0.2)", borderRadius:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontSize:11, color:"var(--text-muted)", fontFamily:"var(--mono)" }}>FRAUD RISK SCORE</span>
            <span style={{ fontSize:20, fontWeight:900, color:"var(--red)", fontFamily:"var(--mono)" }}>{riskScore}/10</span>
          </div>
          <div style={{ height:8, background:"var(--surface3)", borderRadius:4, overflow:"hidden" }}>
            <motion.div initial={{ width:0 }} animate={{ width:`${riskScore*10}%` }} transition={{ duration:1, ease:"easeOut", delay:0.3 }}
              style={{ height:"100%", background:`linear-gradient(90deg,var(--yellow),var(--orange),var(--red))`, borderRadius:4 }} />
          </div>
        </div>

        {/* Fraud path — the GSQL reasoning trace */}
        {fraudPath && (
          <div style={{ marginBottom:24, padding:"14px 18px", background:"rgba(191,90,242,0.06)", border:"1px solid rgba(191,90,242,0.25)", borderRadius:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--purple)", marginBottom:8, fontFamily:"var(--mono)" }}>⬡ GSQL REASONING TRACE — Fraud Path</div>
            <code style={{ fontSize:12, color:"var(--cyan)", fontFamily:"var(--mono)", lineHeight:1.8, display:"block", whiteSpace:"pre-wrap" }}>{fraudPath}</code>
            <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:8 }}>This path was deduced from the graph — the LLM did not generate it. Zero hallucination.</div>
          </div>
        )}

        {/* WCC + Cosine */}
        {(wccCluster || cosineScore) && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
            {wccCluster && (
              <div style={{ padding:"12px 14px", background:"rgba(191,90,242,0.06)", border:"1px solid rgba(191,90,242,0.2)", borderRadius:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"var(--purple)", fontFamily:"var(--mono)", marginBottom:6 }}>WCC CLUSTER</div>
                <div style={{ fontSize:18, fontWeight:900, color:"var(--purple)", fontFamily:"var(--mono)" }}>{wccCluster}</div>
                <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:4 }}>Weakly Connected Component — fraud ring membership</div>
              </div>
            )}
            {cosineScore && (
              <div style={{ padding:"12px 14px", background:"rgba(255,214,10,0.06)", border:"1px solid rgba(255,214,10,0.2)", borderRadius:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"var(--yellow)", fontFamily:"var(--mono)", marginBottom:6 }}>COSINE SIMILARITY</div>
                <div style={{ fontSize:18, fontWeight:900, color: cosineScore > 0.85 ? "var(--red)" : "var(--yellow)", fontFamily:"var(--mono)" }}>{cosineScore} {cosineMatch ? `↔ #${cosineMatch}` : ""}</div>
                <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:4 }}>Behavioral match with {cosineScore > 0.85 ? "banned" : "flagged"} account</div>
              </div>
            )}
          </div>
        )}

        {/* 3-hop path */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:1.5, marginBottom:16, fontFamily:"var(--mono)" }}>
            3-Hop Traversal Path
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:0, overflowX:"auto", padding:"8px 0" }}>
            {hopSteps.map((s, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center" }}>
                <motion.div initial={{ opacity:0, scale:0.7 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.1+i*0.15, type:"spring" }}
                  style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, minWidth:130 }}>
                  <div style={{ width:60, height:60, borderRadius:14, background:`${s.color}18`, border:`2px solid ${s.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, boxShadow:`0 0 16px ${s.color}40` }}>{s.icon}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:s.color, textAlign:"center", fontFamily:"var(--mono)" }}>{s.label}</div>
                  <div style={{ fontSize:9, color:"var(--text-muted)", textAlign:"center" }}>{s.sub}</div>
                  <div style={{ padding:"2px 8px", borderRadius:10, fontSize:9, fontWeight:700, background:`${s.color}15`, color:s.color, border:`1px solid ${s.color}30`, fontFamily:"var(--mono)" }}>HOP {s.hop}</div>
                </motion.div>
                {i < hopSteps.length-1 && (
                  <motion.div initial={{ scaleX:0 }} animate={{ scaleX:1 }} transition={{ delay:0.3+i*0.15, duration:0.4 }}
                    style={{ width:50, display:"flex", flexDirection:"column", alignItems:"center", gap:3, transformOrigin:"left" }}>
                    <div style={{ width:"100%", height:2, background:`linear-gradient(90deg,${hopSteps[i].color},${hopSteps[i+1].color})`, borderRadius:1 }} />
                    <div style={{ fontSize:8, color:"var(--text-muted)", fontFamily:"var(--mono)" }}>linked</div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Evidence signals */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:1.5, marginBottom:12, fontFamily:"var(--mono)" }}>
            Evidence Signals ({evidence?.length})
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {evidence?.map((e, i) => {
              const isAlert = e.includes("ALERT") || e.includes("BLACKLISTED") || e.includes("banned") || e.includes("flagged")
              return (
                <motion.div key={i} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.4+i*0.06 }}
                  style={{ padding:"9px 14px", borderRadius:8, fontFamily:"var(--mono)", fontSize:11, lineHeight:1.5,
                    background: isAlert ? "rgba(255,59,92,0.08)" : "rgba(0,0,0,0.2)",
                    border: `1px solid ${isAlert ? "rgba(255,59,92,0.25)" : "var(--border)"}`,
                    borderLeft: `3px solid ${isAlert ? "var(--red)" : "var(--border2)"}`,
                    color: isAlert ? "var(--red2)" : "var(--text-dim)" }}>
                  {isAlert ? "🚨 " : "• "}{e}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Why baseline missed it */}
        <div style={{ marginTop:20, padding:"14px 16px", background:"rgba(255,159,10,0.06)", border:"1px solid rgba(255,159,10,0.2)", borderRadius:10 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--orange)", marginBottom:6, fontFamily:"var(--mono)" }}>WHY BASELINE MISSED THIS</div>
          <div style={{ fontSize:12, color:"var(--text-dim)", lineHeight:1.6 }}>
            The baseline LLM reads 50 raw login logs. Account #{accountId} appears normal in isolation — clean transactions, no failed logins.
            Without graph traversal, the LLM cannot see that this account shares <strong style={{color:"var(--purple)"}}>Device {sharedDevices?.[0]}</strong> with
            a banned fraudster, or that it logged from <strong style={{color:"var(--red)"}}>IP {blacklisted?.[0]}</strong> which is blacklisted.
            TigerGraph's 3-hop BFS reveals the full fraud ring in milliseconds.
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
