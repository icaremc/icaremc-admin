-- ICARE-MC v2 — UUID-normalized schema
-- Run in Supabase Dashboard → SQL Editor
--
-- Prerequisites: schema.sql (creates profiles + set_updated_at)
-- Optional for data copy: content_translations.sql, existing user rows
--
-- Then run: v2_admin_policies.sql

-- =============================================================================
-- PART 0 — Reset v2 objects (safe re-run; legacy v1 tables are untouched)
-- =============================================================================

drop view if exists public.pregnancy_profiles_v2_compat;
drop table if exists public.pregnancy_logs cascade;
drop table if exists public.pregnancy_week_translations cascade;
drop table if exists public.mothers cascade;
drop table if exists public.pregnancy_weeks cascade;

-- =============================================================================
-- PART 1 — Create tables
-- =============================================================================

create extension if not exists "pgcrypto";

-- Required by updated_at triggers (from schema.sql)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.trimester_for_week(p_week integer)
returns integer
language sql
immutable
as $$
  select case
    when p_week <= 13 then 1
    when p_week <= 27 then 2
    else 3
  end;
$$;

create table public.pregnancy_weeks (
  id uuid primary key default gen_random_uuid(),
  week_number integer not null unique,
  trimester integer not null,
  image_note text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pregnancy_weeks_trimester_range check (trimester between 1 and 3),
  constraint pregnancy_weeks_trimester_match
    check (trimester = public.trimester_for_week(week_number))
);

create index if not exists pregnancy_weeks_week_number_idx
  on public.pregnancy_weeks (week_number);

create index if not exists pregnancy_weeks_published_idx
  on public.pregnancy_weeks (week_number)
  where is_published = true;

create table public.pregnancy_week_translations (
  id uuid primary key default gen_random_uuid(),
  pregnancy_week_id uuid not null references public.pregnancy_weeks (id) on delete cascade,
  language_code text not null check (language_code in ('en', 'am', 'om')),
  title text not null default '',
  subtitle text,
  baby_development text,
  mother_changes text,
  recommendations text,
  warning_signs text,
  sections jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pregnancy_week_id, language_code)
);

create index if not exists pregnancy_week_translations_week_id_idx
  on public.pregnancy_week_translations (pregnancy_week_id);

create table public.mothers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  due_date date,
  pregnancy_start_date date,
  is_first_pregnancy boolean not null default true,
  location text,
  hospital text,
  conditions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mothers_user_id_idx on public.mothers (user_id);

create table public.pregnancy_logs (
  id uuid primary key default gen_random_uuid(),
  mother_id uuid not null references public.mothers (id) on delete cascade,
  pregnancy_week_id uuid references public.pregnancy_weeks (id) on delete set null,
  log_date date not null default (timezone('utc', now()))::date,
  weight numeric,
  mood text,
  symptoms text[] not null default '{}',
  checklist jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mother_id, log_date)
);

create index if not exists pregnancy_logs_mother_date_idx
  on public.pregnancy_logs (mother_id, log_date desc);

create index if not exists pregnancy_logs_week_id_idx
  on public.pregnancy_logs (pregnancy_week_id);

drop trigger if exists pregnancy_weeks_updated_at on public.pregnancy_weeks;
create trigger pregnancy_weeks_updated_at
  before update on public.pregnancy_weeks
  for each row execute function public.set_updated_at();

drop trigger if exists pregnancy_week_translations_updated_at on public.pregnancy_week_translations;
create trigger pregnancy_week_translations_updated_at
  before update on public.pregnancy_week_translations
  for each row execute function public.set_updated_at();

drop trigger if exists mothers_updated_at on public.mothers;
create trigger mothers_updated_at
  before update on public.mothers
  for each row execute function public.set_updated_at();

drop trigger if exists pregnancy_logs_updated_at on public.pregnancy_logs;
create trigger pregnancy_logs_updated_at
  before update on public.pregnancy_logs
  for each row execute function public.set_updated_at();

alter table public.pregnancy_weeks enable row level security;
alter table public.pregnancy_week_translations enable row level security;
alter table public.mothers enable row level security;
alter table public.pregnancy_logs enable row level security;

drop policy if exists "pregnancy_weeks_select_published" on public.pregnancy_weeks;
create policy "pregnancy_weeks_select_published" on public.pregnancy_weeks
  for select using (is_published = true);

drop policy if exists "pregnancy_week_translations_select_published" on public.pregnancy_week_translations;
create policy "pregnancy_week_translations_select_published" on public.pregnancy_week_translations
  for select using (
    exists (
      select 1
      from public.pregnancy_weeks pw
      where pw.id = pregnancy_week_id
        and pw.is_published = true
    )
  );

drop policy if exists "mothers_select_own" on public.mothers;
create policy "mothers_select_own" on public.mothers
  for select using (auth.uid() = user_id);

drop policy if exists "mothers_insert_own" on public.mothers;
create policy "mothers_insert_own" on public.mothers
  for insert with check (auth.uid() = user_id);

drop policy if exists "mothers_update_own" on public.mothers;
create policy "mothers_update_own" on public.mothers
  for update using (auth.uid() = user_id);

drop policy if exists "mothers_delete_own" on public.mothers;
create policy "mothers_delete_own" on public.mothers
  for delete using (auth.uid() = user_id);

drop policy if exists "pregnancy_logs_select_own" on public.pregnancy_logs;
create policy "pregnancy_logs_select_own" on public.pregnancy_logs
  for select using (
    exists (
      select 1 from public.mothers m
      where m.id = mother_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "pregnancy_logs_insert_own" on public.pregnancy_logs;
create policy "pregnancy_logs_insert_own" on public.pregnancy_logs
  for insert with check (
    exists (
      select 1 from public.mothers m
      where m.id = mother_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "pregnancy_logs_update_own" on public.pregnancy_logs;
create policy "pregnancy_logs_update_own" on public.pregnancy_logs
  for update using (
    exists (
      select 1 from public.mothers m
      where m.id = mother_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "pregnancy_logs_delete_own" on public.pregnancy_logs;
create policy "pregnancy_logs_delete_own" on public.pregnancy_logs
  for delete using (
    exists (
      select 1 from public.mothers m
      where m.id = mother_id and m.user_id = auth.uid()
    )
  );

create or replace view public.pregnancy_profiles_v2_compat as
select
  id,
  user_id,
  pregnancy_start_date as lnmp_date,
  due_date as edd_date,
  is_first_pregnancy,
  location,
  hospital,
  conditions,
  created_at,
  updated_at
from public.mothers;

-- Refresh PostgREST schema cache so the API sees new tables immediately
notify pgrst, 'reload schema';

-- =============================================================================
-- PART 2 — Copy existing data (skips missing source tables)
-- =============================================================================

do $$
begin
  if to_regclass('public.pregnancy_profiles') is not null then
    insert into public.mothers (
      id, user_id, due_date, pregnancy_start_date, is_first_pregnancy,
      location, hospital, conditions, created_at, updated_at
    )
    select
      id, user_id, edd_date, lnmp_date, is_first_pregnancy,
      location, hospital, conditions, created_at, updated_at
    from public.pregnancy_profiles
    on conflict (user_id) do update
    set
      due_date = excluded.due_date,
      pregnancy_start_date = excluded.pregnancy_start_date,
      is_first_pregnancy = excluded.is_first_pregnancy,
      location = excluded.location,
      hospital = excluded.hospital,
      conditions = excluded.conditions,
      updated_at = now();
  end if;
end $$;

do $$
begin
  if to_regclass('public.daily_health_logs') is not null then
    insert into public.pregnancy_logs (
      id, mother_id, log_date, symptoms, checklist, notes, created_at, updated_at
    )
    select
      d.id, m.id, d.log_date, d.symptoms, d.checklist, null, d.created_at, d.updated_at
    from public.daily_health_logs d
    join public.mothers m on m.user_id = d.user_id
    on conflict (mother_id, log_date) do update
    set symptoms = excluded.symptoms, checklist = excluded.checklist, updated_at = now();
  end if;
end $$;

do $$
begin
  if to_regclass('public.content_translations') is not null then
    insert into public.pregnancy_weeks (week_number, trimester, image_note, is_published)
    select
      ct.entity_id::integer,
      public.trimester_for_week(ct.entity_id::integer),
      coalesce(
        ct.translations -> 'en' ->> 'image_note',
        ct.translations -> 'am' ->> 'image_note',
        ct.translations -> 'om' ->> 'image_note'
      ),
      ct.is_published
    from public.content_translations ct
    where ct.namespace = 'pregnancy_week'
      and ct.entity_id ~ '^[0-9]+$'
    on conflict (week_number) do update
    set
      trimester = excluded.trimester,
      image_note = excluded.image_note,
      is_published = excluded.is_published,
      updated_at = now();

    insert into public.pregnancy_week_translations (
      pregnancy_week_id, language_code, title, subtitle,
      baby_development, mother_changes, recommendations, warning_signs, sections
    )
    select
      pw.id,
      lang.code,
      coalesce(slice ->> 'title', 'Week ' || pw.week_number),
      slice ->> 'subtitle',
      slice ->> 'baby_development',
      slice ->> 'mother_changes',
      slice ->> 'recommendations',
      slice ->> 'warning_signs',
      coalesce(slice -> 'sections', '[]'::jsonb)
    from public.content_translations ct
    join public.pregnancy_weeks pw on pw.week_number = ct.entity_id::integer
    cross join lateral (values ('en'), ('am'), ('om')) as lang(code)
    cross join lateral (select ct.translations -> lang.code as slice) s
    where ct.namespace = 'pregnancy_week'
      and ct.entity_id ~ '^[0-9]+$'
      and slice is not null
      and slice <> 'null'::jsonb
    on conflict (pregnancy_week_id, language_code) do update
    set
      title = excluded.title,
      subtitle = excluded.subtitle,
      baby_development = excluded.baby_development,
      mother_changes = excluded.mother_changes,
      recommendations = excluded.recommendations,
      warning_signs = excluded.warning_signs,
      sections = excluded.sections,
      updated_at = now();
  end if;
end $$;

notify pgrst, 'reload schema';
