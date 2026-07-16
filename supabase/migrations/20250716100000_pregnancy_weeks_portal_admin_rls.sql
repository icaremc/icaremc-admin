-- Portal CMS: pregnancy weeks + translations (admin_users, not profiles.is_admin).

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

-- pregnancy_weeks
drop policy if exists "pregnancy_weeks_read_published" on public.pregnancy_weeks;
drop policy if exists "pregnancy_weeks_admin_select" on public.pregnancy_weeks;
drop policy if exists "pregnancy_weeks_admin_insert" on public.pregnancy_weeks;
drop policy if exists "pregnancy_weeks_admin_update" on public.pregnancy_weeks;
drop policy if exists "pregnancy_weeks_admin_delete" on public.pregnancy_weeks;

create policy "pregnancy_weeks_read_published" on public.pregnancy_weeks
  for select using (
    (auth.role() = 'authenticated' and is_published = true)
    or public.is_portal_admin()
  );

create policy "pregnancy_weeks_admin_insert" on public.pregnancy_weeks
  for insert to authenticated
  with check (public.is_portal_admin());

create policy "pregnancy_weeks_admin_update" on public.pregnancy_weeks
  for update to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

create policy "pregnancy_weeks_admin_delete" on public.pregnancy_weeks
  for delete to authenticated
  using (public.is_portal_admin());

-- pregnancy_week_translations
drop policy if exists "pregnancy_week_translations_read" on public.pregnancy_week_translations;
drop policy if exists "pregnancy_week_translations_admin_insert" on public.pregnancy_week_translations;
drop policy if exists "pregnancy_week_translations_admin_update" on public.pregnancy_week_translations;
drop policy if exists "pregnancy_week_translations_admin_delete" on public.pregnancy_week_translations;

create policy "pregnancy_week_translations_read" on public.pregnancy_week_translations
  for select using (
    (
      auth.role() = 'authenticated'
      and exists (
        select 1
        from public.pregnancy_weeks w
        where w.id = pregnancy_week_id
          and w.is_published = true
      )
    )
    or public.is_portal_admin()
  );

create policy "pregnancy_week_translations_admin_insert" on public.pregnancy_week_translations
  for insert to authenticated
  with check (public.is_portal_admin());

create policy "pregnancy_week_translations_admin_update" on public.pregnancy_week_translations
  for update to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

create policy "pregnancy_week_translations_admin_delete" on public.pregnancy_week_translations
  for delete to authenticated
  using (public.is_portal_admin());

-- child_growth_periods (same CMS path)
drop policy if exists "child_growth_periods_admin_insert" on public.child_growth_periods;
drop policy if exists "child_growth_periods_admin_update" on public.child_growth_periods;
drop policy if exists "child_growth_periods_admin_delete" on public.child_growth_periods;

drop policy if exists "child_growth_periods_read_published" on public.child_growth_periods;
create policy "child_growth_periods_read_published" on public.child_growth_periods
  for select using (
    (auth.role() = 'authenticated' and is_published = true)
    or public.is_portal_admin()
  );

create policy "child_growth_periods_admin_insert" on public.child_growth_periods
  for insert to authenticated
  with check (public.is_portal_admin());

create policy "child_growth_periods_admin_update" on public.child_growth_periods
  for update to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

create policy "child_growth_periods_admin_delete" on public.child_growth_periods
  for delete to authenticated
  using (public.is_portal_admin());

-- child_growth_period_translations
drop policy if exists "child_growth_period_translations_read" on public.child_growth_period_translations;
drop policy if exists "child_growth_period_translations_admin_insert" on public.child_growth_period_translations;
drop policy if exists "child_growth_period_translations_admin_update" on public.child_growth_period_translations;
drop policy if exists "child_growth_period_translations_admin_delete" on public.child_growth_period_translations;

create policy "child_growth_period_translations_read" on public.child_growth_period_translations
  for select using (
    (
      auth.role() = 'authenticated'
      and exists (
        select 1
        from public.child_growth_periods p
        where p.id = period_id
          and p.is_published = true
      )
    )
    or public.is_portal_admin()
  );

create policy "child_growth_period_translations_admin_insert" on public.child_growth_period_translations
  for insert to authenticated
  with check (public.is_portal_admin());

create policy "child_growth_period_translations_admin_update" on public.child_growth_period_translations
  for update to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

create policy "child_growth_period_translations_admin_delete" on public.child_growth_period_translations
  for delete to authenticated
  using (public.is_portal_admin());

-- pregnancy week hero images (storage)
drop policy if exists "pregnancy_weeks_storage_admin_insert" on storage.objects;
create policy "pregnancy_weeks_storage_admin_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'pregnancy-weeks'
    and public.is_portal_admin()
  );

drop policy if exists "pregnancy_weeks_storage_admin_update" on storage.objects;
create policy "pregnancy_weeks_storage_admin_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'pregnancy-weeks'
    and public.is_portal_admin()
  )
  with check (
    bucket_id = 'pregnancy-weeks'
    and public.is_portal_admin()
  );

drop policy if exists "pregnancy_weeks_storage_admin_delete" on storage.objects;
create policy "pregnancy_weeks_storage_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'pregnancy-weeks'
    and public.is_portal_admin()
  );

notify pgrst, 'reload schema';
