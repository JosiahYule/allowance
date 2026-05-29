-- Run this migration against your Supabase project to enable:
--   • Recurring transactions (4c)
--   • Custom categories (4e)
--   • Savings goals (4f)

-- ── Recurring transactions ─────────────────────────────────────────────────
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS recurring           boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_interval  text     CHECK (recurring_interval IN ('weekly','biweekly','monthly')),
  ADD COLUMN IF NOT EXISTS recurring_parent_id uuid     REFERENCES transactions(id) ON DELETE SET NULL;

-- ── Custom categories ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name        text        NOT NULL,
  icon        text        NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE user_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_categories' AND policyname = 'own_categories'
  ) THEN
    CREATE POLICY own_categories ON user_categories
      USING  (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── Savings goals ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title           text        NOT NULL,
  target_amount   numeric     NOT NULL CHECK (target_amount > 0),
  current_amount  numeric     NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'goals' AND policyname = 'own_goals'
  ) THEN
    CREATE POLICY own_goals ON goals
      USING  (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
