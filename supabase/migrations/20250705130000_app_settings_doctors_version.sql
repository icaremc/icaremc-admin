-- Doctors app version policy (force update when min_version increases).
insert into public.app_settings (id, data)
values (
  'app_version_doctors',
  jsonb_build_object(
    'min_version', '1.0.0',
    'force_update', false,
    'message_en', 'A new version of iCare Doctors is available with important updates. Please update to continue.'
  )
)
on conflict (id) do nothing;

drop policy if exists "app_settings_app_version_doctors_read_public" on public.app_settings;
create policy "app_settings_app_version_doctors_read_public" on public.app_settings
  for select
  using (id = 'app_version_doctors');
