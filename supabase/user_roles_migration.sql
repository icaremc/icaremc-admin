-- User roles for admin portal + mobile app accounts.
-- Safe to re-run.
--
-- Run after: admin_policies.sql

-- ---------------------------------------------------------------------------
-- Role column on profiles
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists role text not null default 'mother';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'mother', 'partner'));

comment on column public.profiles.role is
  'Portal/app role: admin (portal access), mother, partner.';

-- Backfill from legacy is_admin flag
update public.profiles
set role = 'admin'
where is_admin = true
  and role <> 'admin';

update public.profiles
set account_type = 'Partner'
where role = 'partner'
  and coalesce(account_type, '') in ('', 'Mother');

update public.profiles
set account_type = 'Mother'
where role = 'mother'
  and coalesce(account_type, '') = '';

-- Keep is_admin aligned with role
update public.profiles
set is_admin = (role = 'admin')
where is_admin is distinct from (role = 'admin');

create or replace function public.sync_profile_role_flags()
returns trigger
language plpgsql
as $$
begin
  if new.role not in ('admin', 'mother', 'partner') then
    raise exception 'Invalid role: %', new.role;
  end if;

  new.is_admin := (new.role = 'admin');

  if new.role = 'partner' then
    new.account_type := coalesce(nullif(new.account_type, ''), 'Partner');
  elsif new.role = 'mother' then
    new.account_type := coalesce(nullif(new.account_type, ''), 'Mother');
  elsif new.role = 'admin' and coalesce(new.account_type, '') = '' then
    new.account_type := 'Admin';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_sync_role_flags on public.profiles;
create trigger profiles_sync_role_flags
  before insert or update of role, account_type
  on public.profiles
  for each row execute function public.sync_profile_role_flags();

-- ---------------------------------------------------------------------------
-- Admin check uses role + legacy is_admin
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (is_admin = true or role = 'admin')
  )
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

-- ---------------------------------------------------------------------------
-- Sign-up hook: read role from auth metadata
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'mother');
begin
  if v_role not in ('admin', 'mother', 'partner') then
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
    v_role = 'admin',
    coalesce(nullif(new.raw_user_meta_data->>'locale', ''), 'en')
  );
  return new;
end;
$$;

-- Admins may update any profile role from the portal
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin())
  with check (public.is_admin());

notify pgrst, 'reload schema';
