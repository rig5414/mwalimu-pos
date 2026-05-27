import { useState, useEffect } from 'react'

/**
 * Animates a number from 0 → target over `duration` ms (ease-out).
 */
export function useAnimatedNumber(target, duration = 900) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const end = Number(target) || 0
    if (end === 0) {
      setValue(0)
      return
    }
    const start = performance.now()
    let frame
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 3
      setValue(Math.round(end * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return value
}
