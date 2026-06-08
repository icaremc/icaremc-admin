-- ICARE-MC — Admin portal RLS policies
-- Run after schema.sql and content_translations.sql
--
-- Grants admins full read access to user data and write access to content_translations.
-- Mark a user as admin:
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'your-admin@email.com');

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
  )
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

-- Content translations (admins see unpublished + can write)
drop policy if exists "content_translations_admin_all" on public.content_translations;
create policy "content_translations_admin_all" on public.content_translations
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Profiles
drop policy if exists "profiles_admin_select" on public.profiles;
create policy "profiles_admin_select" on public.profiles
  for select using (public.is_admin());

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin());

-- Pregnancy profiles
drop policy if exists "pregnancy_admin_select" on public.pregnancy_profiles;
create policy "pregnancy_admin_select" on public.pregnancy_profiles
  for select using (public.is_admin());

-- Daily health logs
drop policy if exists "health_logs_admin_select" on public.daily_health_logs;
create policy "health_logs_admin_select" on public.daily_health_logs
  for select using (public.is_admin());

-- Child profiles
drop policy if exists "child_admin_select" on public.child_profiles;
create policy "child_admin_select" on public.child_profiles
  for select using (public.is_admin());

-- Milestone checks
drop policy if exists "milestones_admin_select" on public.milestone_checks;
create policy "milestones_admin_select" on public.milestone_checks
  for select using (public.is_admin());

-- Appointments
drop policy if exists "appointments_admin_select" on public.appointments;
create policy "appointments_admin_select" on public.appointments
  for select using (public.is_admin());
