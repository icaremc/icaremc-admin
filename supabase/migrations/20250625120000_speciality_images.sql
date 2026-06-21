-- Speciality (doctor_categories) images for admin upload and MC app display.

alter table public.doctor_categories
  add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'specialities',
  'specialities',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "specialities_storage_public_read" on storage.objects;
create policy "specialities_storage_public_read" on storage.objects
  for select to public
  using (bucket_id = 'specialities');
