# Development guide

## Layout

| Folder | What's in it |
|---|---|
| `ml/` | Data download, features, labels, model, walk-forward evaluation, SHAP explanations, model-card generator |
| `jobs/` | `retrain` (weekly: evaluate, train, publish a model version), `daily` (score matured calls, publish the next ones), and `news` (paused, D-042) |
| `ledger/` | Postgres schema (append-only triggers), database access, scoring rules |
| `api/` | Read-only FastAPI service |
| `frontend/` | React + TypeScript + Vite + Tailwind PWA. `src/lib/sim/` is the time machine's engine; `src/i18n/` holds the English and Hindi text |
| `tests/` | Python tests (frontend tests live next to the code in `frontend/src`) |
| `docs/` | PRD, decision log, model card, this guide |
| `analysis/` | SQL analysis of the track record, run against the production database (read-only) |
| `research/` | The original screening-assignment notebook and its known issues |

## Python (ML, jobs, API)

Requires Python 3.11–3.13. On macOS, LightGBM also needs `brew install libomp`.

```bash
python3.11 -m venv .venv && source .venv/bin/activate
pip install -e ".[ml,dev]"        # the API alone needs only `pip install .`
pytest
python -m jobs.retrain --refresh  # download data, evaluate, train, write docs/model-card.md, print today's calls
```

The SQL notebook needs `pip install -e ".[analysis]"` and a `DATABASE_URL` in `.env`. Open `analysis/track_record_sql.ipynb` and run all cells. Its connection is read-only.

### Live ledger (Neon Postgres)

```bash
cp .env.example .env                 # then paste your Neon connection string as DATABASE_URL
python -m jobs.retrain --publish     # create tables, store the model as the active version
python -m jobs.daily                 # refresh prices, score matured calls, publish the next calls
```

In production the jobs run in GitHub Actions with a `DATABASE_URL` repository secret: [daily](../.github/workflows/daily.yml) at 18:00 IST on weekdays (with catch-up runs), [retrain](../.github/workflows/retrain.yml) on Saturdays, and a monthly [keepalive](../.github/workflows/keepalive.yml). The ledger rules are in [decision D-015](decisions.md). The news job (`python -m jobs.news`) is paused and has no schedule: Google News feeds may only be shown in a personal feed reader ([D-042](decisions.md)).

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
| `GET /api/screener`, `/api/history/{symbol}` | Market movers and the screener for all 50 stocks; daily candles since 2016 |
| `GET /api/news?lang=en\|hi&symbol=` | Headlines from the past 3 days (empty while news is paused, D-042) |
| `GET /api/sim/prices` | The time machine's price history: every stock's open and close on a clean trading calendar (gzipped, cached for an hour) |
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
npm run build          # also saves public/sim-prices.json from the API first (prebuild; set SIM_PRICES_URL to change the source)
```

TypeScript types are generated from the API's OpenAPI schema, so the frontend and backend can't drift apart. Fixtures are development-only and never included in production builds.

**Text and translations.** Every string on a translated screen lives in `src/i18n/en.ts`; `src/i18n/hi.ts` must have the same shape, so adding an English string without its Hindi version fails `tsc` ([D-034](decisions.md)). Read text with `const { m } = useI18n()`.

**The time machine.** `src/lib/sim/` is pure functions: `simulate()` turns a game (start, end, cash, optional SIP, orders) into fills, daily values and results, and `buildReport()` turns a finished game into notes and lessons. Its tests run on real 2020–23 prices in `src/fixtures/sim-market.json`. Games are saved in the browser only (`parakh.practice.v1`).

## Monitoring

Each scheduled job finishes by pinging [healthchecks.io](https://healthchecks.io), which emails you if a run fails or doesn't arrive on time ([D-043](decisions.md)). To set it up, once:

1. Create a free healthchecks.io account and a project.
2. Add three checks, each with **Schedule: Cron** and **Time zone: UTC**:

   | Check | Cron | Grace time | Secret to store its ping URL in |
   |---|---|---|---|
   | Parakh daily | `30 12 * * 1-5` | 4 hours (catch-up runs at 21:00 and 07:30 IST) | `HEALTHCHECK_DAILY_URL` |
   | Parakh retrain | `30 3 * * 6` | 6 hours | `HEALTHCHECK_RETRAIN_URL` |
   | Parakh keepalive | `0 4 1 * *` | 2 days | `HEALTHCHECK_KEEPALIVE_URL` |

3. In GitHub: Settings → Secrets and variables → Actions → New repository secret, one per row, with each check's ping URL (`https://hc-ping.com/…`).
4. Run each workflow once from the Actions tab ("Run workflow") and check that its check turns green.

Until a secret is set, that workflow simply skips its ping. Market holidays will show as a late daily run, which is expected.

**Fresh prices for the time machine (optional).** In Vercel: Project → Settings → Git → Deploy Hooks, create a hook for `main`, and store its URL as the `VERCEL_DEPLOY_HOOK_URL` repository secret. The daily job then rebuilds the site after each run, so the static price file includes the latest close ([D-044](decisions.md)). Without it, the file refreshes on each deploy.

## Deployment

| Piece | Where | Config |
|---|---|---|
| API | Render (free plan, Singapore) | [`render.yaml`](../render.yaml); set `DATABASE_URL` in the dashboard |
| Frontend | Vercel (root directory `frontend`), live at [parakh-bi78.vercel.app](https://parakh-bi78.vercel.app/) | [`frontend/vercel.json`](../frontend/vercel.json) forwards `/api/*` to the API |
| Jobs | GitHub Actions | `DATABASE_URL` secret |
| Keep-warm ping | GitHub Actions | `API_URL` repository variable ([why](../.github/workflows/keep-warm.yml)) |
| Database | Neon Postgres (Singapore) | — |

Because Vercel forwards `/api/*` to Render, the browser only ever talks to one site: no CORS configuration is needed, and Vercel preview deployments work too.
