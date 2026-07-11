-- Separate perpuluhan (tithe) from cashflow income
-- Run this once in the Supabase SQL Editor, AFTER supabase-migration-tithes.sql.
--
-- Goal: stop counting tithes as general cashflow income. Previously every tithe
-- was mirrored into cashflow_transactions (type = 'in') via a trigger, so it fed
-- into the finance Dashboard, Laporan Keuangan and Anggaran totals. From now on
-- tithes live only in their own `tithes` table and are reported separately.

-- 1. Remove the sync triggers + function ------------------------------------
drop trigger if exists trg_tithe_sync_ins on public.tithes;
drop trigger if exists trg_tithe_sync_upd on public.tithes;
drop trigger if exists trg_tithe_sync_del on public.tithes;
drop function if exists public.sync_tithe_to_cashflow();

-- 2. Delete the income rows that were mirrored from tithes -------------------
-- These are the rows that made tithes show up in Total Pemasukan.
delete from public.cashflow_transactions
where id in (
  select cashflow_transaction_id
  from public.tithes
  where cashflow_transaction_id is not null
);

-- 3. Drop the vestigial link column -----------------------------------------
alter table public.tithes drop column if exists cashflow_transaction_id;

-- 4. Remove the now-empty "Perpuluhan" income category ----------------------
delete from public.cashflow_categories c
where lower(c.name) = 'perpuluhan'
  and c.type = 'in'
  and not exists (
    select 1 from public.cashflow_transactions t where t.category_id = c.id
  );
