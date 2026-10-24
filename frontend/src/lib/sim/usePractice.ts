import { useEffect, useMemo, useState } from 'react'
import { indexFundGame, simulate, type Game, type Market, type NewOrder } from './engine'
import { COOLDOWN, firstDrawdown, marketEvents } from './events'
import type { Choice, Prompt } from './report'
import { newGame, type ScenarioId } from './scenarios'

/** Playback speeds, in trading days per second. */
export const SPEEDS = [5, 10, 25] as const
const STORAGE_KEY = 'parakh.practice.v1'

/** Everything needed to resume a game: its settings, orders, the moments it stopped to ask, and how far it has got. */
export type Saved = { scenario: ScenarioId; seed: number; startDate: string; game: Game; day: number; prompts?: Prompt[] }

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
 * Move time forward by up to `days`, stopping at the first moment the game should ask what you'll
 * do (decision D-040): a sharp market move, or your portfolio 15% below its peak. Prompts are at
 * least a month apart, so the game doesn't nag.
 */
function moveOn(market: Market, s: Saved, days: number): Saved {
  const prompts = s.prompts ?? []
  if (prompts.some((p) => !p.choice)) return s // waiting for an answer
  const last = prompts.at(-1)?.day ?? null
  const quiet = (day: number) => last != null && day - last < COOLDOWN
  let target = Math.min(s.game.end, s.day + days)
  const move = marketEvents(market, s.game.start, s.game.end).find((e) => e.day > s.day && e.day <= target && !quiet(e.day))
  const mine = firstDrawdown(simulate(market, s.game, target).days, s.day, last)
  const stop = [move, mine].filter((e) => e != null).sort((a, b) => a!.day - b!.day)[0]
  if (!stop) return { ...s, day: target }
  target = stop.day
  return { ...s, day: target, prompts: [...prompts, { day: target, kind: stop.kind, change: stop.change }] }
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

  const prompt = saved?.prompts?.find((p) => !p.choice) ?? null
  const finished = saved != null && saved.day >= saved.game.end
  const advance = (days: number) => setSaved((s) => (s ? moveOn(market, s, days) : s))

  // While a prompt waits for an answer, time stands still; answering lets it run on.
  const running = playing && !finished && !prompt
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setSaved((s) => (s ? moveOn(market, s, 1) : s)), 1000 / speed)
    return () => clearInterval(timer)
  }, [running, speed, market])

  const result = useMemo(() => (saved ? simulate(market, saved.game, saved.day) : null), [market, saved])
  const fund = useMemo(() => (saved ? simulate(market, indexFundGame(market, saved.game), saved.day) : null), [market, saved])

  const addOrders = (s: Saved, orders: NewOrder[]): Saved =>
    s.day < s.game.end ? { ...s, game: { ...s.game, orders: [...s.game.orders, ...orders.map((o) => ({ ...o, day: s.day }))] } } : s

  return {
    saved,
    result,
    fund,
    finished,
    prompt,
    playing: running,
    speed,
    setSpeed,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    advance,
    start(scenario: ScenarioId, cash: number) {
      const seed = Math.floor(Math.random() * 2 ** 31)
      const game = newGame(market, scenario, cash, seed)
      setSaved({ scenario, seed, startDate: market.dates[game.start], game, day: game.start, prompts: [] })
      setPlaying(false)
    },
    /** Orders are placed after the current day's close; they fill when time next moves on. */
    order(o: NewOrder) {
      setSaved((s) => (s ? addOrders(s, [o]) : s))
    },
    cancel(index: number) {
      setSaved((s) => (s ? { ...s, game: { ...s.game, orders: s.game.orders.filter((_, i) => i !== index) } } : s))
    },
    /**
     * Answer a prompt. Selling in a fall sells everything; in a rise it takes half off the table.
     * Buying more puts the cash into the index fund.
     */
    choose(choice: Choice) {
      if (!result || !saved) return
      const held = Object.entries(result.holdings)
      const orders: NewOrder[] =
        choice === 'sell'
          ? held.map(([symbol, qty]) => ({ symbol, side: 'sell' as const, qty: prompt?.kind === 'rise' ? Math.floor(qty / 2) : qty })).filter((o) => o.qty > 0)
          : choice === 'buy' && result.cash > 1
            ? [{ symbol: market.indexFund, side: 'buy', amount: result.cash }]
            : []
      setSaved((s) => {
        if (!s) return s
        const prompts = (s.prompts ?? []).map((p) => (p.choice ? p : { ...p, choice }))
        return addOrders({ ...s, prompts }, orders)
      })
    },
    replay() {
      setSaved((s) => (s ? { ...s, day: s.game.start, game: { ...s.game, orders: [] }, prompts: [] } : s))
      setPlaying(false)
    },
    quit() {
      setSaved(null)
      setPlaying(false)
    },
  }
}

export type Practice = ReturnType<typeof usePractice>
