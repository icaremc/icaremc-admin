-- Patient wallet + automatic refund when an appointment is cancelled.
-- Shared by icare_mc, icare_doctors, icaremc-admin.

create table if not exists public.patient_wallets (
  patient_id uuid primary key references public.profiles (id) on delete cascade,
  balance numeric(12, 2) not null default 0 check (balance >= 0),
  currency text not null default 'ETB',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patient_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  is_credit boolean not null default true,
  type text not null,
  appointment_id uuid references public.appointments (id) on delete set null,
  note text,
  payment_method text,
  created_at timestamptz not null default now()
);

create index if not exists patient_wallet_transactions_patient_idx
  on public.patient_wallet_transactions (patient_id, created_at desc);

create unique index if not exists patient_wallet_transactions_refund_unique
  on public.patient_wallet_transactions (appointment_id)
  where type = 'appointment_refund' and appointment_id is not null;

create or replace function public.ensure_patient_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.patient_wallets (patient_id, currency)
  values (new.id, 'ETB')
  on conflict (patient_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_ensure_patient_wallet on public.profiles;
create trigger profiles_ensure_patient_wallet
  after insert on public.profiles
  for each row execute function public.ensure_patient_wallet();

insert into public.patient_wallets (patient_id, currency)
select p.id, 'ETB'
from public.profiles p
on conflict (patient_id) do nothing;

create or replace function public.refund_patient_wallet_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  refund_amount numeric;
  paid_with_chapa boolean;
  refund_note text;
  short_id text;
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    if coalesce(new.amount_paid, 0) > 0
       and new.payment_status in ('paid', 'partial') then

      if exists (
        select 1
        from public.patient_wallet_transactions pwt
        where pwt.appointment_id = new.id
          and pwt.type = 'appointment_refund'
      ) then
        return new;
      end if;

      refund_amount := round(new.amount_paid::numeric, 2);
      paid_with_chapa := lower(coalesce(new.payment_method, '')) like '%chapa%';
      short_id := left(new.id::text, 6);
      refund_note := case
        when paid_with_chapa then
          'Appointment #' || short_id || ' refund (service fee; gateway fee not refunded)'
        else
          'Appointment #' || short_id || ' cancellation refund'
      end;

      insert into public.patient_wallets (patient_id, balance, currency)
      values (new.patient_id, refund_amount, coalesce(new.currency, 'ETB'))
      on conflict (patient_id) do update
      set
        balance = public.patient_wallets.balance + excluded.balance,
        currency = excluded.currency,
        updated_at = now();

      insert into public.patient_wallet_transactions (
        patient_id,
        amount,
        is_credit,
        type,
        appointment_id,
        note,
        payment_method
      )
      values (
        new.patient_id,
        refund_amount,
        true,
        'appointment_refund',
        new.id,
        refund_note,
        coalesce(new.payment_method, 'wallet')
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_refund_patient_wallet on public.appointments;
create trigger appointments_refund_patient_wallet
  after update on public.appointments
  for each row execute function public.refund_patient_wallet_on_cancel();

alter table public.patient_wallets enable row level security;
alter table public.patient_wallet_transactions enable row level security;

drop policy if exists "patient_wallets_select_own" on public.patient_wallets;
create policy "patient_wallets_select_own" on public.patient_wallets
  for select using (auth.uid() = patient_id);

drop policy if exists "patient_wallet_transactions_select_own" on public.patient_wallet_transactions;
create policy "patient_wallet_transactions_select_own" on public.patient_wallet_transactions
  for select using (auth.uid() = patient_id);
