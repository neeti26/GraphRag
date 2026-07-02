export default function NeighborhoodSummaryCallout({ summary }) {
  if (!summary) return null

  return (
    <div style={{
      background: "rgba(0,245,255,0.06)",
      border: "1px solid rgba(0,245,255,0.25)",
      borderRadius: 6,
      padding: "10px 14px",
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4, fontFamily: "var(--mono)" }}>
        Neighborhood Summary
      </div>
      <div style={{ fontSize: 11, color: "var(--cyan)", fontFamily: "var(--mono)", lineHeight: 1.6, opacity: 0.9 }}>
        {summary}
      </div>
    </div>
  )
}
