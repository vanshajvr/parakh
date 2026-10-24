import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { useModel } from '../api/client'
import { CandleDiagram } from '../components/CandleDiagram'
import { Disclosure } from '../components/Disclosure'
import { Card } from '../components/States'
import { count, pct, shortDate } from '../lib/format'
import { chosenSummary, ROUND_TRIP_COST, type SimulatedMetrics } from '../lib/metrics'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const MODEL_CARD_URL = 'https://github.com/vanshajvr/signalforge-live/blob/main/docs/model-card.md'

export function Learn() {
  useDocumentTitle('How it works')
  const { hash } = useLocation()
  const model = useModel().data
  const rule = model?.kind === 'reversal'
  const sim = model?.metrics as SimulatedMetrics | undefined
  const s = sim ? chosenSummary(sim) : undefined

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash])

  const topic = (id: string, title: string, body: ReactNode) => (
    <Card className="scroll-mt-20 overflow-hidden" key={id}>
      <div id={id}>
        <Disclosure key={`${id}-${hash}`} defaultOpen={hash === `#${id}`} buttonClassName="min-h-14 px-4 py-3.5 lg:px-5"
          summary={<h2 className="m-0 text-base font-semibold text-ink">{title}</h2>}>
          <div className="flex flex-col gap-3 px-4 pb-4 text-[15px] leading-relaxed text-ink-2 lg:px-5 lg:pb-5">{body}</div>
        </Disclosure>
      </div>
    </Card>
  )

  return (
    <div className="stagger flex max-w-3xl flex-col gap-4 lg:gap-5">
      <section className="flex flex-col gap-2 px-1">
        <h1 className="m-0 font-serif text-[30px] leading-tight font-semibold tracking-[-0.015em] lg:text-[40px]">How it works</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-2 lg:text-base">
          Parakh looks at {model ? model.universe.length : 20} large Indian companies every trading day and asks one question:{' '}
          <strong className="font-semibold text-ink">will this stock do better than a NIFTY 50 index fund over the next 5 trading days?</strong>{' '}
          It answers with a lean, a confidence level and its reasons, and keeps a public record of every answer.
        </p>
        <p className="m-0 font-serif text-[15px] text-muted italic">
          Parakh (परख): to test something's true worth, the way a jeweller tests gold on a touchstone.
        </p>
      </section>

      {topic('index-fund', 'Why compare with an index fund?', (
        <>
          <p className="m-0">
            For most beginners, the honest alternative to picking a stock is simply buying a NIFTY 50 index fund. So instead of
            asking "will the price go up?", Parakh asks whether a stock is likely to do better or worse than that fund.
          </p>
          <p className="m-0">
            It also keeps the calls fair: when the whole market rises or falls, that affects every stock, so it isn't counted
            as the model being right or wrong.
          </p>
        </>
      ))}

      {topic('candles', 'How to read a candle', (
        <>
          <p className="m-0">
            Price charts often draw each trading day as a <strong className="font-semibold text-ink">candle</strong>. It packs four
            prices into one shape: where the price opened, its highest and lowest points during the day, and where it closed.
          </p>
          <CandleDiagram />
          <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5">
            <li><strong className="font-semibold text-ink">The body</strong> runs from the open to the close.</li>
            <li><strong className="font-semibold text-ink">The wicks</strong> show how far the price went beyond that, up to the day's high and down to its low.</li>
            <li><strong className="font-semibold text-ink">Green</strong> means it closed above where it opened; <strong className="font-semibold text-ink">red</strong> means it closed below.</li>
          </ul>
          <p className="m-0">
            One catch: a candle compares the close with <em>that day's</em> open, not with the day before. A stock can open higher
            after good news, drift down all day, and still close up on yesterday, which shows as a red candle on a day it rose.
            Hover or tap any day on Parakh's charts to read both.
          </p>
          <p className="m-0">
            Tips channels often name candle shapes, like "hammer", "doji" or "engulfing", as signs of what comes next. Parakh's calls
            don't use them. Whether they predict anything is something we're testing on 10 years of data, and we'll publish the
            answer here either way.
          </p>
        </>
      ))}

      {topic('how', 'How a call is made', (
        <>
          <p className="m-0">
            <strong className="font-semibold text-ink">The data:</strong> daily prices since 2016 for each stock and for the NIFTY 50,
            from Yahoo Finance.
          </p>
          {rule ? (
            <p className="m-0">
              <strong className="font-semibold text-ink">The signal:</strong> one measurement, how each stock did over the past week
              compared with the average of the 20 stocks.
            </p>
          ) : (
            <p className="m-0"><strong className="font-semibold text-ink">The signals:</strong> {model ? Object.keys(model.features).length : 15} measurements of recent price and volume behaviour:</p>
          )}
          {model && !rule && (
            <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
              {Object.entries(model.features).map(([key, meaning]) => <li key={key}>{meaning}</li>)}
            </ul>
          )}
          <p className="m-0">
            <strong className="font-semibold text-ink">The model:</strong>{' '}
            {rule ? (
              <>
                a simple rule: last week's laggards lean towards beating the index over the next week, and last week's leaders
                towards lagging it. We also tested machine-learning models on the same data; none beat this rule by enough to
                justify the extra complexity (<Link to="/learn#model-card">model card</Link>). The rule's chances are
                calibrated on years of past data, so when it says 52%, it's been right about 52% of the time.
              </>
            ) : (
              <>
                {model?.kind === 'lightgbm' ? 'LightGBM, a collection of small decision trees,' : 'A machine-learning model'} trained on
                years of past data, then adjusted ("calibrated") so that when it says 52%, it's right about 52% of the time.
              </>
            )}
          </p>
          <p className="m-0">
            <strong className="font-semibold text-ink">No call:</strong> the model only makes a call when its chance is far enough from 50%.
            That happens on about a quarter of stock-days; the rest are "No call".
          </p>
        </>
      ))}

      {topic('small-edge', 'Why our edge is small', (
        <>
          <p className="m-0">
            Large, well-known companies are watched by thousands of professionals, so patterns in their public price data are
            mostly used up. In testing, Parakh's calls were right {s ? pct(s.hit_rate) : 'about 51%'} of the time
            {s && ` across ${count(s.n_calls)} calls`}. A coin flip gets 50%.
          </p>
          <p className="m-0">
            That edge is real but smaller than typical trading costs (about {pct(ROUND_TRIP_COST, 2)} for a round trip), so trading on
            Parakh's calls alone would not be expected to make money. We'd rather tell you that than pretend otherwise.
          </p>
        </>
      ))}

      {topic('reversals', 'Why the model sometimes bets on reversals', (
        <>
          <p className="m-0">
            Over a few days, stocks that have run up sharply often cool off a little compared with the market, and stocks that
            have fallen often recover a little. {rule ? "Parakh's calls are built on exactly this pattern." : 'The model has learnt this pattern.'}
          </p>
          <p className="m-0">
            {rule
              ? "So a call can look backwards at first glance: a stock that fell more than the others last week gets a bullish lean. It's a tendency, not a rule the market follows: it has been right only a little more often than not."
              : 'So a call can look backwards at first glance: a stock whose short-term trend is below its longer-term trend can get a bullish lean. That\'s why each call lists its "biggest factors" rather than saying "because": the factors are what moved the model most, and they work in combination, not as simple causes.'}
          </p>
        </>
      ))}

      {topic('honest', 'How we keep ourselves honest', (
        <ul className="m-0 flex list-disc flex-col gap-2 pl-5">
          <li>Calls are published after the market closes and before the next open, so no call can see its own outcome.</li>
          <li>Published calls and their results can't be edited or deleted. The database itself refuses.</li>
          <li>The live record and the simulated testing record are always shown separately.</li>
          <li>Stocks where the model has done worse than a coin flip are flagged on their calls, with a range showing how much of that could be chance.</li>
          <li>The rules for choosing the model were written down before testing, and the most recent data was kept back as a final check.</li>
          <li>Every call is in the public ledger, which you can <Link to="/record#ledger">browse</Link> or download as a CSV.</li>
        </ul>
      ))}

      {topic('not', 'What Parakh is not', (
        <ul className="m-0 flex list-disc flex-col gap-2 pl-5">
          <li>Not investment advice, and not registered with SEBI as an investment adviser or research analyst.</li>
          <li>Not personalised: it doesn't know your goals, timeline or risk.</li>
          <li>Not for intraday trading or futures and options.</li>
        </ul>
      ))}

      {topic('model-card', 'The model card', model ? (
        <>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted">Version</dt><dd className="m-0 font-medium text-ink">{model.version}</dd>
            <dt className="text-muted">Trained on data up to</dt><dd className="m-0 font-medium text-ink">{shortDate(model.trained_through)}</dd>
            <dt className="text-muted">Looks ahead</dt><dd className="m-0 font-medium text-ink">{model.horizon_days} trading days</dd>
            {s && (
              <>
                <dt className="text-muted">Right in testing</dt><dd className="m-0 font-medium text-ink">{pct(s.hit_rate)} ({count(s.n_calls)} calls)</dd>
                <dt className="text-muted">Calibration error</dt><dd className="m-0 font-medium text-ink">{pct(s.ece)}</dd>
              </>
            )}
          </dl>
          <a href={MODEL_CARD_URL} className="self-start text-sm font-medium no-underline">Read the full model card →</a>
        </>
      ) : (
        <p className="m-0">Loading the model details…</p>
      ))}
    </div>
  )
}
