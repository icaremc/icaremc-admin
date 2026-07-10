-- Seed per-visit vaccine lists for admin CMS + mobile follow-up visits tab.
-- JSON shape: { code, name, route, benefits[] }
-- Requires 20250710140000_followup_visit_vaccines.sql (vaccines column).

-- Birth (day 0)
update public.child_followup_visit_templates
set
  vaccines = '[
    {
      "code": "bcg",
      "name": "BCG",
      "route": "Injection in the upper arm",
      "benefits": ["Protects against severe tuberculosis (TB)"]
    },
    {
      "code": "opv_0",
      "name": "OPV 0",
      "route": "2 drops in the mouth",
      "benefits": ["First polio protection at birth"]
    }
  ]'::jsonb,
  modules = jsonb_build_object(
    'growth', false, 'nutrition', false, 'vaccines', true,
    'development', false, 'counseling', true, 'red_flags', false
  )
where code = 'visit_birth';

-- 6 weeks
update public.child_followup_visit_templates
set vaccines = '[
  {"code": "penta_1", "name": "Penta 1", "route": "Injection in the thigh",
   "benefits": ["Protects against diphtheria, tetanus, pertussis, hepatitis B, and Hib"]},
  {"code": "opv_1", "name": "OPV 1", "route": "2 drops in the mouth",
   "benefits": ["Second polio dose"]},
  {"code": "pcv_1", "name": "PCV 1", "route": "Injection in the thigh",
   "benefits": ["Protects against pneumonia and meningitis"]},
  {"code": "rota_1", "name": "Rota 1", "route": "Drops in the mouth",
   "benefits": ["Protects against severe diarrhoea from rotavirus"]}
]'::jsonb
where code = 'visit_6w';

-- 10 weeks (primary window; missed doses can catch up at 14 weeks)
update public.child_followup_visit_templates
set vaccines = '[
  {"code": "penta_2", "name": "Penta 2", "route": "Injection in the thigh",
   "benefits": ["Second dose in the 5-in-1 series"]},
  {"code": "opv_2", "name": "OPV 2", "route": "2 drops in the mouth",
   "benefits": ["Third polio dose"]},
  {"code": "pcv_2", "name": "PCV 2", "route": "Injection in the thigh",
   "benefits": ["Second pneumonia vaccine dose"]},
  {"code": "rota_2", "name": "Rota 2", "route": "Drops in the mouth",
   "benefits": ["Second rotavirus dose — complete the series if not given at 10 weeks"]}
]'::jsonb
where code = 'visit_10w';

-- 14 weeks (includes catch-up for any missed 10-week doses)
update public.child_followup_visit_templates
set vaccines = '[
  {"code": "penta_3", "name": "Penta 3", "route": "Injection in the thigh",
   "benefits": ["Final dose in the 5-in-1 series"]},
  {"code": "opv_3", "name": "OPV 3", "route": "2 drops in the mouth",
   "benefits": ["Fourth polio dose"]},
  {"code": "pcv_3", "name": "PCV 3", "route": "Injection in the thigh",
   "benefits": ["Third pneumonia vaccine dose"]},
  {"code": "ipv_1", "name": "IPV", "route": "Injection in the thigh",
   "benefits": ["Inactivated polio booster for stronger protection"]}
]'::jsonb
where code = 'visit_14w';

-- 9 months
update public.child_followup_visit_templates
set vaccines = '[
  {"code": "measles_1", "name": "Measles 1", "route": "Injection in the upper arm",
   "benefits": ["Protects against measles"]}
]'::jsonb
where code = 'visit_9mo';

-- 15 months
update public.child_followup_visit_templates
set vaccines = '[
  {"code": "measles_2", "name": "Measles 2", "route": "Injection in the upper arm",
   "benefits": ["Second measles dose for long-lasting protection"]}
]'::jsonb
where code = 'visit_15mo';

-- Non-vaccine visits: growth / counseling only
update public.child_followup_visit_templates
set
  vaccines = '[]'::jsonb,
  modules = jsonb_build_object(
    'growth', true, 'nutrition', true, 'vaccines', false,
    'development', true, 'counseling', true, 'red_flags', true
  )
where code in (
  'visit_7d', 'visit_6mo', 'visit_7mo', 'visit_12mo', 'visit_18mo', 'visit_24mo',
  'visit_3y', 'visit_4y', 'visit_5y', 'visit_6y', 'visit_7y', 'visit_8y'
);

notify pgrst, 'reload schema';
