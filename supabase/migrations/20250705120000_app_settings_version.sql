-- Mobile app version policy (force update when min_version increases).

insert into public.app_settings (id, data)
values (
  'app_version',
  jsonb_build_object(
    'min_version', '1.0.0',
    'force_update', false,
    'message_en', 'A new version of iCare MC is available with important updates. Please update to continue.',
    'message_am', 'አዲስ የ iCare MC ስሪት ከአስፈላጊ ማሻሻያዎች ጋር ይገኛል። ለመቀጠል እባክዎ ያዘምኑ።',
    'message_om', 'Gosa haaraa iCare MC fooyya''iinsa barbaachisaa wajjin ni argama. Itti fufuuf haaromsi.'
  )
)
on conflict (id) do nothing;

drop policy if exists "app_settings_app_version_read_public" on public.app_settings;
create policy "app_settings_app_version_read_public" on public.app_settings
  for select
  using (id = 'app_version');
