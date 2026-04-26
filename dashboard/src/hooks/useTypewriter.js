import { useState, useEffect, useRef } from "react"

/**
 * useTypewriter — reveals text character-by-character at ~18–22 chars/sec.
 * @param {string} text  - The full string to reveal
 * @param {boolean} active - When true, starts/resumes the animation
 * @returns {{ displayed: string, done: boolean }}
 */
export function useTypewriter(text, active) {
  const [displayed, setDisplayed] = useState("")
  const [done, setDone] = useState(false)
  const intervalRef = useRef(null)
  const indexRef = useRef(0)

  // Clear helper
  const clear = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => {
    // Edge case: empty string
    if (!text) {
      setDisplayed("")
      setDone(true)
      return
    }

    if (!active) {
      // If deactivated mid-animation, jump to full text immediately
      clear()
      setDisplayed(text)
      setDone(true)
      return
    }

    // Reset and start animation
    clear()
    indexRef.current = 0
    setDisplayed("")
    setDone(false)

    // Random interval between 45ms and 56ms per character
    const delay = Math.floor(Math.random() * 12) + 45

    intervalRef.current = setInterval(() => {
      indexRef.current += 1
      const next = text.slice(0, indexRef.current)
      setDisplayed(next)
      if (indexRef.current >= text.length) {
        clear()
        setDone(true)
      }
    }, delay)

    return clear
  }, [text, active])

  return { displayed, done }
}
