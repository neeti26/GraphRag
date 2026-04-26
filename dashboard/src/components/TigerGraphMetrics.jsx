import { motion } from "framer-motion"

export default function TigerGraphMetrics({ summary, records }) {
  // Inference Yield: (graphrag_accuracy / baseline_accuracy) * (total_baseline_tokens / total_graphrag_tokens)
  const inferenceYield = summary.baseline_accuracy_pct > 0 && summary.total_graphrag_tokens > 0
    ? ((summary.graphrag_accuracy_pct / summary.baseline_accuracy_pct) *
       (summary.total_baseline_tokens / summary.total_graphrag_tokens))
    : 0

  // Path Fidelity: % of records with a non-null fraud_path
  const pathFidelity = records.length > 0
    ? (records.filter(r => r.fraud_path !== null).length / records.length * 100)
    : 0

  // Context Window Load: average graphrag_tokens per record
  const contextWindowLoad = records.length > 0
    ? Math.round(records.reduce((s, r) => s + r.graphrag_tokens, 0) / records.length)
    : 0

  const metrics = [
    {
      label: "Inference Yield",
      value: `${inferenceYield.toFixed(2)}×`,
      annotation: "accuracy × token efficiency",
      color: "var(--cyan)",
      bg: "rgba(0,245,255,0.06)",
      border: "rgba(0,245,255,0.2)",
    },
    {
      label: "Path Fidelity",
      value: `${pathFidelity.toFixed(0)}%`,
      annotation: "records with verified fraud path",
      color: "var(--green)",
      bg: "rgba(0,230,118,0.06)",
      border: "rgba(0,230,118,0.2)",
    },
    {
      label: "Context Window Load",
      value: `${contextWindowLoad} tokens`,
      annotation: "avg tokens per GraphRAG query",
      color: "var(--yellow)",
      bg: "rgba(255,184,0,0.06)",
      border: "rgba(255,184,0,0.2)",
    },
    {
      label: "Multi-Hop Depth",
      value: "3 hops",
      annotation: "BFS traversal depth",
      color: "var(--purple)",
      bg: "rgba(191,90,242,0.06)",
      border: "rgba(191,90,242,0.2)",
    },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="card"
      style={{ padding: "20px 22px", borderLeft: "3px solid var(--cyan)" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--cyan)", marginBottom: 16, fontFamily: "var(--mono)", letterSpacing: 0.5 }}>
        TigerGraph Metrics
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {metrics.map((m, i) => (
          <motion.div key={m.label}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.07 }}
            style={{ padding: "14px 16px", background: m.bg, border: `1px solid ${m.border}`, borderRadius: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8, fontFamily: "var(--mono)" }}>
              {m.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: m.color, fontFamily: "var(--mono)", letterSpacing: "-0.5px", marginBottom: 4 }}>
              {m.value}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
              {m.annotation}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
