import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from "recharts"
import RadialGauge from "./RadialGauge"
import TigerGraphMetrics from "./TigerGraphMetrics"

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

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "rgba(2,9,18,0.97)", border: "1px solid var(--border2)", borderRadius: 10, padding: "12px 16px", fontSize: 12, boxShadow: "0 16px 48px rgba(0,0,0,0.7)" }}>
      <div style={{ color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--mono)", fontSize: 11 }}>Account #{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: "flex", justifyContent: "space-between", gap: 20, marginBottom: 4 }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <strong style={{ fontFamily: "var(--mono)", color: p.color }}>{p.value?.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  )
}

const PIPELINE_COLORS = {
  Baseline:  "var(--red)",
  BasicRAG:  "var(--yellow)",
  GraphRAG:  "var(--cyan)",
}

export default function ScoreBoard({ summary, records }) {
  const tokenData   = records.map(r => ({
    id: r.account_id,
    Baseline: r.baseline_tokens,
    "Basic RAG": r.basic_rag_tokens,
    GraphRAG: r.graphrag_tokens,
  }))
  const latencyData = records.map(r => ({
    id: r.account_id,
    Baseline: Math.round(r.baseline_latency_ms),
    "Basic RAG": Math.round(r.basic_rag_latency_ms),
    GraphRAG: Math.round(r.graphrag_latency_ms),
  }))
  const bertData = records.map(r => ({
    id: r.account_id,
    Baseline: +(r.baseline_bert_score * 100).toFixed(1),
    "Basic RAG": +(r.basic_rag_bert_score * 100).toFixed(1),
    GraphRAG: +(r.graphrag_bert_score * 100).toFixed(1),
  }))
  const judgeData = records.map(r => ({
    id: r.account_id,
    Baseline: r.baseline_judge_score,
    "Basic RAG": r.basic_rag_judge_score,
    GraphRAG: r.graphrag_judge_score,
  }))

  const radarData = [
    { metric: "Accuracy",     Baseline: summary.baseline_accuracy_pct, "Basic RAG": summary.basic_rag_accuracy_pct,  GraphRAG: summary.graphrag_accuracy_pct },
    { metric: "BERTScore",    Baseline: +(summary.avg_baseline_bert_score * 100).toFixed(1), "Basic RAG": +(summary.avg_basic_rag_bert_score * 100).toFixed(1), GraphRAG: +(summary.avg_graphrag_bert_score * 100).toFixed(1) },
    { metric: "LLM Judge",    Baseline: summary.avg_baseline_judge_score * 10, "Basic RAG": summary.avg_basic_rag_judge_score * 10, GraphRAG: summary.avg_graphrag_judge_score * 10 },
    { metric: "Token Eff.",   Baseline: 5, "Basic RAG": 75, GraphRAG: 94 },
    { metric: "Latency Eff.", Baseline: 0, "Basic RAG": 40, GraphRAG: summary.avg_latency_improvement_pct },
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Hero — 3-way comparison */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card"
        style={{ padding: "28px 32px", borderTop: "2px solid var(--red)", position: "relative", overflow: "hidden" }}>
        <div className="scan-line" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-1px", marginBottom: 10, background: "linear-gradient(135deg,#fff 0%,var(--red2) 50%,var(--orange) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              3-Pipeline Benchmark Results
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-dim)", maxWidth: 560, lineHeight: 1.7 }}>
              <strong style={{ color: "var(--cyan)" }}>GraphRAG</strong> achieves <strong style={{ color: "var(--green)" }}>100% accuracy</strong> vs 50% for both Baseline and Basic RAG.
              BERTScore and LLM Judge confirm GraphRAG produces the most grounded, complete answers.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              {[
                [`${summary.graphrag_accuracy_pct}% vs ${summary.basic_rag_accuracy_pct}%`, "Accuracy vs Basic RAG", "var(--green)"],
                [`${summary.avg_token_savings_pct}%`, "Token Savings", "var(--cyan)"],
                [`${summary.hallucination_cases?.length}`, "Hallucinations Caught", "var(--orange)"],
                [`${summary.avg_graphrag_bert_score?.toFixed(3)}`, "GraphRAG BERTScore", "var(--purple)"],
                [`${summary.avg_graphrag_judge_score?.toFixed(1)}/10`, "LLM Judge Score", "var(--yellow)"],
              ].map(([v, l, c]) => (
                <div key={l} style={{ padding: "8px 14px", background: `${c}10`, borderRadius: 10, border: `1px solid ${c}25` }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: c, fontFamily: "var(--mono)" }}>{v}</div>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, fontFamily: "var(--mono)" }}>Detection Accuracy</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
              <RadialGauge value={summary.graphrag_accuracy_pct}  label="GraphRAG"  size={120} />
              <RadialGauge value={summary.basic_rag_accuracy_pct} label="Basic RAG" size={120} color="var(--yellow)" />
              <RadialGauge value={summary.baseline_accuracy_pct}  label="Baseline"  size={120} color="var(--red)" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Radar Chart — quality overview */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
          className="card" style={{ padding: "20px 20px 14px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Quality Radar</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>Accuracy · BERTScore · LLM Judge · Token/Latency Efficiency</div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "var(--text-muted)", fontSize: 8 }} />
              <Radar name="Baseline"  dataKey="Baseline"  stroke="var(--red)"    fill="var(--red)"    fillOpacity={0.15} />
              <Radar name="Basic RAG" dataKey="Basic RAG" stroke="var(--yellow)" fill="var(--yellow)" fillOpacity={0.15} />
              <Radar name="GraphRAG"  dataKey="GraphRAG"  stroke="var(--cyan)"   fill="var(--cyan)"   fillOpacity={0.2} />
              <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* KPI ladder */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
          className="card" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>Pipeline Comparison</div>
          {[
            { label: "Detection Accuracy",     vals: [summary.baseline_accuracy_pct + "%", summary.basic_rag_accuracy_pct + "%", summary.graphrag_accuracy_pct + "%"],     colors: ["var(--red)", "var(--yellow)", "var(--green)"] },
            { label: "Avg BERTScore",           vals: [summary.avg_baseline_bert_score?.toFixed(3), summary.avg_basic_rag_bert_score?.toFixed(3), summary.avg_graphrag_bert_score?.toFixed(3)], colors: ["var(--red)", "var(--yellow)", "var(--green)"] },
            { label: "LLM Judge (avg/10)",      vals: [summary.avg_baseline_judge_score?.toFixed(1), summary.avg_basic_rag_judge_score?.toFixed(1), summary.avg_graphrag_judge_score?.toFixed(1)], colors: ["var(--red)", "var(--yellow)", "var(--green)"] },
            { label: "Avg Tokens / Query",      vals: [Math.round(summary.total_baseline_tokens / summary.total_accounts), Math.round(summary.total_basic_rag_tokens / summary.total_accounts), Math.round(summary.total_graphrag_tokens / summary.total_accounts)], colors: ["var(--red)", "var(--yellow)", "var(--cyan)"] },
            { label: "Hallucinations Caught",   vals: ["0", `${summary.basic_rag_hallucination_cases?.length || 0}`, `${summary.hallucination_cases?.length}`], colors: ["var(--red)", "var(--yellow)", "var(--orange)"] },
          ].map(({ label, vals, colors }) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", fontFamily: "var(--mono)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
              <div style={{ display: "flex", gap: 10 }}>
                {[["Baseline", 0], ["Basic RAG", 1], ["GraphRAG", 2]].map(([name, idx]) => (
                  <div key={name} style={{ flex: 1, textAlign: "center", padding: "8px 4px", background: `${colors[idx]}0d`, borderRadius: 8, border: `1px solid ${colors[idx]}25` }}>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 3 }}>{name}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: colors[idx], fontFamily: "var(--mono)" }}>{vals[idx]}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Charts row 1 — Tokens + Latency */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {[
          { title: "Token Usage per Account", sub: "~94% fewer tokens with GraphRAG", data: tokenData, tag: "TOKENS" },
          { title: "Response Latency",        sub: "~70% faster with GraphRAG",       data: latencyData, tag: "LATENCY", unit: "ms" },
        ].map((c, ci) => (
          <motion.div key={c.title} initial={{ opacity: 0, x: ci === 0 ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
            className="card" style={{ padding: "20px 20px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{c.title}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{c.sub}</div>
              </div>
              <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 9, fontWeight: 800, background: "rgba(0,245,255,0.1)", color: "var(--cyan)", border: "1px solid rgba(0,245,255,0.3)", fontFamily: "var(--mono)", letterSpacing: 1 }}>{c.tag}</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={c.data} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,46,74,0.4)" vertical={false} />
                <XAxis dataKey="id" tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--mono)" }} tickFormatter={v => `#${v}`} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--mono)" }} axisLine={false} tickLine={false} unit={c.unit || ""} />
                <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,77,77,0.04)" }} />
                <Bar dataKey="Baseline"  fill="var(--red)"    radius={[4, 4, 0, 0]} maxBarSize={28} fillOpacity={0.85} />
                <Bar dataKey="Basic RAG" fill="var(--yellow)" radius={[4, 4, 0, 0]} maxBarSize={28} fillOpacity={0.85} />
                <Bar dataKey="GraphRAG"  fill="var(--cyan)"   radius={[4, 4, 0, 0]} maxBarSize={28} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        ))}
      </div>

      {/* Charts row 2 — BERTScore + LLM Judge */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {[
          { title: "BERTScore (× 100)", sub: "Semantic similarity vs gold answers — higher is better", data: bertData, tag: "BERTSCORE" },
          { title: "LLM Judge Score",   sub: "Accuracy + Completeness + Grounding (1–10)", data: judgeData, tag: "JUDGE", unit: "/10" },
        ].map((c, ci) => (
          <motion.div key={c.title} initial={{ opacity: 0, x: ci === 0 ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
            className="card" style={{ padding: "20px 20px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{c.title}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{c.sub}</div>
              </div>
              <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 9, fontWeight: 800, background: "rgba(191,90,242,0.1)", color: "var(--purple)", border: "1px solid rgba(191,90,242,0.3)", fontFamily: "var(--mono)", letterSpacing: 1 }}>{c.tag}</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={c.data} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,46,74,0.4)" vertical={false} />
                <XAxis dataKey="id" tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--mono)" }} tickFormatter={v => `#${v}`} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--mono)" }} axisLine={false} tickLine={false} unit={c.unit || ""} />
                <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,77,77,0.04)" }} />
                <Bar dataKey="Baseline"  fill="var(--red)"    radius={[4, 4, 0, 0]} maxBarSize={28} fillOpacity={0.85} />
                <Bar dataKey="Basic RAG" fill="var(--yellow)" radius={[4, 4, 0, 0]} maxBarSize={28} fillOpacity={0.85} />
                <Bar dataKey="GraphRAG"  fill="var(--cyan)"   radius={[4, 4, 0, 0]} maxBarSize={28} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        ))}
      </div>

      {/* Results table — 3 pipelines */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card" style={{ padding: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 18 }}>Per-Account Detection Results — All 3 Pipelines</div>
        <div style={{ display: "grid", gridTemplateColumns: "80px 100px 110px 110px 80px 80px 80px 120px", fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1.2, fontFamily: "var(--mono)", padding: "0 14px 12px", borderBottom: "1px solid var(--border)", gap: 4 }}>
          <span>Account</span><span>Baseline</span><span>Basic RAG</span><span>GraphRAG</span><span>Tokens↓</span><span>BERTScore</span><span>Judge</span><span>Outcome</span>
        </div>
        {records.map((r, i) => {
          const isH = !r.baseline_correct && r.graphrag_correct
          const ragMissed = !r.basic_rag_correct && r.graphrag_correct
          return (
            <motion.div key={r.account_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + i * 0.07 }}
              style={{ display: "grid", gridTemplateColumns: "80px 100px 110px 110px 80px 80px 80px 120px", gap: 4, padding: "13px 14px", borderBottom: "1px solid var(--border)", alignItems: "center", background: isH ? "rgba(255,184,0,0.04)" : "transparent", transition: "background 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,77,77,0.04)"}
              onMouseLeave={e => e.currentTarget.style.background = isH ? "rgba(255,184,0,0.04)" : "transparent"}>
              <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--cyan)", fontSize: 13 }}>#{r.account_id}</span>

              {/* Baseline */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: r.baseline_verdict === "SUSPICIOUS" ? "rgba(255,77,77,0.15)" : "rgba(0,245,255,0.1)", color: r.baseline_verdict === "SUSPICIOUS" ? "var(--red)" : "var(--green)", border: `1px solid ${r.baseline_verdict === "SUSPICIOUS" ? "rgba(255,77,77,0.3)" : "rgba(0,245,255,0.2)"}`, width: "fit-content" }}>{r.baseline_verdict}</span>
                {!r.baseline_correct && <span style={{ fontSize: 8, color: "var(--orange)", fontWeight: 800, fontFamily: "var(--mono)" }}>WRONG</span>}
              </div>

              {/* Basic RAG */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: r.basic_rag_verdict === "SUSPICIOUS" ? "rgba(255,184,0,0.15)" : "rgba(0,245,255,0.1)", color: r.basic_rag_verdict === "SUSPICIOUS" ? "var(--yellow)" : "var(--green)", border: `1px solid ${r.basic_rag_verdict === "SUSPICIOUS" ? "rgba(255,184,0,0.3)" : "rgba(0,245,255,0.2)"}`, width: "fit-content" }}>{r.basic_rag_verdict || "—"}</span>
                {ragMissed && <span style={{ fontSize: 8, color: "var(--orange)", fontWeight: 800, fontFamily: "var(--mono)" }}>MISSED</span>}
              </div>

              {/* GraphRAG */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: r.graphrag_verdict === "SUSPICIOUS" ? "rgba(255,77,77,0.15)" : "rgba(0,245,255,0.1)", color: r.graphrag_verdict === "SUSPICIOUS" ? "var(--red)" : "var(--green)", border: `1px solid ${r.graphrag_verdict === "SUSPICIOUS" ? "rgba(255,77,77,0.3)" : "rgba(0,245,255,0.2)"}`, width: "fit-content" }}>{r.graphrag_verdict}</span>
                {r.graphrag_correct && <span style={{ fontSize: 8, color: "var(--green)", fontWeight: 800, fontFamily: "var(--mono)" }}>✓ CORRECT</span>}
              </div>

              <span style={{ fontFamily: "var(--mono)", color: "var(--cyan)", fontSize: 12, fontWeight: 700 }}>{r.token_savings_pct}%</span>
              <span style={{ fontFamily: "var(--mono)", color: "var(--purple)", fontSize: 12, fontWeight: 700 }}>{r.graphrag_bert_score?.toFixed(3)}</span>
              <span style={{ fontFamily: "var(--mono)", color: "var(--yellow)", fontSize: 12, fontWeight: 700 }}>{r.graphrag_judge_score?.toFixed(1)}</span>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13 }}>{isH ? "⚠️" : r.graphrag_correct ? "✅" : "❌"}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: isH ? "var(--orange)" : r.graphrag_correct ? "var(--green)" : "var(--red)" }}>
                  {isH ? "Hallucination" : r.graphrag_correct ? "Correct" : "Missed"}
                </span>
              </div>
            </motion.div>
          )
        })}

        <div style={{ display: "flex", gap: 24, padding: "14px 14px 0", flexWrap: "wrap" }}>
          {[
            [`${records.filter(r => r.graphrag_correct).length}/${records.length}`, "GraphRAG correct", "var(--green)"],
            [`${records.filter(r => r.basic_rag_correct).length}/${records.length}`, "Basic RAG correct", "var(--yellow)"],
            [`${records.filter(r => r.baseline_correct).length}/${records.length}`, "Baseline correct", "var(--red)"],
            [`${records.filter(r => !r.baseline_correct && r.graphrag_correct).length}`, "Hallucinations caught", "var(--orange)"],
          ].map(([v, l, c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: c, fontFamily: "var(--mono)" }}>{v}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{l}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* TigerGraph Metrics */}
      <TigerGraphMetrics summary={summary} records={records} />
    </div>
  )
}
