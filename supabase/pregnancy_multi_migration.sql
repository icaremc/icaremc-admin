-- Multiple pregnancies per mother (admin reads public.mothers).
-- Run in Supabase SQL Editor.

alter table public.mothers
  drop constraint if exists mothers_user_id_key;

alter table public.mothers
  add column if not exists status text not null default 'active'
    check (status in ('active', 'delivered')),
  add column if not exists delivered_at date,
  add column if not exists child_local_id text;

create index if not exists mothers_user_status_idx
  on public.mothers (user_id, status);

create unique index if not exists mothers_one_active_per_user_idx
  on public.mothers (user_id)
  where status = 'active';

notify pgrst, 'reload schema';
