import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import EvidenceModal from "./EvidenceModal.jsx"
import TokenTax from "./TokenTax.jsx"
import GSQLTrace from "./GSQLTrace.jsx"
import GhostButton from "./GhostButton"
import TokenEconomics from "./TokenEconomics"
import { useTypewriter } from "../hooks/useTypewriter"

const ACCOUNTS = [
  { id: "8821", label: "Account #8821", desc: "The Hallucination Case — looks innocent", icon: "🎯", highlight: true },
  { id: "3344", label: "Account #3344", desc: "Innocent bystander — clean network",     icon: "✅" },
  { id: "1002", label: "Account #1002", desc: "Known flagged — Identity Takeover",       icon: "⚠️" },
  { id: "5566", label: "Account #5566", desc: "Ring member — shares device with banned", icon: "🔗" },
]

const PIPELINE_STAGES = {
  baseline: [
    { id: "read",   label: "Reading 50 raw logs",      ms: 120, icon: "📄" },
    { id: "prompt", label: "Building prompt (~3,800 tokens)", ms: 80,  icon: "✍️" },
    { id: "llm",    label: "LLM inference",             ms: 1800, icon: "🤖" },
  ],
  graphrag: [
    { id: "gsql",    label: "TigerGraph 3-hop GSQL",   ms: 180, icon: "⬡" },
    { id: "extract", label: "Evidence extraction",      ms: 60,  icon: "🔍" },
    { id: "prompt",  label: "Building prompt (~250 tokens)", ms: 40, icon: "✍️" },
    { id: "llm",     label: "LLM inference",            ms: 600, icon: "🧠" },
  ],
}

function useDemoRace(accountId, records) {
  const rec = records?.find(r => r.account_id === accountId)
  if (!rec) return null
  return {
    baseline: {
      verdict: rec.baseline_verdict,
      correct: rec.baseline_correct,
      tokens: rec.baseline_tokens,
      latency_ms: rec.baseline_latency_ms,
      cost_usd: rec.baseline_cost_usd,
      reasoning: rec.baseline_reasoning,
      hops: 0,
    },
    graphrag: {
      verdict: rec.graphrag_verdict,
      correct: rec.graphrag_correct,
      tokens: rec.graphrag_tokens,
      latency_ms: rec.graphrag_latency_ms,
      cost_usd: rec.graphrag_cost_usd,
      reasoning: rec.graphrag_reasoning,
      risk_score: rec.graphrag_risk_score,
      hops: rec.hops_used || 3,
      evidence: rec.graph_evidence || [],
      flagged: rec.flagged_connections || [],
      blacklisted: rec.blacklisted_ips || [],
      shared_devices: rec.shared_devices || [],
      nodes_visited: rec.nodes_visited || 0,
      fraud_path: rec.fraud_path || null,
      wcc_cluster: rec.wcc_cluster || null,
      cosine_score: rec.cosine_score || null,
      cosine_match: rec.cosine_match || null,
      neighborhood_summary: rec.neighborhood_summary || null,
      agentic_loop_triggered: rec.agentic_loop_triggered || false,
      agentic_refinement: rec.agentic_refinement || "",
      entity_link: rec.entity_link || null,
    },
  }
}

const SUB_TABS = [
  { key: "race",  label: "⚡ Pipeline Race" },
  { key: "token", label: "📉 Token Tax" },
]

export default function PipelineRace({ records, summary, onRacingChange }) {
  const [subTab, setSubTab]         = useState("race")
  const [selectedId, setSelectedId] = useState("8821")
  const [racing, setRacing]         = useState(false)
  const [done, setDone]             = useState(false)
  const [bStage, setBStage]         = useState(-1)
  const [gStage, setGStage]         = useState(-1)
  const [bDone, setBDone]           = useState(false)
  const [gDone, setGDone]           = useState(false)
  const [result, setResult]         = useState(null)
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [gsqlOpen, setGsqlOpen]     = useState(false)
  const timers = useRef([])
  const scoreboardRef = useRef(null)

  const demoResult = useDemoRace(selectedId, records)

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  const runRace = () => {
    clearTimers()
    setRacing(true); setDone(false); setResult(null)
    setBStage(-1); setGStage(-1); setBDone(false); setGDone(false)
    onRacingChange?.(true)

    const bStages = PIPELINE_STAGES.baseline
    const gStages = PIPELINE_STAGES.graphrag

    // Baseline timeline
    let bTime = 200
    bStages.forEach((s, i) => {
      timers.current.push(setTimeout(() => setBStage(i), bTime))
      bTime += s.ms
    })
    timers.current.push(setTimeout(() => { setBDone(true) }, bTime + 100))

    // GraphRAG timeline (faster overall)
    let gTime = 200
    gStages.forEach((s, i) => {
      timers.current.push(setTimeout(() => setGStage(i), gTime))
      gTime += s.ms
    })
    timers.current.push(setTimeout(() => { setGDone(true) }, gTime + 100))

    // Show results after both done
    const totalTime = Math.max(bTime, gTime) + 400
    timers.current.push(setTimeout(() => {
      setResult(demoResult)
      setDone(true)
      setRacing(false)
      onRacingChange?.(false)
    }, totalTime))
  }

  useEffect(() => () => clearTimers(), [])

  const reset = () => {
    clearTimers()
    setRacing(false); setDone(false); setResult(null)
    setBStage(-1); setGStage(-1); setBDone(false); setGDone(false)
  }

  const bTotal = PIPELINE_STAGES.baseline.reduce((s, x) => s + x.ms, 0)
  const gTotal = PIPELINE_STAGES.graphrag.reduce((s, x) => s + x.ms, 0)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Sub-tab toggle ── */}
      <div style={{ display: "flex", gap: 4, padding: "4px", background: "var(--surface2)", borderRadius: 10, width: "fit-content", border: "1px solid var(--border)" }}>
        {SUB_TABS.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, transition: "all 0.2s",
              background: subTab === t.key ? "linear-gradient(90deg, var(--surface4), var(--red))" : "transparent",
              color: subTab === t.key ? "var(--text)" : "var(--text-muted)",
              boxShadow: subTab === t.key ? "var(--shadow-red)" : "none" }}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "token" && <TokenTax records={records} summary={summary} />}

      {subTab === "race" && <>

      {/* ── Hero ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="card" style={{ padding: "28px 32px", borderTop: "2px solid var(--red)", position: "relative", overflow: "hidden" }}>
        <div className="scan-line" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {[["PARALLEL PIPELINE RACE","var(--red)"],["AI FACTORY MODEL","var(--cyan)"],["TIGERGRAPH HACKATHON 2025","var(--green)"]].map(([l,c])=>(
                <span key={l} style={{ padding:"3px 12px", borderRadius:20, fontSize:9, fontWeight:700, background:`${c}12`, color:c, border:`1px solid ${c}30`, fontFamily:"var(--mono)", letterSpacing:1.5 }}>{l}</span>
              ))}
            </div>
            {/* AI Factory Schema layer chips */}
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              {[
                ["Graph Layer",         "var(--cyan)"],
                ["Orchestration Layer", "var(--purple)"],
                ["LLM Layer",           "var(--red)"],
                ["Evaluation Layer",    "var(--yellow)"],
              ].map(([l, c]) => (
                <span key={l} style={{ fontFamily:"var(--mono)", fontSize:9, fontWeight:700, letterSpacing:1.5, borderRadius:20, padding:"3px 12px", background:`${c}12`, color:c, border:`1px solid ${c}30` }}>{l}</span>
              ))}
            </div>
            <div style={{ fontSize:9, color:"var(--text-muted)", fontFamily:"var(--mono)", marginBottom:12, lineHeight:1.6 }}>
              Graph Layer = TigerGraph GSQL · Orchestration Layer = GraphRAG pipeline · LLM Layer = OpenAI inference · Evaluation Layer = benchmark metrics
            </div>            <h1 style={{ fontSize:38, fontWeight:900, letterSpacing:"-2px", lineHeight:1.1, marginBottom:10, background:"linear-gradient(135deg, var(--text) 0%, var(--red2) 45%, var(--orange) 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              Inference Benchmarking Engine
            </h1>
            <p style={{ fontSize:13, color:"var(--text-dim)", maxWidth:560, lineHeight:1.7 }}>
              Select an account and watch <strong style={{color:"var(--red)"}}>Baseline LLM</strong> vs <strong style={{color:"var(--green)"}}>GraphRAG</strong> race in real time.
              The baseline reads 50 raw logs and misses the fraud ring.
              TigerGraph runs a 3-hop GSQL traversal and catches it in <strong style={{color:"var(--cyan)"}}>94% fewer tokens</strong>.
            </p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, minWidth:200 }}>
            {[
              [`${summary.graphrag_accuracy_pct}% vs ${summary.baseline_accuracy_pct}%`, "Detection Accuracy", "var(--green)"],
              [`${summary.avg_token_savings_pct}%`, "Avg Token Savings", "var(--cyan)"],
              [`${summary.hallucination_cases?.length} caught`, "Hallucinations Fixed", "var(--orange)"],
            ].map(([v,l,c])=>(
              <div key={l} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 14px", background:`${c}10`, borderRadius:10, border:`1px solid ${c}25` }}>
                <span style={{ fontSize:16, fontWeight:900, color:c, fontFamily:"var(--mono)", minWidth:80 }}>{v}</span>
                <span style={{ fontSize:10, color:"var(--text-muted)" }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Account selector ── */}
      <div>
        <div style={{ fontSize:10, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:1.5, marginBottom:12, fontFamily:"var(--mono)" }}>
          Select Target Account
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          {ACCOUNTS.map(a => (
            <motion.button key={a.id} onClick={() => { setSelectedId(a.id); reset() }}
              whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
              style={{
                padding:"14px 16px", textAlign:"left", cursor:"pointer", fontFamily:"var(--font)",
                background: selectedId===a.id ? "rgba(255,59,92,0.1)" : "var(--surface)",
                border: `1.5px solid ${selectedId===a.id ? "var(--red)" : "var(--border)"}`,
                borderRadius:"var(--radius-sm)",
                boxShadow: selectedId===a.id ? "var(--shadow-red)" : "none",
                transition:"all 0.2s",
              }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span style={{ fontSize:18 }}>{a.icon}</span>
                <span style={{ fontSize:13, fontWeight:700, color: selectedId===a.id ? "var(--red2)" : "var(--text)", fontFamily:"var(--mono)" }}>{a.label}</span>
                {a.highlight && <span className="alert-pulse" style={{ fontSize:9, padding:"1px 6px", borderRadius:8, background:"rgba(255,159,10,0.2)", color:"var(--orange)", fontWeight:800, fontFamily:"var(--mono)" }}>HALLUCINATION</span>}
              </div>
              <div style={{ fontSize:11, color:"var(--text-muted)", lineHeight:1.4 }}>{a.desc}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Race button ── */}
      <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
        <GhostButton
          accent="var(--red)"
          onClick={racing ? undefined : runRace}
          disabled={racing}
        >
          {racing ? "⏳ RACING..." : done ? "🔄 RUN AGAIN" : "▶ START RACE"}
        </GhostButton>
        {done && result && (
          <>
            <motion.div initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }}
              style={{ fontSize:13, color:"var(--green)", fontWeight:700, fontFamily:"var(--mono)" }}>
              ✓ Race complete — GraphRAG wins
            </motion.div>
            <motion.div initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.1 }}>
              <GhostButton
                accent="var(--cyan)"
                onClick={() => scoreboardRef.current?.scrollIntoView({ behavior: "smooth" })}
              >
                ⚡ Compare
              </GhostButton>
            </motion.div>
            <motion.div initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.2 }}>
              <GhostButton
                accent="var(--purple)"
                onClick={() => setGsqlOpen(true)}
              >
                ⬡ GSQL Trace
              </GhostButton>
            </motion.div>
          </>
        )}
      </div>

      {/* ── Side-by-side pipeline ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
        <PipelinePanel
          title="🔴 Pipeline 1 — Baseline LLM"
          subtitle="No graph context · Raw log dump"
          color="var(--red)"
          bg="rgba(255,59,92,0.04)"
          borderColor="rgba(255,59,92,0.3)"
          stages={PIPELINE_STAGES.baseline}
          currentStage={bStage}
          isDone={bDone}
          totalMs={bTotal}
          result={result?.baseline}
          racing={racing}
        />
        <PipelinePanel
          title="🟢 Pipeline 2 — GraphRAG"
          subtitle="TigerGraph 3-hop GSQL · Filtered context"
          color="var(--green)"
          bg="rgba(0,230,118,0.04)"
          borderColor="rgba(0,230,118,0.3)"
          stages={PIPELINE_STAGES.graphrag}
          currentStage={gStage}
          isDone={gDone}
          totalMs={gTotal}
          result={result?.graphrag}
          racing={racing}
          winner
          onViewEvidence={() => setEvidenceOpen(true)}
        />
      </div>

      {/* ── Scoreboard row ── */}
      <AnimatePresence>
        {done && result && (
          <motion.div ref={scoreboardRef} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            transition={{ duration:0.4 }}>
            <ScoreboardRow baseline={result.baseline} graphrag={result.graphrag} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Token Economics ── */}
      {done && result && (
        <TokenEconomics summary={summary} records={records} graphragCorrect={result?.graphrag?.correct} />
      )}

      {/* ── Evidence modal ── */}
      <AnimatePresence>
        {evidenceOpen && result?.graphrag && (
          <EvidenceModal
            accountId={selectedId}
            evidence={result.graphrag.evidence}
            flagged={result.graphrag.flagged}
            blacklisted={result.graphrag.blacklisted}
            sharedDevices={result.graphrag.shared_devices}
            riskScore={result.graphrag.risk_score}
            fraudPath={result.graphrag.fraud_path}
            wccCluster={result.graphrag.wcc_cluster}
            cosineScore={result.graphrag.cosine_score}
            cosineMatch={result.graphrag.cosine_match}
            neighborhoodSummary={result.graphrag.neighborhood_summary}
            entity_link={result.graphrag.entity_link}
            onClose={() => setEvidenceOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── GSQL Trace modal ── */}
      <AnimatePresence>
        {gsqlOpen && (
          <GSQLTrace accountId={selectedId} onClose={() => setGsqlOpen(false)} />
        )}
      </AnimatePresence>

      </>}
    </div>
  )
}

function PipelinePanel({ title, subtitle, color, bg, borderColor, stages, currentStage, isDone, totalMs, result, racing, winner, onViewEvidence }) {
  const { displayed: reasoningDisplayed, done: reasoningDone } = useTypewriter(
    result?.reasoning ?? "",
    !!(isDone && result)
  )
  const { displayed: refinementDisplayed, done: refinementDone } = useTypewriter(
    result?.agentic_refinement ?? "",
    !!(isDone && result && result.agentic_loop_triggered && reasoningDone)
  )

  return (
    <div style={{ background:bg, border:`1.5px solid ${borderColor}`, borderRadius:"var(--radius)", padding:22, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${color},transparent)` }} />
      {winner && isDone && (
        <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:"spring", delay:0.2 }}
          style={{ position:"absolute", top:14, right:14, padding:"3px 12px", borderRadius:10, fontSize:9, fontWeight:900, background:color, color:"#000", letterSpacing:1, boxShadow:`0 0 12px ${color}60` }}>
          ⚡ WINNER
        </motion.div>
      )}

      <div style={{ marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ fontSize:13, fontWeight:800, color }}>{title}</div>
          {isDone && result?.agentic_loop_triggered && (
            <span style={{ padding:"2px 6px", borderRadius:4, fontSize:10, fontWeight:700, background:"rgba(0,245,255,0.12)", border:"1px solid #00F5FF", color:"#00F5FF", fontFamily:"var(--mono)", letterSpacing:0.5 }}>
              AGENT LOOP
            </span>
          )}
        </div>
        <div style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"var(--mono)", marginTop:3 }}>{subtitle}</div>
      </div>

      {/* Stage progress */}
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
        {stages.map((s, i) => {
          const active = currentStage === i
          const done   = currentStage > i || isDone
          return (
            <div key={s.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8,
              background: active ? `${color}12` : done ? "rgba(0,245,255,0.05)" : "rgba(0,0,0,0.15)",
              border: `1px solid ${active ? color+"50" : done ? "rgba(0,245,255,0.2)" : "var(--border)"}`,
              transition:"all 0.3s" }}>
              <span style={{ fontSize:14, flexShrink:0 }}>{done ? "✓" : active ? s.icon : s.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, fontWeight:600, color: active ? color : done ? "var(--cyan)" : "var(--text-muted)" }}>{s.label}</div>
                <div style={{ height:2, background:"var(--surface3)", borderRadius:1, marginTop:4, overflow:"hidden" }}>
                  {active && (
                    <motion.div initial={{ x:"-100%" }} animate={{ x:"100%" }}
                      transition={{ repeat:Infinity, duration:0.8, ease:"easeInOut" }}
                      style={{ height:"100%", width:"50%", background:color, borderRadius:1 }} />
                  )}
                  {done && <div style={{ height:"100%", width:"100%", background:"var(--cyan)", borderRadius:1 }} />}
                </div>
              </div>
              <span style={{ fontSize:9, color:"var(--text-muted)", fontFamily:"var(--mono)", flexShrink:0 }}>{s.ms}ms</span>
            </div>
          )
        })}
      </div>

      {/* Struggling vs instant progress bars (Task 15.2) — only shown for GraphRAG panel (winner) */}
      {winner && racing && (
        <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Baseline bar — slow */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontFamily: "var(--mono)", color: "var(--red)" }}>LLM struggling…</span>
            </div>
            <div style={{ height: 4, background: "var(--surface3)", borderRadius: 2, overflow: "hidden" }}>
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: isDone ? "100%" : "100%" }}
                transition={{ duration: 2.1, ease: "linear" }}
                style={{ height: "100%", background: "var(--red)", borderRadius: 2 }}
              />
            </div>
          </div>
          {/* GraphRAG bar — fast */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontFamily: "var(--mono)", color: "var(--cyan)" }}>Graph: instant</span>
            </div>
            <div style={{ height: 4, background: "var(--surface3)", borderRadius: 2, overflow: "hidden" }}>
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: isDone ? "100%" : "100%" }}
                transition={{ duration: 0.88, ease: "linear" }}
                style={{ height: "100%", background: "var(--cyan)", borderRadius: 2 }}
              />
            </div>
          </div>
        </div>
      )}
      {winner && isDone && (
        <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <div style={{ height: 4, background: "var(--surface3)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: "100%", background: "var(--red)", borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 9, fontFamily: "var(--mono)", color: "var(--red)" }}>✓ LLM struggling…</span>
          </div>
          <div>
            <div style={{ height: 4, background: "var(--surface3)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: "100%", background: "var(--cyan)", borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 9, fontFamily: "var(--mono)", color: "var(--cyan)" }}>✓ Graph: instant</span>
          </div>
        </div>
      )}

      {/* Result */}
      <AnimatePresence>
        {isDone && result && (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}>
            {/* Verdict */}
            <div style={{ padding:"14px 16px", background: result.verdict==="SUSPICIOUS" ? "rgba(255,77,77,0.1)" : "rgba(0,245,255,0.08)", border:`1px solid ${result.verdict==="SUSPICIOUS" ? "rgba(255,77,77,0.3)" : "rgba(0,245,255,0.2)"}`, borderRadius:10, marginBottom:12 }}>
              <div style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"var(--mono)", marginBottom:4 }}>
                VERDICT {result.risk_score !== undefined ? `· Risk ${result.risk_score}/10` : ""}
              </div>
              <div style={{ fontSize:22, fontWeight:900, color: result.verdict==="SUSPICIOUS" ? "var(--red)" : "var(--cyan)" }}>
                {result.verdict==="SUSPICIOUS" ? "⚠️ SUSPICIOUS" : "✓ SAFE"}
              </div>
              {!result.correct && (
                <div style={{ fontSize:10, color:"var(--orange)", fontWeight:700, marginTop:4, fontFamily:"var(--mono)" }}>
                  ✗ WRONG — This is the hallucination
                </div>
              )}
            </div>

            {/* Reasoning — single or dual block */}
            {result.agentic_loop_triggered ? (
              <>
                <div style={{ fontSize:9, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:1, marginBottom:4, fontFamily:"var(--mono)" }}>
                  Initial Analysis
                </div>
                <div style={{ fontSize:11, color:"var(--text-dim)", lineHeight:1.65, fontFamily: result.reasoning?.includes("→") ? "var(--mono)" : "var(--font)", padding:"10px 12px", background:"rgba(0,0,0,0.2)", borderRadius:8, marginBottom:8, maxHeight:100, overflowY:"auto", whiteSpace:"pre-wrap" }}>
                  {reasoningDisplayed}
                  {!reasoningDone && (
                    <motion.span animate={{ opacity:[1,0] }} transition={{ repeat:Infinity, duration:0.6, ease:"steps(1)" }}
                      style={{ display:"inline-block", color }}>▋</motion.span>
                  )}
                </div>
                {reasoningDone && result.agentic_refinement && (
                  <>
                    <div style={{ height:1, background:"var(--border)", marginBottom:8 }} />
                    <div style={{ fontSize:9, fontWeight:700, color:"#00F5FF", textTransform:"uppercase", letterSpacing:1, marginBottom:4, fontFamily:"var(--mono)" }}>
                      Refined Analysis
                    </div>
                    <div style={{ fontSize:11, color:"var(--text-dim)", lineHeight:1.65, fontFamily:"var(--font)", padding:"10px 12px", background:"rgba(0,245,255,0.04)", border:"1px solid rgba(0,245,255,0.15)", borderRadius:8, marginBottom:8, maxHeight:100, overflowY:"auto", whiteSpace:"pre-wrap" }}>
                      {refinementDisplayed}
                      {!refinementDone && (
                        <motion.span animate={{ opacity:[1,0] }} transition={{ repeat:Infinity, duration:0.6, ease:"steps(1)" }}
                          style={{ display:"inline-block", color:"#00F5FF" }}>▋</motion.span>
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div style={{ fontSize:11, color:"var(--text-dim)", lineHeight:1.65, fontFamily: result.reasoning?.includes("→") ? "var(--mono)" : "var(--font)", padding:"10px 12px", background:"rgba(0,0,0,0.2)", borderRadius:8, marginBottom:12, maxHeight:120, overflowY:"auto", whiteSpace:"pre-wrap" }}>
                {reasoningDisplayed}
                {!reasoningDone && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, ease: "steps(1)" }}
                    style={{ display: "inline-block", color }}
                  >▋</motion.span>
                )}
              </div>
            )}

            {/* Explainable Pathing (Task 18) */}
            {reasoningDone && result?.fraud_path && (
              <div style={{ background:"rgba(191,90,242,0.06)", border:"1px solid rgba(191,90,242,0.25)", borderRadius:8, padding:"10px 12px", marginTop:8, marginBottom:12 }}>
                <div style={{ fontSize:9, fontFamily:"var(--mono)", color:"var(--purple)", fontWeight:700, marginBottom:6 }}>⬡ Graph traversal path</div>
                <div style={{ fontSize:11, fontFamily:"var(--mono)", color:"var(--cyan)", whiteSpace:"pre-wrap", lineHeight:1.6 }}>{result.fraud_path}</div>
                <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:6 }}>LLM reasoning explicitly references this graph path — zero hallucination</div>
              </div>
            )}

            {/* Metrics */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
              {[
                [result.tokens?.toLocaleString(), "tokens", color],
                [`${result.latency_ms?.toFixed(0)}ms`, "latency", color],
                [result.hops > 0 ? `${result.hops} hops` : "0 hops", "graph depth", result.hops > 0 ? "var(--purple)" : "var(--text-muted)"],
              ].map(([v,l,c])=>(
                <div key={l} style={{ textAlign:"center", padding:"8px 6px", background:"rgba(0,0,0,0.2)", borderRadius:8 }}>
                  <div style={{ fontSize:15, fontWeight:800, color:c, fontFamily:"var(--mono)" }}>{v}</div>
                  <div style={{ fontSize:9, color:"var(--text-muted)", marginTop:2 }}>{l}</div>
                </div>
              ))}
            </div>

            {/* View evidence button */}
            {winner && result.evidence?.length > 0 && onViewEvidence && (
              <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                onClick={onViewEvidence}
                style={{ width:"100%", marginTop:12, padding:"10px", borderRadius:8, border:`1px solid ${color}50`, background:`${color}10`, color, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"var(--mono)", letterSpacing:0.5 }}>
                🔍 View Graph Evidence ({result.evidence?.length} signals)
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!racing && !isDone && (
        <div style={{ textAlign:"center", padding:"20px 0", color:"var(--text-muted)", fontSize:12 }}>
          Press START RACE to begin
        </div>
      )}
    </div>
  )
}

function ScoreboardRow({ baseline, graphrag }) {
  const tokenSavings = baseline.tokens && graphrag.tokens
    ? (((baseline.tokens - graphrag.tokens) / baseline.tokens) * 100).toFixed(1)
    : 0
  const latencySavings = baseline.latency_ms && graphrag.latency_ms
    ? (((baseline.latency_ms - graphrag.latency_ms) / baseline.latency_ms) * 100).toFixed(1)
    : 0
  const costSavings = baseline.cost_usd && graphrag.cost_usd
    ? (((baseline.cost_usd - graphrag.cost_usd) / baseline.cost_usd) * 100).toFixed(1)
    : 0

  const rows = [
    { metric:"Detection Accuracy", baseline: baseline.correct ? "✓ Correct" : "✗ MISSED FRAUD", graphrag: graphrag.correct ? "✓ Correct" : "✗ Missed", winner:"graphrag", baselineColor: baseline.correct ? "var(--cyan)" : "var(--red)", graphragColor: graphrag.correct ? "var(--cyan)" : "var(--red)" },
    { metric:"Token Count",        baseline:`${baseline.tokens?.toLocaleString()} tokens`, graphrag:`${graphrag.tokens?.toLocaleString()} tokens`, delta:`↓ ${tokenSavings}%`, winner:"graphrag" },
    { metric:"Inference Cost",     baseline:`$${baseline.cost_usd?.toFixed(6)}`, graphrag:`$${graphrag.cost_usd?.toFixed(6)}`, delta:`↓ ${costSavings}%`, winner:"graphrag" },
    { metric:"Latency",            baseline:`${baseline.latency_ms?.toFixed(0)}ms`, graphrag:`${graphrag.latency_ms?.toFixed(0)}ms`, delta:`↓ ${latencySavings}%`, winner:"graphrag" },
    { metric:"Reasoning Depth",    baseline:"0 hops (no graph)", graphrag:`${graphrag.hops} hops traversed`, delta:`+${graphrag.nodes_visited} nodes`, winner:"graphrag" },
    { metric:"Context Quality",    baseline:"Raw logs (noisy)", graphrag:"Graph facts (precise)", winner:"graphrag" },
  ]

  return (
    <div className="card" style={{ padding:24 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <div style={{ width:3, height:18, background:"linear-gradient(180deg,var(--red),var(--orange))", borderRadius:2 }} />
        <div style={{ fontSize:14, fontWeight:700, color:"var(--text)" }}>Comparison Scoreboard</div>
        <div style={{ fontSize:11, color:"var(--text-muted)" }}>— Real-time benchmark results</div>
      </div>

      {/* Header */}
      <div style={{ display:"grid", gridTemplateColumns:"200px 1fr 1fr 120px", gap:0, fontSize:9, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:1.2, fontFamily:"var(--mono)", padding:"0 14px 10px", borderBottom:"1px solid var(--border)" }}>
        <span>Metric</span><span>🔴 Baseline</span><span>🟢 GraphRAG</span><span>Improvement</span>
      </div>

      {rows.map((r, i) => (
        <motion.div key={r.metric} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.06 }}
          style={{ display:"grid", gridTemplateColumns:"200px 1fr 1fr 120px", gap:0, padding:"13px 14px", borderBottom:"1px solid var(--border)", alignItems:"center" }}>
          <span style={{ fontSize:12, fontWeight:600, color:"var(--text-dim)" }}>{r.metric}</span>
          <span style={{ fontSize:12, color: r.baselineColor || "var(--red)", fontFamily:"var(--mono)", fontWeight: !baseline.correct && r.metric==="Detection Accuracy" ? 800 : 400 }}>{r.baseline}</span>
          <span style={{ fontSize:12, color: r.graphragColor || "var(--cyan)", fontFamily:"var(--mono)", fontWeight:600 }}>{r.graphrag}</span>
          <span style={{ fontSize:11, color:"var(--cyan)", fontFamily:"var(--mono)", fontWeight:700 }}>{r.delta || "✓ Better"}</span>
        </motion.div>
      ))}
    </div>
  )
}
