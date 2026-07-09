-- Public storage for learning-path item images (multiple per item).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'child-growth-learning-paths',
  'child-growth-learning-paths',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "learning_path_images_public_read" on storage.objects;
create policy "learning_path_images_public_read" on storage.objects
  for select to public
  using (bucket_id = 'child-growth-learning-paths');

drop policy if exists "learning_path_images_admin_insert" on storage.objects;
create policy "learning_path_images_admin_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'child-growth-learning-paths'
    and public.is_portal_admin()
  );

drop policy if exists "learning_path_images_admin_update" on storage.objects;
create policy "learning_path_images_admin_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'child-growth-learning-paths'
    and public.is_portal_admin()
  )
  with check (
    bucket_id = 'child-growth-learning-paths'
    and public.is_portal_admin()
  );

drop policy if exists "learning_path_images_admin_delete" on storage.objects;
create policy "learning_path_images_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'child-growth-learning-paths'
    and public.is_portal_admin()
  );

-- Allow multiple image URLs on learning-path items.
create or replace function public.normalize_learning_path_item(item jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  label text;
  image_url text;
  video_url text;
  image_urls jsonb := '[]'::jsonb;
  elem text;
  seen text[] := '{}';
begin
  if jsonb_typeof(item) = 'string' then
    return jsonb_build_object('label', trim(both from item #>> '{}'));
  end if;

  if jsonb_typeof(item) != 'object' then
    return jsonb_build_object('label', coalesce(item::text, ''));
  end if;

  label := coalesce(
    nullif(trim(item->>'label'), ''),
    nullif(trim(item->>'text'), ''),
    nullif(trim(item->>'title'), ''),
    ''
  );
  image_url := nullif(trim(coalesce(item->>'image_url', item->>'imageUrl')), '');
  video_url := nullif(trim(coalesce(item->>'video_url', item->>'videoUrl')), '');

  if jsonb_typeof(coalesce(item->'image_urls', item->'imageUrls')) = 'array' then
    for elem in
      select nullif(trim(value #>> '{}'), '')
      from jsonb_array_elements(coalesce(item->'image_urls', item->'imageUrls'))
    loop
      if elem is not null and not (elem = any (seen)) then
        seen := array_append(seen, elem);
        image_urls := image_urls || to_jsonb(elem);
      end if;
    end loop;
  end if;

  if image_url is not null and not (image_url = any (seen)) then
    seen := array_prepend(image_url, seen);
    image_urls := jsonb_build_array(image_url) || image_urls;
  end if;

  if jsonb_array_length(image_urls) > 0 then
    image_url := image_urls->>0;
    -- One media type only: prefer images over video.
    video_url := null;
  end if;

  return jsonb_strip_nulls(
    jsonb_build_object(
      'label', label,
      'image_url', image_url,
      'image_urls', case when jsonb_array_length(image_urls) > 0 then image_urls else null end,
      'video_url', video_url
    )
  );
end;
$$;

notify pgrst, 'reload schema';
