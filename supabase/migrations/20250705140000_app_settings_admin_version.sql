-- Admin panel version policy (force refresh when min_version increases).
insert into public.app_settings (id, data)
values (
  'app_version_admin',
  jsonb_build_object(
    'min_version', '0.1.0',
    'force_update', false,
    'message_en', 'A new version of the ICare admin panel is available. Refresh the page or redeploy to continue with the latest features.'
  )
)
on conflict (id) do nothing;

drop policy if exists "app_settings_app_version_admin_read_public" on public.app_settings;
create policy "app_settings_app_version_admin_read_public" on public.app_settings
  for select
  using (id = 'app_version_admin');
