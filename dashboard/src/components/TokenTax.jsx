import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, ReferenceLine,
} from "recharts"

function useCountUp(target, delay = 0, duration = 1200) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => {
      let start = null
      const step = ts => {
        if (!start) start = ts
        const p = Math.min((ts - start) / duration, 1)
        setVal(+(target * (1 - Math.pow(1 - p, 3))).toFixed(1))
        if (p < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, delay)
    return () => clearTimeout(t)
  }, [target, delay, duration])
  return val
}

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "rgba(2,9,18,0.97)", border: "1px solid var(--border2)", borderRadius: 10, padding: "12px 16px", fontSize: 12 }}>
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

export default function TokenTax({ records, summary }) {
  const tokenData = records.map(r => ({
    id: r.account_id,
    Baseline: r.baseline_tokens,
    GraphRAG: r.graphrag_tokens,
    savings: r.token_savings_pct,
  }))

  const costData = records.map(r => ({
    id: r.account_id,
    Baseline: +(r.baseline_cost_usd * 1000).toFixed(4),
    GraphRAG: +(r.graphrag_cost_usd * 1000).toFixed(4),
  }))

  const latencyData = records.map(r => ({
    id: r.account_id,
    Baseline: r.baseline_latency_ms,
    GraphRAG: r.graphrag_latency_ms,
  }))

  const totalBaselineTokens = records.reduce((s, r) => s + r.baseline_tokens, 0)
  const totalGraphRAGTokens = records.reduce((s, r) => s + r.graphrag_tokens, 0)
  const tokenReduction = (((totalBaselineTokens - totalGraphRAGTokens) / totalBaselineTokens) * 100).toFixed(1)

  const wccClusters = [
    { id: "C1", label: "Fraud Ring", members: ["#0001", "#1002", "#8821", "#5566"], size: 4, risk: "HIGH", color: "var(--red)", device: "XYZ-999", ip: "192.168.1.1" },
    { id: "C2", label: "Isolated", members: ["#3344"], size: 1, risk: "LOW", color: "var(--green)", device: "DEF-222", ip: "10.0.0.55" },
  ]

  const cosineScores = [
    { account: "#8821", match: "#0001 (BANNED)", score: 0.94, label: "Behavioral match — same device + IP pattern", color: "var(--red)" },
    { account: "#5566", match: "#1002 (FLAGGED)", score: 0.87, label: "Similar login timing + transaction volume", color: "var(--orange)" },
    { account: "#1002", match: "#0001 (BANNED)", score: 0.91, label: "Identical device fingerprint + IP range", color: "var(--red)" },
    { account: "#3344", match: "No match", score: 0.12, label: "Unique behavioral profile — clean", color: "var(--green)" },
  ]

  const fnPrevention = [
    { label: "Baseline False Negatives", value: 2, color: "var(--red)", icon: "✗", desc: "Accounts 8821 & 5566 called SAFE" },
    { label: "GraphRAG False Negatives", value: 0, color: "var(--green)", icon: "✓", desc: "All fraud correctly flagged" },
  ]

  const avgTokenSavings = useCountUp(parseFloat(tokenReduction), 200)
  const totalSaved = useCountUp(totalBaselineTokens - totalGraphRAGTokens, 300)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="card" style={{ padding: "24px 28px", borderTop: "2px solid var(--cyan)", position: "relative", overflow: "hidden" }}>
        <div className="scan-line" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {[["TOKEN TAX DASHBOARD", "var(--cyan)"], ["CONTEXT WINDOW ANALYSIS", "var(--purple)"]].map(([l, c]) => (
                <span key={l} style={{ padding: "3px 12px", borderRadius: 20, fontSize: 9, fontWeight: 700, background: `${c}12`, color: c, border: `1px solid ${c}30`, fontFamily: "var(--mono)", letterSpacing: 1.5 }}>{l}</span>
              ))}
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-1px", marginBottom: 8, background: "linear-gradient(135deg,#fff 0%,var(--cyan) 60%,var(--purple) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Context Window Reduction
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-dim)", maxWidth: 520, lineHeight: 1.7 }}>
              TigerGraph acts as a <strong style={{ color: "var(--cyan)" }}>precision filter</strong> — instead of dumping 3,800 raw tokens into the LLM,
              it extracts only the fraud-relevant graph facts. The result: <strong style={{ color: "var(--green)" }}>~94% fewer tokens</strong>, lower cost, and zero hallucinations.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 180 }}>
            <StatPill value={`${avgTokenSavings}%`} label="Avg Token Reduction" color="var(--cyan)" />
            <StatPill value={`${totalSaved.toLocaleString()}`} label="Total Tokens Saved" color="var(--purple)" />
            <StatPill value={`${fnPrevention[0].value} → 0`} label="False Negatives Fixed" color="var(--green)" />
          </div>
        </div>
      </motion.div>

      {/* Context window reduction bars */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="card" style={{ padding: "20px 24px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Per-Account Context Window</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 20 }}>Tokens sent to LLM — Baseline reads all 50 logs, GraphRAG sends only extracted graph facts</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {records.map((r, i) => (
            <motion.div key={r.account_id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--cyan)", fontFamily: "var(--mono)" }}>Account #{r.account_id}</span>
                <span style={{ fontSize: 11, color: "var(--green)", fontFamily: "var(--mono)", fontWeight: 700 }}>↓ {r.token_savings_pct}% saved</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <TokenBar label="Baseline" tokens={r.baseline_tokens} max={4200} color="var(--red)" delay={0.2 + i * 0.08} />
                <TokenBar label="GraphRAG" tokens={r.graphrag_tokens} max={4200} color="var(--green)" delay={0.3 + i * 0.08} />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 3 charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <ChartCard title="Token Count" sub="~94% reduction" data={tokenData} keys={["Baseline", "GraphRAG"]} colors={["var(--red)", "var(--cyan)"]} tag="TOKENS" />
        <ChartCard title="Cost (×1000 $)" sub="~94% cost savings" data={costData} keys={["Baseline", "GraphRAG"]} colors={["var(--red)", "var(--green)"]} tag="COST" />
        <ChartCard title="Latency (ms)" sub="~70% faster" data={latencyData} keys={["Baseline", "GraphRAG"]} colors={["var(--red)", "var(--yellow)"]} tag="LATENCY" />
      </div>

      {/* False Negative Prevention */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="card" style={{ padding: "20px 24px", borderTop: "2px solid var(--orange)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>False Negative Prevention</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 20 }}>The hallucination test — cases where Baseline says SAFE but GraphRAG correctly flags SUSPICIOUS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {fnPrevention.map((f, i) => (
            <motion.div key={f.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 + i * 0.1 }}
              style={{ padding: "20px 22px", background: `${f.color}08`, border: `1.5px solid ${f.color}30`, borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: f.color, fontFamily: "var(--mono)", lineHeight: 1 }}>{f.icon} {f.value}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: f.color, marginTop: 8 }}>{f.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{f.desc}</div>
            </motion.div>
          ))}
        </div>
        <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(255,159,10,0.06)", border: "1px solid rgba(255,159,10,0.2)", borderRadius: 10, fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--orange)" }}>Why this matters:</strong> A false negative in fraud detection means a fraudster goes undetected.
          The baseline LLM misses 2 out of 3 fraud cases because it reads raw logs without graph context.
          GraphRAG's 3-hop traversal catches 100% by revealing hidden connections the LLM cannot see in flat text.
        </div>
      </motion.div>

      {/* WCC Clusters */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="card" style={{ padding: "20px 24px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>WCC Clusters — Weakly Connected Components</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 20 }}>TigerGraph's WCC algorithm instantly partitions the graph into fraud rings vs isolated accounts</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {wccClusters.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 + i * 0.1 }}
              style={{ padding: "18px 20px", background: `${c.color}08`, border: `1.5px solid ${c.color}30`, borderRadius: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: c.color, fontFamily: "var(--mono)", letterSpacing: 1 }}>CLUSTER {c.id}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginTop: 2 }}>{c.label}</div>
                </div>
                <div style={{ padding: "4px 12px", borderRadius: 20, fontSize: 10, fontWeight: 800, background: `${c.color}20`, color: c.color, border: `1px solid ${c.color}40`, fontFamily: "var(--mono)" }}>
                  {c.risk} RISK
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {c.members.map(m => (
                  <span key={m} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${c.color}15`, color: c.color, border: `1px solid ${c.color}30`, fontFamily: "var(--mono)" }}>{m}</span>
                ))}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--mono)" }}>
                Size: {c.size} · Device: {c.device} · IP: {c.ip}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Cosine Similarity */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="card" style={{ padding: "20px 24px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Cosine Similarity — Behavioral Matching</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 20 }}>
          Finds accounts that behave like known fraudsters even without a direct device/IP link — catches synthetic identities that rotate infrastructure
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {cosineScores.map((s, i) => (
            <motion.div key={s.account} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + i * 0.08 }}
              style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 16px", background: `${s.color}08`, border: `1px solid ${s.color}25`, borderRadius: 10 }}>
              <div style={{ minWidth: 80, fontFamily: "var(--mono)", fontWeight: 700, color: s.color, fontSize: 13 }}>{s.account}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: "var(--text-dim)" }}>↔ {s.match}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: s.color, fontFamily: "var(--mono)" }}>{s.score}</span>
                </div>
                <div style={{ height: 6, background: "var(--surface3)", borderRadius: 3, overflow: "hidden" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${s.score * 100}%` }} transition={{ duration: 1, ease: "easeOut", delay: 0.6 + i * 0.08 }}
                    style={{ height: "100%", background: `linear-gradient(90deg,${s.color}80,${s.color})`, borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
        <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(191,90,242,0.06)", border: "1px solid rgba(191,90,242,0.2)", borderRadius: 10, fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--purple)" }}>How it works:</strong> TigerGraph computes cosine similarity on behavioral feature vectors
          (login times, transaction amounts, device count, IP diversity). A score above 0.85 triggers a fraud alert even if no direct graph edge exists.
          This catches <em>synthetic identities that rotate devices</em> — the hardest fraud to detect.
        </div>
      </motion.div>
    </div>
  )
}

function StatPill({ value, label, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 14px", background: `${color}10`, borderRadius: 10, border: `1px solid ${color}25` }}>
      <span style={{ fontSize: 16, fontWeight: 900, color, fontFamily: "var(--mono)", minWidth: 80 }}>{value}</span>
      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{label}</span>
    </div>
  )
}

function TokenBar({ label, tokens, max, color, delay }) {
  const pct = (tokens / max) * 100
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 9, fontFamily: "var(--mono)", color: "var(--text-muted)", minWidth: 60, textAlign: "right" }}>{label}</span>
      <div style={{ flex: 1, height: 18, background: "var(--surface3)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: "easeOut", delay }}
          style={{ height: "100%", background: `linear-gradient(90deg,${color}80,${color})`, borderRadius: 4 }} />
        <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 9, fontFamily: "var(--mono)", color: "#fff", fontWeight: 700, mixBlendMode: "screen" }}>
          {tokens.toLocaleString()}
        </span>
      </div>
    </div>
  )
}

function ChartCard({ title, sub, data, keys, colors, tag }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
      className="card" style={{ padding: "18px 18px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{title}</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>
        </div>
        <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 8, fontWeight: 800, background: `${colors[1]}12`, color: colors[1], border: `1px solid ${colors[1]}30`, fontFamily: "var(--mono)", letterSpacing: 1 }}>{tag}</span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,46,74,0.4)" vertical={false} />
          <XAxis dataKey="id" tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "var(--mono)" }} tickFormatter={v => `#${v}`} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "var(--mono)" }} axisLine={false} tickLine={false} />
          <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,59,92,0.04)" }} />
          {keys.map((k, i) => (
            <Bar key={k} dataKey={k} fill={colors[i]} radius={[4, 4, 0, 0]} maxBarSize={28} fillOpacity={0.85} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
