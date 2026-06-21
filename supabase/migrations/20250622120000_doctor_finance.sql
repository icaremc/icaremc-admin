-- Doctor wallets, ledger, payout methods/requests, and finance settings.

-- ---------------------------------------------------------------------------
-- doctor_wallets
-- ---------------------------------------------------------------------------
create table if not exists public.doctor_wallets (
  doctor_id uuid primary key references public.doctor_profiles (id) on delete cascade,
  available_balance numeric(12, 2) not null default 0 check (available_balance >= 0),
  pending_balance numeric(12, 2) not null default 0 check (pending_balance >= 0),
  currency text not null default 'ETB',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists doctor_wallets_updated_at on public.doctor_wallets;
create trigger doctor_wallets_updated_at
  before update on public.doctor_wallets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- wallet_transactions
-- ---------------------------------------------------------------------------
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctor_profiles (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  is_credit boolean not null,
  type text not null check (
    type in (
      'appointment_earning',
      'payout_hold',
      'payout_release',
      'payout_paid',
      'adjustment'
    )
  ),
  appointment_id uuid references public.appointments (id) on delete set null,
  payout_request_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_doctor_idx
  on public.wallet_transactions (doctor_id, created_at desc);

create unique index if not exists wallet_transactions_appointment_earning_uidx
  on public.wallet_transactions (appointment_id)
  where type = 'appointment_earning' and appointment_id is not null;

-- ---------------------------------------------------------------------------
-- doctor_payout_methods
-- ---------------------------------------------------------------------------
create table if not exists public.doctor_payout_methods (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctor_profiles (id) on delete cascade,
  holder_name text not null,
  account_number text not null,
  bank_name text not null,
  bank_code text,
  swift_code text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  currency text not null default 'ETB',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists doctor_payout_methods_doctor_idx
  on public.doctor_payout_methods (doctor_id, is_active, is_default);

-- ---------------------------------------------------------------------------
-- doctor_payout_requests
-- ---------------------------------------------------------------------------
create table if not exists public.doctor_payout_requests (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctor_profiles (id) on delete cascade,
  payout_method_id uuid references public.doctor_payout_methods (id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  admin_note text,
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'completed')
  ),
  created_at timestamptz not null default now(),
  payment_date timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_payout_request_id_fkey;

alter table public.wallet_transactions
  add constraint wallet_transactions_payout_request_id_fkey
  foreign key (payout_request_id) references public.doctor_payout_requests (id) on delete set null;

create index if not exists doctor_payout_requests_doctor_idx
  on public.doctor_payout_requests (doctor_id, created_at desc);

create index if not exists doctor_payout_requests_status_idx
  on public.doctor_payout_requests (status, created_at desc);

drop trigger if exists doctor_payout_requests_updated_at on public.doctor_payout_requests;
create trigger doctor_payout_requests_updated_at
  before update on public.doctor_payout_requests
  for each row execute function public.set_updated_at();

drop trigger if exists doctor_payout_methods_updated_at on public.doctor_payout_methods;
create trigger doctor_payout_methods_updated_at
  before update on public.doctor_payout_methods
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Finance settings row
-- ---------------------------------------------------------------------------
insert into public.app_settings (id, data)
values (
  'finance',
  jsonb_build_object(
    'minimumAmountWithdraw', 500,
    'platformCommissionPercent', 10
  )
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Ensure wallet exists for each doctor
-- ---------------------------------------------------------------------------
create or replace function public.ensure_doctor_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.doctor_wallets (doctor_id, currency)
  values (new.id, coalesce(new.currency, 'ETB'))
  on conflict (doctor_id) do nothing;
  return new;
end;
$$;

drop trigger if exists doctor_profiles_ensure_wallet on public.doctor_profiles;
create trigger doctor_profiles_ensure_wallet
  after insert on public.doctor_profiles
  for each row execute function public.ensure_doctor_wallet();

insert into public.doctor_wallets (doctor_id, currency)
select dp.id, coalesce(dp.currency, 'ETB')
from public.doctor_profiles dp
on conflict (doctor_id) do nothing;

-- ---------------------------------------------------------------------------
-- Credit wallet when appointment is completed
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
  if new.status = 'completed' and old.status is distinct from 'completed' then
    if new.amount_paid > 0 and new.payment_status in ('paid', 'partial') then
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
        'Earning from completed appointment'
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

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.doctor_wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.doctor_payout_methods enable row level security;
alter table public.doctor_payout_requests enable row level security;

drop policy if exists "doctor_wallets_select_own" on public.doctor_wallets;
create policy "doctor_wallets_select_own" on public.doctor_wallets
  for select using (auth.uid() = doctor_id);

drop policy if exists "wallet_transactions_select_own" on public.wallet_transactions;
create policy "wallet_transactions_select_own" on public.wallet_transactions
  for select using (auth.uid() = doctor_id);

drop policy if exists "doctor_payout_methods_select_own" on public.doctor_payout_methods;
create policy "doctor_payout_methods_select_own" on public.doctor_payout_methods
  for select using (auth.uid() = doctor_id);

drop policy if exists "doctor_payout_methods_insert_own" on public.doctor_payout_methods;
create policy "doctor_payout_methods_insert_own" on public.doctor_payout_methods
  for insert with check (auth.uid() = doctor_id);

drop policy if exists "doctor_payout_methods_update_own" on public.doctor_payout_methods;
create policy "doctor_payout_methods_update_own" on public.doctor_payout_methods
  for update using (auth.uid() = doctor_id);

drop policy if exists "doctor_payout_requests_select_own" on public.doctor_payout_requests;
create policy "doctor_payout_requests_select_own" on public.doctor_payout_requests
  for select using (auth.uid() = doctor_id);

drop policy if exists "doctor_payout_requests_insert_own" on public.doctor_payout_requests;
create policy "doctor_payout_requests_insert_own" on public.doctor_payout_requests
  for insert with check (auth.uid() = doctor_id);

drop policy if exists "app_settings_finance_read_authenticated" on public.app_settings;
create policy "app_settings_finance_read_authenticated" on public.app_settings
  for select
  using (auth.uid() is not null and id in ('payment', 'finance'));

-- ---------------------------------------------------------------------------
-- Doctor payout request (atomic balance hold)
-- ---------------------------------------------------------------------------
create or replace function public.request_doctor_payout(
  p_amount numeric,
  p_payout_method_id uuid,
  p_note text default null
)
returns public.doctor_payout_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doctor_id uuid := auth.uid();
  v_wallet public.doctor_wallets%rowtype;
  v_min_withdraw numeric := 500;
  v_finance jsonb;
  v_request public.doctor_payout_requests%rowtype;
  v_method public.doctor_payout_methods%rowtype;
begin
  if v_doctor_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  select data into v_finance from public.app_settings where id = 'finance';
  if v_finance is not null then
    v_min_withdraw := coalesce((v_finance->>'minimumAmountWithdraw')::numeric, 500);
  end if;

  if p_amount < v_min_withdraw then
    raise exception 'Minimum withdrawal is %', v_min_withdraw;
  end if;

  select * into v_method
  from public.doctor_payout_methods
  where id = p_payout_method_id
    and doctor_id = v_doctor_id
    and is_active = true;

  if not found then
    raise exception 'Payout method not found';
  end if;

  select * into v_wallet
  from public.doctor_wallets
  where doctor_id = v_doctor_id
  for update;

  if not found then
    raise exception 'Wallet not found';
  end if;

  if v_wallet.available_balance < p_amount then
    raise exception 'Insufficient wallet balance';
  end if;

  update public.doctor_wallets
  set
    available_balance = available_balance - p_amount,
    pending_balance = pending_balance + p_amount,
    updated_at = now()
  where doctor_id = v_doctor_id;

  insert into public.doctor_payout_requests (
    doctor_id,
    payout_method_id,
    amount,
    note,
    status
  )
  values (
    v_doctor_id,
    p_payout_method_id,
    p_amount,
    nullif(trim(p_note), ''),
    'pending'
  )
  returning * into v_request;

  insert into public.wallet_transactions (
    doctor_id,
    amount,
    is_credit,
    type,
    payout_request_id,
    note
  )
  values (
    v_doctor_id,
    p_amount,
    false,
    'payout_hold',
    v_request.id,
    'Payout request hold'
  );

  return v_request;
end;
$$;

grant execute on function public.request_doctor_payout(numeric, uuid, text) to authenticated;
