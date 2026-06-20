-- Hospitals directory + doctor affiliations — shared by icare_doctors, icare_mc, icaremc-admin.

create table if not exists public.hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  address text,
  city text,
  phone text,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hospitals_slug_key unique (slug)
);

create index if not exists hospitals_active_sort_idx
  on public.hospitals (is_active, sort_order, name);

drop trigger if exists hospitals_updated_at on public.hospitals;
create trigger hospitals_updated_at
  before update on public.hospitals
  for each row execute function public.set_updated_at();

alter table public.hospitals enable row level security;

drop policy if exists "hospitals_read_active" on public.hospitals;
create policy "hospitals_read_active" on public.hospitals
  for select using (auth.role() = 'authenticated' and is_active = true);

create table if not exists public.doctor_hospital_affiliations (
  doctor_id uuid not null references public.doctor_profiles (id) on delete cascade,
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (doctor_id, hospital_id)
);

create index if not exists doctor_hospital_affiliations_hospital_idx
  on public.doctor_hospital_affiliations (hospital_id);

create unique index if not exists doctor_hospital_affiliations_one_primary_idx
  on public.doctor_hospital_affiliations (doctor_id)
  where is_primary = true;

alter table public.doctor_hospital_affiliations enable row level security;

drop policy if exists "doctor_hospital_affiliations_select_own" on public.doctor_hospital_affiliations;
create policy "doctor_hospital_affiliations_select_own" on public.doctor_hospital_affiliations
  for select using (auth.uid() = doctor_id);

drop policy if exists "doctor_hospital_affiliations_select_authenticated" on public.doctor_hospital_affiliations;
create policy "doctor_hospital_affiliations_select_authenticated" on public.doctor_hospital_affiliations
  for select using (auth.role() = 'authenticated');

drop policy if exists "doctor_hospital_affiliations_manage_own" on public.doctor_hospital_affiliations;
create policy "doctor_hospital_affiliations_manage_own" on public.doctor_hospital_affiliations
  for all using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id);

alter table public.doctor_profiles
  add column if not exists primary_hospital_id uuid references public.hospitals (id) on delete set null;

create index if not exists doctor_profiles_primary_hospital_id_idx
  on public.doctor_profiles (primary_hospital_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hospitals',
  'hospitals',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "hospitals_storage_public_read" on storage.objects;
create policy "hospitals_storage_public_read" on storage.objects
  for select to public
  using (bucket_id = 'hospitals');
