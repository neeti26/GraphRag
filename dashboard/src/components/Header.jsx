import { motion } from "framer-motion"

export default function Header({ summary }) {
  const hallucinations = summary?.hallucination_cases?.length || 0
  return (
    <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      style={{
        background: "rgba(11,14,20,0.97)",
        borderBottom: "1px solid var(--border)",
        padding: "12px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        backdropFilter: "blur(24px)",
        position: "fixed", top: 0, left: 0, right: 0,
        zIndex: 100,
        height: 60,
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 400 }}
          style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg,#7f1d1d,var(--red))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "var(--shadow-red)", cursor: "pointer" }}>🛡️</motion.div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.5px", color: "var(--text)" }}>FraudGraph</div>
          <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--mono)", letterSpacing: 0.3 }}>Inference Benchmarking Engine</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 9, fontWeight: 700, color: "var(--cyan)", background: "rgba(88,166,255,0.08)", border: "1px solid rgba(88,166,255,0.2)", fontFamily: "var(--mono)", letterSpacing: 0.5 }}>TigerGraph</span>
        <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 9, fontWeight: 700, color: "var(--green)", background: "rgba(63,185,80,0.08)", border: "1px solid rgba(63,185,80,0.2)", fontFamily: "var(--mono)", letterSpacing: 0.5 }}>GraphRAG</span>
        {hallucinations > 0 && (
          <div className="alert-pulse" style={{ marginLeft: 4, padding: "4px 12px", borderRadius: 6, background: "rgba(255,77,77,0.12)", border: "1px solid rgba(255,77,77,0.3)", fontSize: 9, fontWeight: 800, color: "var(--red)", letterSpacing: 0.8, fontFamily: "var(--mono)" }}>
            ⚠️ {hallucinations} HALLUCINATION{hallucinations > 1 ? "S" : ""}
          </div>
        )}
      </div>
    </motion.header>
  )
}
