-- Learning paths: normalize milestones JSON in child_growth_period_translations.
-- See icare_mc/supabase/child_growth_learning_paths_migration.sql (same content).

comment on column public.child_growth_period_translations.milestones is
  'Learning path categories: [{title, items[]}]. Each item is {label, image_url?, video_url?}. Legacy string items are converted by this migration.';

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

create or replace function public.normalize_learning_path_milestones(raw jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  cat jsonb;
  elem jsonb;
  cats jsonb := '[]'::jsonb;
  items jsonb;
begin
  if raw is null or jsonb_typeof(raw) != 'array' then
    return '[]'::jsonb;
  end if;

  for cat in select value from jsonb_array_elements(raw)
  loop
    items := '[]'::jsonb;
    for elem in
      select value from jsonb_array_elements(coalesce(cat->'items', '[]'::jsonb))
    loop
      items := items || jsonb_build_array(public.normalize_learning_path_item(elem));
    end loop;

    cats := cats || jsonb_build_array(
      jsonb_build_object(
        'title', coalesce(cat->>'title', ''),
        'items', items
      )
    );
  end loop;

  return cats;
end;
$$;

revoke all on function public.normalize_learning_path_item(jsonb) from public;
grant execute on function public.normalize_learning_path_item(jsonb) to authenticated;

revoke all on function public.normalize_learning_path_milestones(jsonb) from public;
grant execute on function public.normalize_learning_path_milestones(jsonb) to authenticated;

update public.child_growth_period_translations
set
  milestones = public.normalize_learning_path_milestones(milestones),
  updated_at = now()
where milestones is not null
  and milestones != '[]'::jsonb;

notify pgrst, 'reload schema';
