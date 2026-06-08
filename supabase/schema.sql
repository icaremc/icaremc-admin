-- ICARE-MC Supabase schema
-- Run in Supabase Dashboard → SQL Editor → New query → Run

-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  account_type text default 'Mother',
  locale text default 'en' check (locale in ('en', 'am')),
  dark_mode boolean default false,
  notifications_enabled boolean default true,
  onboarding_complete boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Pregnancy profile (LNMP, EDD, conditions)
-- ---------------------------------------------------------------------------
create table if not exists public.pregnancy_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  lnmp_date date not null,
  edd_date date,
  is_first_pregnancy boolean not null default true,
  location text,
  hospital text,
  conditions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pregnancy_profiles_user_id_idx
  on public.pregnancy_profiles (user_id);

-- ---------------------------------------------------------------------------
-- Daily health log (symptoms + checklist per day)
-- ---------------------------------------------------------------------------
create table if not exists public.daily_health_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  log_date date not null default (timezone('utc', now()))::date,
  symptoms text[] not null default '{}',
  checklist jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create index if not exists daily_health_logs_user_date_idx
  on public.daily_health_logs (user_id, log_date desc);

-- ---------------------------------------------------------------------------
-- Child profile (baby growth & milestones)
-- ---------------------------------------------------------------------------
create table if not exists public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  birth_date date not null,
  sex text not null check (sex in ('male', 'female')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Developmental milestone checklist
-- ---------------------------------------------------------------------------
create table if not exists public.milestone_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_key text not null,
  checked_at timestamptz not null default now(),
  unique (user_id, item_key)
);

create index if not exists milestone_checks_user_id_idx
  on public.milestone_checks (user_id);

-- ---------------------------------------------------------------------------
-- Appointments (prenatal visits, ultrasound — optional module)
-- ---------------------------------------------------------------------------
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  appointment_type text,
  appointment_at timestamptz,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_user_id_idx
  on public.appointments (user_id, appointment_at);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists pregnancy_profiles_updated_at on public.pregnancy_profiles;
create trigger pregnancy_profiles_updated_at
  before update on public.pregnancy_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists daily_health_logs_updated_at on public.daily_health_logs;
create trigger daily_health_logs_updated_at
  before update on public.daily_health_logs
  for each row execute function public.set_updated_at();

drop trigger if exists child_profiles_updated_at on public.child_profiles;
create trigger child_profiles_updated_at
  before update on public.child_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists appointments_updated_at on public.appointments;
create trigger appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile row on sign-up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'account_type', 'Mother')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.pregnancy_profiles enable row level security;
alter table public.daily_health_logs enable row level security;
alter table public.child_profiles enable row level security;
alter table public.milestone_checks enable row level security;
alter table public.appointments enable row level security;

-- Profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Pregnancy profiles
drop policy if exists "pregnancy_select_own" on public.pregnancy_profiles;
create policy "pregnancy_select_own" on public.pregnancy_profiles
  for select using (auth.uid() = user_id);

drop policy if exists "pregnancy_insert_own" on public.pregnancy_profiles;
create policy "pregnancy_insert_own" on public.pregnancy_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "pregnancy_update_own" on public.pregnancy_profiles;
create policy "pregnancy_update_own" on public.pregnancy_profiles
  for update using (auth.uid() = user_id);

drop policy if exists "pregnancy_delete_own" on public.pregnancy_profiles;
create policy "pregnancy_delete_own" on public.pregnancy_profiles
  for delete using (auth.uid() = user_id);

-- Daily health logs
drop policy if exists "health_logs_select_own" on public.daily_health_logs;
create policy "health_logs_select_own" on public.daily_health_logs
  for select using (auth.uid() = user_id);

drop policy if exists "health_logs_insert_own" on public.daily_health_logs;
create policy "health_logs_insert_own" on public.daily_health_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "health_logs_update_own" on public.daily_health_logs;
create policy "health_logs_update_own" on public.daily_health_logs
  for update using (auth.uid() = user_id);

drop policy if exists "health_logs_delete_own" on public.daily_health_logs;
create policy "health_logs_delete_own" on public.daily_health_logs
  for delete using (auth.uid() = user_id);

-- Child profiles
drop policy if exists "child_select_own" on public.child_profiles;
create policy "child_select_own" on public.child_profiles
  for select using (auth.uid() = user_id);

drop policy if exists "child_insert_own" on public.child_profiles;
create policy "child_insert_own" on public.child_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "child_update_own" on public.child_profiles;
create policy "child_update_own" on public.child_profiles
  for update using (auth.uid() = user_id);

drop policy if exists "child_delete_own" on public.child_profiles;
create policy "child_delete_own" on public.child_profiles
  for delete using (auth.uid() = user_id);

-- Milestone checks
drop policy if exists "milestones_select_own" on public.milestone_checks;
create policy "milestones_select_own" on public.milestone_checks
  for select using (auth.uid() = user_id);

drop policy if exists "milestones_insert_own" on public.milestone_checks;
create policy "milestones_insert_own" on public.milestone_checks
  for insert with check (auth.uid() = user_id);

drop policy if exists "milestones_delete_own" on public.milestone_checks;
create policy "milestones_delete_own" on public.milestone_checks
  for delete using (auth.uid() = user_id);

-- Appointments
drop policy if exists "appointments_select_own" on public.appointments;
create policy "appointments_select_own" on public.appointments
  for select using (auth.uid() = user_id);

drop policy if exists "appointments_insert_own" on public.appointments;
create policy "appointments_insert_own" on public.appointments
  for insert with check (auth.uid() = user_id);

drop policy if exists "appointments_update_own" on public.appointments;
create policy "appointments_update_own" on public.appointments
  for update using (auth.uid() = user_id);

drop policy if exists "appointments_delete_own" on public.appointments;
create policy "appointments_delete_own" on public.appointments
  for delete using (auth.uid() = user_id);
