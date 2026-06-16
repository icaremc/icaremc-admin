-- Doctor specialty categories for profile selection and MC app filtering.
create table if not exists public.doctor_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.doctor_profiles
  add column if not exists category_id uuid references public.doctor_categories (id) on delete set null;

create index if not exists doctor_profiles_category_id_idx
  on public.doctor_profiles (category_id);

create index if not exists doctor_categories_active_sort_idx
  on public.doctor_categories (is_active, sort_order, name);
