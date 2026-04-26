import { useState } from "react"
import { motion } from "framer-motion"

/**
 * Ghost Button — outline-only at rest, fills with accent color at 15% opacity on hover.
 * Props: children, accent (CSS color), onClick, disabled, fullWidth
 */
export default function GhostButton({ children, accent = "var(--red)", onClick, disabled = false, fullWidth = false }) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.button
      whileTap={disabled ? {} : { scale: 0.97 }}
      onHoverStart={() => !disabled && setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: fullWidth ? "100%" : undefined,
        padding: "12px 28px",
        borderRadius: "var(--radius-sm)",
        border: `1px solid ${accent}`,
        background: hovered ? `${accent}26` : "transparent",
        color: hovered ? "#FFFFFF" : accent,
        fontSize: 13,
        fontWeight: 700,
        fontFamily: "var(--mono)",
        letterSpacing: 0.5,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "background 150ms, color 150ms, border-color 150ms",
        userSelect: "none",
      }}
    >
      {children}
    </motion.button>
  )
}
