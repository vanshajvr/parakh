import { lazy, Suspense, type ComponentProps } from 'react'

const CandleChart = lazy(() => import('./CandleChart').then((m) => ({ default: m.CandleChart })))

/** The chart library is large, so it loads only when a chart is on screen. */
export function LazyCandleChart(props: ComponentProps<typeof CandleChart>) {
  return (
    <Suspense fallback={<div style={{ height: props.height ?? 300 }} className="animate-pulse rounded-xl bg-chip" />}>
      <CandleChart {...props} />
    </Suspense>
  )
}
