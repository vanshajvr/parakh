# Product Requirements: Parakh

> Status: v1 draft · Owner: Vanshaj Verma · Last updated: 2026-10-24

## 1. Summary

Parakh is an ML-powered stock signal tool for beginner Indian investors, designed as the opposite of a stock-tips group. Every signal comes with its **track record**, its **confidence** and its **reasoning** in plain language, and the tool openly says "No call" when the data isn't clear.

Testing showed that even Parakh's own signal can't reliably beat a coin flip (D-024). So the product also gives beginners a fast way to **practise investing with virtual money on real past markets**, judged against the same honest benchmark: simply holding a NIFTY 50 index fund (D-033). It works in English and Hindi (D-034).

**One-liner:** Practise investing with fake money, and see honestly what works.

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
| How often we make a call | About 25% of stock-days, all labelled *Slight edge* | The model's edge is small; fixed thresholds would almost never trigger (D-010). A *Stronger edge* tier did no better, so it was dropped (D-032) |
| Publishing cadence | Daily, after market close, before the next open | Calls are locked in before the outcome is known |
| Track record | Live ledger kept separate from the simulated backtest | Never mix simulated results with real out-of-sample results |
| Explanations | The model's own factors (the rule's single input, or SHAP values for ML models) turned into fixed sentence templates | Deterministic; a reason can't be made up |

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
5. **Glossary** (D-034)
   - Every market word the app uses, in plain English and Hindi, with an example. Any dotted word in the app opens its meaning.
6. **Practice: the time machine** (D-033, phase 16)
   - Pick a scenario (the 2020 crash, the 2021 rally, a flat 2022–23, a decade of SIP, or a mystery period with the dates hidden) and a starting amount.
   - Time plays forward on its own; buy and sell whole shares or a NIFTY 50 ETF, with real charges, filled at the next day's open.
   - The game pauses on big market moves and asks what you'll do.
   - A report card compares you with just holding the index fund, with short lessons tied to what you did.

The Today screen also explains each **no call**: how far the stock moved against the others last week, and where that day's calls began (D-035).

### Out of scope (MVP)

Trade execution, portfolio tracking, intraday data, personalised advice, user accounts and sign-in, a live "make your own call" game, leaderboards, taxes in the simulator, and options/F&O (D-033).

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
- **North star:** weekly users who view a signal's track record or finish a practice game.
- **Supporting:** visits to "How it works", return visits each week, practice games replayed.
- **Learning (phase 17 user test):** the share of testers who beat the index fund, and how often they sell during a big fall before and after seeing the lesson card.

### Guardrails
- 0 signals shown without a confidence value and a reason.
- 0 changes to live ledger entries after they're published (append-only).

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| The model is barely better than random (Phase 6: a one-line reversal rule beat ML under pre-registered rules, then fell to 48.8% on the 2025–26 holdout; D-024) | The product's value is honesty; the scoreboard and model card show the truth either way |
| Explanations that sound illogical (the model often bets on reversals) | "Biggest factors" wording, plus a plain-words explainer on How it works (D-013) |
| yfinance outages or rate limits | Cache data in the database; show a "data delayed" state |
| Being perceived as investment advice | Lean wording, disclaimers, educational framing, no personalisation |
| The live track record starts empty | Show the simulated record, clearly labelled, until the live record has enough history |
| The simulator rewards hindsight or gambling | Mystery mode hides the dates, every result is compared with the index fund, and there's no leaderboard (D-033) |
| Hindi that reads like a literal translation | Simple everyday Hindi that keeps the English market words people use, reviewed by a native speaker (D-034) |

## 9. Roadmap

| Phase | Scope |
|---|---|
| 0 | Repo cleanup, PRD, decision log |
| 1 | ML core: data, features, 5-day labels, walk-forward evaluation, baselines, calibration, SHAP, model card |
| 2 | Live ledger: Neon Postgres schema, daily GitHub Actions job |
| 3 | FastAPI read-only API |
| 4 | Frontend: Today, Stock, Track record, How it works |
| 5 | Ship: deployment, CI, case-study README |
| 6 | Modelling pass: pre-registered evaluation, calibration fix, reversal rule vs ML (D-022 to D-024) |
| 7–14 | Live tracking, charts, market movers, adaptive landing, SQL analysis, one label for every call (D-025 to D-032) |
| 15 | English and Hindi, glossary, no-call reasons (D-033 to D-035) |
| 16 | Practice: the time machine |
| 17 | User test with 5–10 beginners, fixes and write-up |
| Later | Ideas above; taxes in the simulator |

## 10. Disclaimer

Parakh is an educational project. It is not investment advice, and it is not registered with SEBI as an investment adviser or research analyst.
