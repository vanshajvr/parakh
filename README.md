# SignalForge (working name)

**ML stock signals with receipts.** A signal tool for beginner Indian investors. Every call shows its track record, its confidence and its reasoning, and it says "No call" when the data isn't clear.

> 🚧 **Under active rebuild.** This project started as a notebook for a screening assignment and is being rebuilt into a full product. See the [roadmap](docs/PRD.md#9-roadmap).

## Why

Stock tips from Telegram groups and finfluencers come with no track record, no stated confidence and no reasoning. SignalForge is the opposite:

- **Receipts:** a public, append-only ledger of every call, published before the outcome is known.
- **Confidence:** calibrated probabilities, never a bare "BUY".
- **Reasoning:** a plain-English explanation of the top factors behind each call.
- **Honesty:** "No call" when the model isn't confident, and the worst periods shown openly.

## Docs

- [Product requirements (PRD)](docs/PRD.md)
- [Model card: what the model does and how well](docs/model-card.md)
- [Decision log](docs/decisions.md)
- [Original prototype and its known issues](research/README.md)

## Run it locally

Requires Python 3.11–3.13. On macOS, LightGBM also needs `brew install libomp`.

```bash
python3.11 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest                          # run the tests
python -m jobs.retrain --refresh  # download data, evaluate, train, write docs/model-card.md, print today's calls
```

## Status

| Phase | Scope | Status |
|---|---|---|
| 0 | Repo cleanup, PRD, decision log | ✅ Done |
| 1 | ML core: walk-forward evaluation, baselines, calibration, SHAP | ✅ Done |
| 2 | Live ledger: Neon Postgres + daily GitHub Actions job | ⏳ Next |
| 3 | FastAPI API | — |
| 4 | React frontend | — |
| 5 | Deployment, CI, case study | — |

## Disclaimer

This is an educational project. It is not investment advice, and it is not registered with SEBI as an investment adviser or research analyst.

## Author

Vanshaj Verma · NSUT '27 · [GitHub](https://github.com/vanshajvr) · [LinkedIn](https://www.linkedin.com/in/vanshajverma60/)
