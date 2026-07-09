-- Baby follow-up visit templates + per-child instances (mirrors icare_mc migration).

create table if not exists public.child_followup_visit_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  sort_order integer not null default 0,
  label text not null,
  offset_days integer null,
  offset_months integer null,
  growth_period_id uuid null references public.child_growth_periods (id) on delete set null,
  modules jsonb not null default jsonb_build_object(
    'growth', true,
    'nutrition', true,
    'vaccines', true,
    'development', true,
    'counseling', true,
    'red_flags', true
  ),
  remind_days_before integer[] not null default array[7, 1, 0],
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint child_followup_visit_templates_code_key unique (code),
  constraint child_followup_visit_templates_offset_check check (
    (offset_days is not null and offset_months is null)
    or (offset_days is null and offset_months is not null)
  )
);

create index if not exists child_followup_visit_templates_sort_idx
  on public.child_followup_visit_templates (sort_order, is_published);

drop trigger if exists child_followup_visit_templates_updated_at
  on public.child_followup_visit_templates;
create trigger child_followup_visit_templates_updated_at
  before update on public.child_followup_visit_templates
  for each row execute function public.set_updated_at();

alter table public.child_followup_visit_templates enable row level security;

create or replace function public.is_portal_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.id = auth.uid()
      and au.is_active = true
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  );
$$;

revoke all on function public.is_portal_admin() from public;
grant execute on function public.is_portal_admin() to authenticated;

drop policy if exists "child_followup_templates_read_published"
  on public.child_followup_visit_templates;
create policy "child_followup_templates_read_published"
  on public.child_followup_visit_templates
  for select using (
    (auth.role() = 'authenticated' and is_published = true)
    or public.is_portal_admin()
  );

drop policy if exists "child_followup_templates_admin_insert"
  on public.child_followup_visit_templates;
create policy "child_followup_templates_admin_insert"
  on public.child_followup_visit_templates
  for insert to authenticated
  with check (public.is_portal_admin());

drop policy if exists "child_followup_templates_admin_update"
  on public.child_followup_visit_templates;
create policy "child_followup_templates_admin_update"
  on public.child_followup_visit_templates
  for update to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

drop policy if exists "child_followup_templates_admin_delete"
  on public.child_followup_visit_templates;
create policy "child_followup_templates_admin_delete"
  on public.child_followup_visit_templates
  for delete to authenticated
  using (public.is_portal_admin());

create table if not exists public.child_followup_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  child_local_id text not null,
  template_id uuid not null references public.child_followup_visit_templates (id) on delete restrict,
  due_date date not null,
  status text not null default 'scheduled',
  completed_at timestamptz null,
  checklist jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint child_followup_visits_user_child_template_key
    unique (user_id, child_local_id, template_id),
  constraint child_followup_visits_status_check check (
    status in ('scheduled', 'due', 'overdue', 'completed', 'skipped')
  )
);

create index if not exists child_followup_visits_user_child_due_idx
  on public.child_followup_visits (user_id, child_local_id, due_date);

drop trigger if exists child_followup_visits_updated_at on public.child_followup_visits;
create trigger child_followup_visits_updated_at
  before update on public.child_followup_visits
  for each row execute function public.set_updated_at();

alter table public.child_followup_visits enable row level security;

drop policy if exists "child_followup_visits_select_own" on public.child_followup_visits;
create policy "child_followup_visits_select_own"
  on public.child_followup_visits
  for select using (auth.uid() = user_id);

drop policy if exists "child_followup_visits_insert_own" on public.child_followup_visits;
create policy "child_followup_visits_insert_own"
  on public.child_followup_visits
  for insert with check (auth.uid() = user_id);

drop policy if exists "child_followup_visits_update_own" on public.child_followup_visits;
create policy "child_followup_visits_update_own"
  on public.child_followup_visits
  for update using (auth.uid() = user_id);

create or replace function public.compute_followup_due_date(
  p_birth_date date,
  p_offset_days integer,
  p_offset_months integer
) returns date
language sql
immutable
as $$
  select case
    when p_offset_months is not null
      then (p_birth_date + (p_offset_months || ' months')::interval)::date
    else p_birth_date + coalesce(p_offset_days, 0)
  end;
$$;

create or replace function public.generate_child_followup_visits(
  p_user_id uuid,
  p_child_local_id text,
  p_birth_date date
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_birth_date is null or p_child_local_id is null or p_user_id is null then
    return;
  end if;

  insert into public.child_followup_visits (
    user_id,
    child_local_id,
    template_id,
    due_date,
    status
  )
  select
    p_user_id,
    p_child_local_id,
    t.id,
    public.compute_followup_due_date(p_birth_date, t.offset_days, t.offset_months),
    'scheduled'
  from public.child_followup_visit_templates t
  where t.is_published = true
  on conflict (user_id, child_local_id, template_id) do update
    set
      due_date = excluded.due_date,
      updated_at = now()
    where child_followup_visits.status in ('scheduled', 'due', 'overdue');
end;
$$;

create or replace function public.trg_children_generate_followup_visits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_child_key text;
begin
  v_child_key := coalesce(new.local_id, new.id::text);
  if new.birth_date is not null then
    perform public.generate_child_followup_visits(
      new.user_id,
      v_child_key,
      new.birth_date
    );
  end if;
  return new;
end;
$$;

drop trigger if exists children_followup_visits_after_upsert on public.children;
create trigger children_followup_visits_after_upsert
  after insert or update of birth_date, local_id on public.children
  for each row execute function public.trg_children_generate_followup_visits();

insert into public.child_followup_visit_templates (
  code, sort_order, label, offset_days, offset_months, growth_period_id
)
select v.code, v.sort_order, v.label, v.offset_days, v.offset_months, p.id
from (
  values
    ('visit_birth', 10, 'Birth visit', 0::integer, null::integer, 0),
    ('visit_7d', 20, '7 days', 7, null, null),
    ('visit_6w', 30, '6 weeks', 42, null, 1),
    ('visit_10w', 40, '10 weeks', 70, null, null),
    ('visit_14w', 50, '14 weeks', 98, null, null),
    ('visit_6mo', 60, '6 months', null, 6, 6),
    ('visit_7mo', 70, '7 months', null, 7, null),
    ('visit_9mo', 80, '9 months', null, 9, 9),
    ('visit_12mo', 90, '12 months', null, 12, 12),
    ('visit_15mo', 100, '15 months', null, 15, 15),
    ('visit_18mo', 110, '18 months', null, 18, 18),
    ('visit_24mo', 120, '24 months', null, 24, 24),
    ('visit_3y', 130, '3 years', null, 36, 36),
    ('visit_4y', 140, '4 years', null, 48, 48),
    ('visit_5y', 150, '5 years', null, 60, 60),
    ('visit_6y', 160, '6 years', null, 72, 72),
    ('visit_7y', 170, '7 years', null, 84, 84),
    ('visit_8y', 180, '8 years', null, 96, 96)
) as v(code, sort_order, label, offset_days, offset_months, age_months)
left join public.child_growth_periods p
  on p.age_months = v.age_months
on conflict (code) do nothing;

do $$
declare
  r record;
begin
  for r in
    select
      c.user_id,
      coalesce(c.local_id, c.id::text) as child_key,
      c.birth_date
    from public.children c
    where c.birth_date is not null
  loop
    perform public.generate_child_followup_visits(
      r.user_id,
      r.child_key,
      r.birth_date
    );
  end loop;
end $$;
