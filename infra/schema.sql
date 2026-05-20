-- padel-tours schema (Postgres + PostGIS)
-- Run via: pnpm db:migrate

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS clubs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  name            text NOT NULL,
  address         text NOT NULL,
  postal_code     text NOT NULL,
  city            text NOT NULL,
  location        geography(Point, 4326) NOT NULL,
  courts_count    integer NOT NULL CHECK (courts_count > 0),
  provider        text NOT NULL CHECK (provider IN ('playtomic','doinsport','anybuddy','tenup','custom','mock')),
  external_id     text NOT NULL,
  booking_base_url text NOT NULL,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clubs_location_gix ON clubs USING GIST (location);
CREATE INDEX IF NOT EXISTS clubs_provider_idx ON clubs (provider);

-- Optional: log de chaque appel adapter pour debug/monitoring
CREATE TABLE IF NOT EXISTS adapter_logs (
  id          bigserial PRIMARY KEY,
  ts          timestamptz NOT NULL DEFAULT now(),
  provider    text NOT NULL,
  club_slug   text NOT NULL,
  ok          boolean NOT NULL,
  latency_ms  integer NOT NULL,
  slot_count  integer,
  error       text
);

CREATE INDEX IF NOT EXISTS adapter_logs_ts_idx ON adapter_logs (ts DESC);
CREATE INDEX IF NOT EXISTS adapter_logs_provider_idx ON adapter_logs (provider, ok);
