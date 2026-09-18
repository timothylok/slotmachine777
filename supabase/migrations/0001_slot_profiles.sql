-- Slot machine player state: one row per authenticated user.
--
-- Deliberately namespaced as `slot_profiles` rather than `profiles`, and with
-- no trigger on auth.users, so this migration is safe to run on a Supabase
-- project that already hosts other applications. The client upserts the row on
-- first save, which makes a sign-up trigger unnecessary.

create table if not exists public.slot_profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  credits      numeric(12, 2) not null default 1000 check (credits >= 0),
  best_win     numeric(12, 2) not null default 0 check (best_win >= 0),
  spins        integer        not null default 0 check (spins >= 0),
  updated_at   timestamptz    not null default now()
);

alter table public.slot_profiles enable row level security;

-- A player can only ever see and change their own row.
drop policy if exists "slot players read own row" on public.slot_profiles;
create policy "slot players read own row"
  on public.slot_profiles for select
  using (auth.uid() = id);

drop policy if exists "slot players insert own row" on public.slot_profiles;
create policy "slot players insert own row"
  on public.slot_profiles for insert
  with check (auth.uid() = id);

drop policy if exists "slot players update own row" on public.slot_profiles;
create policy "slot players update own row"
  on public.slot_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
