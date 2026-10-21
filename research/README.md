# Research

## `AlgoTradingSystem.ipynb`: the original prototype

This is the original notebook built for a company screening assignment. It is kept unchanged as project history and is the starting point for the rebuild.

**What it does:** fetches 6 months of daily data for 4 NSE stocks from yfinance, computes RSI and the 20/50-day moving averages, generates buy signals on a DMA crossover with RSI below 50, trains a Logistic Regression model on next-day direction, and logs trades and P&L to Google Sheets.

**Known issues, fixed in the new pipeline:**

| Issue | Why it matters | Fix in the rebuild |
|---|---|---|
| Random `train_test_split` on time-series data | Look-ahead leakage: the model trains on future days, so the reported accuracy isn't trustworthy | Walk-forward (chronological) validation |
| About 125 rows (6 months) per stock | Too little data to learn from or evaluate | About 8 years across 15–20 stocks |
| No baseline comparison | Accuracy means nothing without knowing the "always up" rate | Coin-flip and always-bullish baselines |
| Unscaled features (raw volume) | Hurts Logistic Regression | Scaled or normalised features |
| Next-day target | Close to random at this horizon | 5-trading-day horizon |
| Fixed 3-day exit, no transaction costs, only buy signals | Overstates strategy performance | Bullish, bearish and abstain calls, scored honestly |
| Hardcoded credentials path, Colab-only cells | Not reproducible | Config through environment variables |
