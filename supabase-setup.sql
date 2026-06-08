-- ============================================================
--  Closing Cabal Sales OS — Supabase setup
--  Paste this whole file into Supabase SQL Editor and run it.
-- ============================================================

-- 1) Key-value store: holds ALL app data (mirrors the prototype's storage).
create table if not exists public.kv (
  key text primary key,
  value jsonb,
  updated_at timestamptz default now()
);

-- 2) Approved members: filled by the Whop webhook. Controls who can sign up.
create table if not exists public.approved_members (
  email text primary key,
  whop_user_id text,
  active boolean default true,
  updated_at timestamptz default now()
);

-- 3) Gate sign-ups: block any account whose email isn't an active Whop member.
create or replace function public.enforce_whop_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.approved_members m
    where lower(m.email) = lower(new.email) and m.active = true
  ) then
    raise exception 'NO_ACTIVE_MEMBERSHIP';
  end if;
  return new;
end;
$$;

drop trigger if exists check_whop_approval on auth.users;
create trigger check_whop_approval
  before insert on auth.users
  for each row execute function public.enforce_whop_approval();

-- 4) Access policies. Data here is non-sensitive, so the app (anon key) may
--    read/write the kv store. The service_role key (webhook) bypasses RLS.
alter table public.kv enable row level security;
drop policy if exists "kv_all" on public.kv;
create policy "kv_all" on public.kv for all using (true) with check (true);

alter table public.approved_members enable row level security;
drop policy if exists "approved_read" on public.approved_members;
create policy "approved_read" on public.approved_members for select using (true);

-- ============================================================
--  TESTING TIP: to create a test account before any real Whop
--  purchase, manually approve your own email:
--    insert into public.approved_members (email, active)
--    values ('you@example.com', true);
-- ============================================================
