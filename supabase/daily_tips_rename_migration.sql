-- Rename pregnancy_tips → daily_tips (if pregnancy_tips_migration.sql was already applied)
-- Safe to re-run: skips when pregnancy_tips does not exist.

drop function if exists public.get_daily_tip_for_week_day(int, int, text);
drop function if exists public.get_daily_tips_for_week(int, text);
drop function if exists public.pregnancy_tip_payload(public.pregnancy_tips, text);

do $$
begin
  if to_regclass('public.pregnancy_tips') is null then
    return;
  end if;

  alter table public.pregnancy_tip_translations
    rename to daily_tip_translations;

  alter table public.pregnancy_tips
    rename to daily_tips;

  alter index if exists pregnancy_tips_week_day_uidx rename to daily_tips_week_day_uidx;
  alter index if exists pregnancy_tips_week_number_idx rename to daily_tips_week_number_idx;
  alter index if exists pregnancy_tips_active_idx rename to daily_tips_active_idx;

  -- Keep tip_id column; ensure single FK for PostgREST embed
  alter table public.daily_tip_translations
    drop constraint if exists daily_tip_translations_daily_tip_id_fkey;

  alter table public.daily_tip_translations
    drop constraint if exists pregnancy_tip_translations_tip_id_fkey;

  alter table public.daily_tip_translations
    add constraint pregnancy_tip_translations_tip_id_fkey
    foreign key (tip_id) references public.daily_tips (id) on delete cascade;
end $$;

-- Recreate RPCs against renamed tables
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

-- Policies
drop policy if exists "pregnancy_tips_select_active" on public.daily_tips;
drop policy if exists "pregnancy_tips_admin_all" on public.daily_tips;
drop policy if exists "pregnancy_tip_translations_select_active" on public.daily_tip_translations;
drop policy if exists "pregnancy_tip_translations_admin_all" on public.daily_tip_translations;

drop policy if exists "daily_tips_select_active" on public.daily_tips;
create policy "daily_tips_select_active" on public.daily_tips
  for select using (is_active = true);

drop policy if exists "daily_tip_translations_select_active" on public.daily_tip_translations;
create policy "daily_tip_translations_select_active" on public.daily_tip_translations
  for select using (
    exists (
      select 1 from public.daily_tips dt
      where dt.id = tip_id and dt.is_active = true
    )
  );

drop policy if exists "daily_tips_admin_all" on public.daily_tips;
create policy "daily_tips_admin_all" on public.daily_tips
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "daily_tip_translations_admin_all" on public.daily_tip_translations;
create policy "daily_tip_translations_admin_all" on public.daily_tip_translations
  for all using (public.is_admin()) with check (public.is_admin());

notify pgrst, 'reload schema';
