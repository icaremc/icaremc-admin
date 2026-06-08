-- Separate admin portal accounts from mobile app profiles.
-- Run after: admin_policies.sql, user_roles_migration.sql
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- admin_users table
-- ---------------------------------------------------------------------------

create table if not exists public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  admin_role text not null default 'content_admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_users_role_check check (
    admin_role in ('super_admin', 'content_admin', 'support', 'viewer')
  )
);

create unique index if not exists admin_users_email_uidx
  on public.admin_users (lower(email));

create index if not exists admin_users_role_idx
  on public.admin_users (admin_role)
  where is_active = true;

comment on table public.admin_users is
  'Admin portal accounts with portal-specific roles (separate from mobile app profiles).';

comment on column public.admin_users.admin_role is
  'super_admin | content_admin | support | viewer';

drop trigger if exists admin_users_updated_at on public.admin_users;
create trigger admin_users_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

-- Migrate legacy profile-based admins
insert into public.admin_users (id, email, full_name, admin_role, is_active)
select
  p.id,
  coalesce(u.email, p.id::text),
  p.full_name,
  'super_admin',
  true
from public.profiles p
join auth.users u on u.id = p.id
where p.is_admin = true
   or p.role = 'admin'
on conflict (id) do update
set
  email = excluded.email,
  full_name = coalesce(excluded.full_name, admin_users.full_name),
  is_active = true,
  updated_at = now();

-- Mobile profiles should no longer carry portal admin flags
update public.profiles
set
  role = case when role = 'admin' then 'mother' else role end,
  is_admin = false,
  account_type = case
    when role = 'admin' or is_admin = true then coalesce(nullif(account_type, ''), 'Admin')
    else account_type
  end
where role = 'admin'
   or is_admin = true;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('mother', 'partner'));

-- ---------------------------------------------------------------------------
-- Admin helpers (used by RLS + portal)
-- ---------------------------------------------------------------------------

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where id = auth.uid()
      and is_active = true
      and admin_role = 'super_admin'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where id = auth.uid()
      and is_active = true
  )
  or exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (is_admin = true or role = 'admin')
  )
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

create or replace function public.admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select admin_role
  from public.admin_users
  where id = auth.uid()
    and is_active = true
  limit 1;
$$;

-- Keep profile role sync limited to mobile app roles
create or replace function public.sync_profile_role_flags()
returns trigger
language plpgsql
as $$
begin
  if new.role not in ('mother', 'partner') then
    raise exception 'Invalid role: %', new.role;
  end if;

  new.is_admin := false;

  if new.role = 'partner' then
    new.account_type := coalesce(nullif(new.account_type, ''), 'Partner');
  elsif new.role = 'mother' then
    new.account_type := coalesce(nullif(new.account_type, ''), 'Mother');
  end if;

  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'mother');
begin
  if v_role not in ('mother', 'partner') then
    v_role := 'mother';
  end if;

  insert into public.profiles (
    id, full_name, phone, account_type, role, is_admin, locale
  )
  values (
    new.id,
    nullif(coalesce(new.raw_user_meta_data->>'full_name', ''), ''),
    nullif(coalesce(new.raw_user_meta_data->>'phone', ''), ''),
    coalesce(new.raw_user_meta_data->>'account_type', 'Mother'),
    v_role,
    false,
    coalesce(nullif(new.raw_user_meta_data->>'locale', ''), 'en')
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS for admin_users
-- ---------------------------------------------------------------------------

alter table public.admin_users enable row level security;

drop policy if exists "admin_users_select" on public.admin_users;
create policy "admin_users_select" on public.admin_users
  for select using (
    id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "admin_users_insert" on public.admin_users;
create policy "admin_users_insert" on public.admin_users
  for insert with check (public.is_super_admin());

drop policy if exists "admin_users_update" on public.admin_users;
create policy "admin_users_update" on public.admin_users
  for update using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "admin_users_delete" on public.admin_users;
create policy "admin_users_delete" on public.admin_users
  for delete using (public.is_super_admin());

notify pgrst, 'reload schema';
