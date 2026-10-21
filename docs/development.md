# Development guide

## Layout

| Folder | What's in it |
|---|---|
| `ml/` | Data download, features, labels, model, walk-forward evaluation, SHAP explanations, model-card generator |
| `jobs/` | `retrain` (weekly: evaluate, train, publish a model version) and `daily` (score matured calls, publish the next ones) |
| `ledger/` | Postgres schema (append-only triggers), database access, scoring rules |
| `api/` | Read-only FastAPI service |
| `frontend/` | React + TypeScript + Vite + Tailwind PWA |
| `tests/` | Python tests (frontend tests live next to the code in `frontend/src`) |
| `docs/` | PRD, decision log, model card, this guide |
| `research/` | The original screening-assignment notebook and its known issues |

## Python (ML, jobs, API)

Requires Python 3.11–3.13. On macOS, LightGBM also needs `brew install libomp`.

```bash
python3.11 -m venv .venv && source .venv/bin/activate
pip install -e ".[ml,dev]"        # the API alone needs only `pip install .`
pytest
python -m jobs.retrain --refresh  # download data, evaluate, train, write docs/model-card.md, print today's calls
```

### Live ledger (Neon Postgres)

```bash
cp .env.example .env                 # then paste your Neon connection string as DATABASE_URL
python -m jobs.retrain --publish     # create tables, store the model as the active version
python -m jobs.daily                 # refresh prices, score matured calls, publish the next calls
```

In production both jobs run in GitHub Actions ([daily](../.github/workflows/daily.yml) at 18:00 IST on weekdays, [retrain](../.github/workflows/retrain.yml) on Saturdays) with a `DATABASE_URL` repository secret. The ledger rules are in [decision D-015](decisions.md).

### API

```bash
uvicorn api.main:app --reload        # http://localhost:8000/docs for the interactive API docs
```

| Endpoint | Powers |
|---|---|
| `GET /api/today` | Today screen: latest calls with receipts, scoreboard, data freshness |
| `GET /api/stocks`, `/api/stocks/{symbol}` | Stock list; stock page (chart, latest call and factors, live and simulated history) |
| `GET /api/track-record` | Live record next to the simulated one |
| `GET /api/ledger`, `/api/ledger.csv` | The public ledger, paginated or as a CSV download |
| `GET /api/model` | Model version, features and evaluation |
| `GET /api/status` | Data freshness and recent job runs |

The API's database sessions are read-only, and results are cached for 5 minutes.

## Frontend

Requires Node 20+.

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173, with the API running on :8000
npm run dev:fixtures   # no API needed: recorded responses from src/fixtures/
npm test
npm run gen:api        # regenerate src/api/schema.ts after changing the API's response models
```

TypeScript types are generated from the API's OpenAPI schema, so the frontend and backend can't drift apart. Fixtures are development-only and never included in production builds.

## Deployment

| Piece | Where | Config |
|---|---|---|
| API | Render (free plan, Singapore) | [`render.yaml`](../render.yaml); set `DATABASE_URL` in the dashboard |
| Frontend | Vercel (root directory `frontend`) | [`frontend/vercel.json`](../frontend/vercel.json) forwards `/api/*` to the API |
| Jobs | GitHub Actions | `DATABASE_URL` secret |
| Keep-warm ping | GitHub Actions | `API_URL` repository variable ([why](../.github/workflows/keep-warm.yml)) |
| Database | Neon Postgres (Singapore) | — |

Because Vercel forwards `/api/*` to Render, the browser only ever talks to one site: no CORS configuration is needed, and Vercel preview deployments work too.
