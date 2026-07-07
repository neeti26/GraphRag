/**
 * TokenEconomics — displays token/cost savings and hallucination guard status.
 * Props: { summary, records, graphragCorrect }
 */
export default function TokenEconomics({ summary, records, graphragCorrect }) {
  const avgBaselineTokens = summary?.total_baseline_tokens / (summary?.total_accounts || 1)
  const avgGraphragTokens = summary?.total_graphrag_tokens / (summary?.total_accounts || 1)
  const contextReduction = ((avgBaselineTokens - avgGraphragTokens) / avgBaselineTokens * 100).toFixed(1)
  const costSavings = (summary?.total_baseline_cost_usd - summary?.total_graphrag_cost_usd).toFixed(6)

  const metrics = [
    {
      label: "Context Reduction %",
      value: `${contextReduction}%`,
      color: "var(--cyan)",
    },
    {
      label: "Cost Savings USD",
      value: `$${costSavings}`,
      color: "var(--green)",
    },
  ]

  return (
    <div
      className="card"
      style={{ borderTop: "2px solid var(--cyan)", marginTop: 8 }}
    >
      <div
        style={{
          display: "flex",
          gap: 24,
          padding: "16px 24px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {metrics.map(({ label, value, color }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 9,
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: 1.5,
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 24,
                fontWeight: 700,
                color,
              }}
            >
              {value}
            </span>
          </div>
        ))}

        {/* Hallucination Guard badge */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 9,
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: 1.5,
            }}
          >
            Hallucination Guard
          </span>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 12,
              fontWeight: 700,
              color: graphragCorrect ? "#00F5FF" : "#FF4D4D",
              padding: "4px 12px",
              borderRadius: 20,
              background: graphragCorrect ? "rgba(0,245,255,0.1)" : "rgba(255,77,77,0.1)",
              border: `1px solid ${graphragCorrect ? "rgba(0,245,255,0.3)" : "rgba(255,77,77,0.3)"}`,
              display: "inline-block",
            }}
          >
            {graphragCorrect ? "Grounded in GSQL Truth" : "Unverifiable Guess"}
          </span>
        </div>
      </div>
    </div>
  )
}
