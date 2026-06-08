-- Fix PostgREST relationship for daily_tips ↔ daily_tip_translations.
-- Run in Supabase SQL Editor when the app reports:
--   "Could not find a relationship between 'daily_tips' and 'daily_tip_translations'"
--
-- Your live schema uses tip_id + pregnancy_tip_translations_tip_id_fkey.
-- Safe to re-run.

drop table if exists public.daily_tip_translations_1 cascade;

-- Remove accidental daily_tip_id column if a partial migration added it
alter table public.daily_tip_translations
  drop constraint if exists daily_tip_translations_daily_tip_id_fkey;

alter table public.daily_tip_translations
  drop constraint if exists daily_tip_translations_tip_id_fkey;

alter table public.daily_tip_translations
  drop column if exists daily_tip_id;

-- Ensure single FK on tip_id (matches deployed schema)
alter table public.daily_tip_translations
  drop constraint if exists pregnancy_tip_translations_tip_id_fkey;

alter table public.daily_tip_translations
  add constraint pregnancy_tip_translations_tip_id_fkey
  foreign key (tip_id) references public.daily_tips (id) on delete cascade;

-- Drop orphaned pregnancy_* tables if daily_tips already exists
do $$
begin
  if to_regclass('public.daily_tips') is not null
     and to_regclass('public.pregnancy_tips') is not null then
    drop table if exists public.pregnancy_tip_translations cascade;
    drop table if exists public.pregnancy_tips cascade;
  end if;
end $$;

-- RPCs must reference tip_id (not daily_tip_id)
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

notify pgrst, 'reload schema';
