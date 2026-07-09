-- Fix follow-up template admin RLS (portal uses admin_users).

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
