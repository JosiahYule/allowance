-- Ensure transactions table has full RLS coverage including DELETE.
-- Safe to re-run: all statements use IF NOT EXISTS / DO guards.

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'transactions' AND policyname = 'own_transactions_select'
  ) THEN
    CREATE POLICY own_transactions_select ON transactions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'transactions' AND policyname = 'own_transactions_insert'
  ) THEN
    CREATE POLICY own_transactions_insert ON transactions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'transactions' AND policyname = 'own_transactions_update'
  ) THEN
    CREATE POLICY own_transactions_update ON transactions
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'transactions' AND policyname = 'own_transactions_delete'
  ) THEN
    CREATE POLICY own_transactions_delete ON transactions
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
