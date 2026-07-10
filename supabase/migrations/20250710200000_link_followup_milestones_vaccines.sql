-- Link check-up visit templates → child growth milestones and sync vaccines onto each period.
-- Safe to re-run. Requires:
--   20250708120000_child_followup_visits.sql
--   20250710180000_followup_visit_vaccines_seed.sql
--   20250710190000_child_growth_milestones_seed.sql

-- ── 1) growth_period_id: month-based visits (exact age_months match) ──

update public.child_followup_visit_templates t
set
  growth_period_id = p.id,
  updated_at = now()
from public.child_growth_periods p
where t.offset_months is not null
  and p.age_months = t.offset_months;

-- ── 2) growth_period_id: day-based visits → nearest milestone checkpoint ──

update public.child_followup_visit_templates t
set
  growth_period_id = p.id,
  updated_at = now()
from (values
  ('visit_birth', 0),   -- birth
  ('visit_7d',    0),   -- first week → newborn milestone
  ('visit_6w',    1),   -- 6 weeks
  ('visit_10w',   2),   -- ~10 weeks → 2-month checkpoint
  ('visit_14w',   4)    -- ~14 weeks → 4-month checkpoint
) as v(code, age_months)
join public.child_growth_periods p on p.age_months = v.age_months
where t.code = v.code;

-- visit_7mo has no matching growth period (schedule-only between 6 and 9 months).

-- ── 3) Sync vaccines from linked templates → milestone translations (en) ──
--    Deduplicates by vaccine code; keeps name, route, benefits, code.

with vaccine_rows as (
  select distinct on (t.growth_period_id, coalesce(v->>'code', v->>'name'))
    t.growth_period_id as period_id,
    jsonb_strip_nulls(
      jsonb_build_object(
        'code', nullif(trim(v->>'code'), ''),
        'name', coalesce(nullif(trim(v->>'name'), ''), trim(v->>'title')),
        'route', coalesce(nullif(trim(v->>'route'), ''), trim(v->>'body')),
        'benefits', coalesce(v->'benefits', v->'bullets', '[]'::jsonb)
      )
    ) as vaccine,
    t.sort_order
  from public.child_followup_visit_templates t
  cross join lateral jsonb_array_elements(coalesce(t.vaccines, '[]'::jsonb)) as v
  where t.growth_period_id is not null
    and coalesce(nullif(trim(v->>'name'), ''), nullif(trim(v->>'title'), '')) is not null
  order by
    t.growth_period_id,
    coalesce(v->>'code', v->>'name'),
    t.sort_order
),
merged as (
  select
    period_id,
    jsonb_agg(vaccine order by sort_order, vaccine->>'name') as vaccines
  from vaccine_rows
  group by period_id
)
update public.child_growth_period_translations tr
set
  vaccines = coalesce(m.vaccines, '[]'::jsonb),
  updated_at = now()
from merged m
where tr.period_id = m.period_id
  and tr.language_code = 'en';

-- Clear vaccines on en translations whose linked templates have none.
update public.child_growth_period_translations tr
set
  vaccines = '[]'::jsonb,
  updated_at = now()
where tr.language_code = 'en'
  and not exists (
    select 1
    from public.child_followup_visit_templates t
    where t.growth_period_id = tr.period_id
      and coalesce(jsonb_array_length(t.vaccines), 0) > 0
  )
  and exists (
    select 1
    from public.child_followup_visit_templates t
    where t.growth_period_id = tr.period_id
  );

notify pgrst, 'reload schema';
