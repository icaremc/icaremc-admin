-- Assign day numbers (1–7) to daily tips within each pregnancy week.
-- Safe to re-run: only updates rows missing translations.en.day_number.
--
-- Run after daily_tip_week_migration.sql

-- Backfill known seed UUIDs (week 1 = days 1–7, week 2 = day 1)
update public.content_translations
set
  translations = jsonb_set(
    translations,
    '{en,day_number}',
    to_jsonb(day_map.day_number),
    true
  ),
  version = version + 1,
  updated_at = now()
from (
  values
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'::text, 1),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 2),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 3),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 4),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 5),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 6),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a07', 7),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a08', 1),
    ('01', 1),
    ('02', 2),
    ('03', 3),
    ('04', 4),
    ('05', 5),
    ('06', 6),
    ('07', 7),
    ('08', 1)
) as day_map (entity_id, day_number)
where namespace = 'daily_tip'
  and content_translations.entity_id = day_map.entity_id
  and not (translations -> 'en' ? 'day_number');

-- Fallback: cycle day_number 1–7 for any remaining tips in creation order per week
with numbered as (
  select
    id,
    row_number() over (
      partition by (translations -> 'en' ->> 'week_number')::int
      order by created_at
    ) as rn
  from public.content_translations
  where namespace = 'daily_tip'
    and not (translations -> 'en' ? 'day_number')
)
update public.content_translations ct
set
  translations = jsonb_set(
    ct.translations,
    '{en,day_number}',
    to_jsonb(((numbered.rn - 1) % 7) + 1),
    true
  ),
  version = ct.version + 1,
  updated_at = now()
from numbered
where ct.id = numbered.id;

-- Update helper: fetch tip for a specific week + day
create or replace function public.get_daily_tip_for_week_day(
  p_week int,
  p_day int,
  p_locale text default 'en'
)
returns jsonb
language sql
stable
as $$
  select
    coalesce(translations -> p_locale, translations -> 'en')
    || jsonb_build_object('entity_id', entity_id)
  from public.content_translations
  where namespace = 'daily_tip'
    and is_published = true
    and (translations -> 'en' ->> 'week_number')::int = p_week
    and (translations -> 'en' ->> 'day_number')::int = p_day
  order by created_at
  limit 1;
$$;

comment on function public.get_daily_tip_for_week_day(int, int, text) is
  'Returns the localized daily tip for a pregnancy week and day (1–7).';

notify pgrst, 'reload schema';
