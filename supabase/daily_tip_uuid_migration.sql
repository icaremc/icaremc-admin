-- Migrate daily_tip entity_id from integer keys ('01', '1', …) to UUIDs.
-- Safe to re-run: only updates rows that still use numeric entity_id values.
--
-- Run in Supabase Dashboard → SQL Editor after content_translations exists.

update public.content_translations
set
  entity_id = id::text,
  version = version + 1,
  updated_at = now()
where namespace = 'daily_tip'
  and entity_id ~ '^[0-9]+$';

notify pgrst, 'reload schema';
