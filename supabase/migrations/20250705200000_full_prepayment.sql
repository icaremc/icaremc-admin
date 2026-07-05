-- Enforce full online prepayment for all paid services.
-- Chat unlocks only after payment (or free/zero-price bookings).
-- Run once in Supabase SQL Editor (shared by icare_mc, icare_doctors, icaremc-admin).

-- ---------------------------------------------------------------------------
-- doctor_profiles — always full prepayment
-- ---------------------------------------------------------------------------
update public.doctor_profiles
set
  prepayment_mode = 'full',
  prepayment_percent = 100,
  updated_at = now()
where prepayment_mode is distinct from 'full'
   or prepayment_percent is distinct from 100;

alter table public.doctor_profiles
  alter column prepayment_mode set default 'full';

alter table public.doctor_profiles
  alter column prepayment_percent set default 100;

alter table public.doctor_profiles
  drop constraint if exists doctor_profiles_prepayment_mode_check;

alter table public.doctor_profiles
  add constraint doctor_profiles_prepayment_mode_check
  check (prepayment_mode = 'full');

-- ---------------------------------------------------------------------------
-- appointments — snapshot uses full prepayment only
-- ---------------------------------------------------------------------------
update public.appointments
set
  prepayment_mode = 'full',
  prepayment_percent = 100,
  prepayment_amount = total_amount
where total_amount > 0
  and prepayment_mode is distinct from 'full';

alter table public.appointments
  drop constraint if exists appointments_prepayment_mode_check;

alter table public.appointments
  add constraint appointments_prepayment_mode_check
  check (prepayment_mode in ('full', 'none'));

-- Keep 'none' for legacy zero-price rows; new paid bookings always 'full'.

-- ---------------------------------------------------------------------------
-- Chat — only after full payment (or free service)
-- ---------------------------------------------------------------------------
create or replace function public.create_chat_on_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' then
    return new;
  end if;

  if new.total_amount <= 0
     or new.payment_status in ('paid', 'waived') then
    insert into public.chat_conversations (appointment_id, patient_id, doctor_id)
    values (new.id, new.patient_id, new.doctor_id)
    on conflict (appointment_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_create_chat on public.appointments;
create trigger appointments_create_chat
  after insert on public.appointments
  for each row execute function public.create_chat_on_appointment();

drop trigger if exists appointments_create_chat_on_payment on public.appointments;
create trigger appointments_create_chat_on_payment
  after update of payment_status, amount_paid, status on public.appointments
  for each row
  when (
    old.payment_status is distinct from new.payment_status
    or old.amount_paid is distinct from new.amount_paid
    or old.status is distinct from new.status
  )
  execute function public.create_chat_on_appointment();

-- Remove chat threads for unpaid paid bookings.
delete from public.chat_conversations cc
using public.appointments a
where cc.appointment_id = a.id
  and a.total_amount > 0
  and a.payment_status not in ('paid', 'waived')
  and a.status <> 'cancelled';

notify pgrst, 'reload schema';
