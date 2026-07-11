-- Portal admin read access for per-child growth measurements and vaccine records.

drop policy if exists "child_growth_measurements_admin_select"
  on public.child_growth_measurements;
create policy "child_growth_measurements_admin_select"
  on public.child_growth_measurements
  for select using (public.is_portal_admin());

drop policy if exists "child_vaccine_records_admin_select"
  on public.child_vaccine_records;
create policy "child_vaccine_records_admin_select"
  on public.child_vaccine_records
  for select using (public.is_portal_admin());

notify pgrst, 'reload schema';
