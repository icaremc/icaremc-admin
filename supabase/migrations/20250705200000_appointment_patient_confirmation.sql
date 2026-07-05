-- Patient must confirm before doctor wallet is credited (commission deducted on confirm).
-- Run on existing Supabase projects after doctor_finance + booking migrations.

-- ---------------------------------------------------------------------------
-- New status: doctor finished visit, payout held until patient confirms
-- ---------------------------------------------------------------------------
alter table public.appointments
  drop constraint if exists appointments_status_check;

alter table public.appointments
  add constraint appointments_status_check
  check (status in (
    'pending',
    'confirmed',
    'awaiting_patient_confirmation',
    'completed',
    'cancelled'
  ));

-- ---------------------------------------------------------------------------
-- RLS: doctor marks confirmed → awaiting_patient_confirmation (not completed)
-- ---------------------------------------------------------------------------
drop policy if exists "appointments_doctor_update" on public.appointments;
create policy "appointments_doctor_update" on public.appointments
  for update
  using (auth.uid() = doctor_id)
  with check (status in ('confirmed', 'awaiting_patient_confirmation', 'cancelled'));

-- Patient confirms visit → completed (releases doctor payout)
drop policy if exists "appointments_patient_confirm_complete" on public.appointments;
create policy "appointments_patient_confirm_complete" on public.appointments
  for update
  using (
    auth.uid() = patient_id
    and status = 'awaiting_patient_confirmation'
  )
  with check (status = 'completed');

-- ---------------------------------------------------------------------------
-- Credit doctor wallet only after patient confirmation
-- ---------------------------------------------------------------------------
create or replace function public.credit_doctor_wallet_on_complete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  commission_pct numeric := 10;
  net_amount numeric;
  finance_data jsonb;
begin
  if new.status = 'completed'
     and old.status = 'awaiting_patient_confirmation' then
    if coalesce(new.amount_paid, 0) > 0
       and new.payment_status in ('paid', 'partial') then
      if exists (
        select 1 from public.wallet_transactions wt
        where wt.appointment_id = new.id and wt.type = 'appointment_earning'
      ) then
        return new;
      end if;

      select data into finance_data
      from public.app_settings
      where id = 'finance';

      if finance_data is not null then
        commission_pct := coalesce((finance_data->>'platformCommissionPercent')::numeric, 10);
      end if;

      net_amount := round(new.amount_paid * (1 - commission_pct / 100), 2);
      if net_amount <= 0 then
        return new;
      end if;

      insert into public.doctor_wallets (doctor_id, available_balance, currency)
      values (new.doctor_id, net_amount, coalesce(new.currency, 'ETB'))
      on conflict (doctor_id) do update
      set
        available_balance = public.doctor_wallets.available_balance + excluded.available_balance,
        currency = excluded.currency,
        updated_at = now();

      insert into public.wallet_transactions (
        doctor_id,
        amount,
        is_credit,
        type,
        appointment_id,
        note
      )
      values (
        new.doctor_id,
        net_amount,
        true,
        'appointment_earning',
        new.id,
        'Earning from patient-confirmed appointment'
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_credit_doctor_wallet on public.appointments;
create trigger appointments_credit_doctor_wallet
  after update on public.appointments
  for each row execute function public.credit_doctor_wallet_on_complete();
