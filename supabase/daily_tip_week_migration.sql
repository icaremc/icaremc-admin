-- Assign pregnancy week numbers to daily tips (week-based tip pools).
-- Safe to re-run: only updates rows missing translations.en.week_number.
--
-- Run in Supabase Dashboard → SQL Editor after content_translations exists.
-- Recommended order: daily_tip_uuid_migration.sql → this file.

-- Backfill known seed UUIDs (2 tips per week for weeks 1–4)
update public.content_translations
set
  translations = jsonb_set(
    translations,
    '{en,week_number}',
    to_jsonb(week_map.week_number),
    true
  ),
  version = version + 1,
  updated_at = now()
from (
  values
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'::text, 1),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 1),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 1),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 1),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 1),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 1),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a07', 1),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a08', 2),
    ('01', 1),
    ('02', 1),
    ('03', 1),
    ('04', 1),
    ('05', 1),
    ('06', 1),
    ('07', 1),
    ('08', 2)
) as week_map (entity_id, week_number)
where namespace = 'daily_tip'
  and content_translations.entity_id = week_map.entity_id
  and not (translations -> 'en' ? 'week_number');

-- Fallback: assign any remaining tips without week_number to week 1
update public.content_translations
set
  translations = jsonb_set(
    translations,
    '{en,week_number}',
    '1'::jsonb,
    true
  ),
  version = version + 1,
  updated_at = now()
where namespace = 'daily_tip'
  and not (translations -> 'en' ? 'week_number');

-- Helper for the mobile app: fetch published tips for a pregnancy week
create or replace function public.get_daily_tips_for_week(
  p_week int,
  p_locale text default 'en'
)
returns setof jsonb
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
  order by created_at;
$$;

comment on function public.get_daily_tips_for_week(int, text) is
  'Returns localized daily tip payloads for a pregnancy week pool. App picks one tip per day from the result set.';

notify pgrst, 'reload schema';
