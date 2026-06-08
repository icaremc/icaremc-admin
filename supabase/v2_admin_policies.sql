-- ICARE-MC v2 — Admin RLS for normalized tables
-- Run after v2_uuid_normalized.sql and admin_policies.sql

-- Pregnancy weeks CMS
drop policy if exists "pregnancy_weeks_admin_all" on public.pregnancy_weeks;
create policy "pregnancy_weeks_admin_all" on public.pregnancy_weeks
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pregnancy_week_translations_admin_all" on public.pregnancy_week_translations;
create policy "pregnancy_week_translations_admin_all" on public.pregnancy_week_translations
  for all using (public.is_admin()) with check (public.is_admin());

-- Mothers + pregnancy logs (admin read)
drop policy if exists "mothers_admin_select" on public.mothers;
create policy "mothers_admin_select" on public.mothers
  for select using (public.is_admin());

drop policy if exists "pregnancy_logs_admin_select" on public.pregnancy_logs;
create policy "pregnancy_logs_admin_select" on public.pregnancy_logs
  for select using (public.is_admin());
