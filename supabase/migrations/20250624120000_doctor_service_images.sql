-- Doctor service images (uploaded from doctor app; displayed in admin).
-- Bucket + column may already exist if doctor_service_image_migration.sql was applied.

alter table public.doctor_services
  add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'drservices',
  'drservices',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
