/**
 * RadialGauge — SVG arc gauge replacing RadialBarChart for single-metric display.
 * Arc sweeps 270° (from 135° to 405°) representing 0–100%.
 *
 * Props:
 *   value  {number}  0–100 (clamped)
 *   label  {string}  text below the numeric value
 *   size   {number}  default 160
 */
export default function RadialGauge({ value, label, size = 160 }) {
  const clamped = Math.max(0, Math.min(100, value))

  // Arc geometry
  const cx = size / 2
  const cy = size / 2
  const r  = size * 0.38
  const strokeWidth = size * 0.075

  // 270° sweep starting at 135° (bottom-left), going clockwise to 405° (bottom-right)
  const startAngle = 135
  const sweepAngle = 270
  const circumference = 2 * Math.PI * r
  // We only use 270/360 of the circumference
  const arcLength = (sweepAngle / 360) * circumference
  const fillLength = (clamped / 100) * arcLength

  // Convert polar to cartesian
  const toXY = (angleDeg) => {
    const rad = (angleDeg - 90) * (Math.PI / 180)
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    }
  }

  const buildArcPath = (startDeg, endDeg) => {
    const s = toXY(startDeg)
    const e = toXY(endDeg)
    const largeArc = endDeg - startDeg > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`
  }

  const trackPath = buildArcPath(startAngle, startAngle + sweepAngle)
  const valuePath = clamped > 0
    ? buildArcPath(startAngle, startAngle + (clamped / 100) * sweepAngle)
    : null

  const arcColor = clamped > 80 ? "#00F5FF"
    : clamped >= 50 ? "#FFB800"
    : "#FF4D4D"

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      {/* Track */}
      <path
        d={trackPath}
        fill="none"
        stroke="#2D333B"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Value arc */}
      {valuePath && (
        <path
          d={valuePath}
          fill="none"
          stroke={arcColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${arcColor}80)` }}
        />
      )}
      {/* Center value */}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontSize: size * 0.2,
          fontWeight: 900,
          fill: arcColor,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {clamped}%
      </text>
      {/* Label */}
      <text
        x={cx}
        y={cy + size * 0.16}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontSize: size * 0.075,
          fill: "#484F58",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {label}
      </text>
    </svg>
  )
}
