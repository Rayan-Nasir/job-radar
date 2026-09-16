-- Job Radar — Supabase schema. Run in the Supabase SQL Editor.
-- Stores each user's saved profile (and later, saved resumes). RLS keeps rows private per user.

create table if not exists public.profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "own profile read"  on public.profiles;
drop policy if exists "own profile write" on public.profiles;
drop policy if exists "own profile upd"   on public.profiles;

create policy "own profile read"  on public.profiles for select using (auth.uid() = user_id);
create policy "own profile write" on public.profiles for insert with check (auth.uid() = user_id);
create policy "own profile upd"   on public.profiles for update using (auth.uid() = user_id);

-- Optional: saved resumes (raw + tailored JSON), one row per version.
create table if not exists public.resumes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text,
  raw         text,
  tailored    jsonb,
  created_at  timestamptz not null default now()
);
alter table public.resumes enable row level security;
drop policy if exists "own resumes" on public.resumes;
create policy "own resumes" on public.resumes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
