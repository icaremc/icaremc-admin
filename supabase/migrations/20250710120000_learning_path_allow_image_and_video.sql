-- Allow learning-path items to keep both image_url and video_url.

create or replace function public.normalize_learning_path_item(item jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  label text;
  image_url text;
  video_url text;
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

  return jsonb_strip_nulls(
    jsonb_build_object(
      'label', label,
      'image_url', image_url,
      'video_url', video_url
    )
  );
end;
$$;
