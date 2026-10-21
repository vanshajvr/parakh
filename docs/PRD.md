# Product Requirements: Parakh

> Status: v0 draft · Owner: Vanshaj Verma · Last updated: 2026-10-22

## 1. Summary

Parakh is an ML-powered stock signal tool for beginner Indian investors, designed as the opposite of a stock-tips group. Every signal comes with its **track record**, its **confidence** and its **reasoning** in plain language, and the tool openly says "No call" when the data isn't clear.

**One-liner:** ML stock signals with receipts.

## 2. Problem

Beginner retail investors in India get stock ideas from Telegram groups, finfluencers and YouTube. These tips usually come with:

- **No track record**: there's no way to check whether the source has been right before.
- **No stated confidence**: every tip is presented as a "sure shot".
- **No reasoning**: the investor can't learn anything from the tip.

Beginners can't separate signal from noise, so they trust whoever sounds most confident, and often lose money. SEBI's recent action against unregistered finfluencers shows how widespread the problem is.

## 3. Target user

**Primary persona: Riya, 24, first-time investor**

- Opened a Zerodha or Groww account in the last year.
- Follows a couple of finfluencers and one Telegram tips group.
- Has lost money on a "sure shot" tip.
- Doesn't know what RSI or MACD are, and doesn't want to day-trade.
- Holds positions for days to weeks.

**Job to be done:** *"Before I act on a stock idea, help me quickly see what the data says, how sure it is, and whether this source has actually been right before."*

**Not the target (for now):** active traders, F&O traders, and quants who want a strategy-building tool.

## 4. Product principles

1. **Receipts before claims.** No signal is shown without its track record next to it.
2. **Confidence is always visible.** There is never a bare "BUY".
3. **Explain like I'm new.** Every signal gets a one-sentence reason in plain English.
4. **"No call" is a valid answer.** The model abstains when it isn't confident.
5. **Educate, don't advise.** Signals are worded as *Bullish lean* or *Bearish lean*, never *Buy* or *Sell*.

## 5. Key decisions

| Decision | Choice | Rationale |
|---|---|---|
| What we predict | Will the stock **beat the NIFTY 50** over the horizon? | A beginner's honest alternative is an index fund; it also removes market-mood swings (D-008) |
| Prediction horizon | 5 trading days | Less noisy than next-day; matches a beginner's holding period |
| Stock universe | 20 liquid NIFTY 50 stocks | Better data quality and stats you can trust; a focused experience |
| Signal types | Bullish lean (likely to outperform the index) / Bearish lean (likely to lag it) / No call | Bearish shown as "data suggests waiting", since beginners rarely short |
| How often we make a call | About 25% of stock-days, with *Slight* / *Stronger edge* labels | The model's edge is small; fixed thresholds would almost never trigger (D-010) |
| Publishing cadence | Daily, after market close, before the next open | Calls are locked in before the outcome is known |
| Track record | Live ledger kept separate from the simulated backtest | Never mix simulated results with real out-of-sample results |
| Explanations | SHAP values turned into fixed sentence templates | Deterministic; a reason can't be made up |

See [decisions.md](decisions.md) for the full decision log.

## 6. MVP scope

### Screens

On the phone, every screen shows a short summary first and reveals detail on tap. The receipt on each call and any per-stock warning are always visible (decisions D-018 and D-019). Desktop layouts open the detail by default.

1. **Today**
   - A card for each stock: its lean, a confidence band and a one-line reason.
   - A scoreboard strip: hit rate on calls vs a coin flip, and how bullish-lean stocks did relative to simply holding a NIFTY 50 index fund.
2. **Stock page**
   - A price chart with past signals marked as hits or misses.
   - A "Why" breakdown: the top factors, in plain words.
   - The track record for this stock.
3. **Track record**
   - The full public ledger of live calls and their outcomes.
   - A calibration chart: "when we said 70%, were we right about 70% of the time?"
   - A comparison with the baselines.
   - The worst periods, shown openly.
   - The simulated backtest record, clearly labelled.
4. **How it works**
   - A beginner-friendly explainer of the indicators used.
   - The model card: data, method, evaluation and limitations.
   - A disclaimer.

### Out of scope (MVP)

Trade execution, portfolio tracking, intraday data, personalised advice, user accounts, and options/F&O.

### Later ideas

- Watchlist
- A daily email or Telegram digest (meet users where the bad tips live)
- LLM-written explanations built on top of the SHAP output
- "Explain this tip": enter a stock a finfluencer mentioned and see what the data says

## 7. Success metrics

### Model quality
See [model-card.md](model-card.md) for current numbers.
- **Hit rate on calls** compared with a coin flip (50%) and with "always beats the index".
- **Excess return vs the NIFTY 50** after bullish and bearish calls, compared with trading costs.
- **Calibration**: stated confidence should match the actual hit rate (for example, measured by expected calibration error).
- **Coverage**: the share of stock-days on which the model makes a call.

### Product (hypothetical, for the case study)
- **North star:** weekly users who view a signal's track record.
- **Supporting:** visits to "How it works", return visits each week.

### Guardrails
- 0 signals shown without a confidence value and a reason.
- 0 changes to live ledger entries after they're published (append-only).

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| The model is barely better than random (confirmed in Phase 1: 51.2% hit rate, an edge smaller than trading costs) | The product's value is honesty; the scoreboard and model card show the truth either way |
| Explanations that sound illogical (the model often bets on reversals) | "Biggest factors" wording, plus a plain-words explainer on How it works (D-013) |
| yfinance outages or rate limits | Cache data in the database; show a "data delayed" state |
| Being perceived as investment advice | Lean wording, disclaimers, educational framing, no personalisation |
| The live track record starts empty | Show the simulated record, clearly labelled, until the live record has enough history |

## 9. Roadmap

| Phase | Scope |
|---|---|
| 0 | Repo cleanup, PRD, decision log |
| 1 | ML core: data, features, 5-day labels, walk-forward evaluation, baselines, calibration, SHAP, model card |
| 2 | Live ledger: Neon Postgres schema, daily GitHub Actions job |
| 3 | FastAPI read-only API |
| 4 | Frontend: Today, Stock, Track record, How it works |
| 5 | Ship: deployment, CI, case-study README |
| 6 | Later ideas (see above) |

## 10. Disclaimer

Parakh is an educational project. It is not investment advice, and it is not registered with SEBI as an investment adviser or research analyst.
