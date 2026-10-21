# Decision Log

Each entry records what was decided, why, and what else was considered. Newest first.

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
**Follow-up:** Revisit in a modelling pass before adding more stocks: per-stock or per-sector behaviour, regime features, and whether the repeated "short-term trend below longer-term trend" explanation (3 of 5 calls on 19 Oct) points to a feature that dominates too much.

### D-018 · Installable web app (PWA), calm editorial design, details on demand
**Date:** 2026-10-22
**Decision:**
- One responsive web app that can be installed as a PWA on phones and on Windows/Mac. No native apps.
- A calm, editorial look: IBM Plex Serif and Sans (Plex has a matching Devanagari typeface for the planned Hindi version).
- Blue for bullish and orange for bearish, always with an icon and a label, never colour alone.
- Progressive disclosure on the phone: cards and sections show a summary and expand on tap.
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
**Why:** With a weak model, calibrated probabilities sit between about 46% and 54%, so the planned fixed 55%/45% thresholds would almost never trigger and the Today screen would always say "No call". Sizing by coverage keeps the screen useful, and the hit rate shown next to each band keeps it honest. *Stronger edge* calls have done better (51.9% vs 50.6%).
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
