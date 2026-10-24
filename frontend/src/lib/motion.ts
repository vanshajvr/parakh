import { useEffect, useState } from 'react'

/** True only when the reader hasn't asked for reduced motion (and in tests, which have no media queries). */
export function motionAllowed(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: no-preference)').matches
}

const NUMBER = /-?\d[\d,]*(\.\d+)?/

/**
 * Counts the first number in a label up from zero once, keeping its format: "51.4%", "Day 2",
 * "₹1,217.50". Labels without a number, or readers who prefer less motion, get the final text.
 */
export function useCountUp(label: string, duration = 700): string {
  // The in-between text while counting; null (show the real label) before and after.
  const [counting, setCounting] = useState<string | null>(null)
  useEffect(() => {
    const match = label.match(NUMBER)
    if (!match || !motionAllowed()) return
    const target = Number(match[0].replace(/,/g, ''))
    const decimals = match[1] ? match[1].length - 1 : 0
    const grouped = match[0].includes(',')
    const write = (v: number) => {
      const n = grouped ? v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : v.toFixed(decimals)
      return label.replace(NUMBER, n)
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setCounting(t < 1 ? write(target * (1 - (1 - t) ** 3)) : null)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      setCounting(null)
    }
  }, [label, duration])
  return counting ?? label
}
