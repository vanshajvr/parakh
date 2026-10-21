# Parakh

*Parakh (परख): to test something's true worth, the way a jeweller tests gold on a touchstone.*

**ML stock signals with receipts.** A signal tool for beginner Indian investors. Every call shows its track record, its confidence and its reasoning, and it says "No call" when the data isn't clear.

> 🚧 **Under active rebuild.** This project started as a notebook for a screening assignment and is being rebuilt into a full product. See the [roadmap](docs/PRD.md#9-roadmap).

## Why

Stock tips from Telegram groups and finfluencers come with no track record, no stated confidence and no reasoning. Parakh is the opposite:

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

### Live ledger (Neon Postgres)

```bash
cp .env.example .env                 # then paste your Neon connection string as DATABASE_URL
python -m jobs.retrain --publish     # create tables, store the model as the active version
python -m jobs.daily                 # refresh prices, score matured calls, publish the next calls
```

### API

```bash
uvicorn api.main:app --reload        # http://localhost:8000/docs for the interactive API docs
```

| Endpoint | Powers |
|---|---|
| `GET /api/today` | Today screen: latest calls (most confident first), scoreboard, data freshness |
| `GET /api/stocks`, `/api/stocks/{symbol}` | Stock list; stock page with a 1-year chart, the latest call with its factors, and live and simulated history |
| `GET /api/track-record` | Track record: live stats, by confidence and calibration, next to the simulated record |
| `GET /api/ledger`, `/api/ledger.csv` | The full public ledger, paginated or as a CSV download |
| `GET /api/model` | How it works: model version, features and evaluation |
| `GET /api/status` | "Data delayed" state and recent job runs |

The API is read-only (its database sessions can't write) and caches results for 5 minutes.

In production, both jobs run in GitHub Actions ([daily](.github/workflows/daily.yml) at 18:00 IST on weekdays, [retrain](.github/workflows/retrain.yml) on Saturdays) using a `DATABASE_URL` repository secret. The ledger rules (append-only, publish window) are described in [decision D-015](docs/decisions.md).

### Frontend

React + TypeScript + Vite, styled with Tailwind. Requires Node 20+.

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173, with the API running on :8000
npm run dev:fixtures   # no API needed: uses recorded responses from src/fixtures/
npm test               # component and logic tests
npm run gen:api        # regenerate src/api/schema.ts after changing the API's response models
```

TypeScript types come straight from the API's OpenAPI schema, so the frontend and backend can't drift apart. Fixtures are used only in development and are never included in production builds.

## Status

| Phase | Scope | Status |
|---|---|---|
| 0 | Repo cleanup, PRD, decision log | ✅ Done |
| 1 | ML core: walk-forward evaluation, baselines, calibration, SHAP | ✅ Done |
| 2 | Live ledger: Neon Postgres + daily GitHub Actions job | ✅ Done |
| 3 | FastAPI API | ✅ Done |
| 4 | Frontend (installable web app) | 🚧 In progress: Today screen done; stock page, track record, PWA next |
| 5 | Deployment, CI, case study | — |

## Disclaimer

This is an educational project. It is not investment advice, and it is not registered with SEBI as an investment adviser or research analyst.

## Author

Vanshaj Verma · NSUT '27 · [GitHub](https://github.com/vanshajvr) · [LinkedIn](https://www.linkedin.com/in/vanshajverma60/)
