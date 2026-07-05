-- ICare Chapa booking payments — tx reference on appointments.
-- Run after booking_pricing migration.

alter table public.appointments
  add column if not exists payment_method text;

alter table public.appointments
  add column if not exists chapa_tx_ref text;

create index if not exists appointments_chapa_tx_ref_idx
  on public.appointments (chapa_tx_ref)
  where chapa_tx_ref is not null;
