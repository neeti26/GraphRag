/**
 * EvidenceString — renders a graph evidence string with syntax-like color coding.
 *
 * Priority rules:
 *  1. Alert tokens (ALERT, BLACKLISTED, banned, flagged) → entire string in Crimson #FF4D4D
 *  2. Safe tokens (clean, SAFE, isolated) → entire string in Electric Cyan #00F5FF
 *  3. Key-value separator (: or =) → key in #00F5FF, value in #F0F6FF
 *  4. Plain string → rendered in #F0F6FF
 *
 * All text prefixed with "> " in #444C56, font-family: var(--mono)
 */
export default function EvidenceString({ text }) {
  const ALERT_TOKENS = ["ALERT", "BLACKLISTED", "banned", "flagged"]
  const SAFE_TOKENS  = ["clean", "SAFE", "isolated"]

  const hasAlert = ALERT_TOKENS.some(t => text.includes(t))
  const hasSafe  = !hasAlert && SAFE_TOKENS.some(t => text.includes(t))

  const baseStyle = { fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.6 }
  const promptStyle = { color: "#444C56", ...baseStyle }

  if (hasAlert) {
    return (
      <span style={baseStyle}>
        <span style={promptStyle}>&gt; </span>
        <span style={{ color: "#FF4D4D" }}>{text}</span>
      </span>
    )
  }

  if (hasSafe) {
    return (
      <span style={baseStyle}>
        <span style={promptStyle}>&gt; </span>
        <span style={{ color: "#00F5FF" }}>{text}</span>
      </span>
    )
  }

  // Try key-value split on first : or =
  const colonIdx = text.indexOf(":")
  const equalsIdx = text.indexOf("=")
  const sepIdx = colonIdx === -1 ? equalsIdx
    : equalsIdx === -1 ? colonIdx
    : Math.min(colonIdx, equalsIdx)

  if (sepIdx > 0) {
    const key = text.slice(0, sepIdx)
    const sep = text[sepIdx]
    const val = text.slice(sepIdx + 1)
    return (
      <span style={baseStyle}>
        <span style={promptStyle}>&gt; </span>
        <span style={{ color: "#00F5FF" }}>{key}</span>
        <span style={{ color: "#484F58" }}>{sep}</span>
        <span style={{ color: "#F0F6FF" }}>{val}</span>
      </span>
    )
  }

  // Plain string
  return (
    <span style={baseStyle}>
      <span style={promptStyle}>&gt; </span>
      <span style={{ color: "#F0F6FF" }}>{text}</span>
    </span>
  )
}
