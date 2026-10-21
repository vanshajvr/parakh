# Decision Log

Each entry records what was decided, why, and what else was considered. Newest first.

---

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
