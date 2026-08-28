alter table public.app_subscriptions
  add column if not exists admin_receipt_url text;

drop function if exists public.admin_grant_app_subscription(uuid, int);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'app-membership-receipts',
  'app-membership-receipts',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "app_membership_receipts_admin_read" on storage.objects;
create policy "app_membership_receipts_admin_read" on storage.objects
  for select
  to authenticated
  using (bucket_id = 'app-membership-receipts' and public.is_portal_admin());

create or replace function public.admin_grant_app_subscription(
  p_patient_id uuid,
  p_duration_days int default null,
  p_amount_paid numeric default null,
  p_receipt_url text default null
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

  if p_receipt_url is null or length(trim(p_receipt_url)) = 0 then
    raise exception 'Receipt is required';
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
    chapa_tx_ref,
    admin_receipt_url
  ) values (
    p_patient_id,
    'yearly',
    'active',
    starts,
    ends,
    round(coalesce(p_amount_paid, 0)::numeric, 2),
    coalesce(nullif(settings->>'currency', ''), 'ETB'),
    'admin',
    null,
    trim(p_receipt_url)
  )
  returning * into new_row;

  return new_row;
end;
$$;

revoke all on function public.admin_grant_app_subscription(uuid, int, numeric, text) from public;
grant execute on function public.admin_grant_app_subscription(uuid, int, numeric, text)
  to authenticated, service_role;

notify pgrst, 'reload schema';
