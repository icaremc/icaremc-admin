-- Per check-up vaccine list (name, route, benefits).

alter table public.child_followup_visit_templates
  add column if not exists vaccines jsonb not null default '[]'::jsonb;

comment on column public.child_followup_visit_templates.vaccines is
  'Vaccines for this check-up: [{name, route, benefits: string[]}].';

alter table public.child_followup_visit_templates
  alter column modules set default jsonb_build_object(
    'growth', false,
    'nutrition', false,
    'vaccines', true,
    'development', false,
    'counseling', false,
    'red_flags', false
  );

update public.child_followup_visit_templates
set modules = jsonb_build_object(
  'growth', false,
  'nutrition', false,
  'vaccines', true,
  'development', false,
  'counseling', false,
  'red_flags', false
)
where modules is distinct from jsonb_build_object(
  'growth', false,
  'nutrition', false,
  'vaccines', true,
  'development', false,
  'counseling', false,
  'red_flags', false
);
