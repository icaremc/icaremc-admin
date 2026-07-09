-- Simpler milestone labels for admin + app display.

update public.child_growth_periods
set age_label = 'Newborn'
where age_months = 0
  and age_label like 'Newborn%';

update public.child_growth_periods
set age_label = '6 weeks'
where age_months = 1
  and (age_label like '%6 weeks%' or age_label like '%1.5 month%');
