import { useEffect, useRef, useState } from 'react'

/** Tracks an element's rendered width, so SVG charts can draw in real pixels. */
export function useElementWidth<T extends HTMLElement>(initial = 340) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(initial)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}
