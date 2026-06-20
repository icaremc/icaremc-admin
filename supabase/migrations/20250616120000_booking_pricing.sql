-- ICare booking pricing — services, prepayment settings, appointment price snapshots.
-- Run in Supabase SQL Editor after booking_schema.sql / doctor_profiles_schema.sql.

alter table public.doctor_profiles
  add column if not exists currency text not null default 'ETB';

alter table public.doctor_profiles
  add column if not exists prepayment_mode text not null default 'none';

alter table public.doctor_profiles
  drop constraint if exists doctor_profiles_prepayment_mode_check;

alter table public.doctor_profiles
  add constraint doctor_profiles_prepayment_mode_check
  check (prepayment_mode in ('none', 'percent', 'full'));

alter table public.doctor_profiles
  add column if not exists prepayment_percent integer not null default 50;

alter table public.doctor_profiles
  drop constraint if exists doctor_profiles_prepayment_percent_check;

alter table public.doctor_profiles
  add constraint doctor_profiles_prepayment_percent_check
  check (prepayment_percent between 0 and 100);

create table if not exists public.doctor_services (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctor_profiles (id) on delete cascade,
  name text not null,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  currency text not null default 'ETB',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists doctor_services_doctor_idx
  on public.doctor_services (doctor_id);

create index if not exists doctor_services_active_idx
  on public.doctor_services (doctor_id, sort_order)
  where is_active = true;

drop trigger if exists doctor_services_updated_at on public.doctor_services;
create trigger doctor_services_updated_at
  before update on public.doctor_services
  for each row execute function public.set_updated_at();

alter table public.doctor_services enable row level security;

drop policy if exists "doctor_services_doctor_manage" on public.doctor_services;
create policy "doctor_services_doctor_manage" on public.doctor_services
  for all using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id);

drop policy if exists "doctor_services_patient_read" on public.doctor_services;
create policy "doctor_services_patient_read" on public.doctor_services
  for select using (
    auth.role() = 'authenticated'
    and is_active = true
    and exists (
      select 1 from public.doctor_profiles dp
      where dp.id = doctor_services.doctor_id
        and dp.is_verified = true
    )
  );

alter table public.appointments
  add column if not exists service_id uuid references public.doctor_services (id) on delete set null;

alter table public.appointments
  add column if not exists service_name text;

alter table public.appointments
  add column if not exists service_description text;

alter table public.appointments
  add column if not exists service_price numeric(12, 2);

alter table public.appointments
  add column if not exists currency text not null default 'ETB';

alter table public.appointments
  add column if not exists prepayment_mode text not null default 'none';

alter table public.appointments
  drop constraint if exists appointments_prepayment_mode_check;

alter table public.appointments
  add constraint appointments_prepayment_mode_check
  check (prepayment_mode in ('none', 'percent', 'full'));

alter table public.appointments
  add column if not exists prepayment_percent integer;

alter table public.appointments
  add column if not exists total_amount numeric(12, 2) not null default 0;

alter table public.appointments
  add column if not exists prepayment_amount numeric(12, 2) not null default 0;

alter table public.appointments
  add column if not exists amount_paid numeric(12, 2) not null default 0;

alter table public.appointments
  add column if not exists payment_status text not null default 'unpaid';

alter table public.appointments
  drop constraint if exists appointments_payment_status_check;

alter table public.appointments
  add constraint appointments_payment_status_check
  check (payment_status in ('unpaid', 'partial', 'paid', 'waived'));
