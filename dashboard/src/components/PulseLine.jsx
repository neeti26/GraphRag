import { motion, AnimatePresence } from "framer-motion"

/**
 * PulseLine — animated vertical separator between Baseline and GraphRAG panes.
 * Props: active (boolean) — when true, shows a traveling highlight
 */
export default function PulseLine({ active }) {
  return (
    <div style={{
      position: "relative",
      width: 1,
      alignSelf: "stretch",
      background: "#2D333B",
      flexShrink: 0,
      overflow: "hidden",
    }}>
      <AnimatePresence>
        {active && (
          <motion.div
            key="pulse"
            initial={{ top: "-60px" }}
            animate={{ top: "100%" }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            style={{
              position: "absolute",
              left: 0,
              width: "100%",
              height: 60,
              background: "linear-gradient(to bottom, transparent, #00F5FF, transparent)",
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
