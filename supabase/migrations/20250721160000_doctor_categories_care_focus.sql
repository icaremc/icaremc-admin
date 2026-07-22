-- Tag specialities by care journey so MC parents see matching doctors.
-- pregnancy | child_development | both

alter table public.doctor_categories
  add column if not exists care_focus text not null default 'both';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'doctor_categories_care_focus_check'
  ) then
    alter table public.doctor_categories
      add constraint doctor_categories_care_focus_check
      check (care_focus in ('pregnancy', 'child_development', 'both'));
  end if;
end $$;

comment on column public.doctor_categories.care_focus is
  'Audience for MC Dr tab: pregnancy, child_development, or both';

create index if not exists doctor_categories_care_focus_idx
  on public.doctor_categories (care_focus)
  where is_active = true;

-- Seed defaults for known specialities (safe to re-run)
update public.doctor_categories
set care_focus = 'pregnancy', updated_at = now()
where slug in ('obstetrician-gynecologist', 'midwife-prenatal-care');

update public.doctor_categories
set care_focus = 'child_development', updated_at = now()
where slug in ('pediatrician', 'neonatologist');

update public.doctor_categories
set care_focus = 'both', updated_at = now()
where slug in ('family-medicine', 'general-practitioner')
  and care_focus is distinct from 'both';
