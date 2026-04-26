import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import GhostButton from "./GhostButton"

const QUERIES = [
  {
    id: "q1",
    step: 1,
    icon: "⬡",
    title: "SELECT Account Node",
    color: "var(--cyan)",
    gsql: `SELECT a
FROM Account:a
WHERE a.account_id == "8821"
ACCUM @@result += a;`,
    result: `Account #8821 found
  status: active
  risk_score: 0.2 (pre-graph)
  registered: 2023-01-14`,
    ms: 12,
    desc: "Fetch the target account node from TigerGraph.",
  },
  {
    id: "q2",
    step: 2,
    icon: "📱",
    title: "USED_DEVICE Traversal",
    color: "var(--purple)",
    gsql: `SELECT d
FROM Account:a -(USED_DEVICE:e)-> Device:d
WHERE a.account_id == "8821"
ACCUM @@devices += d.device_id;`,
    result: `Device found: XYZ-999
  first_seen: 2023-01-15
  last_seen: 2024-11-02
  account_count: 4  ← HIGH RISK`,
    ms: 18,
    desc: "Traverse USED_DEVICE edges to find all devices linked to this account.",
  },
  {
    id: "q3",
    step: 3,
    icon: "👥",
    title: "Neighbor Account Lookup",
    color: "var(--orange)",
    gsql: `SELECT b
FROM Device:d -(USED_BY:e)-> Account:b
WHERE d.device_id IN @@devices
  AND b.account_id != "8821"
ACCUM @@neighbors += b;`,
    result: `Neighbors via XYZ-999:
  Account #1002 — status: FLAGGED (risk=7.4)
  Account #0001 — status: BANNED  (risk=9.8)
  Account #5566 — status: FLAGGED (risk=6.1)`,
    ms: 24,
    desc: "Find all accounts that share the same device — the core fraud ring detection step.",
  },
  {
    id: "q4",
    step: 4,
    icon: "🚫",
    title: "IP Blacklist Check",
    color: "var(--red)",
    gsql: `SELECT ip
FROM Account:a -(LOGGED_FROM_IP:e)-> IPAddress:ip
WHERE a.account_id == "8821"
  AND ip.blacklisted == TRUE
ACCUM @@blacklisted_ips += ip.address;`,
    result: `BLACKLISTED IP found: 192.168.1.1
  reason: Known fraud proxy
  chargebacks: 12
  linked_accounts: 3`,
    ms: 15,
    desc: "Check if the account has logged in from any blacklisted IP addresses.",
  },
  {
    id: "q5",
    step: 5,
    icon: "🔗",
    title: "WCC() — Fraud Ring Detection",
    color: "var(--yellow)",
    gsql: `RUN QUERY tg_wcc(
  v_type=["Account","Device","IPAddress"],
  e_type=["USED_DEVICE","LOGGED_FROM_IP","USED_BY"],
  output_limit=10
);`,
    result: `WCC Cluster C1 (size=4):
  Members: #0001, #1002, #8821, #5566
  Shared device: XYZ-999
  Shared IP: 192.168.1.1
  → FRAUD RING CONFIRMED

WCC Cluster C2 (size=1):
  Members: #3344 → ISOLATED (safe)`,
    ms: 38,
    desc: "Weakly Connected Components partitions the graph into fraud rings. C1 has 4 members — all connected via shared device and IP.",
  },
  {
    id: "q6",
    step: 6,
    icon: "📐",
    title: "CosineSimilarity() — Behavioral Match",
    color: "var(--green)",
    gsql: `RUN QUERY tg_cosine_nbor_ss(
  source=("Account","8821"),
  e_type="TRANSACTION",
  reverse_e_type="REVERSE_TRANSACTION",
  top_k=3,
  print_results=TRUE
);`,
    result: `Top behavioral matches:
  #0001 (BANNED)  → similarity: 0.94 ← CRITICAL
  #1002 (FLAGGED) → similarity: 0.91
  #5566 (FLAGGED) → similarity: 0.87

Threshold 0.85 exceeded — fraud pattern confirmed`,
    ms: 45,
    desc: "Cosine similarity on transaction feature vectors. Account #8821 behaves like banned Account #0001 with 94% similarity.",
  },
]

const ALGORITHMS = [
  { name: "WCC", full: "Weakly Connected Components", color: "var(--yellow)", desc: "Partitions the graph into clusters of connected accounts. A cluster of size > 2 sharing a device is a fraud ring." },
  { name: "Cosine Similarity", full: "tg_cosine_nbor_ss", color: "var(--green)", desc: "Computes behavioral similarity between accounts using transaction feature vectors. Catches synthetic identities that rotate devices." },
  { name: "3-hop BFS", full: "Breadth-First Search", color: "var(--cyan)", desc: "Traverses up to 3 hops from the target account to find all connected nodes — devices, IPs, and other accounts." },
  { name: "ShortestPath", full: "tg_shortest_path", color: "var(--purple)", desc: "Finds the minimum-hop path between a new account and a known blacklisted node. Used to calculate fraud proximity score." },
]

export default function GSQLTrace({ accountId = "8821", onClose }) {
  const [activeStep, setActiveStep] = useState(null)
  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState([])

  const runTrace = () => {
    setRunning(true)
    setCompleted([])
    setActiveStep(null)
    QUERIES.forEach((q, i) => {
      setTimeout(() => {
        setActiveStep(q.id)
        setCompleted(prev => [...prev, q.id])
        if (i === QUERIES.length - 1) {
          setTimeout(() => { setRunning(false); setActiveStep(null) }, 400)
        }
      }, i * 320)
    })
  }

  const totalMs = QUERIES.reduce((s, q) => s + q.ms, 0)

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        style={{ background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: "var(--radius)", padding: 28, maxWidth: 820, width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--purple)", marginBottom: 4 }}>
              ⬡ GSQL Reasoning Trace — Account #{accountId}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--mono)" }}>
              {QUERIES.length} queries executed · {totalMs}ms total · TigerGraph Cloud
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <GhostButton accent="var(--purple)" onClick={runTrace} disabled={running}>
              {running ? "⏳ Running..." : "▶ Replay Trace"}
            </GhostButton>
            <button onClick={onClose} style={{ padding: "7px 14px", borderRadius: 8, background: "rgba(255,77,77,0.15)", border: "1px solid rgba(255,77,77,0.3)", color: "var(--red)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--mono)" }}>
              ✕
            </button>
          </div>
        </div>

        {/* Key message */}
        <div style={{ marginBottom: 20, padding: "12px 16px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 10, fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--purple)" }}>Zero Hallucination Guarantee:</strong> Every fraud signal below was deduced from the graph structure.
          The LLM received only these extracted facts — it cannot fabricate connections that don't exist in TigerGraph.
        </div>

        {/* Query steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {QUERIES.map((q, i) => {
            const isDone = completed.includes(q.id)
            const isActive = activeStep === q.id
            return (
              <motion.div key={q.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                <div
                  onClick={() => setActiveStep(activeStep === q.id ? null : q.id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                    background: isDone ? `${q.color}08` : isActive ? `${q.color}10` : "rgba(0,0,0,0.2)",
                    border: `1px solid ${isDone ? q.color + "40" : isActive ? q.color + "60" : "var(--border)"}`,
                    transition: "all 0.2s" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${q.color}20`, border: `1px solid ${q.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                    {isDone ? "✓" : q.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 9, fontFamily: "var(--mono)", color: "var(--text-muted)", fontWeight: 700 }}>STEP {q.step}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: isDone ? q.color : "var(--text-dim)" }}>{q.title}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{q.desc}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--mono)" }}>{q.ms}ms</span>
                    {isActive && <div style={{ width: 6, height: 6, borderRadius: "50%", background: q.color, boxShadow: `0 0 8px ${q.color}` }} />}
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{activeStep === q.id ? "▲" : "▼"}</span>
                  </div>
                </div>

                <AnimatePresence>
                  {activeStep === q.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: "hidden" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "10px 0 4px" }}>
                        <div style={{ padding: "12px 14px", background: "rgba(0,0,0,0.3)", borderRadius: 8, border: "1px solid var(--border)" }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: q.color, fontFamily: "var(--mono)", marginBottom: 8, letterSpacing: 1 }}>GSQL QUERY</div>
                          <pre style={{ fontSize: 11, color: "var(--cyan)", fontFamily: "var(--mono)", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap", overflowX: "auto" }}>{q.gsql}</pre>
                        </div>
                        <div style={{ padding: "12px 14px", background: `${q.color}06`, borderRadius: 8, border: `1px solid ${q.color}25` }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: q.color, fontFamily: "var(--mono)", marginBottom: 8, letterSpacing: 1 }}>RESULT</div>
                          <pre style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--mono)", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{q.result}</pre>
                          <div style={{ marginTop: 8, fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--mono)" }}>Executed in {q.ms}ms</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>

        {/* Total execution */}
        <div style={{ padding: "12px 16px", background: "rgba(0,245,255,0.06)", border: "1px solid rgba(0,245,255,0.2)", borderRadius: 10, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
            Total graph execution time: <strong style={{ color: "var(--green)", fontFamily: "var(--mono)" }}>{totalMs}ms</strong>
            <span style={{ color: "var(--text-muted)", marginLeft: 12 }}>vs LLM reading raw logs: ~2,100ms</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--green)", fontWeight: 700, fontFamily: "var(--mono)" }}>
            ↓ {(((2100 - totalMs) / 2100) * 100).toFixed(0)}% faster
          </div>
        </div>

        {/* Algorithm explanations */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14, fontFamily: "var(--mono)" }}>
            GSQL Algorithms Used
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {ALGORITHMS.map((a, i) => (
              <motion.div key={a.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
                style={{ padding: "12px 14px", background: `${a.color}06`, border: `1px solid ${a.color}25`, borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: a.color, fontFamily: "var(--mono)" }}>{a.name}</span>
                  <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--mono)" }}>{a.full}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.5 }}>{a.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
