# Decision Log

Each entry records what was decided, why, and what else was considered. Newest first.

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
