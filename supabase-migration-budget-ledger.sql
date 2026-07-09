-- Anggaran (budget) ledger model
-- Run this once in the Supabase SQL Editor.
--
-- Before: cashflow_budgets allowed only ONE row per (category, year, month),
-- so re-adding a budget replaced the amount. This unique constraint blocks
-- keeping a history of budget entries.
--
-- After: multiple budget entries per category/period are allowed. Each entry
-- is its own row; the app sums them for the category's "Rencana" total, and
-- lets you edit or delete individual entries.

ALTER TABLE cashflow_budgets DROP CONSTRAINT IF EXISTS cashflow_budgets_uniq;

-- Keep lookups by category/period fast now that there can be many rows.
CREATE INDEX IF NOT EXISTS cashflow_budgets_cat_period_idx
  ON cashflow_budgets (category_id, year, month);
