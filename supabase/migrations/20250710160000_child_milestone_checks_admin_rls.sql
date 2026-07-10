-- Portal admin read access for per-child learning path progress.

drop policy if exists "child_milestone_checks_admin_select"
  on public.child_milestone_checks;
create policy "child_milestone_checks_admin_select"
  on public.child_milestone_checks
  for select using (public.is_portal_admin());

notify pgrst, 'reload schema';
