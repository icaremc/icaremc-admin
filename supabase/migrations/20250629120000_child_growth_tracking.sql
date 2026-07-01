-- Child growth: numeric reference metrics (for auto-calc + chart) and per-child tracking.
-- Builds on 20250626120000_child_growth_timeline.sql.

-- 1) Numeric, locale-independent growth metrics on each age period.
--    Shape: { "boys": { "weight_kg": 5.6, "weight_min": 4.4, "weight_max": 7.0,
--                        "height_cm": 57, "height_min": 54, "height_max": 61,
--                        "hc_cm": 39.1, "hc_min": 36.9, "hc_max": 41.3 },
--             "girls": { ... } }
alter table public.child_growth_periods
  add column if not exists growth_metrics jsonb not null default '{}'::jsonb;

-- 2) Per-child measurements recorded over time (powers the child's growth chart).
create table if not exists public.child_growth_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  child_local_id text not null,
  measured_on date not null default current_date,
  age_months numeric(6, 2),
  weight_kg numeric(6, 3),
  height_cm numeric(6, 2),
  head_circumference_cm numeric(6, 2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists child_growth_measurements_user_child_idx
  on public.child_growth_measurements (user_id, child_local_id, measured_on);

drop trigger if exists child_growth_measurements_updated_at
  on public.child_growth_measurements;
create trigger child_growth_measurements_updated_at
  before update on public.child_growth_measurements
  for each row execute function public.set_updated_at();

alter table public.child_growth_measurements enable row level security;

drop policy if exists "child_growth_measurements_select_own"
  on public.child_growth_measurements;
create policy "child_growth_measurements_select_own"
  on public.child_growth_measurements
  for select using (auth.uid() = user_id);

drop policy if exists "child_growth_measurements_insert_own"
  on public.child_growth_measurements;
create policy "child_growth_measurements_insert_own"
  on public.child_growth_measurements
  for insert with check (auth.uid() = user_id);

drop policy if exists "child_growth_measurements_update_own"
  on public.child_growth_measurements;
create policy "child_growth_measurements_update_own"
  on public.child_growth_measurements
  for update using (auth.uid() = user_id);

drop policy if exists "child_growth_measurements_delete_own"
  on public.child_growth_measurements;
create policy "child_growth_measurements_delete_own"
  on public.child_growth_measurements
  for delete using (auth.uid() = user_id);

-- 3) Per-child developmental milestone checklist completion.
--    item_key matches the mobile app key format "<months>-<categoryIndex>-<itemIndex>".
create table if not exists public.child_milestone_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  child_local_id text not null,
  item_key text not null,
  created_at timestamptz not null default now(),
  constraint child_milestone_checks_unique
    unique (user_id, child_local_id, item_key)
);

create index if not exists child_milestone_checks_user_child_idx
  on public.child_milestone_checks (user_id, child_local_id);

alter table public.child_milestone_checks enable row level security;

drop policy if exists "child_milestone_checks_select_own"
  on public.child_milestone_checks;
create policy "child_milestone_checks_select_own"
  on public.child_milestone_checks
  for select using (auth.uid() = user_id);

drop policy if exists "child_milestone_checks_insert_own"
  on public.child_milestone_checks;
create policy "child_milestone_checks_insert_own"
  on public.child_milestone_checks
  for insert with check (auth.uid() = user_id);

drop policy if exists "child_milestone_checks_delete_own"
  on public.child_milestone_checks;
create policy "child_milestone_checks_delete_own"
  on public.child_milestone_checks
  for delete using (auth.uid() = user_id);

-- 4) Per-child vaccination records.
create table if not exists public.child_vaccine_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  child_local_id text not null,
  vaccine_key text not null,
  vaccine_name text not null,
  age_months integer,
  received boolean not null default false,
  date_received date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint child_vaccine_records_unique
    unique (user_id, child_local_id, vaccine_key)
);

create index if not exists child_vaccine_records_user_child_idx
  on public.child_vaccine_records (user_id, child_local_id);

drop trigger if exists child_vaccine_records_updated_at
  on public.child_vaccine_records;
create trigger child_vaccine_records_updated_at
  before update on public.child_vaccine_records
  for each row execute function public.set_updated_at();

alter table public.child_vaccine_records enable row level security;

drop policy if exists "child_vaccine_records_select_own"
  on public.child_vaccine_records;
create policy "child_vaccine_records_select_own"
  on public.child_vaccine_records
  for select using (auth.uid() = user_id);

drop policy if exists "child_vaccine_records_insert_own"
  on public.child_vaccine_records;
create policy "child_vaccine_records_insert_own"
  on public.child_vaccine_records
  for insert with check (auth.uid() = user_id);

drop policy if exists "child_vaccine_records_update_own"
  on public.child_vaccine_records;
create policy "child_vaccine_records_update_own"
  on public.child_vaccine_records
  for update using (auth.uid() = user_id);

drop policy if exists "child_vaccine_records_delete_own"
  on public.child_vaccine_records;
create policy "child_vaccine_records_delete_own"
  on public.child_vaccine_records
  for delete using (auth.uid() = user_id);

notify pgrst, 'reload schema';
