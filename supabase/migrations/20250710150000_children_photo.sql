-- Child profile photos for mobile app + admin portal.

alter table public.children
  add column if not exists photo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'childphotos',
  'childphotos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "childphotos_insert_own" on storage.objects;
create policy "childphotos_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'childphotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "childphotos_update_own" on storage.objects;
create policy "childphotos_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'childphotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'childphotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "childphotos_delete_own" on storage.objects;
create policy "childphotos_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'childphotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "childphotos_select_public" on storage.objects;
create policy "childphotos_select_public" on storage.objects
  for select
  using (bucket_id = 'childphotos');

notify pgrst, 'reload schema';
