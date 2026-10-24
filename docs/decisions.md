# Decision Log

Each entry records what was decided, why, and what else was considered. Newest first.

---

### D-041 · Show how to play, don't tell
**Date:** 2026-10-24
**Decision:**
- **Setup screen:** a three-step picture strip (buy the index fund or any stock → press Play → did you beat the index fund?), with each picture drawn from the game's own pieces.
- **First game:** a five-step tour that dims the page and spotlights the real parts of the screen: your money against the index fund, the index fund's Buy button, Play, the interruptions and the report card. One short line per step, Skip and Back, reopened from "How to play". It's shown once per device.
- **Nudges:** until the first order, a "Start with a buy" card at the top offers a one-tap "Buy the index fund", and the fund's Buy button pulses. Once an order is waiting, Play pulses with "Now press Play".
- **Orders:** buy by rupees or by shares; sell any number of shares. Amounts use a text field with Indian grouping that can be empty, replacing a number field that kept a leading zero ("01000").
**Why:** In the first real test, the player couldn't tell where to start, put about ₹1,000 into the fund, left 98.6% in cash, and got a report card about idle cash. The game's rules were fine; the first minute wasn't. Beginners learn a game by being shown its pieces in place, not by reading paragraphs.
**Alternatives:** A written how-to page (skipped by most players); a video (heavy, and goes out of date with every change).

---

### D-040 · Interruptions, a report card and lessons
**Date:** 2026-10-24
**Decision:**
- **Interruptions:** playback, and skipping ahead, stop on the first market fall (10% in 10 trading days), market rise (10% in 20) or portfolio fall (15% below its peak), at most once every 21 trading days. Time stands still until the player answers. Three equal choices: hold, sell (everything in a fall; half in a rise) or buy more (cash into the index fund). The dialog shows only what was known that day.
- **Report card:** you against the index fund (value, return, worst fall, trades, charges), then notes on what the choices were followed by: each answer and what the index fund did over the next month, sales made in a fall, many trades, cash left idle (30%+), one stock holding half the money, picking from today's index, SIP instalments, and the result itself (a win is called luck; a loss names the index fund's advantages).
- **Lessons:** ten short cards (selling in a fall, buying after a rise, time in the market, charges, idle cash, one basket, one win isn't proof, why the index fund is hard to beat, survivorship bias, SIPs), each shown only when a note points at it. English and Hindi.
**Why:** The game teaches through the moments that matter: a fall, a rally, your own money shrinking. Stopping to ask makes the choice deliberate, and the report shows what followed without saying what the player should have done; hindsight is easy, and one period proves little either way. In testing, selling in March 2020 and buying back in April happened to beat the fund by ₹16,817, and the report calls that luck.
**Alternatives:** Scoring choices as right or wrong (claims a certainty nobody had); tips during play ("hold!"), which would answer the question for the player.

---

### D-039 · The time machine's rules and engine
**Date:** 2026-10-24
**Decision:**
- **Engine:** pure TypeScript functions (`frontend/src/lib/sim/`) from a game (start and end day, starting cash, optional SIP, and the player's orders) to everything that happened. Only the orders are saved, so a game can be resumed or replayed exactly.
- **Trading rules:** orders placed after a day's close fill at the next day's open; whole shares only; sells fill before buys on the same morning; a stock can only be bought once it has a price (after listing); holdings are valued at each close.
- **Charges:** a zero-brokerage broker's delivery charges (Zerodha, 2025): STT 0.1% each way on shares (0.001% on ETF sales), NSE and SEBI fees, 0.015% stamp duty on buys, 18% GST on fees, and ₹15.93 per stock sold. A ₹1 lakh round trip costs about 0.24%. No taxes in this version.
- **Index fund:** NIFTYBEES, a real NIFTY 50 ETF, because the index level leaves out dividends (in 2020 the ETF returned 15.2% against the index's 14.8%). The benchmark is the same money, at the same times, put into it and left alone.
- **Prices:** one cached endpoint (`/api/sim/prices`) serves every stock's open and close since 2016 on a clean calendar (a day counts only if most stocks traded), about 740 KB compressed.
- **Where it lives:** a Practice tab, second after Today. A game is saved on the device (settings and orders only), so it can be resumed later; there are no accounts (D-033).
- **Interruptions:** the market falling 10% within 10 trading days, rising 10% within 20, or your portfolio falling 15% from its peak; at most one every 21 trading days.
- **Scenarios:** the 2020 crash, the 2021 rally, a flat 18 months (Oct 2021 to Mar 2023, within 5% of where it started), a SIP from 2016 (every instalment, including the first, goes straight into the index fund, so a SIP left alone matches its benchmark exactly), and a mystery window of 250–500 trading days from a seeded random start, with the dates hidden.
**Why:** The lesson has to come from real prices and real costs, or the game teaches the wrong thing. On the 2020 data, ₹1 lakh left in the index fund ends at ₹1,12,903 despite a 37% fall; the same money sold on 23 March and bought back on 1 June ends at ₹95,159.
**Alternatives:** Server-side simulation (needs accounts and storage); the index level as the fund (overstates stock-picking by leaving out dividends); fractional shares (not how NSE works).

---

### D-038 · A workspace for Today on laptops
**Date:** 2026-10-24
**Decision:**
- On laptops, Today is a master–detail workspace: the 20 stocks in a sticky list on the left (calls first, then the no-calls ordered by how close they came, with their bars), the selected stock's chart, reasons, progress and news in the middle, and a rail with what to look at next, market movers, the live record and how to read a call. Calls in progress sit under the detail as a compact table.
- The selected stock is kept in the URL (`/?stock=TCS`), so a link opens on it.
- The page widens from about 1,150px to 1,600px. How it works gets a sticky "On this page" list beside its reading column, and Market movers drops its sparklines when the card is narrow.
- Phones keep the scrolling feed (D-031) unchanged.
**Why:** The phone layout stretched to a laptop made one long column, nearly 3,000px tall, with empty margins. Three working mockups (a three-column dashboard, horizontal bands with tabs, and this workspace) were compared on real data; the workspace was the most horizontal, about a third shorter, and gives the no-calls room to be explored rather than collapsed.
**Alternatives:** A three-column dashboard (busiest, cramped left column); horizontal bands with tabs (calm, but an overview with news a tab away).

---

### D-037 · News as context for a move, never as a tip
**Date:** 2026-10-24
**Decision:**
- Headlines for all 50 NIFTY stocks come from Google News RSS searches, every 3 hours (`jobs/news.py`, its own workflow so it can never delay the day's calls). Hindi mode shows headlines from the Hindi edition.
- Only the headline, source, time and link are stored; the article opens on the publisher's site. No article text and no AI summaries.
- A headline counts for a stock only if its title names the company (hand-written English and Devanagari names, with look-alikes excluded: Severn Trent, Titan Biotech, Reliance Power) and is about the business (results, deals, shares, ₹ crore, नतीजे, मुनाफा).
- Tips are dropped: "stocks to buy", "target price", "upside", price predictions, chart-pattern signals, "BUY रेटिंग", and sources that publish signals rather than reporting.
- Today groups headlines under the stocks that moved most ("why did they move?"); each stock page lists its own. Every list ends with "by the time news reaches you, the price has usually already moved", linked to *priced in* in the glossary.
- No scrolling ticker; a calm list, newest first.
**Why:** "Why did this stock move?" is the first question a beginner asks, and headlines answer it. But a news feed can quietly teach trading on headlines, the habit Parakh exists to counter (D-001, D-033), so it shows news as context and filters out the tips that news sites mix in.
**Alternatives:** Publisher RSS feeds (not per company); NSE/BSE announcements (official, but block automated access); paid news APIs (free tiers are development-only); AI summaries of articles (copyright grey area, and summaries can get facts wrong).

---

### D-036 · Calm motion that makes the site feel alive, not live
**Date:** 2026-10-24
**Decision:**
- Hover and press feedback everywhere: clickable cards rise slightly, static cards darken their edge, rows highlight, text links underline, buttons give a little when pressed.
- Sections slide open instead of snapping; pages fade up in a short stagger, and page changes cross-fade.
- Key numbers count up once, bars and day trackers fill, and sparklines draw themselves. Loading shows grey shapes in the page's layout.
- Today shows when the next calls are due ("after Monday's close · in 2d 3h") and a "What to look at next" card built from the day's data: the clearest call, the stock that came closest to one, a call in progress, and the glossary.
- Hovers take about 150 ms and entrances about 350 ms. Everything is off for readers who ask for reduced motion.
**Why:** With almost no motion, the site read as a static report. Feedback on every interaction and content that changes with each day's data make it feel responsive, without pretending to be a live ticker: the data still changes once a day (D-025).
**Alternatives:** Scrolling tickers or flashing prices (dishonest for once-a-day data); an animation library (CSS covers all of this, at no extra download).

---

### D-035 · Every "No call" says why
**Date:** 2026-10-24
**Decision:** Under the reversal rule, each no-call stock on Today shows how far it moved against the average of the 20 last week, where that day's calls on the same side began, and a bar for how close it came. The API works this out at read time from the stored factors, so the ledger is untouched. Multi-factor models have no single line, so they keep the generic sentence.
**Why:** On a typical day 15 or 16 of the 20 stocks get no call (by design, D-010), and "the signals are mixed or weak" made the app look broken or lazy. A concrete reason ("3.5% behind the average; calls started at 3.8%") turns the biggest box on the page into a lesson in how the rule works.
**Alternatives:** Explaining it once in How it works (nobody connects it to the box); showing the probability (meaningless to a beginner).

---

### D-034 · English and Hindi, with a glossary
**Date:** 2026-10-24
**Decision:**
- Text lives in typed dictionaries (`frontend/src/i18n/en.ts` is the source, and `hi.ts` must match its shape), so a missing Hindi string fails the build. No i18n library.
- Hindi is simple everyday Hindi that keeps the English market words people actually use (stock, index, call, SIP).
- A language toggle in the header, remembered on the device and set on `<html lang>`. Pages not yet translated say so.
- Phase 15 translates the shell, Today and its components, and the glossary. Factor sentences are rebuilt in Hindi from the stored feature values.
- A glossary of about 25 terms, each with a plain definition and an example. Any dotted word opens it in a native popover.
- IBM Plex Sans Devanagari, which only downloads when Hindi text is on screen.
**Why:** The primary user is a beginner, and many beginners in India are more comfortable in Hindi. Jargon is the first wall they hit, so the meaning should be one tap away where the word appears.
**Alternatives:** react-i18next (string keys with no type checking, and a dependency for about 300 strings); pure Hindi terms such as सूचकांक (more correct, harder for beginners); Hinglish in Roman script (informal, and harder to read at length).

---

### D-033 · From signals to practice
**Date:** 2026-10-24
**Decision:** Keep the honest signals, and make the core of the product a fast simulator: a "time machine" that replays real past markets with virtual money, judged against simply holding a NIFTY 50 index fund. Cut user accounts, a live "make your own call" game, leaderboards and taxes.
**Why:** Testing showed Parakh's own signal can't reliably beat a coin flip (D-024). For a beginner, the most useful lesson is exactly that, and it's learned best by trying and failing with fake money, not by reading. Lessons are everywhere online; practice with honest feedback isn't. Accounts add sign-in and privacy work without adding to that lesson, and a live game takes 5 days per result, which is too slow to learn from. Leaderboards on returns reward gambling.
**Alternatives:** A lesson course (already plentiful online); live virtual trading like existing apps (slow, and it rewards luck); keeping Parakh signals-only (an honest dead end for the user).

---

### D-032 · One label for every call
**Date:** 2026-10-24
**Decision:** Drop the *Stronger edge* tier. Every call is labelled *Slight edge*, and its receipt shows the hit rate of all testing calls (51.4%), not of its tier. Calls already published keep the label they were published with, since the ledger can't be edited.
**Why:** The SQL analysis (`analysis/track_record_sql.ipynb`, section 2) found the tiers don't sort calls: *Stronger edge* calls were right 50.9% of the time and *Slight edge* calls 51.8%, and the top probability decile beat the index less often than the middle ones. On the Today screen, a beginner saw "Stronger edge" next to the lower number. A label that claims more confidence than the record supports breaks the product's main promise (D-001).
**Alternatives:** Renaming the tiers to describe signal strength rather than accuracy (honest but clunky, and tells a user nothing they can act on); showing both tiers' rates on every card (transparent but confusing for a beginner).

---

### D-031 · An adaptive landing page: market first until there are calls
**Date:** 2026-10-22
**Decision:**
- Today opens with four key numbers: the live record (day, published, scored), how many live calls have been right so far, the testing hit rate against a coin flip, and today's calls.
- Before any live calls exist, the NIFTY 50 chart (two-thirds width) and Market movers (one-third) come first, with the first-calls notice below them.
- Once calls are published, today's calls (three across) move to the top and the market row follows.
- Calls in progress and the recent testing calls sit beside the live record and "How to read a call".
- Short movers lists only show genuine moves: a stock that fell isn't listed as a top gainer. The screener still sorts every stock.
**Why:** The old layout stacked the chart above everything and left the sidebar half empty. With no live calls yet, the market data is what makes the page worth opening. Once calls flow daily, they are the reason to visit, so they lead.
**Alternatives:** Market-first always (calls get buried once they exist); calls-first always (an empty-looking page until the first calls).

---

### D-030 · Market movers and a screener across the whole NIFTY 50
**Date:** 2026-10-22
**Decision:**
- Today has a Market movers card covering all 50 NIFTY 50 stocks:
  - gainers and losers over 1 day, 5 days or 1 month;
  - most active by value traded (shares × price), not by share count;
  - unusual volume (the latest day against the stock's own 20-day average);
  - near the 52-week high or low;
  - "Vs the others", the reversal rule's own input, which replaces the separate "What the rule sees" card;
  - a sector filter, and the top 5 per view.
- The Stocks page becomes the full screener, with the same views, search, a "Parakh's 20 only" filter, sortable columns on desktop, and filters kept in the URL.
- The 30 members Parakh doesn't cover are fetched daily for prices only, from a separate download and cache, so they can never reach the model. They are labelled "No Parakh calls", and their stock pages say so instead of promising a call.
- Under gainers and losers, a note computed from Parakh's own history says what happened next: across 528 weeks since 2016, the 5 biggest weekly gainers among Parakh's 20 lagged the NIFTY 50 the next week 53% of the time, and the biggest losers beat it 50% of the time.
- The daily job stores the extra prices inside a savepoint, so a failed download is logged and never costs a day of calls.
**Why:**
- A movers list is the first thing beginners check in any market app. Ranking by share count misleads them, because cheap stocks trade more shares. Ranking by value is a small, genuine lesson.
- Gainer lists feed the FOMO that tips channels exploit. Pairing them with what actually happened next, from our own data, keeps the list honest: chasing gainers hasn't paid, and a bounce-back isn't reliable either.
**Alternatives:** Movers on Parakh's 20 only (thin lists); a separate movers card alongside "What the rule sees" (two cards saying the same thing).

---

### D-029 · An interactive chart library, standard candle colours, full history
**Date:** 2026-10-22
**Decision:**
- The NIFTY 50 and stock charts use TradingView's open-source `lightweight-charts` (Apache-2.0, pinned to 5.2.1). It is loaded lazily, so it doesn't slow the first screen, and it shows the library's small attribution logo.
- Charts show every stored daily candle from 2016, served by `/api/history/{symbol}` (`NIFTY50` for the index).
- You can scroll or pinch to zoom and drag to pan, with 1M to All range buttons.
- A crosshair tooltip next to the candle shows open, high, low, close, the change from the day before and the 20-day average. The plain-words reading stays underneath.
- Candles use the standard green and red. A close line and a 20-day moving average can each be switched on and off.
- On stock pages, past calls are dots in their lean colour, marked ✓ or ✗ once scored, and can be hidden.
**Why:** After trying the hand-drawn version, the user found it too static and hard to read. A chart beginners will recognise from broker apps, and can zoom into, teaches more than a fixed picture. Over about 2,600 candles, zoom and pan were not worth building by hand.
**Supersedes:** D-020 (the custom SVG chart) and D-028's hollow-and-filled colours. The plain-words readings, daily-only data (D-025) and "no indicator overlays beyond the 20-day average" still stand.
**Trade-off:** Green and red now sit beside the blue and orange lean colours. Leans always carry an icon and a label, so they stay distinguishable without relying on colour.

---

### D-028 · Daily candlestick charts, in neutral ink, as an explainer
**Date:** 2026-10-22
**Decision:**
- Today opens with a NIFTY 50 card: a year of daily candles (3 months shown first), the latest open, high, low and close, the 1-day, 5-day and 1-month moves, and a plain-words reading of any candle you tap or hover.
- Stock charts get a Line/Candles toggle; past-call markers sit above the candles.
- How it works explains how to read a candle, including the common trap that a candle compares the close with that day's open, not with the day before.
- Candles are neutral: hollow when the day closed above its open, filled when it closed below. They are not green and red.
- Still daily candles from stored closes (D-025). There are no indicator overlays, drawing tools or intraday candles.
**Why:**
- Candlesticks are the first chart a beginner sees in any broker app, and almost no one explains them. Reading one in words is genuinely educational, and it makes the landing screen show real data from the first visit.
- Blue and orange already mean bullish and bearish *lean* across Parakh. Green and red candles would add a second colour language on the same screen. Hollow and filled is the classic alternative, and it is colour-blind safe.
- Indicators and pattern tools are what make an app feel like a trading terminal, and they invite pattern-chasing. Whether common candle patterns predict anything goes into the research pass as a pre-registered test, rather than being implied by the UI.
**Alternatives:** TradingView's `lightweight-charts` (quicker to add, but it brings the trader look and a dependency, as in D-020); green and red candles (familiar, but they clash with the lean colours).

---

### D-026 · Fill the wait with data we already hold; every section starts closed
**Date:** 2026-10-22
**Decision:**
- Today shows a NIFTY 50 strip (last close, the day's move, the 5-day move) and "What the rule sees": all 20 stocks ranked by their last 5 days against the average of the 20, which is the reversal rule's only input.
- Until live calls have results, Today also shows the latest testing calls and how they turned out, under a dashed *Simulated* badge. Track record always shows them.
- The Stocks list shows each stock's last close, 5-day move, a 1-month sparkline, and its testing hit rate with a likely range.
- Every section starts closed, on desktop too, and opens on tap. Summary lines keep the key number, receipt or warning visible (an update to D-018).
- The daily job also runs at 21:00 and 07:30 IST. On 21 Oct, Yahoo had the stocks' closes hours before the NIFTY 50's, and the 18:00 run alone missed the publish window.
**Why:**
- Before the first results, the app only showed what Parakh had published, which was nothing. The stored prices and the backtest already answer "what is the rule looking at?" and "what does a scored call look like?" without any new data source.
- A third-party "real-time NSE" API was considered and rejected: it wraps Yahoo's unofficial endpoints (the same source as yfinance), and its public instance is a bare IP over plain HTTP with no stated terms. Licensed real-time NSE data needs a paid vendor (D-025).
- Recent testing calls are shown even when they look bad (15 of 44 right in early October), because hiding a bad patch would be cherry-picking.
**Alternatives:** Intraday prices (D-025); keeping desktop sections open (more visible, but the user found long open pages harder to scan).

---

### D-025 · Show calls in progress, once a day; no live prices
**Date:** 2026-10-22
**Decision:**
- The Today page lists earlier calls that are still inside their 5 trading days.
- Each call shows "day N of 5", the stock's and the NIFTY 50's moves since the call's close, the gap between them, a small chart of that gap after each day, and "on track so far" or "off track so far".
- It updates once a day from the closes the daily job already stores. There are no intraday prices or charts.
- Progress uses the same session counting as scoring, so a call's day-5 figure is the outcome it gets (`ledger.scoring.progress`, tested against `score`).
- The status is styled as provisional: a dashed chip, never the bullish/bearish colours, and the section says nothing in it is a result yet.
**Why:**
- Between publishing and scoring, a call used to be invisible for a week. Showing that week makes the ledger visible as it builds, which matters most in the first months, before the live hit rate means anything.
- Live intraday prices would turn an educational tool into a trading screen. Mid-session swings mean nothing for a 5-day call and recreate the tips-group thrill Parakh is positioned against. Redistributing real-time NSE data also needs a licence.
**Alternatives:** Live intraday prices and charts (rejected for the reasons above); a 15-minute-delayed "so far today" figure on open calls only (possible later, if users ask for it).

---

### D-024 · Publish the reversal rule; show per-stock ranges
**Date:** 2026-10-22
**Decision:**
- Parakh's calls now come from the one-line reversal rule (`reversal-20261012`), not LightGBM.
- The weekly retrain applies the D-022 rules automatically: the simplest model wins unless a more complex one passes the bar and beats its research-window IC by at least 0.005. The research window stays fixed at 2019–2024.
- Each stock's testing hit rate is shown with a 95% range. It counts one result per stock-week, because calls on the same stock in the same week share most of their price move.
**Why:**
- Research years 2019–2024: the rule passed (IC 0.029, t 2.39, 1 negative year). LightGBM failed (IC 0.034, t 1.80). Logistic regression failed (IC 0.010, t 1.05).
- Of the pre-registered LightGBM features, only NIFTY 50 volatility reached t ≥ 2 (t 2.01). Its IC beat the rule's by 0.0046, under the 0.005 margin. Reversal × volatility (t 1.27), volume shock (t 1.29) and all three together (t 1.72) failed.
- 10- and 20-day horizons were weaker than 5 days for both the rule and LightGBM.
- Holdout 2025–26, checked once: the rule had IC 0.018 (t 0.98) and 48.8% of calls right; LightGBM had IC 0.037 (t 1.22) and 52.1%. Neither is significant. Switching on this result would have meant choosing on the holdout, so the pre-registered choice stands, and the model card reports the holdout as it came out.
- Per-stock spread was mostly noise. Under the rule, no stock's range is wholly below 50%, and the old model's worst stock (ICICI Bank, 44.2%) is at 55.0%. The D-019 warning stays, now with the range and a note on whether it includes 50%.
**Alternatives:** Ship LightGBM and log a deviation (better holdout numbers, but no clean test left); publish both and let the live ledger decide (needs a second set of calls in the ledger).
**Supersedes:** D-012 (selection by Brier score).

### D-023 · Calibrate on out-of-fold scores; abstain rather than invert
**Date:** 2026-10-22
**Decision:**
- The calibrator is fitted on out-of-fold scores: each year of the training window is scored by a model trained only on earlier years, with a 5-day gap.
- Scores are converted to within-day z-scores before calibrating, so the out-of-fold models and the final model are on the same scale.
- If the calibrator's slope is zero or negative, the model abstains (every stock gets "No call") instead of reversing its ranking.
**Why:**
- The old calibrator was fitted on the latest 20% of each window, about one year of noisy data. In the 2021 fold its slope came out at −0.03, which turned a model with a positive IC (+0.063) into the published −0.054. The model card's "worst year" was this bug.
- Without the z-scores, the "No call" band was sized on differently spread scores, and coverage fell from the 25% target to 8%.
- Models stored before this change keep their original calibration: a flag on the model records which method it uses, and the stored `lightgbm-20261012` gives identical calls under the new code.
**Alternatives:** Only clipping the slope at zero (removes the inversion but still calibrates on one noisy year); isotonic calibration (needs more data than this edge supports).

---

### D-022 · Modelling pass: evaluation rules fixed before any experiment
**Date:** 2026-10-22
**Decision:**
- **Research window:** walk-forward test years 2019–2024 only. **Holdout:** 2025 onwards is evaluated once, at the end, for the chosen setup, and reported as it comes out. It is not used to pick or tune anything.
- **Primary metric:** daily rank IC, the Spearman correlation between each day's probabilities and the stocks' 5-day excess returns, averaged over days. Its t-stat uses every 5th trading day so that overlapping 5-day outcomes aren't counted as independent.
- **A candidate passes if:**
  - IC t-stat ≥ 2.0;
  - at most 1 of the 6 research years has a negative IC;
  - calibration error ≤ 2%.
- **Baseline:** a one-line short-term reversal rule (last week's biggest losers lean bullish). An ML model is chosen only if it passes and its IC beats the rule's by at least 0.005. Otherwise the simpler rule is published.
- **Experiments are listed in advance:** calibration fix; reversal × volatility, volume shock and market-regime features; 10- and 20-day horizons (research only). Anything not on this list needs a new entry.
**Why:**
- Diagnostics on the published backtest showed the edge was not statistically distinguishable from zero (IC 0.021, t ≈ 1.1).
- With an edge this small, trying many variants and keeping the best one would produce a lucky result rather than a real one. Writing the rules down first, and keeping a holdout, is what makes the outcome believable.
**Alternatives:** Tuning on the full 2019–2026 history (more data, but no untouched test); judging by hit rate on calls (depends on the coverage setting and is noisier than IC).

---

### D-021 · Offline: show the last saved calls, never stale data silently
**Date:** 2026-10-22
**Decision:** The PWA precaches the app itself and caches API responses network-first (6-second timeout, kept for 3 days). When the device is offline, a banner says the calls shown are the last ones saved on this device. The CSV download is never cached.
**Why:** A beginner opening the installed app on a train should see something useful, but must never mistake old calls for today's. Network-first means a working connection always wins.
**Alternatives:** Cache-first (faster, but risks showing yesterday's calls as current); no offline support (a blank screen when offline).

### D-020 · A custom SVG price chart instead of a charting library
**Date:** 2026-10-22
**Decision:** The stock page's price chart is a small hand-written SVG component, not TradingView's `lightweight-charts`.
**Why:** The approved design encodes each past call as colour = lean and filled/hollow = right/wrong, which that library's markers can't draw. A trader-style chart with crosshairs and candles also isn't what a beginner needs. The custom chart is about 150 lines, fully accessible (`role="img"` with a text summary) and removes a dependency.
**Alternatives:** `lightweight-charts` (planned in Phase 0); Recharts (heavier, generic styling).

### D-019 · Warn about stocks the model handles badly; don't hide them (yet)
**Date:** 2026-10-22
**Decision:** If a stock's own simulated hit rate is below 50%, its stock page and its call card say so plainly (for example, Titan: "47.1% right in testing, below a coin flip"), and the warning stays visible even when sections are collapsed. Calls on those stocks are still published.
**Why:** Transparency is the product. Quietly dropping weak stocks would make the overall record look better than it is, which is the cherry-picking Parakh exists to oppose. Users can weigh the call themselves.
**Alternatives:** Suppressing calls on stocks below 50% (more protective, but it hides information and flatters the scoreboard).
**Finding:** 8 of the 20 stocks are below 50% in testing (lowest: ICICI Bank at 44.2%; highest: UltraTech Cement at 58.2%). With roughly 300–450 calls per stock, much of that spread could be chance, so the expanded card says "part of that gap from 50% may be chance" rather than implying the model is reliably wrong on those stocks.
**Update:** Per-stock ranges added in D-024; most of the spread was chance.
**Follow-up:** Revisit in a modelling pass before adding more stocks: per-stock or per-sector behaviour, regime features, and whether the repeated "short-term trend below longer-term trend" explanation (3 of 5 calls on 19 Oct) points to a feature that dominates too much.

### D-018 · Installable web app (PWA), calm editorial design, details on demand
**Date:** 2026-10-22
**Decision:**
- One responsive web app that can be installed as a PWA on phones and on Windows/Mac. No native apps.
- A calm, editorial look: IBM Plex Serif and Sans (Plex has a matching Devanagari typeface for the planned Hindi version).
- Blue for bullish and orange for bearish, always with an icon and a label, never colour alone.
- Progressive disclosure on the phone: cards and sections show a summary and expand on tap. (Since D-026 this applies on desktop too.)
- The receipt line and any per-stock warning never collapse.
**Why:**
- Beginners discover stocks on their phones, while recruiters and researchers use laptops; one codebase serves both.
- App stores add cost and review overhead with no benefit for this audience.
- The first mockups were judged "too open and detailed" for a beginner, so detail moved behind taps without hiding the receipts.
**Alternatives:** React Native/Expo apps; Electron/Tauri desktop apps; bright fintech styling.

### D-017 · Name: Parakh
**Date:** 2026-10-22
**Decision:** Rename the product from "SignalForge (working name)" to **Parakh** (परख, to test something's true worth, as a jeweller tests gold).
**Why:** It says what the product does to stock tips, has an easy story to tell, suits an Indian audience and points towards a Hindi version. "Signal" names sound like the paid tips channels Parakh is positioned against.
**Alternatives:** Tilt ("a tilt, not a tip"), Kasauti, Hisaab, Tipcheck, Receipts. Names containing "Nifty" were ruled out (NSE trademark).

### D-016 · A thin, read-only API that shares the model card's scoring code
**Date:** 2026-10-22
**Decision:**
- FastAPI serves precomputed data from Postgres; no model runs at request time, and ML libraries aren't loaded.
- Database sessions are read-only.
- Responses are cached for 5 minutes in memory and through `Cache-Control` headers.
- Live stats are computed with the same `ml.metrics` functions as the model card.
- An empty ledger is a normal, valid state, not an error.
**Why:**
- The ledger changes once a day, so caching costs nothing in freshness.
- Read-only sessions mean an API bug can't touch the receipts.
- Shared scoring code means the live and simulated hit rates are defined the same way.
- The API stays small enough for a free host.

### D-015 · Ledger integrity rules are enforced by the system, not by promise
**Date:** 2026-10-22
**Decision:**
- Postgres triggers reject any `UPDATE` or `DELETE` on published calls and on outcomes.
- Outcomes live in a separate table, so scoring never touches a call.
- A call is published only after its session has fully closed (16:00 IST) and before the next session opens (09:15 IST). If the job misses that window, the day stays as a visible gap instead of being backfilled.
- Every job run is logged in `job_runs`, so gaps can be explained.
**Why:** "Receipts" only mean something if nobody, including us, can quietly edit or backfill them.
**Alternatives:** Publishing a hash of each day's calls to a public place (for example, a git commit). Could be added later as an external proof.

### D-014 · Weekly retrain, daily predict-and-score; models stored in the database
**Date:** 2026-10-22
**Decision:** GitHub Actions runs `jobs.daily` at 18:00 IST on weekdays and `jobs.retrain --publish` on Saturdays. Each model is stored in `model_versions`, and every call records the version that made it. A stored version is never overwritten.
**Why:**
- Calls stay stable through the week instead of shifting with a daily retrain.
- Every call can be traced to the exact model that made it.
- The ledger and its models live in one place.
**Alternatives:** Retraining daily (simpler, but calls drift and versions churn); committing the model file to git (bot commits, and the file history mixes with code).

### D-013 · Reasons say "Biggest factors", not "because"
**Date:** 2026-10-22
**Decision:** The one-line reason lists the factors that pushed the call most (from SHAP), worded as "Biggest factors: …" rather than "because …".
**Why:** The model often bets on reversals (a big weekly gain can push towards *lagging*), and feature effects depend on combinations. "Because it's up 10.9% this week → bearish" sounds illogical to a beginner. "Biggest factors" is faithful to the model without implying simple cause and effect.
**Follow-up:** The How-it-works page should explain reversal effects in plain words.

### D-012 · Model selection by Brier score, simpler model wins ties
**Date:** 2026-10-22
**Decision:** Compare candidates on out-of-sample Brier score; on a tie (difference under 0.00001), pick the simpler model. Result: LightGBM (hit rate 51.2%, calibration error 0.7%) over logistic regression (48.7%, 1.6%).
**Why:** The product promises honest probabilities, so the selection metric rewards calibrated probabilities rather than raw accuracy.

### D-011 · Probabilities centred within each day; base model refit after calibration
**Date:** 2026-10-22
**Decision:** After calibration, centre each day's probabilities on 50%. Fit the calibrator on the latest 20% of the training window, then refit the base model on the whole window.
**Why:** Without centring, the calibrator picked up how often stocks beat the index recently, so whole years became all-bullish or all-bearish (2022: 100% bearish). Since the target is relative, about half the stocks beat the index on any day, so centring is principled. Training only on the first 80% cost signal (AUC fell from 0.512 to 0.500); refitting recovered it.

### D-010 · The "No call" band is sized by coverage, not a fixed threshold
**Date:** 2026-10-22
**Decision:** Each model sizes its "No call" band on its calibration slice so about 25% of stock-days get a call. Calls are split into *Slight edge* and *Stronger edge* (the more confident half).
**Why:** With a weak model, calibrated probabilities sit between about 46% and 54%, so the planned fixed 55%/45% thresholds would almost never trigger and the Today screen would always say "No call". Sizing by coverage keeps the screen useful, and the hit rate shown next to each band keeps it honest. *Stronger edge* calls have done better (51.9% vs 50.6%). *Superseded in part by D-032: under the reversal rule the stronger tier did worse, so there is now one label.*
**Alternatives:** Fixed thresholds (too few calls); always calling the top/bottom N each day (overstates confidence on quiet days).

### D-009 · Extra features tested and dropped
**Date:** 2026-10-22
**Decision:** 12-month momentum, distance from the 52-week high and sector-relative return were tested and not added.
**Why:** AUC moved from 0.5095 to 0.5118 (within noise), and the gap between top- and bottom-ranked stocks didn't improve. They would also cost a year of warm-up data. Simpler model wins.

### D-008 · Target: "beats the NIFTY 50 over 5 days", not "price goes up"
**Date:** 2026-10-22
**Decision:** Predict whether a stock's 5-day return beats the NIFTY 50's.
**Why:** On the absolute target the model had no edge (AUC ≈ 0.50), and its calls followed the market mood (bullish on 98% of stock-days in 2024). The relative target removes market swings, kept a small, steady edge across years in early tests, and fits the user: the honest alternative for a beginner is an index fund, so the question is "is this stock likely to do better than the index?"
**Consequence:** Copy becomes "likely to outperform / lag the NIFTY 50", and the scoreboard benchmark becomes the index fund.

### D-007 · Explanations use fixed templates, not an LLM (for now)
**Date:** 2026-10-22
**Decision:** Turn each prediction's SHAP values into fixed plain-English sentence templates.
**Why:** Explanations must be faithful to what the model actually did. A template can't make up a reason; an LLM can.
**Alternatives:** LLM-generated explanations. Deferred to a later phase, as a layer on top of the SHAP output.

### D-006 · Live track record kept separate from the backtest
**Date:** 2026-10-22
**Decision:** Show two records: a *simulated* backtest and a *live* append-only ledger of calls published before their outcomes were known.
**Why:** Mixing simulated and real results is the most common way trading products overstate performance. The live ledger is the product's main differentiator.
**Consequence:** The live pipeline is built before the frontend, so the record starts growing as early as possible.

### D-005 · Bearish leans kept
**Date:** 2026-10-22
**Decision:** Show Bullish lean, Bearish lean and No call.
**Why:** Even if a beginner can't short, "data suggests waiting" is useful. A bullish-only tool would also look like it only ever says yes.

### D-004 · Wording: "lean", not "Buy/Sell"
**Date:** 2026-10-22
**Decision:** Signals are worded as *Bullish lean* / *Bearish lean*.
**Why:** It keeps the product educational rather than advisory (SEBI research-analyst rules), and it is more honest about uncertainty.

### D-003 · 5-trading-day horizon, 15–20 stocks
**Date:** 2026-10-22
**Decision:** Predict direction over 5 trading days for 15–20 liquid NIFTY 50 stocks (20 chosen; see `ml/config.py`). The target was later changed to performance relative to the index (D-008).
**Why:** Next-day direction is close to random. A 5-day horizon is less noisy and fits how beginners actually hold stocks. A small universe keeps the data and stats clean.
**Alternatives:** Next-day (too noisy); all of NIFTY 50 (can be added later).

### D-002 · Primary user is a beginner retail investor
**Date:** 2026-10-22
**Decision:** Build for first-time Indian investors who are exposed to tips groups and finfluencers.
**Why:** It gives the clearest problem statement and makes trust and explainability the core of the product.
**Alternatives:** An informed hobbyist who wants a strategy-backtesting lab (a more crowded space, with a weaker AI-product story).

### D-001 · Positioning: "signals with receipts", not "accurate predictions"
**Date:** 2026-10-22
**Decision:** The differentiator is honesty about uncertain ML output (track record, calibration, abstaining), not prediction accuracy.
**Why:** Short-horizon price direction can't be predicted much better than chance with public data. Competing on accuracy can't be won and invites overclaiming.

### D-000 · Rebuild from the original notebook
**Date:** 2026-10-22
**Decision:** Remove the empty backend/frontend placeholders and keep the original assignment notebook in `research/` as project history.
**Why:** The earlier frontend/backend code was lost. The notebook has known methodology issues (see `research/README.md`), which the new ML pipeline fixes.
