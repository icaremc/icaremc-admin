-- Doctor cancel penalty + cancellation attribution.
alter table public.appointments
  add column if not exists cancelled_by text;

alter table public.appointments
  drop constraint if exists appointments_cancelled_by_check;

alter table public.appointments
  add constraint appointments_cancelled_by_check
  check (cancelled_by is null or cancelled_by in ('patient', 'doctor', 'admin'));

alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_type_check;

alter table public.wallet_transactions
  add constraint wallet_transactions_type_check
  check (
    type in (
      'appointment_earning',
      'payout_hold',
      'payout_release',
      'payout_paid',
      'adjustment',
      'cancel_penalty'
    )
  );

create unique index if not exists wallet_transactions_cancel_penalty_uidx
  on public.wallet_transactions (appointment_id)
  where type = 'cancel_penalty' and appointment_id is not null;

create or replace function public.penalize_doctor_wallet_on_doctor_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  finance_data jsonb;
  penalty_enabled boolean := false;
  penalty_amount numeric := 0;
  configured_penalty numeric := 0;
  doctor_balance numeric := 0;
  short_id text;
begin
  if new.status = 'cancelled'
     and old.status is distinct from 'cancelled'
     and new.cancelled_by = 'doctor'
     and coalesce(new.amount_paid, 0) > 0
     and new.payment_status in ('paid', 'partial') then

    if exists (
      select 1
      from public.wallet_transactions wt
      where wt.appointment_id = new.id
        and wt.type = 'cancel_penalty'
    ) then
      return new;
    end if;

    select data into finance_data
    from public.app_settings
    where id = 'finance';

    if finance_data is not null then
      penalty_enabled := coalesce((finance_data->>'doctorCancelPenaltyEnabled')::boolean, false);
      configured_penalty := coalesce((finance_data->>'doctorCancelPenaltyAmount')::numeric, 0);
    end if;

    if not penalty_enabled or configured_penalty <= 0 then
      return new;
    end if;

    select coalesce(available_balance, 0)
    into doctor_balance
    from public.doctor_wallets
    where doctor_id = new.doctor_id;

    penalty_amount := least(configured_penalty, greatest(doctor_balance, 0));
    if penalty_amount <= 0 then
      return new;
    end if;

    short_id := left(new.id::text, 6);

    update public.doctor_wallets
    set
      available_balance = available_balance - penalty_amount,
      updated_at = now()
    where doctor_id = new.doctor_id;

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
      penalty_amount,
      false,
      'cancel_penalty',
      new.id,
      case
        when penalty_amount < configured_penalty then
          'Cancellation penalty (partial) for appointment #' || short_id
        else
          'Cancellation penalty for appointment #' || short_id
      end
    );
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_penalize_doctor_cancel on public.appointments;
create trigger appointments_penalize_doctor_cancel
  after update on public.appointments
  for each row execute function public.penalize_doctor_wallet_on_doctor_cancel();

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
  actor_label text;
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

      actor_label := case coalesce(new.cancelled_by, '')
        when 'doctor' then 'Doctor cancellation'
        when 'patient' then 'Patient cancellation'
        when 'admin' then 'Admin cancellation'
        else 'Cancellation'
      end;

      refund_note := case
        when paid_with_chapa then
          actor_label || ' refund for appointment #' || short_id ||
          ' (service fee; gateway fee not refunded)'
        else
          actor_label || ' refund for appointment #' || short_id
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
