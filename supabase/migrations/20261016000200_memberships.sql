-- 20261016000200 memberships: who can access a business, and how (blueprint: Data model,
-- Security). Adds public.users (one row per Google account, with the builder flag),
-- memberships (owner | staff), and the security-definer helpers is_member() and
-- is_owner() that every row-level security policy uses.
-- Keeps all existing data (only new objects).
-- Rollback: drop trigger on_auth_user_created on auth.users; drop function
--   public.handle_new_user(), public.is_member(uuid), public.is_owner(uuid);
--   drop table public.memberships, public.users;

-- ---------------------------------------------------------------- users
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text,
  avatar_url  text,
  -- builder console access (blueprint: Surfaces). Only set by the platform, never by users.
  is_builder  boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.users enable row level security;

-- Copy each new Google account into public.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts that existed before this migration.
insert into public.users (id, email, name, avatar_url)
select u.id, u.email,
       coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
       u.raw_user_meta_data->>'avatar_url'
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------- memberships
create table if not exists public.memberships (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  business_id  uuid not null references public.businesses(id) on delete cascade,
  role         text not null check (role in ('owner', 'staff')),
  status       text not null default 'active' check (status in ('active', 'invited', 'removed')),
  created_at   timestamptz not null default now(),
  unique (user_id, business_id)
);
create index if not exists memberships_business_idx on public.memberships (business_id);
create index if not exists memberships_user_idx on public.memberships (user_id);
alter table public.memberships enable row level security;

-- ---------------------------------------------------------------- helpers
-- security definer so policies can check memberships without recursing into the
-- memberships table's own policies; search_path = '' so nothing can be shadowed.
create or replace function public.is_member(target_business uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.business_id = target_business
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create or replace function public.is_owner(target_business uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.business_id = target_business
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = 'owner'
  );
$$;

revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.is_owner(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated, service_role;
grant execute on function public.is_owner(uuid) to authenticated, service_role;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
