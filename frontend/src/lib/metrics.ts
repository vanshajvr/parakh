import type { CallStats } from '../api/client'

/** Shape of the model metrics stored with each model version (written by ml/report.py). */
export type ModelSummary = CallStats & {
  auc: number
  ece: number
  brier: number
  period: [string, string]
  base_rate_beat_index: number
  by_confidence: Record<string, CallStats>
}
export type YearRow = CallStats & { year: number; auc: number; base_rate_beat_index: number }
export type CalibrationRow = { n: number; predicted: number; actual: number }
export type SimulatedMetrics = {
  chosen_model: string
  model_version: string
  models: Record<string, ModelSummary>
  yearly: YearRow[]
  calibration: CalibrationRow[]
}

/** Rough round-trip cost of a delivery trade in India; same value as ROUND_TRIP_COST in ml/config.py. */
export const ROUND_TRIP_COST = 0.0025

export function chosenSummary(m: SimulatedMetrics): ModelSummary {
  return m.models[m.chosen_model]
}

export function worstYear(rows: YearRow[]): YearRow | undefined {
  return [...rows].filter((r) => r.hit_rate != null).sort((a, b) => a.hit_rate! - b.hit_rate!)[0]
}

export function yearsBelowCoinFlip(rows: YearRow[]): number {
  return rows.filter((r) => r.hit_rate != null && r.hit_rate < 0.5).length
}

/** Whether "Stronger edge" calls have actually done better than "Slight edge" ones. */
export function confidenceVerdict(bands: Record<string, CallStats>): string {
  const strong = bands['Stronger edge']?.hit_rate, slight = bands['Slight edge']?.hit_rate
  if (strong == null || slight == null) return ''
  const gap = (strong - slight) * 100
  if (gap >= 0.5) return 'Yes, a little. The confidence labels mean something, but not much.'
  if (gap > -0.5) return 'Not really: the two levels have done about the same.'
  return 'No: stronger-edge calls did slightly worse, so every new call gets the same label.'
}

/** Gap between how bullish-lean and bearish-lean stocks did against the index, per 5 days. */
export function edgeSpread(s: CallStats): number | null {
  if (s.avg_excess_after_bullish == null || s.avg_excess_after_bearish == null) return null
  return s.avg_excess_after_bullish - s.avg_excess_after_bearish
}
