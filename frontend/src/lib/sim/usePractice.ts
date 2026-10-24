import { useCallback, useEffect, useMemo, useState } from 'react'
import { indexFundGame, simulate, type Game, type Market, type NewOrder } from './engine'
import { newGame, type ScenarioId } from './scenarios'

/** Playback speeds, in trading days per second. */
export const SPEEDS = [5, 10, 25] as const
const STORAGE_KEY = 'parakh.practice.v1'

/** Everything needed to resume a game: its settings and orders, and how far it has got. */
export type Saved = { scenario: ScenarioId; seed: number; startDate: string; game: Game; day: number }

function load(market: Market): Saved | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Saved | null
    // Day numbers point into the market's calendar; if that has changed, the game can't be trusted.
    return saved && market.dates[saved.game.start] === saved.startDate && saved.day <= saved.game.end ? saved : null
  } catch {
    return null
  }
}

function store(saved: Saved | null) {
  try {
    if (saved) localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be off (private windows); the game then lasts for this visit only.
  }
}

/**
 * One practice game on this device: start it, let time run, place orders. Everything shown is
 * recomputed from the saved orders, so what you see is always exactly what the rules produce.
 */
export function usePractice(market: Market) {
  const [saved, setSaved] = useState<Saved | null>(() => load(market))
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(SPEEDS[0])

  useEffect(() => store(saved), [saved])

  const advance = useCallback((days: number) => {
    setSaved((s) => (s ? { ...s, day: Math.min(s.game.end, s.day + days) } : s))
  }, [])

  const finished = saved != null && saved.day >= saved.game.end
  useEffect(() => {
    if (!playing || finished) return
    const timer = setInterval(() => advance(1), 1000 / speed)
    return () => clearInterval(timer)
  }, [playing, finished, speed, advance])

  const result = useMemo(() => (saved ? simulate(market, saved.game, saved.day) : null), [market, saved])
  const fund = useMemo(() => (saved ? simulate(market, indexFundGame(market, saved.game), saved.day) : null), [market, saved])

  return {
    saved,
    result,
    fund,
    finished,
    playing: playing && !finished,
    speed,
    setSpeed,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    advance,
    start(scenario: ScenarioId, cash: number) {
      const seed = Math.floor(Math.random() * 2 ** 31)
      const game = newGame(market, scenario, cash, seed)
      setSaved({ scenario, seed, startDate: market.dates[game.start], game, day: game.start })
      setPlaying(false)
    },
    /** Orders are placed after the current day's close; they fill when time next moves on. */
    order(o: NewOrder) {
      setSaved((s) => (s && s.day < s.game.end ? { ...s, game: { ...s.game, orders: [...s.game.orders, { ...o, day: s.day }] } } : s))
    },
    cancel(index: number) {
      setSaved((s) => (s ? { ...s, game: { ...s.game, orders: s.game.orders.filter((_, i) => i !== index) } } : s))
    },
    replay() {
      setSaved((s) => (s ? { ...s, day: s.game.start, game: { ...s.game, orders: [] } } : s))
      setPlaying(false)
    },
    quit() {
      setSaved(null)
      setPlaying(false)
    },
  }
}

export type Practice = ReturnType<typeof usePractice>
