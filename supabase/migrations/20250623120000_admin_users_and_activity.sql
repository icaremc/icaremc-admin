-- Portal admin accounts and activity audit logs.

-- ---------------------------------------------------------------------------
-- admin_users
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  admin_role text not null default 'viewer' check (
    admin_role in ('super_admin', 'content_admin', 'support', 'viewer')
  ),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_users_email_idx on public.admin_users (email);
create index if not exists admin_users_role_idx on public.admin_users (admin_role, is_active);

drop trigger if exists admin_users_updated_at on public.admin_users;
create trigger admin_users_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

alter table public.admin_users enable row level security;

drop policy if exists "admin_users_select_authenticated" on public.admin_users;
create policy "admin_users_select_authenticated" on public.admin_users
  for select using (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- admin_activity_logs (portal admin actions)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  actor_email text,
  actor_name text,
  actor_role text,
  event_type text not null,
  event_label text not null,
  resource_type text,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists admin_activity_logs_created_idx
  on public.admin_activity_logs (created_at desc);

create index if not exists admin_activity_logs_actor_idx
  on public.admin_activity_logs (actor_id, created_at desc);

create index if not exists admin_activity_logs_event_idx
  on public.admin_activity_logs (event_type, created_at desc);

alter table public.admin_activity_logs enable row level security;

drop policy if exists "admin_activity_logs_select_authenticated" on public.admin_activity_logs;
create policy "admin_activity_logs_select_authenticated" on public.admin_activity_logs
  for select using (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- platform_activity_logs (mobile app: mothers, doctors)
-- ---------------------------------------------------------------------------
create table if not exists public.platform_activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  actor_name text,
  actor_type text not null check (actor_type in ('mother', 'doctor', 'admin', 'anonymous')),
  event_type text not null,
  event_label text not null,
  resource_type text,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists platform_activity_logs_created_idx
  on public.platform_activity_logs (created_at desc);

create index if not exists platform_activity_logs_actor_idx
  on public.platform_activity_logs (actor_id, created_at desc);

create index if not exists platform_activity_logs_type_idx
  on public.platform_activity_logs (actor_type, event_type, created_at desc);

alter table public.platform_activity_logs enable row level security;

drop policy if exists "platform_activity_logs_select_authenticated" on public.platform_activity_logs;
create policy "platform_activity_logs_select_authenticated" on public.platform_activity_logs
  for select using (auth.uid() is not null);
