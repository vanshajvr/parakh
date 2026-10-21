# Decision Log

Each entry records what was decided, why, and what else was considered. Newest first.

---

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
**Decision:** Predict direction over 5 trading days for 15–20 liquid NIFTY 50 stocks.
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
