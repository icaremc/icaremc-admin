-- Track when a doctor first responds (confirms) a booking for SLA monitoring.

alter table public.appointments
  add column if not exists confirmed_at timestamptz;

comment on column public.appointments.confirmed_at is
  'Set when status first becomes confirmed. Used for doctor response SLA.';

create or replace function public.set_appointment_confirmed_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'confirmed'
     and (old.status is distinct from 'confirmed')
     and new.confirmed_at is null then
    new.confirmed_at := coalesce(new.confirmed_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_set_confirmed_at on public.appointments;
create trigger appointments_set_confirmed_at
  before update on public.appointments
  for each row execute function public.set_appointment_confirmed_at();

-- Best-effort backfill for already-confirmed bookings.
update public.appointments
set confirmed_at = updated_at
where status = 'confirmed'
  and confirmed_at is null;

-- Completed bookings that must have been confirmed at some point: use updated_at only when
-- we have no better signal (weak backfill for historical rows).
update public.appointments
set confirmed_at = updated_at
where status = 'completed'
  and confirmed_at is null
  and updated_at is not null;
