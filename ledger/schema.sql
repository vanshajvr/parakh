-- SignalForge ledger schema. Idempotent: safe to run on every job start.

-- Every trained model, stored with its evaluation so each call can be traced to the exact model.
CREATE TABLE IF NOT EXISTS model_versions (
    version          TEXT PRIMARY KEY,
    kind             TEXT NOT NULL,
    trained_through  DATE NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active        BOOLEAN NOT NULL DEFAULT FALSE,
    metrics          JSONB NOT NULL,
    artifact         BYTEA NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_model ON model_versions (is_active) WHERE is_active;

-- Daily adjusted prices for the universe and the benchmark (served to the stock page charts).
CREATE TABLE IF NOT EXISTS prices (
    ticker  TEXT NOT NULL,
    date    DATE NOT NULL,
    open    DOUBLE PRECISION NOT NULL,
    high    DOUBLE PRECISION NOT NULL,
    low     DOUBLE PRECISION NOT NULL,
    close   DOUBLE PRECISION NOT NULL,
    volume  DOUBLE PRECISION,
    PRIMARY KEY (ticker, date)
);

-- The live ledger: one call per stock per session, published after the close of `as_of`
-- and before the next session opens. Append-only (see trigger below).
CREATE TABLE IF NOT EXISTS predictions (
    id             BIGSERIAL PRIMARY KEY,
    ticker         TEXT NOT NULL,
    as_of          DATE NOT NULL,
    model_version  TEXT NOT NULL REFERENCES model_versions (version),
    p_outperform   DOUBLE PRECISION NOT NULL,
    lean           TEXT NOT NULL CHECK (lean IN ('bullish', 'bearish', 'no_call')),
    confidence     TEXT NOT NULL,
    reason         TEXT NOT NULL,
    factors        JSONB NOT NULL,
    published_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (ticker, as_of)
);

CREATE OR REPLACE FUNCTION forbid_ledger_changes() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'The live ledger is append-only: % on % is not allowed', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS predictions_append_only ON predictions;
CREATE TRIGGER predictions_append_only
    BEFORE UPDATE OR DELETE ON predictions
    FOR EACH ROW EXECUTE FUNCTION forbid_ledger_changes();

-- How each call turned out, written once its horizon has passed. Kept separate so that
-- scoring never touches the published call.
CREATE TABLE IF NOT EXISTS outcomes (
    prediction_id  BIGINT PRIMARY KEY REFERENCES predictions (id),
    outcome_date   DATE NOT NULL,
    stock_return   DOUBLE PRECISION NOT NULL,
    index_return   DOUBLE PRECISION NOT NULL,
    excess_return  DOUBLE PRECISION NOT NULL,
    beat_index     BOOLEAN NOT NULL,
    hit            BOOLEAN,  -- NULL for "No call"
    scored_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS outcomes_append_only ON outcomes;
CREATE TRIGGER outcomes_append_only
    BEFORE UPDATE OR DELETE ON outcomes
    FOR EACH ROW EXECUTE FUNCTION forbid_ledger_changes();

-- The simulated (walk-forward backtest) record of the active model. Replaced on every retrain
-- and always labelled "simulated" in the product, never mixed with the live ledger.
CREATE TABLE IF NOT EXISTS backtest_predictions (
    ticker         TEXT NOT NULL,
    date           DATE NOT NULL,
    model_version  TEXT NOT NULL REFERENCES model_versions (version),
    p_outperform   DOUBLE PRECISION NOT NULL,
    lean           TEXT NOT NULL,
    confidence     TEXT NOT NULL,
    beat_index     BOOLEAN NOT NULL,
    excess_return  DOUBLE PRECISION NOT NULL,
    PRIMARY KEY (ticker, date)
);

-- One row per job run, so gaps in the ledger (holidays, outages, missed windows) are explained.
CREATE TABLE IF NOT EXISTS job_runs (
    id           BIGSERIAL PRIMARY KEY,
    job          TEXT NOT NULL,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    status       TEXT NOT NULL,
    detail       TEXT
);
