-- Extended child birth record fields (mobile + admin).
-- Run after children_schema.sql.

alter table public.children
  add column if not exists gestational_age_weeks numeric(4, 1),
  add column if not exists gestational_age_days integer,
  add column if not exists birth_hospital text,
  add column if not exists blood_group text,
  add column if not exists woreda text;

alter table public.children
  drop constraint if exists children_gestational_age_days_check;

alter table public.children
  add constraint children_gestational_age_days_check
  check (
    gestational_age_days is null
    or (gestational_age_days >= 0 and gestational_age_days <= 6)
  );

alter table public.children
  drop constraint if exists children_blood_group_check;

alter table public.children
  add constraint children_blood_group_check
  check (
    blood_group is null
    or blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
  );

drop policy if exists "children_admin_select" on public.children;
create policy "children_admin_select" on public.children
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "children_admin_update" on public.children;
create policy "children_admin_update" on public.children
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

notify pgrst, 'reload schema';
