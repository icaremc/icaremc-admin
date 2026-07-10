-- Fix portal admin access to children (admin_users, not profiles.is_admin).

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

drop policy if exists "children_admin_select" on public.children;
create policy "children_admin_select" on public.children
  for select using (public.is_portal_admin());

drop policy if exists "children_admin_update" on public.children;
create policy "children_admin_update" on public.children
  for update using (public.is_portal_admin())
  with check (public.is_portal_admin());

drop policy if exists "profiles_portal_admin_select" on public.profiles;
create policy "profiles_portal_admin_select" on public.profiles
  for select using (public.is_portal_admin());

drop policy if exists "pregnancies_portal_admin_select" on public.pregnancies;
create policy "pregnancies_portal_admin_select" on public.pregnancies
  for select using (public.is_portal_admin());

notify pgrst, 'reload schema';
