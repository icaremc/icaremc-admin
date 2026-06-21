-- Child growth timeline (0–18 years): growth, vaccines, milestones, red flags, nutrition, visits.
-- Mirrors pregnancy_weeks + pregnancy_week_translations for the mobile child health module.

create table if not exists public.child_growth_periods (
  id uuid primary key default gen_random_uuid(),
  age_months integer not null,
  age_label text not null,
  age_group text not null default 'infant',
  image_note text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint child_growth_periods_age_months_key unique (age_months),
  constraint child_growth_periods_age_months_check
    check (age_months >= 0 and age_months <= 216),
  constraint child_growth_periods_age_group_check
    check (age_group in ('newborn', 'infant', 'toddler', 'child', 'adolescent'))
);

create index if not exists child_growth_periods_sort_idx
  on public.child_growth_periods (age_months, is_published);

drop trigger if exists child_growth_periods_updated_at on public.child_growth_periods;
create trigger child_growth_periods_updated_at
  before update on public.child_growth_periods
  for each row execute function public.set_updated_at();

alter table public.child_growth_periods enable row level security;

drop policy if exists "child_growth_periods_read_published" on public.child_growth_periods;
create policy "child_growth_periods_read_published" on public.child_growth_periods
  for select using (auth.role() = 'authenticated' and is_published = true);

create table if not exists public.child_growth_period_translations (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.child_growth_periods (id) on delete cascade,
  language_code text not null,
  title text not null,
  subtitle text,
  growth jsonb not null default '{}'::jsonb,
  vaccines jsonb not null default '[]'::jsonb,
  milestones jsonb not null default '[]'::jsonb,
  red_flags jsonb not null default '[]'::jsonb,
  nutrition jsonb not null default '[]'::jsonb,
  visit_reminders jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint child_growth_period_translations_language_check
    check (language_code in ('en', 'am', 'om')),
  constraint child_growth_period_translations_period_lang_key
    unique (period_id, language_code)
);

create index if not exists child_growth_period_translations_period_idx
  on public.child_growth_period_translations (period_id, language_code);

drop trigger if exists child_growth_period_translations_updated_at
  on public.child_growth_period_translations;
create trigger child_growth_period_translations_updated_at
  before update on public.child_growth_period_translations
  for each row execute function public.set_updated_at();

alter table public.child_growth_period_translations enable row level security;

drop policy if exists "child_growth_period_translations_read" on public.child_growth_period_translations;
create policy "child_growth_period_translations_read" on public.child_growth_period_translations
  for select using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.child_growth_periods p
      where p.id = period_id and p.is_published = true
    )
  );
