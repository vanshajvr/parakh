import { Link } from 'react-router'
import { useNews, useScreener, type NewsItem } from '../api/client'
import { useI18n } from '../i18n'
import { ago, signedPct } from '../lib/format'
import { Card } from './States'
import { Term } from './Term'

const MOVERS = 5
const PER_MOVER = 2

/**
 * Headlines as context for a move, never as a tip (decision D-037): Today groups them under the
 * stocks that moved most, and every list ends with a reminder that news is usually priced in.
 */
export function InTheNews() {
  const { lang, m } = useI18n()
  const { data: news } = useNews(lang)
  const { data: screener } = useScreener()
  if (!news || news.length === 0) return null

  const change = new Map((screener?.stocks ?? []).map((s) => [s.symbol, s.change_1d]))
  const bySymbol = new Map<string, NewsItem[]>()
  for (const item of news) bySymbol.set(item.symbol, [...(bySymbol.get(item.symbol) ?? []), item])
  const movers = [...bySymbol.keys()]
    .sort((a, b) => Math.abs(change.get(b) ?? 0) - Math.abs(change.get(a) ?? 0))
    .slice(0, MOVERS)

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="m-0 text-[15px] font-semibold">{m.news.title}</h2>
        <span className="text-[13px] leading-snug text-muted">{m.news.subtitle}</span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {movers.map((symbol) => {
          const items = bySymbol.get(symbol)!
          return (
            <li key={symbol} className="flex flex-col gap-1.5 border-b border-chip pb-3 last:border-0 last:pb-0">
              <span className="flex items-baseline justify-between gap-3">
                <Link to={`/stocks/${symbol}`} className="text-sm font-semibold text-ink no-underline">{symbol}</Link>
                <span className="text-[13px] font-medium text-ink-2 tabular-nums">{signedPct(change.get(symbol), 1)}</span>
              </span>
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {items.slice(0, PER_MOVER).map((item) => <Headline key={item.url} item={item} />)}
              </ul>
              {items.length > PER_MOVER && (
                <Link to={`/stocks/${symbol}#news`} className="self-start text-xs font-medium no-underline">{m.news.more(items.length - PER_MOVER)}</Link>
              )}
            </li>
          )
        })}
      </ul>
      <Caveat />
    </Card>
  )
}

/** A stock's own headlines, on its page. Shown for all 50 stocks, with or without Parakh calls. */
export function StockNews({ symbol }: { symbol: string }) {
  const { lang, m } = useI18n()
  const { data: news, isPending } = useNews(lang, symbol)
  if (isPending) return null
  return (
    <Card className="flex scroll-mt-24 flex-col gap-3 p-4 lg:p-5">
      <div id="news" className="flex flex-col gap-0.5">
        <h2 className="m-0 text-base font-semibold">{m.news.stockTitle}</h2>
        <span className="text-[13px] text-muted">{m.news.stockSubtitle}</span>
      </div>
      {news && news.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {news.slice(0, 8).map((item) => <Headline key={item.url} item={item} />)}
        </ul>
      ) : (
        <p className="m-0 text-sm text-muted">{m.news.empty}</p>
      )}
      <Caveat />
    </Card>
  )
}

function Headline({ item }: { item: NewsItem }) {
  const { lang, m } = useI18n()
  return (
    <li>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        lang={lang}
        aria-description={m.news.opensIn(item.source)}
        className="-mx-2 flex flex-col gap-0.5 rounded-lg px-2 py-1.5 no-underline hover:bg-page"
      >
        <span className="text-sm leading-snug text-ink">{item.title}</span>
        <span className="text-xs text-muted">{item.source} · {ago(item.published_at, m.locale)}</span>
      </a>
    </li>
  )
}

function Caveat() {
  const { m } = useI18n()
  return (
    <p className="m-0 rounded-xl bg-page px-3 py-2.5 text-[13px] leading-relaxed text-ink-2">
      {m.news.caveat} <Term id="pricedIn" />
      <span className="mt-1 block text-xs text-muted">{m.news.note}</span>
    </p>
  )
}
