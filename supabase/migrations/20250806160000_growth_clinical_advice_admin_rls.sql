-- Admin portal policies for growth clinical interpretation copy.
-- Tables are created/seeded by the mobile app stack.
-- Does not enable RLS (avoids locking app reads if RLS was off).
-- Apply only when these tables already exist.

do $$
begin
  if to_regclass('public.growth_clinical_advice') is null then
    raise notice 'growth_clinical_advice missing — skip admin policies';
    return;
  end if;

  drop policy if exists "growth_clinical_advice_admin_select"
    on public.growth_clinical_advice;
  create policy "growth_clinical_advice_admin_select"
    on public.growth_clinical_advice
    for select using (public.is_portal_admin());

  drop policy if exists "growth_clinical_advice_admin_update"
    on public.growth_clinical_advice;
  create policy "growth_clinical_advice_admin_update"
    on public.growth_clinical_advice
    for update using (public.is_portal_admin())
    with check (public.is_portal_admin());

  if to_regclass('public.growth_clinical_advice_translations') is null then
    raise notice 'growth_clinical_advice_translations missing — skip translation policies';
    return;
  end if;

  drop policy if exists "growth_clinical_advice_translations_admin_select"
    on public.growth_clinical_advice_translations;
  create policy "growth_clinical_advice_translations_admin_select"
    on public.growth_clinical_advice_translations
    for select using (public.is_portal_admin());

  drop policy if exists "growth_clinical_advice_translations_admin_insert"
    on public.growth_clinical_advice_translations;
  create policy "growth_clinical_advice_translations_admin_insert"
    on public.growth_clinical_advice_translations
    for insert with check (public.is_portal_admin());

  drop policy if exists "growth_clinical_advice_translations_admin_update"
    on public.growth_clinical_advice_translations;
  create policy "growth_clinical_advice_translations_admin_update"
    on public.growth_clinical_advice_translations
    for update using (public.is_portal_admin())
    with check (public.is_portal_admin());

  drop policy if exists "growth_clinical_advice_translations_admin_delete"
    on public.growth_clinical_advice_translations;
  create policy "growth_clinical_advice_translations_admin_delete"
    on public.growth_clinical_advice_translations
    for delete using (public.is_portal_admin());
end $$;

notify pgrst, 'reload schema';
