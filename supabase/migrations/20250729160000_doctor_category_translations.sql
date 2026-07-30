-- Per-locale names for doctor specialities (en required; am/om optional).

create table if not exists public.doctor_category_translations (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.doctor_categories (id) on delete cascade,
  language_code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doctor_category_translations_language_check
    check (language_code in ('en', 'am', 'om')),
  constraint doctor_category_translations_category_lang_key
    unique (category_id, language_code)
);

create index if not exists doctor_category_translations_category_idx
  on public.doctor_category_translations (category_id, language_code);

drop trigger if exists doctor_category_translations_updated_at
  on public.doctor_category_translations;
create trigger doctor_category_translations_updated_at
  before update on public.doctor_category_translations
  for each row execute function public.set_updated_at();

insert into public.doctor_category_translations (category_id, language_code, name)
select c.id, 'en', c.name
from public.doctor_categories c
where not exists (
  select 1
  from public.doctor_category_translations t
  where t.category_id = c.id
    and t.language_code = 'en'
);

alter table public.doctor_category_translations enable row level security;

drop policy if exists "doctor_category_translations_read" on public.doctor_category_translations;
drop policy if exists "doctor_category_translations_admin_insert" on public.doctor_category_translations;
drop policy if exists "doctor_category_translations_admin_update" on public.doctor_category_translations;
drop policy if exists "doctor_category_translations_admin_delete" on public.doctor_category_translations;

create policy "doctor_category_translations_read" on public.doctor_category_translations
  for select using (
    auth.role() = 'authenticated'
    or public.is_portal_admin()
  );

create policy "doctor_category_translations_admin_insert" on public.doctor_category_translations
  for insert to authenticated
  with check (public.is_portal_admin());

create policy "doctor_category_translations_admin_update" on public.doctor_category_translations
  for update to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

create policy "doctor_category_translations_admin_delete" on public.doctor_category_translations
  for delete to authenticated
  using (public.is_portal_admin());
