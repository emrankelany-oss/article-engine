-- Migration 002: Migration Tracking Table
-- Date: 2026-03-26
-- Description: Creates a table to track which migrations have been applied

CREATE TABLE IF NOT EXISTS public._migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ DEFAULT now()
);

-- Record baseline as already applied
INSERT INTO public._migrations (name) VALUES ('001_baseline')
  ON CONFLICT (name) DO NOTHING;

-- Record this migration
INSERT INTO public._migrations (name) VALUES ('002_migrations_table')
  ON CONFLICT (name) DO NOTHING;
