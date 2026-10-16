-- 20261016000800 tables for later phases (blueprint: Data model), empty for now and
-- protected by row-level security, plus the five built-in agents for every business.
--   staff_services  who can do which service (owners edit; Team)
--   agents          built-in / template / custom agents (owners edit; staff read)
--   agent_runs      every time an agent acted (written by the server; members read)
--   notifications   every text or email sent (written by the server; members read)
--   audit_log       who changed what (written by the server; members read; append-only)
-- Built-in agents: receptionist, booking, sales, support (live) and admin_assistant
-- (paused: not built yet). A trigger gives every new business the same five.
-- Keeps all existing data (new objects only; idempotent seed).
-- Rollback: drop trigger businesses_seed_agents on public.businesses; drop function
--   public.seed_built_in_agents(); drop table public.audit_log, public.notifications,
--   public.agent_runs, public.agents, public.staff_services;

create table if not exists public.staff_services (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  staff_id     uuid not null references public.staff(id) on delete cascade,
  service_id   uuid not null references public.services(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (staff_id, service_id)
);
create index if not exists staff_services_business_idx on public.staff_services (business_id);

create table if not exists public.agents (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  kind             text not null check (kind in ('built_in', 'template', 'custom')),
  key              text,            -- built-in agents: receptionist, booking, sales, support, admin_assistant
  name             text not null,
  job_text         text not null default '',
  trigger          jsonb,           -- custom agents (Phase 2)
  allowed_actions  jsonb not null default '[]'::jsonb,
  status           text not null default 'draft' check (status in ('draft', 'test', 'live', 'paused')),
  created_at       timestamptz not null default now(),
  unique (business_id, key)
);
create index if not exists agents_business_idx on public.agents (business_id);

create table if not exists public.agent_runs (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  agent_id     uuid references public.agents(id) on delete set null,
  input        jsonb,
  actions      jsonb not null default '[]'::jsonb,
  result       jsonb,
  tokens       int,
  created_at   timestamptz not null default now()
);
create index if not exists agent_runs_business_idx on public.agent_runs (business_id, created_at);

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  "to"         text not null,
  channel      text not null check (channel in ('sms', 'email')),
  template     text not null,
  status       text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  booking_id   uuid references public.bookings(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists notifications_business_idx on public.notifications (business_id, created_at);

create table if not exists public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  actor_type   text not null check (actor_type in ('user', 'agent', 'system')),
  actor_id     text,
  action       text not null,
  before       jsonb,
  after        jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists audit_log_business_idx on public.audit_log (business_id, created_at);

alter table public.staff_services enable row level security;
alter table public.agents enable row level security;
alter table public.agent_runs enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- ---------------------------------------------------------------- policies
do $$
declare
  t text;
begin
  -- Owners edit; members read.
  foreach t in array array['staff_services', 'agents'] loop
    execute format('drop policy if exists "%1$s: members read" on public.%1$I', t);
    execute format('create policy "%1$s: members read" on public.%1$I for select to authenticated using ((select public.is_member(business_id)))', t);
    execute format('drop policy if exists "%1$s: owners insert" on public.%1$I', t);
    execute format('create policy "%1$s: owners insert" on public.%1$I for insert to authenticated with check ((select public.is_owner(business_id)))', t);
    execute format('drop policy if exists "%1$s: owners update" on public.%1$I', t);
    execute format('create policy "%1$s: owners update" on public.%1$I for update to authenticated using ((select public.is_owner(business_id))) with check ((select public.is_owner(business_id)))', t);
    execute format('drop policy if exists "%1$s: owners delete" on public.%1$I', t);
    execute format('create policy "%1$s: owners delete" on public.%1$I for delete to authenticated using ((select public.is_owner(business_id)))', t);
  end loop;
  -- Written only by trusted server jobs (service role); members read; nobody edits.
  foreach t in array array['agent_runs', 'notifications', 'audit_log'] loop
    execute format('drop policy if exists "%1$s: members read" on public.%1$I', t);
    execute format('create policy "%1$s: members read" on public.%1$I for select to authenticated using ((select public.is_member(business_id)))', t);
    execute format('drop policy if exists "%1$s: no direct insert" on public.%1$I', t);
    execute format('create policy "%1$s: no direct insert" on public.%1$I for insert to authenticated with check (false)', t);
    execute format('drop policy if exists "%1$s: no direct update" on public.%1$I', t);
    execute format('create policy "%1$s: no direct update" on public.%1$I for update to authenticated using (false)', t);
    execute format('drop policy if exists "%1$s: no direct delete" on public.%1$I', t);
    execute format('create policy "%1$s: no direct delete" on public.%1$I for delete to authenticated using (false)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- built-in agents
create or replace function public.seed_built_in_agents_for(target_business uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.agents (business_id, kind, key, name, job_text, status) values
    (target_business, 'built_in', 'receptionist', 'Receptionist', 'Understand what the customer wants and route it.', 'live'),
    (target_business, 'built_in', 'booking', 'Booking', 'Turn a booking intent into a complete booking request.', 'live'),
    (target_business, 'built_in', 'sales', 'Sales', 'Answer new customers'' questions from the business''s own details.', 'live'),
    (target_business, 'built_in', 'support', 'Support', 'Help existing customers and pass anything else to the owner.', 'live'),
    (target_business, 'built_in', 'admin_assistant', 'Your assistant', 'Onboard the owner, then oversee the AI team.', 'paused')
  on conflict (business_id, key) do nothing;
$$;

create or replace function public.seed_built_in_agents()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_built_in_agents_for(new.id);
  return new;
end;
$$;

drop trigger if exists businesses_seed_agents on public.businesses;
create trigger businesses_seed_agents
  after insert on public.businesses
  for each row execute function public.seed_built_in_agents();

select public.seed_built_in_agents_for(id) from public.businesses;

revoke execute on function public.seed_built_in_agents_for(uuid) from public, anon, authenticated;
revoke execute on function public.seed_built_in_agents() from public, anon, authenticated;
