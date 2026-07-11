-- Perpuluhan (tithe) tracking
-- Run this once in the Supabase SQL Editor.
--
-- Goal: give tithes their own dedicated track — recording who gave, which
-- family, which period, how they paid. Tithes are kept SEPARATE from general
-- cashflow income: they are NOT mirrored into cashflow_transactions, so they do
-- not feed into the finance Dashboard / Laporan Keuangan / Anggaran income
-- totals. Perpuluhan is reported on its own page instead.
--
-- (If you previously ran a version of this file that mirrored tithes into
--  cashflow_transactions, run supabase-migration-tithes-separate.sql to undo it.)

-- 1. The tithes table ---------------------------------------------------------
create table if not exists public.tithes (
  id                      uuid primary key default gen_random_uuid(),
  transaction_date        date not null default current_date,
  amount                  numeric not null check (amount > 0),
  giver_name              text not null,                       -- nama pemberi (member or not)
  jemaat_id               uuid references public.jemaat(id) on delete set null, -- optional member link
  payment_method          text not null default 'tunai',       -- tunai | transfer | qris
  period_month            int check (period_month between 1 and 12), -- bulan perpuluhan
  period_year             int check (period_year between 2000 and 2100),
  notes                   text,
  created_at              timestamptz not null default now()
);

create index if not exists tithes_date_idx   on public.tithes (transaction_date);
create index if not exists tithes_jemaat_idx on public.tithes (jemaat_id);
create index if not exists tithes_period_idx on public.tithes (period_year, period_month);

-- 2. Row level security -------------------------------------------------------
-- Matches how the app already reaches finance tables from the browser client.
alter table public.tithes enable row level security;

drop policy if exists tithes_rw on public.tithes;
create policy tithes_rw on public.tithes
  for all
  to anon, authenticated
  using (true)
  with check (true);
