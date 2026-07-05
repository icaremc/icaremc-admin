-- Pregnancy week hero images (admin upload → mobile app display).

alter table public.pregnancy_weeks
  add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pregnancy-weeks',
  'pregnancy-weeks',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "pregnancy_weeks_storage_public_read" on storage.objects;
create policy "pregnancy_weeks_storage_public_read" on storage.objects
  for select to public
  using (bucket_id = 'pregnancy-weeks');

drop policy if exists "pregnancy_weeks_storage_admin_insert" on storage.objects;
create policy "pregnancy_weeks_storage_admin_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'pregnancy-weeks'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "pregnancy_weeks_storage_admin_update" on storage.objects;
create policy "pregnancy_weeks_storage_admin_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'pregnancy-weeks'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    bucket_id = 'pregnancy-weeks'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "pregnancy_weeks_storage_admin_delete" on storage.objects;
create policy "pregnancy_weeks_storage_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'pregnancy-weeks'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );
