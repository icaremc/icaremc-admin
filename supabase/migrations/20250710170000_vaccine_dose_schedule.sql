-- Ethiopia-style EPI dose windows for due / overdue / catch-up logic in the app.
-- Mirrors bundled defaults in icare_mc VaccineScheduleService.

create table if not exists public.vaccine_dose_schedule (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  display_name text not null,
  dose_number integer not null default 1,
  series_code text not null default '',
  eligible_from_days integer not null,
  eligible_until_days integer null,
  preferred_visit_codes text[] not null default '{}',
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vaccine_dose_schedule_code_key unique (code)
);

create index if not exists vaccine_dose_schedule_published_sort_idx
  on public.vaccine_dose_schedule (is_published, sort_order, eligible_from_days);

drop trigger if exists vaccine_dose_schedule_updated_at on public.vaccine_dose_schedule;
create trigger vaccine_dose_schedule_updated_at
  before update on public.vaccine_dose_schedule
  for each row execute function public.set_updated_at();

alter table public.vaccine_dose_schedule enable row level security;

drop policy if exists "vaccine_dose_schedule_read_published"
  on public.vaccine_dose_schedule;
create policy "vaccine_dose_schedule_read_published"
  on public.vaccine_dose_schedule
  for select using (
    (auth.role() = 'authenticated' and is_published = true)
    or public.is_portal_admin()
  );

drop policy if exists "vaccine_dose_schedule_admin_insert"
  on public.vaccine_dose_schedule;
create policy "vaccine_dose_schedule_admin_insert"
  on public.vaccine_dose_schedule
  for insert to authenticated
  with check (public.is_portal_admin());

drop policy if exists "vaccine_dose_schedule_admin_update"
  on public.vaccine_dose_schedule;
create policy "vaccine_dose_schedule_admin_update"
  on public.vaccine_dose_schedule
  for update to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

drop policy if exists "vaccine_dose_schedule_admin_delete"
  on public.vaccine_dose_schedule;
create policy "vaccine_dose_schedule_admin_delete"
  on public.vaccine_dose_schedule
  for delete to authenticated
  using (public.is_portal_admin());

insert into public.vaccine_dose_schedule (
  code,
  display_name,
  dose_number,
  series_code,
  eligible_from_days,
  eligible_until_days,
  preferred_visit_codes,
  sort_order
)
values
  ('bcg', 'BCG', 1, 'bcg', 0, 14, array['visit_birth'], 10),
  ('opv_0', 'OPV 0', 1, 'opv', 0, 14, array['visit_birth'], 20),
  ('penta_1', 'Penta 1', 1, 'penta', 35, 49, array['visit_6w'], 30),
  ('opv_1', 'OPV 1', 1, 'opv', 35, 49, array['visit_6w'], 40),
  ('pcv_1', 'PCV 1', 1, 'pcv', 35, 49, array['visit_6w'], 50),
  ('rota_1', 'Rota 1', 1, 'rota', 35, 49, array['visit_6w'], 60),
  ('penta_2', 'Penta 2', 2, 'penta', 63, 84, array['visit_10w', 'visit_14w'], 70),
  ('opv_2', 'OPV 2', 2, 'opv', 63, 105, array['visit_10w', 'visit_14w'], 80),
  ('pcv_2', 'PCV 2', 2, 'pcv', 63, 84, array['visit_10w', 'visit_14w'], 90),
  ('rota_2', 'Rota 2', 2, 'rota', 63, 84, array['visit_10w', 'visit_14w'], 100),
  ('penta_3', 'Penta 3', 3, 'penta', 98, 120, array['visit_14w'], 110),
  ('opv_3', 'OPV 3', 3, 'opv', 98, 120, array['visit_14w'], 120),
  ('pcv_3', 'PCV 3', 3, 'pcv', 98, 120, array['visit_14w'], 130),
  ('ipv_1', 'IPV', 1, 'ipv', 98, 120, array['visit_14w'], 140),
  ('measles_1', 'Measles 1', 1, 'measles', 270, 300, array['visit_9mo'], 150),
  ('measles_2', 'Measles 2', 2, 'measles', 450, 480, array['visit_15mo'], 160)
on conflict (code) do update
set
  display_name = excluded.display_name,
  dose_number = excluded.dose_number,
  series_code = excluded.series_code,
  eligible_from_days = excluded.eligible_from_days,
  eligible_until_days = excluded.eligible_until_days,
  preferred_visit_codes = excluded.preferred_visit_codes,
  sort_order = excluded.sort_order,
  is_published = true,
  updated_at = now();

notify pgrst, 'reload schema';
