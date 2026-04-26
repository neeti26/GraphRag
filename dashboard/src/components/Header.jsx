import { motion } from "framer-motion"

export default function Header({ summary }) {
  const hallucinations = summary?.hallucination_cases?.length || 0
  return (
    <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      style={{
        background: "rgba(11,14,20,0.97)",
        borderBottom: "1px solid var(--border)",
        padding: "14px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        backdropFilter: "blur(24px)",
        position: "fixed", top: 0, left: 0, right: 0,
        zIndex: 100,
        height: 69,
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <motion.div whileHover={{ scale: 1.1, rotate: -10 }} transition={{ type: "spring", stiffness: 400 }}
          style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg,#7f1d1d,var(--red))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "var(--shadow-red)", cursor: "pointer" }}>🛡️</motion.div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.5px", color: "var(--text)" }}>FraudGraph</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--mono)", letterSpacing: 0.5 }}>Inference Benchmarking Engine · TigerGraph Hackathon 2025</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {[["TigerGraph", "var(--cyan)"], ["GraphRAG", "var(--green)"], ["Fraud AI", "var(--red)"]].map(([l, c]) => (
          <span key={l} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 10, fontWeight: 700, color: c, background: `${c}12`, border: `1px solid ${c}30`, fontFamily: "var(--mono)", letterSpacing: 0.5 }}>{l}</span>
        ))}
        {hallucinations > 0 && (
          <div className="alert-pulse" style={{ marginLeft: 6, padding: "5px 14px", borderRadius: 20, background: "rgba(255,77,77,0.15)", border: "1px solid rgba(255,77,77,0.4)", fontSize: 10, fontWeight: 800, color: "var(--red)", letterSpacing: 1, fontFamily: "var(--mono)" }}>
            ⚠️ {hallucinations} HALLUCINATION{hallucinations > 1 ? "S" : ""} CAUGHT
          </div>
        )}
      </div>
    </motion.header>
  )
}
