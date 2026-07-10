-- Perpuluhan (tithe) tracking
-- Run this once in the Supabase SQL Editor.
--
-- Goal: give tithes their own dedicated track — recording who gave, which
-- family, which period, how they paid — WITHOUT breaking the existing income
-- reports. The finance Dashboard, Laporan Keuangan and Anggaran all read income
-- from cashflow_transactions (type = 'in'). So every tithe is mirrored into a
-- cashflow_transactions row under a "Perpuluhan" income category via a trigger.
-- Insert/update/delete a tithe and the matching income row follows automatically.

-- 1. Make sure the "Perpuluhan" income category exists ------------------------
insert into public.cashflow_categories (name, type)
select 'Perpuluhan', 'in'
where not exists (
  select 1 from public.cashflow_categories
  where lower(name) = 'perpuluhan' and type = 'in'
);

-- 2. The tithes table ---------------------------------------------------------
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
  -- link to the mirrored income row so we can keep it in sync / remove it
  cashflow_transaction_id uuid references public.cashflow_transactions(id) on delete set null,
  created_at              timestamptz not null default now()
);

create index if not exists tithes_date_idx   on public.tithes (transaction_date);
create index if not exists tithes_jemaat_idx on public.tithes (jemaat_id);
create index if not exists tithes_period_idx on public.tithes (period_year, period_month);

-- 3. Keep cashflow_transactions in sync with tithes ---------------------------
-- SECURITY DEFINER so the write to cashflow_transactions bypasses RLS regardless
-- of who inserts the tithe (mirrors how the app writes offerings from the client).
create or replace function public.sync_tithe_to_cashflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cat_id    uuid;
  desc_text text;
begin
  if (tg_op = 'DELETE') then
    if old.cashflow_transaction_id is not null then
      delete from public.cashflow_transactions where id = old.cashflow_transaction_id;
    end if;
    return old;
  end if;

  select id into cat_id
  from public.cashflow_categories
  where lower(name) = 'perpuluhan' and type = 'in'
  limit 1;

  desc_text := 'Perpuluhan - ' || coalesce(nullif(trim(new.giver_name), ''), 'Anonim');

  if (tg_op = 'INSERT') then
    insert into public.cashflow_transactions (transaction_date, type, category_id, description, amount)
    values (new.transaction_date, 'in', cat_id, desc_text, new.amount)
    returning id into new.cashflow_transaction_id;

  elsif (tg_op = 'UPDATE') then
    if new.cashflow_transaction_id is not null then
      update public.cashflow_transactions
      set transaction_date = new.transaction_date,
          category_id      = cat_id,
          description      = desc_text,
          amount           = new.amount
      where id = new.cashflow_transaction_id;
    else
      insert into public.cashflow_transactions (transaction_date, type, category_id, description, amount)
      values (new.transaction_date, 'in', cat_id, desc_text, new.amount)
      returning id into new.cashflow_transaction_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tithe_sync_ins on public.tithes;
create trigger trg_tithe_sync_ins
  before insert on public.tithes
  for each row execute function public.sync_tithe_to_cashflow();

drop trigger if exists trg_tithe_sync_upd on public.tithes;
create trigger trg_tithe_sync_upd
  before update on public.tithes
  for each row execute function public.sync_tithe_to_cashflow();

drop trigger if exists trg_tithe_sync_del on public.tithes;
create trigger trg_tithe_sync_del
  after delete on public.tithes
  for each row execute function public.sync_tithe_to_cashflow();

-- 4. Row level security -------------------------------------------------------
-- Matches how the app already reaches finance tables from the browser client.
alter table public.tithes enable row level security;

drop policy if exists tithes_rw on public.tithes;
create policy tithes_rw on public.tithes
  for all
  to anon, authenticated
  using (true)
  with check (true);
