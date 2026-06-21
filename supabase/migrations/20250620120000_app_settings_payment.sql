-- Admin-managed app settings (payment gateways, etc.) — Zemen-compatible shape.

create table if not exists public.app_settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists app_settings_updated_at on public.app_settings;
create trigger app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

alter table public.app_settings enable row level security;

-- Mobile app reads Chapa keys after sign-in (service role used by admin API for writes).
drop policy if exists "app_settings_payment_read_authenticated" on public.app_settings;
create policy "app_settings_payment_read_authenticated" on public.app_settings
  for select
  using (auth.uid() is not null and id = 'payment');

-- Seed empty payment row (admin fills keys in portal).
insert into public.app_settings (id, data)
values (
  'payment',
  jsonb_build_object(
    'chapa',
    jsonb_build_object(
      'name', 'Chapa',
      'enable', false,
      'isActive', false,
      'isSandbox', false,
      'publicKey', '',
      'secretKey', '',
      'feePercent', 3.5
    )
  )
)
on conflict (id) do nothing;
