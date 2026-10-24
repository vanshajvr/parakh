import { useEffect, useMemo, useRef, useState } from 'react'
import { useSimMarket } from '../api/client'
import { Pause, Play, Search } from '../components/Icons'
import { ValueChart } from '../components/practice/ValueChart'
import { Card, Loading, LoadError } from '../components/States'
import { Term } from '../components/Term'
import { useI18n, type Messages } from '../i18n'
import { money, price, shortDate, signedPct } from '../lib/format'
import { affordable, charges } from '../lib/sim/charges'
import { lastClose, toMarket, type Market } from '../lib/sim/engine'
import { positions, summarise } from '../lib/sim/results'
import { SCENARIOS, scenarioById, type ScenarioId } from '../lib/sim/scenarios'
import { SPEEDS, usePractice, type Practice as PracticeState } from '../lib/sim/usePractice'
import { useDocumentTitle } from '../lib/useDocumentTitle'

/** The time machine (decisions D-033, D-039): practise with virtual money on real past markets. */
export function Practice() {
  const { m } = useI18n()
  useDocumentTitle(m.practice.title)
  const { data, isPending, isError, refetch } = useSimMarket()
  const market = useMemo(() => (data ? toMarket(data) : null), [data])
  if (isPending) return <Loading what={m.practice.title} />
  if (isError || !market) return <LoadError what={m.practice.title} onRetry={() => refetch()} />
  return <Game market={market} />
}

function Game({ market }: { market: Market }) {
  const practice = usePractice(market)
  return practice.saved ? <Playing market={market} practice={practice} /> : <Setup onStart={practice.start} />
}

/* ---- Setup ---------------------------------------------------------------------------------- */

const AMOUNTS = [10_000, 50_000, 1_00_000, 5_00_000]
const SIP_AMOUNTS = [1_000, 5_000, 10_000, 25_000]

function Setup({ onStart }: { onStart: (scenario: ScenarioId, cash: number) => void }) {
  const { m } = useI18n()
  const [scenario, setScenario] = useState<ScenarioId>('crash')
  const sip = scenarioById(scenario).sip === true
  const presets = sip ? SIP_AMOUNTS : AMOUNTS
  const [amount, setAmount] = useState<number>(1_00_000)
  const [custom, setCustom] = useState('')
  const cash = custom ? Number(custom) : presets.includes(amount) ? amount : presets[1]
  return (
    <div className="stagger flex flex-col gap-5 lg:gap-6">
      <section className="flex max-w-3xl flex-col gap-2 px-1">
        <h1 className="m-0 font-serif text-[30px] leading-tight font-semibold tracking-[-0.015em] lg:text-[40px]">{m.practice.title}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-2">{m.practice.intro} <Term id="indexFund" /></p>
      </section>
      <section aria-labelledby="pick" className="flex flex-col gap-3">
        <h2 id="pick" className="m-0 px-1 text-base font-semibold">{m.practice.pickPeriod}</h2>
        <div role="radiogroup" aria-labelledby="pick" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {SCENARIOS.map((s) => {
            const t = m.practice.scenarios[s.id]
            const on = s.id === scenario
            return (
              <button key={s.id} type="button" role="radio" aria-checked={on} onClick={() => { setScenario(s.id); setCustom('') }}
                className={`lift flex cursor-pointer flex-col gap-1.5 rounded-2xl border bg-surface p-4 text-left ${on ? 'border-ink' : 'border-line'}`}>
                <span className="text-[15px] font-semibold text-ink">{t.title}</span>
                <span className="text-xs font-medium text-muted">{t.period}</span>
                <span className="text-[13px] leading-snug text-ink-2">{t.blurb}</span>
              </button>
            )
          })}
        </div>
      </section>
      <section aria-labelledby="amount" className="flex flex-col gap-3">
        <h2 id="amount" className="m-0 px-1 text-base font-semibold">{sip ? m.practice.monthlyAmount : m.practice.startingMoney}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((a) => (
            <button key={a} type="button" aria-pressed={!custom && cash === a} onClick={() => { setAmount(a); setCustom('') }}
              className={`h-10 cursor-pointer rounded-full border px-4 text-sm font-medium ${!custom && cash === a ? 'border-brand bg-brand text-on-brand' : 'border-line-2 bg-surface text-ink'}`}>
              {money(a)}
            </button>
          ))}
          <label className="flex items-center gap-2 text-sm text-muted">
            {m.practice.custom}
            <input type="number" inputMode="numeric" min={1000} step={1000} value={custom} onChange={(e) => setCustom(e.target.value)}
              className="h-10 w-36 rounded-xl border border-line-2 bg-surface px-3 text-sm text-ink" />
          </label>
        </div>
      </section>
      <button type="button" disabled={!(cash >= 1000)} onClick={() => onStart(scenario, cash)}
        className="h-12 cursor-pointer self-start rounded-full bg-brand px-6 text-[15px] font-semibold text-on-brand disabled:cursor-not-allowed disabled:opacity-50">
        {m.practice.start} · {m.practice.scenarios[scenario].title}
      </button>
    </div>
  )
}

/* ---- Playing -------------------------------------------------------------------------------- */

function Playing({ market, practice }: { market: Market; practice: PracticeState }) {
  const { m } = useI18n()
  const { saved, result, fund } = practice
  const [buying, setBuying] = useState<string | null>(null)
  if (!saved || !result || !fund) return null
  const { game, day } = saved
  const hide = scenarioById(saved.scenario).hideDates === true
  const t = m.practice.scenarios[saved.scenario]
  const now = result.days.at(-1)!, fundNow = fund.days.at(-1)!
  const gap = now.value - fundNow.value
  const when = (d: number) => (hide ? m.practice.dayOf(d - game.start + 1, game.end - game.start + 1) : shortDate(market.dates[d], m.locale))

  const openBuy = (symbol: string) => {
    practice.pause()
    setBuying(symbol)
  }

  const summary = (
    <Card className="flex flex-col gap-4 p-4 lg:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">{m.practice.yourMoney}</span>
          <span className="font-serif text-[32px] leading-none font-semibold tabular-nums">{money(now.value)}</span>
          <span className="text-[13px] text-muted">{m.practice.putIn(money(now.invested))} · {m.practice.cash} {money(result.cash)}</span>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-right">
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">{m.practice.fund}</span>
          <span className="text-[22px] leading-none font-semibold text-ink-2 tabular-nums">{money(fundNow.value)}</span>
          <span className="text-[13px] font-medium text-ink">
            {Math.abs(gap) < 1 ? m.practice.level : gap > 0 ? m.practice.ahead(money(gap)) : m.practice.behind(money(-gap))}
          </span>
        </div>
      </div>
      <ValueChart you={result.days} fund={fund.days} length={game.end - game.start + 1}
        startLabel={when(game.start)} endLabel={when(game.end)} youLabel={m.practice.legendYou} fundLabel={m.practice.legendFund}
        label={m.practice.chartAria(money(now.value), money(fundNow.value))} />
      <Controls practice={practice} label={when(day)} />
    </Card>
  )

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <section className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 font-serif text-[28px] leading-tight font-semibold tracking-[-0.015em] lg:text-[36px]">{t.title}</h1>
          <span className="text-sm text-muted">{hide ? t.period : `${shortDate(market.dates[game.start], m.locale)} – ${shortDate(market.dates[game.end], m.locale)}`}</span>
        </div>
        <button type="button" onClick={() => { if (window.confirm(m.practice.confirmNew)) practice.quit() }}
          className="h-9 cursor-pointer rounded-full border border-line-2 bg-surface px-3.5 text-[13px] font-medium text-ink">
          {m.practice.newGame}
        </button>
      </section>

      {practice.finished && <EndPanel market={market} practice={practice} />}

      {/* Phone: one column. Laptop: holdings | your money and time | the market (D-038's workspace style). */}
      <div className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)_minmax(300px,360px)] lg:items-start lg:gap-6">
        <div className="min-w-0 lg:col-start-2 lg:row-start-1">{summary}</div>
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1 lg:gap-6">
          <Holdings market={market} practice={practice} />
          <Pending practice={practice} />
        </div>
        <div className="min-w-0 lg:col-start-3 lg:row-start-1">
          <MarketList market={market} day={day} holdings={result.holdings} onBuy={openBuy} disabled={practice.finished} />
        </div>
      </div>

      {buying && <BuySheet market={market} practice={practice} symbol={buying} onClose={() => setBuying(null)} />}
    </div>
  )
}

function Controls({ practice, label }: { practice: PracticeState; label: string }) {
  const { m } = useI18n()
  const { saved } = practice
  if (!saved) return null
  const { start, end } = saved.game
  const done = (saved.day - start) / Math.max(1, end - start)
  const step = 'h-10 cursor-pointer rounded-full border border-line-2 bg-surface px-3.5 text-[13px] font-medium text-ink disabled:opacity-40'
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-chip" role="progressbar" aria-label={m.practice.progress}
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(done * 100)}>
          <span className="block h-full rounded-full bg-ink-2 transition-[width] duration-150" style={{ width: `${done * 100}%` }} />
        </span>
        <span className="shrink-0 text-[13px] font-medium text-ink tabular-nums">{label}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={practice.finished} onClick={practice.playing ? practice.pause : practice.play}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-on-brand disabled:opacity-40">
          {practice.playing ? <Pause size={16} /> : <Play size={16} />}
          {practice.playing ? m.practice.pause : m.practice.play}
        </button>
        <button type="button" className={step} disabled={practice.finished} onClick={() => practice.advance(5)}>{m.practice.week}</button>
        <button type="button" className={step} disabled={practice.finished} onClick={() => practice.advance(21)}>{m.practice.month}</button>
        <div role="group" aria-label={m.practice.speed} className="ml-auto flex gap-0.5 rounded-full bg-chip p-0.5">
          {SPEEDS.map((s, i) => (
            <button key={s} type="button" aria-pressed={practice.speed === s} onClick={() => practice.setSpeed(s)}
              className={`h-9 min-w-10 cursor-pointer rounded-full px-2.5 text-xs ${practice.speed === s ? 'bg-surface font-semibold text-ink shadow-sm' : 'font-medium text-muted'}`}>
              {['1×', '2×', '5×'][i]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Holdings({ market, practice }: { market: Market; practice: PracticeState }) {
  const { m } = useI18n()
  const { saved, result } = practice
  if (!saved || !result) return null
  const held = positions(market, result, saved.day)
  const sell = (symbol: string, qty: number) => practice.order({ symbol, side: 'sell', qty })
  return (
    <Card className="flex flex-col gap-2 p-4">
      <h2 className="m-0 text-[15px] font-semibold">{m.practice.holdings}</h2>
      {held.length === 0 && <p className="m-0 text-sm leading-relaxed text-muted">{m.practice.noHoldings}</p>}
      <ul className="m-0 flex list-none flex-col p-0">
        {held.map((p) => (
          <li key={p.symbol} className="flex flex-col gap-1.5 border-b border-chip py-2.5 last:border-0">
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-ink">{p.symbol}</span>
              <span className="text-sm font-medium text-ink tabular-nums">{money(p.value)}</span>
            </span>
            <span className="flex items-baseline justify-between gap-2 text-xs text-muted">
              <span>{m.practice.shares(p.qty)}</span>
              <span className="tabular-nums">{m.practice.gainLoss(signedPct(p.gain, 1))}</span>
            </span>
            {!practice.finished && (
              <span className="flex gap-1.5">
                {p.qty > 1 && <button type="button" onClick={() => sell(p.symbol, Math.floor(p.qty / 2))} className="h-8 cursor-pointer rounded-full border border-line-2 bg-surface px-3 text-xs font-medium text-ink">{m.practice.sellHalf}</button>}
                <button type="button" onClick={() => sell(p.symbol, p.qty)} className="h-8 cursor-pointer rounded-full border border-line-2 bg-surface px-3 text-xs font-medium text-ink">{m.practice.sellAll}</button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** Orders waiting for the next open, and any that couldn't fill. */
function Pending({ practice }: { practice: PracticeState }) {
  const { m } = useI18n()
  const { saved, result } = practice
  if (!saved || !result) return null
  const waiting = saved.game.orders.map((o, i) => ({ o, i })).filter(({ o }) => o.day === saved.day)
  const refused = result.rejections.filter((r) => r.order.day < saved.day).slice(-3)
  if (waiting.length === 0 && refused.length === 0) return null
  return (
    <Card className="flex flex-col gap-2 p-4">
      {waiting.length > 0 && <h2 className="m-0 text-[15px] font-semibold">{m.practice.pending}</h2>}
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {waiting.map(({ o, i }) => (
          <li key={i} className="flex items-center justify-between gap-2 text-[13px] text-ink-2">
            <span>{o.side === 'buy' ? m.practice.pendingBuy(o.symbol, money(o.amount)) : m.practice.pendingSell(o.symbol, o.qty)}</span>
            <button type="button" onClick={() => practice.cancel(i)} className="h-8 cursor-pointer rounded-full px-2.5 text-xs font-medium text-link hover:bg-chip">{m.practice.cancel}</button>
          </li>
        ))}
      </ul>
      {refused.map((r, i) => (
        <p key={i} className="m-0 rounded-lg bg-page px-3 py-2 text-xs text-ink-2">{m.practice.rejected[r.reason](r.order.symbol)}</p>
      ))}
    </Card>
  )
}

function MarketList({ market, day, holdings, onBuy, disabled }: {
  market: Market; day: number; holdings: Record<string, number>; onBuy: (symbol: string) => void; disabled: boolean
}) {
  const { m } = useI18n()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const rows = [market.indexFund, ...market.symbols.filter((s) => s !== market.indexFund).sort()]
    .filter((s) => !q || `${s} ${market.info[s].name}`.toLowerCase().includes(q))
  return (
    <Card className="flex flex-col gap-2 p-3 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)]">
      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <h2 className="m-0 text-[15px] font-semibold">{m.practice.market}</h2>
        <span className="text-xs text-muted">{m.practice.oneMonth}</span>
      </div>
      <label className="relative block">
        <span className="sr-only">{m.practice.search}</span>
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={m.practice.search}
          className="h-10 w-full rounded-xl border border-line-2 bg-surface pr-3 pl-9 text-sm text-ink" />
      </label>
      <ul className="m-0 flex max-h-[28rem] min-h-0 list-none flex-col overflow-y-auto p-0 lg:max-h-none lg:flex-1">
        {rows.map((symbol) => {
          const close = market.close[symbol][day]
          const listed = lastClose(market, symbol, day) != null
          const before = day >= 21 ? market.close[symbol][day - 21] : null
          const change = close != null && before != null ? close / before - 1 : null
          return (
            <li key={symbol} className="-mx-1 flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-page">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                  {symbol}
                  {symbol === market.indexFund && <span className="rounded-full bg-chip px-1.5 py-px text-[10px] font-medium text-ink-2">{m.practice.indexFundTag}</span>}
                </span>
                <span className="truncate text-xs text-muted">
                  {holdings[symbol] ? `${m.practice.held(holdings[symbol])} · ` : ''}{market.info[symbol].name}
                </span>
              </span>
              {listed ? (
                <>
                  <span className="flex w-20 flex-col items-end text-right">
                    <span className="text-[13px] text-ink tabular-nums">{price(lastClose(market, symbol, day))}</span>
                    <span className="text-[11px] text-muted tabular-nums">{signedPct(change, 1)}</span>
                  </span>
                  <button type="button" disabled={disabled} onClick={() => onBuy(symbol)}
                    className="h-8 cursor-pointer rounded-full border border-line-2 bg-surface px-3 text-xs font-semibold text-ink disabled:opacity-40">
                    {m.practice.buy}
                  </button>
                </>
              ) : (
                <span className="text-xs text-muted">{m.practice.notListed}</span>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function BuySheet({ market, practice, symbol, onClose }: { market: Market; practice: PracticeState; symbol: string; onClose: () => void }) {
  const { m } = useI18n()
  const cash = practice.result?.cash ?? 0
  const quote = lastClose(market, symbol, practice.saved?.day ?? 0) ?? 0
  const etf = symbol === market.indexFund
  const presets = [5_000, 10_000, 25_000].filter((a) => a < cash)
  const [amount, setAmount] = useState(Math.min(cash, presets.at(-1) ?? cash))
  const qty = affordable(Math.min(amount, cash), quote, etf)
  const c = charges('buy', qty * quote, etf)
  const first = useRef<HTMLInputElement>(null)
  useEffect(() => {
    first.current?.focus()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  const lines = Object.entries(m.practice.order.lines) as [keyof Messages['practice']['order']['lines'], string][]
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/30 p-4 lg:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="buy-title" onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-lg">
        <div className="flex flex-col gap-0.5">
          <h2 id="buy-title" className="m-0 text-lg font-semibold">{m.practice.order.buyTitle(symbol)}</h2>
          <span className="text-[13px] text-muted">{market.info[symbol].name} · {m.practice.order.cashLeft(money(cash))}</span>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          {m.practice.order.amount}
          <input ref={first} type="number" inputMode="numeric" min={0} max={Math.floor(cash)} value={Math.round(amount)}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            className="h-11 rounded-xl border border-line-2 bg-surface px-3 text-[15px] text-ink tabular-nums" />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {[...presets, cash].map((a, i) => (
            <button key={i} type="button" onClick={() => setAmount(a)}
              className="h-8 cursor-pointer rounded-full border border-line-2 bg-surface px-3 text-xs font-medium text-ink">
              {a === cash ? m.practice.order.allCash : money(a)}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1 rounded-xl bg-page px-3.5 py-3 text-[13px]">
          <span className="font-medium text-ink">{qty > 0 ? m.practice.order.estimate(qty, price(quote)) : m.practice.order.tooSmall}</span>
          <span className="text-muted">{m.practice.order.fills}</span>
        </div>
        {qty > 0 && (
          <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[13px]">
            <dt className="col-span-2 pb-0.5 text-xs font-semibold tracking-wide text-muted uppercase">{m.practice.order.charges} <Term id="costs" /></dt>
            {lines.filter(([k]) => c[k] > 0).map(([k, label]) => (
              <div key={k} className="contents"><dt className="text-ink-2">{label}</dt><dd className="m-0 text-right text-ink-2 tabular-nums">{price(c[k])}</dd></div>
            ))}
            <dt className="border-t border-line pt-1 font-semibold text-ink">{m.practice.order.total}</dt>
            <dd className="m-0 border-t border-line pt-1 text-right font-semibold text-ink tabular-nums">{price(c.total)}</dd>
          </dl>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-11 cursor-pointer rounded-full px-4 text-sm font-medium text-ink-2 hover:bg-chip">{m.practice.order.close}</button>
          <button type="button" disabled={qty === 0} onClick={() => { practice.order({ symbol, side: 'buy', amount: Math.min(amount, cash) }); onClose() }}
            className="h-11 cursor-pointer rounded-full bg-brand px-5 text-sm font-semibold text-on-brand disabled:opacity-40">
            {m.practice.order.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}

function EndPanel({ market, practice }: { market: Market; practice: PracticeState }) {
  const { m } = useI18n()
  const { saved, result, fund } = practice
  if (!saved || !result || !fund) return null
  const you = summarise(result), index = summarise(fund)
  const gap = you.value - index.value
  const e = m.practice.end
  return (
    <Card className="flex flex-col gap-3 border-ink p-5">
      <h2 className="m-0 font-serif text-2xl font-semibold">{e.title}</h2>
      <div className="grid grid-cols-2 gap-3">
        {[[e.you, you], [e.fund, index]].map(([label, s]) => (
          <div key={label as string} className="flex flex-col gap-0.5 rounded-xl bg-page p-3">
            <span className="text-xs font-semibold tracking-wide text-muted uppercase">{label as string}</span>
            <span className="text-[22px] font-semibold tabular-nums">{money((s as typeof you).value)}</span>
            <span className="text-[13px] text-muted tabular-nums">{signedPct((s as typeof you).returnPct, 1)}</span>
          </div>
        ))}
      </div>
      <p className="m-0 text-[15px] font-medium text-ink">{Math.abs(gap) < 1 ? e.tie : gap > 0 ? e.beat(money(gap)) : e.lost(money(-gap))}</p>
      <p className="m-0 text-[13px] text-muted">{e.details(you.trades, money(you.chargesPaid))}</p>
      {scenarioById(saved.scenario).hideDates && (
        <p className="m-0 text-[13px] text-ink-2">{e.revealed(shortDate(market.dates[saved.game.start], m.locale), shortDate(market.dates[saved.game.end], m.locale))}</p>
      )}
      <p className="m-0 text-xs text-muted">{e.soon}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={practice.replay} className="h-10 cursor-pointer rounded-full bg-brand px-4 text-sm font-semibold text-on-brand">{e.again}</button>
        <button type="button" onClick={practice.quit} className="h-10 cursor-pointer rounded-full border border-line-2 bg-surface px-4 text-sm font-medium text-ink">{m.practice.newGame}</button>
      </div>
    </Card>
  )
}
