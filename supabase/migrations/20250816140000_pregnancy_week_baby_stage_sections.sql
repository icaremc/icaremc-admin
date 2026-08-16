-- Pregnancy week translations: baby (one-liner), stage (one-liner),
-- always prepend Baby's Development + Pregnancy changes sections.
-- Option B migrate: first line → one-liner; remainder → matching section.

alter table public.pregnancy_week_translations
  add column if not exists stage text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pregnancy_week_translations'
      and column_name = 'baby_development'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pregnancy_week_translations'
      and column_name = 'baby'
  ) then
    alter table public.pregnancy_week_translations
      rename column baby_development to baby;
  end if;
end $$;

do $$
declare
  r record;
  baby_lines text[];
  mother_lines text[];
  baby_first text;
  baby_rest text[];
  stage_first text;
  mother_rest text[];
  existing jsonb;
  baby_title text;
  preg_title text;
  baby_sec jsonb;
  preg_sec jsonb;
  new_sections jsonb;
  already_migrated boolean;
begin
  for r in
    select id, language_code, baby, mother_changes, coalesce(sections, '[]'::jsonb) as sections
    from public.pregnancy_week_translations
  loop
    baby_title := case r.language_code
      when 'am' then 'የሕፃን እድገት'
      when 'om' then 'Guddina Daa''imaa'
      else 'Baby''s Development'
    end;
    preg_title := case r.language_code
      when 'am' then 'የእርግዝና ለውጦች'
      when 'om' then 'Jijjiirama Ulfaa'
      else 'Pregnancy changes'
    end;

    already_migrated := (
      jsonb_typeof(r.sections) = 'array'
      and jsonb_array_length(r.sections) >= 2
      and coalesce(r.sections->0->>'title', '') = baby_title
      and coalesce(r.sections->1->>'title', '') = preg_title
    );
    if already_migrated then
      continue;
    end if;

    baby_lines := array(
      select trim(both from x)
      from unnest(string_to_array(coalesce(r.baby, ''), E'\n')) as x
      where trim(both from x) <> ''
    );
    mother_lines := array(
      select trim(both from x)
      from unnest(string_to_array(coalesce(r.mother_changes, ''), E'\n')) as x
      where trim(both from x) <> ''
    );

    baby_first := coalesce(baby_lines[1], '');
    if coalesce(array_length(baby_lines, 1), 0) > 1 then
      baby_rest := baby_lines[2:array_length(baby_lines, 1)];
    else
      baby_rest := array[]::text[];
    end if;

    stage_first := coalesce(mother_lines[1], '');
    if coalesce(array_length(mother_lines, 1), 0) > 1 then
      mother_rest := mother_lines[2:array_length(mother_lines, 1)];
    else
      mother_rest := array[]::text[];
    end if;

    baby_sec := jsonb_build_object(
      'title', baby_title,
      'body', '',
      'bullets', to_jsonb(coalesce(baby_rest, array[]::text[])),
      'is_urgent', false
    );
    preg_sec := jsonb_build_object(
      'title', preg_title,
      'body', '',
      'bullets', to_jsonb(coalesce(mother_rest, array[]::text[])),
      'is_urgent', false
    );

    existing := case
      when jsonb_typeof(r.sections) = 'array' then r.sections
      else '[]'::jsonb
    end;
    new_sections := jsonb_build_array(baby_sec, preg_sec) || existing;

    update public.pregnancy_week_translations
    set
      baby = nullif(baby_first, ''),
      stage = nullif(stage_first, ''),
      mother_changes = null,
      sections = new_sections,
      updated_at = now()
    where id = r.id;
  end loop;
end $$;
