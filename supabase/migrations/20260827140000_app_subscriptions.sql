create table if not exists public.app_subscriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users (id) on delete cascade,
  plan text not null default 'yearly'
    check (plan in ('yearly')),
  status text not null default 'active'
    check (status in ('active', 'expired', 'cancelled')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  amount_paid numeric(12, 2) not null default 0,
  currency text not null default 'ETB',
  payment_method text,
  chapa_tx_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists app_subscriptions_tx_ref_uidx
  on public.app_subscriptions (chapa_tx_ref)
  where chapa_tx_ref is not null;

create unique index if not exists app_subscriptions_one_active_uidx
  on public.app_subscriptions (patient_id)
  where status = 'active';

create index if not exists app_subscriptions_patient_idx
  on public.app_subscriptions (patient_id, status, ends_at desc);

comment on table public.app_subscriptions is
  'Prepaid yearly app membership. Access is valid while status=active and ends_at > now().';

alter table public.app_subscriptions enable row level security;

drop policy if exists app_subscriptions_select_own on public.app_subscriptions;
create policy app_subscriptions_select_own
  on public.app_subscriptions
  for select
  to authenticated
  using (patient_id = auth.uid());

insert into public.app_settings (id, data, updated_at)
values (
  'subscription',
  jsonb_build_object(
    'enabled', true,
    'yearlyPrice', 1000,
    'currency', 'ETB',
    'durationDays', 365,
    'requireForAppAccess', true
  ),
  now()
)
on conflict (id) do nothing;

create or replace function public.activate_app_subscription(
  p_tx_ref text,
  p_amount_paid numeric,
  p_payment_method text default 'chapa'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  settings jsonb;
  price numeric;
  duration_days integer;
  enabled boolean;
  existing_id uuid;
  active_row public.app_subscriptions%rowtype;
  starts timestamptz;
  ends timestamptz;
  new_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_tx_ref is null or length(trim(p_tx_ref)) < 8 then
    raise exception 'Invalid payment reference';
  end if;

  select data into settings
  from public.app_settings
  where id = 'subscription';

  enabled := coalesce((settings->>'enabled')::boolean, true);
  if not enabled then
    raise exception 'Subscriptions are not enabled';
  end if;

  price := coalesce(nullif(settings->>'yearlyPrice', '')::numeric, 1000);
  duration_days := coalesce(nullif(settings->>'durationDays', '')::int, 365);
  if duration_days < 1 then
    duration_days := 365;
  end if;

  if coalesce(p_amount_paid, 0) + 0.01 < price then
    raise exception 'Full yearly payment is required';
  end if;

  select id into existing_id
  from public.app_subscriptions
  where chapa_tx_ref = trim(p_tx_ref)
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  select *
  into active_row
  from public.app_subscriptions
  where patient_id = uid
    and status = 'active'
    and ends_at > now()
  order by ends_at desc
  limit 1;

  if found then
    update public.app_subscriptions
    set status = 'expired',
        updated_at = now()
    where id = active_row.id;

    starts := active_row.ends_at;
    ends := active_row.ends_at + (duration_days::text || ' days')::interval;
  else
    update public.app_subscriptions
    set status = 'expired',
        updated_at = now()
    where patient_id = uid
      and status = 'active';

    starts := now();
    ends := now() + (duration_days::text || ' days')::interval;
  end if;

  insert into public.app_subscriptions (
    patient_id,
    plan,
    status,
    starts_at,
    ends_at,
    amount_paid,
    currency,
    payment_method,
    chapa_tx_ref
  ) values (
    uid,
    'yearly',
    'active',
    starts,
    ends,
    round(p_amount_paid::numeric, 2),
    coalesce(nullif(settings->>'currency', ''), 'ETB'),
    coalesce(nullif(trim(p_payment_method), ''), 'chapa'),
    trim(p_tx_ref)
  )
  returning id into new_id;

  return new_id;
exception
  when unique_violation then
    select id into existing_id
    from public.app_subscriptions
    where chapa_tx_ref = trim(p_tx_ref)
    limit 1;
    if existing_id is not null then
      return existing_id;
    end if;
    raise;
end;
$$;

revoke all on function public.activate_app_subscription(text, numeric, text)
  from public;
grant execute on function public.activate_app_subscription(text, numeric, text)
  to authenticated;
grant select on table public.app_subscriptions to authenticated;

create or replace function public.cancel_own_app_subscription()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.app_subscriptions
  set status = 'cancelled',
      updated_at = now()
  where patient_id = auth.uid()
    and status = 'active';
end;
$$;

revoke all on function public.cancel_own_app_subscription() from public;
grant execute on function public.cancel_own_app_subscription() to authenticated;
