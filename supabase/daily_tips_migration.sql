-- ICARE-MC — Normalize daily tips into daily_tips + daily_tip_translations
-- Run in Supabase Dashboard → SQL Editor
--
-- Prerequisites:
--   schema.sql, content_translations.sql, admin_policies.sql
--   daily_tip_uuid_migration.sql, daily_tip_week_migration.sql, daily_tip_day_migration.sql
--   (so legacy daily_tip rows have week_number + day_number in translations.en)
--
-- If you already ran pregnancy_tips_migration.sql, run daily_tips_rename_migration.sql instead.
--
-- Safe to re-run: uses IF NOT EXISTS and ON CONFLICT for idempotent inserts.

-- =============================================================================
-- PART 1 — Tables
-- =============================================================================

create table if not exists public.daily_tips (
  id uuid primary key default gen_random_uuid(),
  week_number integer not null,
  category varchar(50),
  day_number integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_tips_week_range check (week_number between 1 and 42),
  constraint daily_tips_day_range check (day_number is null or day_number between 1 and 7)
);

comment on table public.daily_tips is
  'Daily pregnancy health tips keyed by week and optional day-in-week (1–7).';

comment on column public.daily_tips.category is
  'Optional grouping: nutrition, exercise, warning, emotional, etc.';

comment on column public.daily_tips.day_number is
  'Day within the pregnancy week (1–7). One tip per week+day when set.';

create unique index if not exists daily_tips_week_day_uidx
  on public.daily_tips (week_number, day_number)
  where day_number is not null;

create index if not exists daily_tips_week_number_idx
  on public.daily_tips (week_number);

create index if not exists daily_tips_active_idx
  on public.daily_tips (week_number, day_number)
  where is_active = true;

create table if not exists public.daily_tip_translations (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null,
  language_code varchar(10) not null,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tip_id, language_code),
  constraint daily_tip_translations_language_check
    check (language_code in ('en', 'am', 'om', 'ti')),
  constraint pregnancy_tip_translations_tip_id_fkey
    foreign key (tip_id) references public.daily_tips (id) on delete cascade
);

create index if not exists pregnancy_tip_translations_tip_id_idx
  on public.daily_tip_translations (tip_id);

-- =============================================================================
-- PART 2 — updated_at triggers
-- =============================================================================

drop trigger if exists daily_tips_updated_at on public.daily_tips;
create trigger daily_tips_updated_at
  before update on public.daily_tips
  for each row execute function public.set_updated_at();

drop trigger if exists daily_tip_translations_updated_at on public.daily_tip_translations;
create trigger daily_tip_translations_updated_at
  before update on public.daily_tip_translations
  for each row execute function public.set_updated_at();

-- =============================================================================
-- PART 3 — Migrate data from content_translations (namespace = daily_tip)
-- =============================================================================

insert into public.daily_tips (id, week_number, category, day_number, is_active, created_at)
select
  case
    when ct.entity_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ct.entity_id::uuid
    else ct.id
  end as id,
  coalesce(
    nullif(trim(ct.translations -> 'en' ->> 'week_number'), '')::integer,
    1
  ) as week_number,
  nullif(trim(ct.translations -> 'en' ->> 'category'), '') as category,
  nullif(trim(ct.translations -> 'en' ->> 'day_number'), '')::integer as day_number,
  ct.is_published as is_active,
  ct.created_at
from public.content_translations ct
where ct.namespace = 'daily_tip'
on conflict (id) do update
set
  week_number = excluded.week_number,
  category = excluded.category,
  day_number = excluded.day_number,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.daily_tip_translations (tip_id, language_code, title, content)
select
  dt.id as tip_id,
  locale.key as language_code,
  coalesce(
    nullif(trim(locale.value ->> 'title'), ''),
    case
      when coalesce(nullif(trim(locale.value ->> 'content'), ''), nullif(trim(locale.value ->> 'text'), '')) is not null
        then left(
          coalesce(nullif(trim(locale.value ->> 'content'), ''), nullif(trim(locale.value ->> 'text'), '')),
          80
        )
      else 'Daily tip'
    end
  ) as title,
  coalesce(
    nullif(trim(locale.value ->> 'content'), ''),
    nullif(trim(locale.value ->> 'text'), ''),
    ''
  ) as content
from public.content_translations ct
join public.daily_tips dt
  on dt.id = case
    when ct.entity_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ct.entity_id::uuid
    else ct.id
  end
cross join lateral jsonb_each(ct.translations) as locale(key, value)
where ct.namespace = 'daily_tip'
  and locale.key in ('en', 'am', 'om', 'ti')
  and jsonb_typeof(locale.value) = 'object'
  and coalesce(
    nullif(trim(locale.value ->> 'content'), ''),
    nullif(trim(locale.value ->> 'text'), '')
  ) is not null
on conflict (tip_id, language_code) do update
set
  title = excluded.title,
  content = excluded.content,
  updated_at = now();

-- =============================================================================
-- PART 4 — Row Level Security
-- =============================================================================

alter table public.daily_tips enable row level security;
alter table public.daily_tip_translations enable row level security;

drop policy if exists "daily_tips_select_active" on public.daily_tips;
create policy "daily_tips_select_active" on public.daily_tips
  for select using (is_active = true);

drop policy if exists "daily_tip_translations_select_active" on public.daily_tip_translations;
create policy "daily_tip_translations_select_active" on public.daily_tip_translations
  for select using (
    exists (
      select 1
      from public.daily_tips dt
      where dt.id = tip_id
        and dt.is_active = true
    )
  );

drop policy if exists "daily_tips_admin_all" on public.daily_tips;
create policy "daily_tips_admin_all" on public.daily_tips
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "daily_tip_translations_admin_all" on public.daily_tip_translations;
create policy "daily_tip_translations_admin_all" on public.daily_tip_translations
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- PART 5 — App helper RPCs (replace content_translations-based versions)
-- =============================================================================

create or replace function public.daily_tip_payload(
  p_tip public.daily_tips,
  p_locale text default 'en'
)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', p_tip.id,
    'entity_id', p_tip.id::text,
    'week_number', p_tip.week_number,
    'day_number', p_tip.day_number,
    'category', p_tip.category,
    'title', coalesce(tr.title, en.title, 'Daily tip'),
    'content', coalesce(tr.content, en.content, ''),
    'text', coalesce(tr.content, en.content, '')
  )
  from public.daily_tip_translations en
  left join public.daily_tip_translations tr
    on tr.tip_id = p_tip.id
   and tr.language_code = p_locale
  where en.tip_id = p_tip.id
    and en.language_code = 'en'
  limit 1;
$$;

create or replace function public.get_daily_tip_for_week_day(
  p_week int,
  p_day int,
  p_locale text default 'en'
)
returns jsonb
language sql
stable
as $$
  select public.daily_tip_payload(dt, p_locale)
  from public.daily_tips dt
  where dt.is_active = true
    and dt.week_number = p_week
    and dt.day_number = p_day
  order by dt.created_at
  limit 1;
$$;

comment on function public.get_daily_tip_for_week_day(int, int, text) is
  'Returns the localized daily tip for a pregnancy week and day (1–7).';

create or replace function public.get_daily_tips_for_week(
  p_week int,
  p_locale text default 'en'
)
returns setof jsonb
language sql
stable
as $$
  select public.daily_tip_payload(dt, p_locale)
  from public.daily_tips dt
  where dt.is_active = true
    and dt.week_number = p_week
  order by dt.day_number nulls last, dt.created_at;
$$;

comment on function public.get_daily_tips_for_week(int, text) is
  'Returns localized daily tip payloads for a pregnancy week pool.';

-- Optional: remove migrated legacy rows once all clients read daily_tips directly.
-- delete from public.content_translations where namespace = 'daily_tip';

notify pgrst, 'reload schema';
