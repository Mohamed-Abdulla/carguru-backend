-- CarGuru Database Schema
-- Runs automatically via docker-entrypoint-initdb.d on first Postgres start

-- Enable uuid generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Cars ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cars (
  id                   INTEGER PRIMARY KEY,
  make                 VARCHAR(100)     NOT NULL,
  model                VARCHAR(100)     NOT NULL,
  variant              VARCHAR(200)     NOT NULL,
  year                 SMALLINT         NOT NULL,
  price_lakh           NUMERIC(6, 2)    NOT NULL,
  fuel_type            VARCHAR(50)      NOT NULL,
  transmission         VARCHAR(50)      NOT NULL,
  body_type            VARCHAR(50)      NOT NULL,
  seats                SMALLINT         NOT NULL,
  mileage_kmpl         NUMERIC(5, 2),
  range_km             INTEGER,
  engine_cc            INTEGER,
  power_bhp            NUMERIC(6, 1)    NOT NULL,
  torque_nm            NUMERIC(6, 1)    NOT NULL,
  safety_rating        SMALLINT         NOT NULL CHECK (safety_rating BETWEEN 1 AND 5),
  boot_space_litres    INTEGER          NOT NULL,
  ground_clearance_mm  INTEGER          NOT NULL,
  use_case             TEXT[]           NOT NULL DEFAULT '{}',
  target_buyer         TEXT[]           NOT NULL DEFAULT '{}',
  pros                 TEXT[]           NOT NULL DEFAULT '{}',
  cons                 TEXT[]           NOT NULL DEFAULT '{}',
  user_rating          NUMERIC(3, 1)    NOT NULL,
  review_count         INTEGER          NOT NULL DEFAULT 0,
  image_url            TEXT,
  colors               TEXT[]           NOT NULL DEFAULT '{}',
  warranty_years       SMALLINT         NOT NULL DEFAULT 2,
  service_cost_annual  INTEGER          NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cars_price       ON cars (price_lakh);
CREATE INDEX IF NOT EXISTS idx_cars_fuel        ON cars (fuel_type);
CREATE INDEX IF NOT EXISTS idx_cars_body        ON cars (body_type);
CREATE INDEX IF NOT EXISTS idx_cars_safety      ON cars (safety_rating);
CREATE INDEX IF NOT EXISTS idx_cars_user_rating ON cars (user_rating DESC);

-- ─── Sessions ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  preferences  JSONB        NOT NULL DEFAULT '{}',
  shortlist    JSONB        NOT NULL DEFAULT '[]',
  messages     JSONB        NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions (updated_at DESC);
