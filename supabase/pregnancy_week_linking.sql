-- Link mother EDD / LNMP → gestational week → daily tips & pregnancy logs.
-- Safe to re-run.
--
-- Run after: v2_uuid_normalized.sql, daily_tip_day_migration.sql

-- ---------------------------------------------------------------------------
-- Gestational age helpers (shared by app, admin, and triggers)
-- ---------------------------------------------------------------------------

create or replace function public.gestational_days(
  p_pregnancy_start date,
  p_due_date date,
  p_reference date default (timezone('utc', now()))::date
)
returns integer
language sql
stable
as $$
  select case
    when p_pregnancy_start is not null then
      greatest(0, p_reference - p_pregnancy_start)
    when p_due_date is not null then
      greatest(0, (p_due_date - (40 * 7)) - p_reference) * -1
    else null
  end;
$$;

comment on function public.gestational_days(date, date, date) is
  'Completed gestational days from pregnancy_start_date (LNMP) or derived from due_date.';

create or replace function public.gestational_week(
  p_pregnancy_start date,
  p_due_date date,
  p_reference date default (timezone('utc', now()))::date
)
returns integer
language sql
stable
as $$
  select case
    when public.gestational_days(p_pregnancy_start, p_due_date, p_reference) is null then null
    else least(
      42,
      greatest(
        1,
        (public.gestational_days(p_pregnancy_start, p_due_date, p_reference) / 7) + 1
      )
    )
  end;
$$;

comment on function public.gestational_week(date, date, date) is
  'Current pregnancy week (1–42) from LNMP or EDD.';

create or replace function public.gestational_day_in_week(
  p_pregnancy_start date,
  p_due_date date,
  p_reference date default (timezone('utc', now()))::date
)
returns integer
language sql
stable
as $$
  select case
    when public.gestational_days(p_pregnancy_start, p_due_date, p_reference) is null then null
    else (public.gestational_days(p_pregnancy_start, p_due_date, p_reference) % 7) + 1
  end;
$$;

comment on function public.gestational_day_in_week(date, date, date) is
  'Day within the current pregnancy week (1–7).';

create or replace function public.pregnancy_week_id_for_number(p_week integer)
returns uuid
language sql
stable
as $$
  select id
  from public.pregnancy_weeks
  where week_number = p_week
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- RPC: full context for the signed-in mother (app home screen)
-- ---------------------------------------------------------------------------

create or replace function public.get_my_pregnancy_context(
  p_locale text default 'en',
  p_reference date default (timezone('utc', now()))::date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_mother public.mothers%rowtype;
  v_week integer;
  v_day integer;
  v_tip jsonb;
begin
  if auth.uid() is null then
    return null;
  end if;

  select * into v_mother
  from public.mothers
  where user_id = auth.uid();

  if not found then
    return null;
  end if;

  v_week := public.gestational_week(
    v_mother.pregnancy_start_date,
    v_mother.due_date,
    p_reference
  );
  v_day := public.gestational_day_in_week(
    v_mother.pregnancy_start_date,
    v_mother.due_date,
    p_reference
  );

  if v_week is not null and v_day is not null then
    v_tip := public.get_daily_tip_for_week_day(v_week, v_day, p_locale);
  end if;

  return jsonb_build_object(
    'mother_id', v_mother.id,
    'pregnancy_start_date', v_mother.pregnancy_start_date,
    'due_date', v_mother.due_date,
    'gestational_week', v_week,
    'day_in_week', v_day,
    'pregnancy_week_id', public.pregnancy_week_id_for_number(v_week),
    'daily_tip', v_tip
  );
end;
$$;

comment on function public.get_my_pregnancy_context(text, date) is
  'Returns mother dates, computed week/day, and today''s daily tip for the signed-in user.';

grant execute on function public.get_my_pregnancy_context(text, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Auto-link pregnancy_logs to pregnancy_weeks on insert/update
-- ---------------------------------------------------------------------------

create or replace function public.set_pregnancy_log_week()
returns trigger
language plpgsql
as $$
declare
  v_mother public.mothers%rowtype;
  v_week integer;
begin
  select * into v_mother
  from public.mothers
  where id = new.mother_id;

  if not found then
    return new;
  end if;

  v_week := public.gestational_week(
    v_mother.pregnancy_start_date,
    v_mother.due_date,
    new.log_date
  );

  if v_week is not null then
    new.pregnancy_week_id := public.pregnancy_week_id_for_number(v_week);
  end if;

  return new;
end;
$$;

drop trigger if exists pregnancy_logs_set_week on public.pregnancy_logs;
create trigger pregnancy_logs_set_week
  before insert or update of log_date, mother_id
  on public.pregnancy_logs
  for each row execute function public.set_pregnancy_log_week();

-- Backfill existing logs missing pregnancy_week_id
update public.pregnancy_logs pl
set pregnancy_week_id = public.pregnancy_week_id_for_number(
  public.gestational_week(
    m.pregnancy_start_date,
    m.due_date,
    pl.log_date
  )
)
from public.mothers m
where m.id = pl.mother_id
  and pl.pregnancy_week_id is null
  and public.gestational_week(m.pregnancy_start_date, m.due_date, pl.log_date) is not null;

notify pgrst, 'reload schema';
