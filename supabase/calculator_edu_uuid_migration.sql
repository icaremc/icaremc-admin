-- Migrate calculator_edu entity_id from slug keys (edd_lnmp, …) to UUIDs.
-- Preserves app lookup by copying the old entity_id into translations.en.topic_key.
-- Safe to re-run: skips rows that already use UUID entity_id values.
--
-- Run in Supabase Dashboard → SQL Editor after content_translations exists.

update public.content_translations
set
  translations = jsonb_set(
    translations,
    '{en,topic_key}',
    to_jsonb(entity_id),
    true
  ),
  entity_id = id::text,
  version = version + 1,
  updated_at = now()
where namespace = 'calculator_edu'
  and entity_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

notify pgrst, 'reload schema';
