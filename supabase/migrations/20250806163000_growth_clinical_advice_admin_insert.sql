-- Allow portal admins to create growth clinical interpretation rules.
do $$
begin
  if to_regclass('public.growth_clinical_advice') is null then
    raise notice 'growth_clinical_advice missing — skip insert policy';
    return;
  end if;

  drop policy if exists "growth_clinical_advice_admin_insert"
    on public.growth_clinical_advice;
  create policy "growth_clinical_advice_admin_insert"
    on public.growth_clinical_advice
    for insert with check (public.is_portal_admin());
end $$;

notify pgrst, 'reload schema';
