-- Phase 3: follow-up reminder log + status refresh (mirrors icare_mc).

create table if not exists public.child_followup_reminder_log (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null
    references public.child_followup_visits (id) on delete cascade,
  user_id uuid not null
    references public.profiles (id) on delete cascade,
  remind_key text not null,
  due_date date not null,
  sent_at timestamptz not null default now(),
  constraint child_followup_reminder_log_visit_key unique (visit_id, remind_key)
);

create index if not exists child_followup_reminder_log_user_sent_idx
  on public.child_followup_reminder_log (user_id, sent_at desc);

alter table public.child_followup_reminder_log enable row level security;

drop policy if exists "child_followup_reminder_log_select_own"
  on public.child_followup_reminder_log;
create policy "child_followup_reminder_log_select_own"
  on public.child_followup_reminder_log
  for select using (auth.uid() = user_id);

create or replace function public.refresh_child_followup_visit_statuses(
  p_today date default (timezone('Africa/Addis_Ababa', now()))::date
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer := 0;
begin
  update public.child_followup_visits v
  set
    status = case
      when v.due_date < p_today then 'overdue'
      when v.due_date = p_today then 'due'
      else 'scheduled'
    end,
    updated_at = now()
  where v.status in ('scheduled', 'due', 'overdue')
    and v.status is distinct from case
      when v.due_date < p_today then 'overdue'
      when v.due_date = p_today then 'due'
      else 'scheduled'
    end;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;
