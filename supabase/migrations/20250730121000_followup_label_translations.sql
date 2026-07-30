-- Follow-up visit labels: en/am/om map; keep label as English canonical.

alter table public.child_followup_visit_templates
  add column if not exists label_translations jsonb not null default '{}'::jsonb;

comment on column public.child_followup_visit_templates.label_translations is
  'Localized visit names keyed by language_code (en, am, om). label stays English.';

update public.child_followup_visit_templates
set label_translations = jsonb_build_object('en', label)
where coalesce(label_translations, '{}'::jsonb) = '{}'::jsonb
  and label is not null
  and label <> '';
