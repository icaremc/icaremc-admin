-- CMS write policies: require content_admin or super_admin (manage_content),
-- not merely any active portal admin (viewer/support).

create or replace function public.can_manage_cms_content()
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
      and au.admin_role in ('super_admin', 'content_admin')
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  );
$$;

revoke all on function public.can_manage_cms_content() from public;
grant execute on function public.can_manage_cms_content() to authenticated;

-- pregnancy_weeks
drop policy if exists "pregnancy_weeks_admin_insert" on public.pregnancy_weeks;
drop policy if exists "pregnancy_weeks_admin_update" on public.pregnancy_weeks;
drop policy if exists "pregnancy_weeks_admin_delete" on public.pregnancy_weeks;

create policy "pregnancy_weeks_admin_insert" on public.pregnancy_weeks
  for insert to authenticated
  with check (public.can_manage_cms_content());

create policy "pregnancy_weeks_admin_update" on public.pregnancy_weeks
  for update to authenticated
  using (public.can_manage_cms_content())
  with check (public.can_manage_cms_content());

create policy "pregnancy_weeks_admin_delete" on public.pregnancy_weeks
  for delete to authenticated
  using (public.can_manage_cms_content());

-- pregnancy_week_translations
drop policy if exists "pregnancy_week_translations_admin_insert" on public.pregnancy_week_translations;
drop policy if exists "pregnancy_week_translations_admin_update" on public.pregnancy_week_translations;
drop policy if exists "pregnancy_week_translations_admin_delete" on public.pregnancy_week_translations;

create policy "pregnancy_week_translations_admin_insert" on public.pregnancy_week_translations
  for insert to authenticated
  with check (public.can_manage_cms_content());

create policy "pregnancy_week_translations_admin_update" on public.pregnancy_week_translations
  for update to authenticated
  using (public.can_manage_cms_content())
  with check (public.can_manage_cms_content());

create policy "pregnancy_week_translations_admin_delete" on public.pregnancy_week_translations
  for delete to authenticated
  using (public.can_manage_cms_content());

-- child_growth_periods
drop policy if exists "child_growth_periods_admin_insert" on public.child_growth_periods;
drop policy if exists "child_growth_periods_admin_update" on public.child_growth_periods;
drop policy if exists "child_growth_periods_admin_delete" on public.child_growth_periods;

create policy "child_growth_periods_admin_insert" on public.child_growth_periods
  for insert to authenticated
  with check (public.can_manage_cms_content());

create policy "child_growth_periods_admin_update" on public.child_growth_periods
  for update to authenticated
  using (public.can_manage_cms_content())
  with check (public.can_manage_cms_content());

create policy "child_growth_periods_admin_delete" on public.child_growth_periods
  for delete to authenticated
  using (public.can_manage_cms_content());

-- child_growth_period_translations
drop policy if exists "child_growth_period_translations_admin_insert" on public.child_growth_period_translations;
drop policy if exists "child_growth_period_translations_admin_update" on public.child_growth_period_translations;
drop policy if exists "child_growth_period_translations_admin_delete" on public.child_growth_period_translations;

create policy "child_growth_period_translations_admin_insert" on public.child_growth_period_translations
  for insert to authenticated
  with check (public.can_manage_cms_content());

create policy "child_growth_period_translations_admin_update" on public.child_growth_period_translations
  for update to authenticated
  using (public.can_manage_cms_content())
  with check (public.can_manage_cms_content());

create policy "child_growth_period_translations_admin_delete" on public.child_growth_period_translations
  for delete to authenticated
  using (public.can_manage_cms_content());

-- child_followup_visit_templates
drop policy if exists "child_followup_visit_templates_admin_insert" on public.child_followup_visit_templates;
drop policy if exists "child_followup_visit_templates_admin_update" on public.child_followup_visit_templates;
drop policy if exists "child_followup_visit_templates_admin_delete" on public.child_followup_visit_templates;

create policy "child_followup_visit_templates_admin_insert" on public.child_followup_visit_templates
  for insert to authenticated
  with check (public.can_manage_cms_content());

create policy "child_followup_visit_templates_admin_update" on public.child_followup_visit_templates
  for update to authenticated
  using (public.can_manage_cms_content())
  with check (public.can_manage_cms_content());

create policy "child_followup_visit_templates_admin_delete" on public.child_followup_visit_templates
  for delete to authenticated
  using (public.can_manage_cms_content());

-- daily_tips (policy names may vary; recreate manage policies)
drop policy if exists "daily_tips_admin_insert" on public.daily_tips;
drop policy if exists "daily_tips_admin_update" on public.daily_tips;
drop policy if exists "daily_tips_admin_delete" on public.daily_tips;
drop policy if exists "pregnancy_tips_admin_insert" on public.daily_tips;
drop policy if exists "pregnancy_tips_admin_update" on public.daily_tips;
drop policy if exists "pregnancy_tips_admin_delete" on public.daily_tips;

create policy "daily_tips_admin_insert" on public.daily_tips
  for insert to authenticated
  with check (public.can_manage_cms_content());

create policy "daily_tips_admin_update" on public.daily_tips
  for update to authenticated
  using (public.can_manage_cms_content())
  with check (public.can_manage_cms_content());

create policy "daily_tips_admin_delete" on public.daily_tips
  for delete to authenticated
  using (public.can_manage_cms_content());

drop policy if exists "daily_tip_translations_admin_insert" on public.daily_tip_translations;
drop policy if exists "daily_tip_translations_admin_update" on public.daily_tip_translations;
drop policy if exists "daily_tip_translations_admin_delete" on public.daily_tip_translations;
drop policy if exists "pregnancy_tip_translations_admin_insert" on public.daily_tip_translations;
drop policy if exists "pregnancy_tip_translations_admin_update" on public.daily_tip_translations;
drop policy if exists "pregnancy_tip_translations_admin_delete" on public.daily_tip_translations;

create policy "daily_tip_translations_admin_insert" on public.daily_tip_translations
  for insert to authenticated
  with check (public.can_manage_cms_content());

create policy "daily_tip_translations_admin_update" on public.daily_tip_translations
  for update to authenticated
  using (public.can_manage_cms_content())
  with check (public.can_manage_cms_content());

create policy "daily_tip_translations_admin_delete" on public.daily_tip_translations
  for delete to authenticated
  using (public.can_manage_cms_content());

-- doctor_category_translations (specialty CMS)
drop policy if exists "doctor_category_translations_admin_insert" on public.doctor_category_translations;
drop policy if exists "doctor_category_translations_admin_update" on public.doctor_category_translations;
drop policy if exists "doctor_category_translations_admin_delete" on public.doctor_category_translations;

create policy "doctor_category_translations_admin_insert" on public.doctor_category_translations
  for insert to authenticated
  with check (public.can_manage_cms_content());

create policy "doctor_category_translations_admin_update" on public.doctor_category_translations
  for update to authenticated
  using (public.can_manage_cms_content())
  with check (public.can_manage_cms_content());

create policy "doctor_category_translations_admin_delete" on public.doctor_category_translations
  for delete to authenticated
  using (public.can_manage_cms_content());
