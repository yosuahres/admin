-- Multi-organization (multi-tenant) data separation
-- Run this once in the Supabase SQL Editor. It runs in a single transaction:
-- if any step fails, nothing is changed.
--
-- What it does
--   1. Creates `organizations` and puts every existing row into one default
--      organization ("IFGF Batam"), so current data keeps working.
--   2. Adds `organization_id` to `profiles` and to every data table.
--   3. Replaces ALL existing row-level-security policies on those tables with a
--      single rule: a signed-in user only sees and writes rows of their own
--      organization. Anonymous (not signed-in) access is removed entirely.
--   4. Makes the cashflow views respect those rules (security_invoker).
--   5. Stops users from moving themselves into another organization or
--      changing their own role.
--
-- New rows get `organization_id` filled in automatically from the signed-in
-- user, so the app never has to pass it.
--
-- ⚠ Step 3 drops every existing policy on the listed tables. Before this
--   migration those policies allowed the anon key to read and write the data,
--   which is exactly what must stop for organizations to be separated.

begin;

-- 1. Organizations ------------------------------------------------------------
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now()
);

insert into public.organizations (name, slug)
values ('IFGF Batam', 'ifgf-batam')
on conflict (slug) do nothing;

-- 2. Profiles belong to an organization --------------------------------------
-- Nullable on purpose: a profile created by the auth trigger has no
-- organization until /api/users/create assigns one. A profile without an
-- organization can see nothing.
alter table public.profiles
  add column if not exists organization_id uuid
  references public.organizations (id) on delete restrict;

update public.profiles
set organization_id = (select id from public.organizations where slug = 'ifgf-batam')
where organization_id is null;

create index if not exists profiles_organization_idx on public.profiles (organization_id);

-- 3. Helpers used by the policies --------------------------------------------
-- SECURITY DEFINER so they can read profiles without recursing into the
-- profiles policies.
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_org_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  )
$$;

revoke all on function public.current_org_id() from public;
revoke all on function public.is_org_admin() from public;
grant execute on function public.current_org_id() to authenticated, service_role;
grant execute on function public.is_org_admin() to authenticated, service_role;

-- 4. Data tables: add organization_id + isolation policy ---------------------
do $$
declare
  default_org uuid := (select id from public.organizations where slug = 'ifgf-batam');
  t text;
  p record;
  tenant_tables text[] := array[
    'jemaat',
    'baptism_records',
    'departments',
    'department_members',
    'icare_groups',
    'icare_members',
    'icare_meetings',
    'icare_attendance',
    'events',
    'event_occurrences',
    'attendance_reports',
    'cashflow_categories',
    'cashflow_transactions',
    'cashflow_budgets',
    'tithes',
    'offerings'
  ];
begin
  foreach t in array tenant_tables loop
    if to_regclass(format('public.%I', t)) is null then
      raise notice 'skipping %, table does not exist', t;
      continue;
    end if;

    execute format(
      'alter table public.%I add column if not exists organization_id uuid
         references public.organizations (id) on delete restrict', t);
    execute format(
      'update public.%I set organization_id = %L where organization_id is null',
      t, default_org);
    execute format(
      'alter table public.%I alter column organization_id set not null', t);
    execute format(
      'alter table public.%I alter column organization_id set default public.current_org_id()', t);
    execute format(
      'create index if not exists %I on public.%I (organization_id)',
      t || '_organization_idx', t);

    execute format('alter table public.%I enable row level security', t);

    for p in
      select policyname from pg_policies where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;

    execute format(
      'create policy tenant_isolation on public.%I
         for all to authenticated
         using (organization_id = public.current_org_id())
         with check (organization_id = public.current_org_id())', t);
  end loop;
end $$;

-- 5. Profiles policies --------------------------------------------------------
alter table public.profiles enable row level security;

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles'
  loop
    execute format('drop policy %I on public.profiles', p.policyname);
  end loop;
end $$;

-- Everyone can read their own profile (needed to find out their organization)
-- and the profiles of their own organization.
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or organization_id = public.current_org_id());

-- Users may edit their own profile; admins may edit anyone in their org.
create policy profiles_update on public.profiles
  for update to authenticated
  using (organization_id = public.current_org_id()
         and (id = auth.uid() or public.is_org_admin()))
  with check (organization_id = public.current_org_id());

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (public.is_org_admin() and organization_id = public.current_org_id());

create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.is_org_admin() and organization_id = public.current_org_id());

alter table public.profiles
  alter column organization_id set default public.current_org_id();

-- Block privilege escalation through the API: nobody signed in through the app
-- may change a profile's organization, and only admins may change roles.
-- Service-role calls (server API routes) and the SQL editor are not affected.
create or replace function public.guard_profile_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.organization_id is distinct from old.organization_id then
      raise exception 'organization_id cannot be changed';
    end if;
    if new.role is distinct from old.role and not public.is_org_admin() then
      raise exception 'only admins can change roles';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists trg_guard_profile_changes on public.profiles;
create trigger trg_guard_profile_changes
  before update on public.profiles
  for each row execute function public.guard_profile_changes();

-- 6. Organizations: members can read their own organization only ------------
alter table public.organizations enable row level security;

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select to authenticated
  using (id = public.current_org_id());

-- 7. Views must apply the callers' policies ----------------------------------
-- Without security_invoker a view runs as its owner and bypasses RLS, which
-- would show every organization's cashflow.
do $$
declare
  v text;
  kind "char";
begin
  foreach v in array array['cashflow_transactions_view', 'cashflow_monthly_summary'] loop
    select c.relkind into kind
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = v;

    if kind is null then
      raise notice 'skipping view %, it does not exist', v;
    elsif kind = 'v' then
      execute format('alter view public.%I set (security_invoker = true)', v);
    else
      raise exception '% is not a plain view (relkind %). It must be recreated as a regular view so it can be filtered per organization.', v, kind;
    end if;
  end loop;
end $$;

-- 8. RPC: list profiles of the caller's organization only -------------------
drop function if exists public.get_profiles_with_jemaat();
create function public.get_profiles_with_jemaat()
returns table (
  id           uuid,
  email        text,
  full_name    text,
  role         text,
  updated_at   timestamptz,
  jemaat_id    uuid,
  jemaat_nama  text
)
language sql
stable
security invoker
set search_path = public
as $$
  select p.id, p.email::text, p.full_name::text, p.role::text,
         p.updated_at::timestamptz, j.id, j.nama_lengkap::text
  from public.profiles p
  left join lateral (
    select id, nama_lengkap from public.jemaat
    where user_id = p.id
    order by created_at nulls last
    limit 1
  ) j on true
  where p.organization_id = public.current_org_id()
  order by p.full_name
$$;

grant execute on function public.get_profiles_with_jemaat() to authenticated;

-- 9. Unique constraints become per organization ------------------------------
-- e.g. UNIQUE (name) on cashflow_categories would stop a second organization
-- from creating its own "Persembahan" category. Each such constraint is
-- recreated as UNIQUE (organization_id, ...). A constraint that a foreign key
-- points at is left alone and reported, since changing it would break the key.
do $$
declare
  c record;
  cols text;
begin
  for c in
    select con.oid, con.conname, con.conrelid, con.conrelid::regclass as tbl, con.conkey
    from pg_constraint con
    join pg_namespace n on n.oid = con.connamespace
    where n.nspname = 'public'
      and con.contype = 'u'
      and con.conrelid <> 'public.organizations'::regclass
      and exists (
        select 1 from pg_attribute a
        where a.attrelid = con.conrelid and a.attname = 'organization_id'
          and not (a.attnum = any (con.conkey))
      )
  loop
    if exists (
      select 1 from pg_constraint fk
      where fk.contype = 'f' and fk.confrelid = c.conrelid and fk.confkey = c.conkey
    ) then
      raise notice 'left % on % global: a foreign key references it', c.conname, c.tbl;
      continue;
    end if;

    select string_agg(quote_ident(a.attname), ', ' order by k.ord) into cols
    from unnest(c.conkey) with ordinality as k(attnum, ord)
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum;

    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
    execute format('alter table %s add constraint %I unique (organization_id, %s)',
                   c.tbl, c.conname, cols);
    raise notice 'scoped % on % to organization', c.conname, c.tbl;
  end loop;
end $$;

commit;

-- 10. Check: unique indexes still global ------------------------------------
-- Unique indexes created with CREATE UNIQUE INDEX (not constraints) are not
-- changed above. Anything listed here on a data table probably needs
-- organization_id added by hand. Read-only; an empty result is the goal.
select i.indrelid::regclass as table_name, ic.relname as index_name,
       pg_get_indexdef(i.indexrelid) as definition
from pg_index i
join pg_class ic on ic.oid = i.indexrelid
join pg_namespace n on n.oid = ic.relnamespace
where n.nspname = 'public'
  and i.indisunique
  and not i.indisprimary
  and i.indrelid <> 'public.organizations'::regclass
  and exists (
    select 1 from pg_attribute a
    where a.attrelid = i.indrelid and a.attname = 'organization_id'
      and not (a.attnum = any (i.indkey::int2[]))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Adding another organization later
--
--   1. insert into public.organizations (name, slug)
--      values ('IFGF Jakarta', 'ifgf-jakarta');
--
--   2. Create its first admin in Supabase → Authentication → Add user, then:
--      update public.profiles
--      set organization_id = (select id from public.organizations where slug = 'ifgf-jakarta'),
--          role = 'admin'
--      where email = 'admin@example.com';
--
--   That admin can then create the rest of their users from the Users page;
--   new users are put into the admin's organization automatically.
-- ─────────────────────────────────────────────────────────────────────────────
