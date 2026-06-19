-- Safe-to-spend model: ties savings goals into cash flow, makes recurring
-- generation idempotent, adds the rollover preference, and indexes the hot path.
-- Safe to re-run: every statement is guarded.

-- ── Goals tied to cash flow ────────────────────────────────────────────────
-- A contribution to a goal is now a real (negative) transaction tagged with the
-- goal, so it reduces "available to spend" like any other outflow.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS transactions_goal_id_idx
  ON transactions (goal_id) WHERE goal_id IS NOT NULL;

-- ── Idempotent recurring generation ────────────────────────────────────────
-- One generated instance per (parent, date). Replaces the racy "select then
-- insert" existence check with a hard constraint so concurrent app opens /
-- a future server-side cron job can't create duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS transactions_recurring_instance_uniq
  ON transactions (recurring_parent_id, date)
  WHERE recurring_parent_id IS NOT NULL;

-- ── Hot query path ─────────────────────────────────────────────────────────
-- Every screen filters transactions by user_id within a month and orders by
-- date. A composite index keeps that fast as history grows.
CREATE INDEX IF NOT EXISTS transactions_user_date_idx
  ON transactions (user_id, date DESC);

-- ── Rollover preference ────────────────────────────────────────────────────
-- When on, last month's leftover carries into this month's allowance.
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS rollover_enabled boolean NOT NULL DEFAULT true;
