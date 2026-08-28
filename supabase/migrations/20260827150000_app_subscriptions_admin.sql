-- Admin portal: grant/revoke app membership (stacking matches activate_app_subscription).

drop policy if exists "app_settings_subscription_read_public" on public.app_settings;
create policy "app_settings_subscription_read_public" on public.app_settings
  for select
  using (id = 'subscription');

create or replace function public.admin_grant_app_subscription(
  p_patient_id uuid,
  p_duration_days int default null
)
returns public.app_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  settings jsonb;
  duration_days integer;
  active_row public.app_subscriptions%rowtype;
  starts timestamptz;
  ends timestamptz;
  new_row public.app_subscriptions%rowtype;
begin
  if auth.role() <> 'service_role' and not public.is_portal_admin() then
    raise exception 'Forbidden';
  end if;

  if p_patient_id is null then
    raise exception 'patient_id is required';
  end if;

  select data into settings
  from public.app_settings
  where id = 'subscription';

  duration_days := coalesce(
    p_duration_days,
    nullif(settings->>'durationDays', '')::int,
    365
  );
  if duration_days < 1 then
    duration_days := 365;
  end if;

  select *
  into active_row
  from public.app_subscriptions
  where patient_id = p_patient_id
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
    where patient_id = p_patient_id
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
    p_patient_id,
    'yearly',
    'active',
    starts,
    ends,
    0,
    coalesce(nullif(settings->>'currency', ''), 'ETB'),
    'admin',
    null
  )
  returning * into new_row;

  return new_row;
end;
$$;

create or replace function public.admin_revoke_app_subscription(p_patient_id uuid)
returns public.app_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  revoked_row public.app_subscriptions%rowtype;
begin
  if auth.role() <> 'service_role' and not public.is_portal_admin() then
    raise exception 'Forbidden';
  end if;

  update public.app_subscriptions
  set status = 'cancelled',
      updated_at = now()
  where patient_id = p_patient_id
    and status = 'active'
  returning * into revoked_row;

  return revoked_row;
end;
$$;

revoke all on function public.admin_grant_app_subscription(uuid, int) from public;
grant execute on function public.admin_grant_app_subscription(uuid, int)
  to authenticated, service_role;

revoke all on function public.admin_revoke_app_subscription(uuid) from public;
grant execute on function public.admin_revoke_app_subscription(uuid)
  to authenticated, service_role;

notify pgrst, 'reload schema';
