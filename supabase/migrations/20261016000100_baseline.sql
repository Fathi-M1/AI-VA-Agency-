-- 20261016000100 baseline: today's production schema, captured from the repo's legacy
-- SQL (supabase/legacy: schema.sql + 002 + 004 + 005). Every statement is idempotent,
-- so it is safe on the existing production database (where all of it already ran) and
-- rebuilds a fresh database from scratch. No data changes here.
-- Rollback: nothing to undo on production (it changes nothing that exists). On a fresh
-- database, drop the schema.


-- ================================================================ legacy schema.sql
-- AI VA Agency: multi-tenant schema.
-- Every table carries business_id; one database serves many businesses, isolated by
-- business_id. A new business (any domain) = new rows, not new code.
-- Apply: Supabase dashboard -> SQL Editor -> paste this file -> Run. Then run seed.sql.

-- ---------------------------------------------------------------- businesses
create table if not exists public.businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  -- per-business flexible config: hours, services[], rules, emergency_line, timezone
  config      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- contacts
-- A person, deduped per business by email (emails are stored lower-cased).
create table if not exists public.contacts (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  name         text,
  email        text,
  phone        text,
  created_at   timestamptz not null default now(),
  constraint contacts_business_email_key unique (business_id, email)
);

-- ---------------------------------------------------------------- conversations
create table if not exists public.conversations (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  contact_id   uuid references public.contacts(id) on delete set null,
  channel      text not null,
  status       text not null default 'open',
  started_at   timestamptz not null default now()
);
create index if not exists conversations_business_idx on public.conversations (business_id);
create index if not exists conversations_contact_idx on public.conversations (contact_id);

-- ---------------------------------------------------------------- messages
create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  role             text not null check (role in ('user', 'agent')),
  -- which agent spoke; null for user messages and for the safety-net emergency reply
  agent            text check (agent in ('receptionist', 'booking', 'sales', 'support')),
  content          text not null,
  created_at       timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
create index if not exists messages_business_idx on public.messages (business_id);

-- ---------------------------------------------------------------- bookings
create table if not exists public.bookings (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references public.businesses(id) on delete cascade,
  contact_id         uuid references public.contacts(id) on delete set null,
  conversation_id    uuid references public.conversations(id) on delete set null,
  service            text not null,
  slot_start         timestamptz not null,
  slot_end           timestamptz not null,
  calcom_booking_id  text not null, -- Cal.com booking uid (v2 addresses bookings by uid)
  status             text not null,
  created_at         timestamptz not null default now()
);
create index if not exists bookings_business_idx on public.bookings (business_id);
create index if not exists bookings_contact_idx on public.bookings (contact_id, slot_start);

-- ---------------------------------------------------------------- escalations
create table if not exists public.escalations (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  contact_id       uuid references public.contacts(id) on delete set null,
  conversation_id  uuid references public.conversations(id) on delete set null,
  reason           text not null,
  status           text not null default 'open',
  created_at       timestamptz not null default now()
);
create index if not exists escalations_business_idx on public.escalations (business_id);

-- ---------------------------------------------------------------- access
-- Row Level Security on, with no policies: the public anon/publishable key can read or
-- write nothing. The app talks to these tables only from the server with the service
-- role key, which bypasses RLS.
alter table public.businesses    enable row level security;
alter table public.contacts      enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.bookings      enable row level security;
alter table public.escalations   enable row level security;

-- ================================================================ legacy 002
-- 002: allow the Sales and Support agents in messages.agent.
-- Apply: Supabase dashboard -> SQL Editor -> paste -> Run (after schema.sql / seed.sql).
-- Postgres names an inline column check "<table>_<column>_check".
alter table public.messages drop constraint if exists messages_agent_check;
alter table public.messages
  add constraint messages_agent_check
  check (agent in ('receptionist', 'booking', 'sales', 'support'));

-- ================================================================ legacy 004 (schema part)
-- 004: owner setup, business type packs, booking requests, Today screen.
-- Apply: Supabase dashboard -> SQL Editor -> paste this whole file -> Run.
-- Safe to re-run (IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS).
-- New tables follow the existing rule: RLS on, no policies (server-only access with the
-- service role key, which bypasses RLS).

-- ---------------------------------------------------------------- 5.1 businesses
alter table public.businesses
  add column if not exists vertical text check (vertical in ('dental', 'salon', 'aircon')),
  add column if not exists booking_slug text unique,
  add column if not exists owner_mobile text,
  add column if not exists setup_completed_at timestamptz,
  add column if not exists calendar_mode text not null default 'requests'
    check (calendar_mode in ('calcom', 'requests')),
  add column if not exists last_seen_at timestamptz;

-- ---------------------------------------------------------------- 5.2 services
create table if not exists public.services (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  name              text not null,
  -- per unit for pricing_type = 'per_unit'
  duration_minutes  int not null check (duration_minutes > 0),
  -- null = the team confirms the price
  price_php         numeric(10, 2),
  pricing_type      text not null default 'fixed'
    check (pricing_type in ('fixed', 'by_hair_length', 'per_unit')),
  -- by_hair_length: {"short":{"price_php":n|null,"duration_minutes":n},"shoulder":{...},"long":{...}}
  variants          jsonb,
  active            boolean not null default true,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now()
);
create index if not exists services_business_idx on public.services (business_id);

-- ---------------------------------------------------------------- 5.3 staff
create table if not exists public.staff (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  name         text not null,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists staff_business_idx on public.staff (business_id);

-- ---------------------------------------------------------------- 5.4 staff_hours
-- Several rows on one weekday = split shifts (e.g. a lunch break). 0 = Sunday.
create table if not exists public.staff_hours (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  staff_id     uuid not null references public.staff(id) on delete cascade,
  weekday      smallint not null check (weekday between 0 and 6),
  start_time   time not null,
  end_time     time not null,
  check (end_time > start_time)
);
create index if not exists staff_hours_business_idx on public.staff_hours (business_id);
create index if not exists staff_hours_staff_idx on public.staff_hours (staff_id);

-- ---------------------------------------------------------------- 5.5 bookings
alter table public.bookings
  add column if not exists staff_id uuid references public.staff(id) on delete set null,
  add column if not exists details jsonb,
  add column if not exists requested_time_text text,
  add column if not exists customer_mobile text,
  add column if not exists decline_reason text;

-- Booking requests have no time (or Cal.com booking) until the owner confirms them.
alter table public.bookings alter column slot_start drop not null;
alter table public.bookings alter column slot_end drop not null;
alter table public.bookings alter column calcom_booking_id drop not null;
alter table public.bookings drop constraint if exists bookings_confirmed_has_slot;
alter table public.bookings
  add constraint bookings_confirmed_has_slot check (status <> 'confirmed' or slot_start is not null);
-- status has no check constraint, so 'requested' / 'confirmed' / 'declined' are allowed
-- alongside the existing Cal.com values.
create index if not exists bookings_staff_idx on public.bookings (staff_id, slot_start);

-- ---------------------------------------------------------------- 5.6 contacts
alter table public.contacts
  add column if not exists mobile text,
  add column if not exists consent_at timestamptz;
create unique index if not exists contacts_business_mobile_key
  on public.contacts (business_id, mobile) where mobile is not null;

-- ---------------------------------------------------------------- access
alter table public.services    enable row level security;
alter table public.staff       enable row level security;
alter table public.staff_hours enable row level security;


-- ================================================================ legacy 005
-- 005: more business types, brand color + public details, the tap-through booking
-- page (reference codes, preferred day / time of day, form vs chat source).
-- Apply: Supabase dashboard -> SQL Editor -> paste this whole file -> Run (after 004).
-- Safe to re-run.

-- ---------------------------------------------------------------- businesses
-- Business types are checked in code against the loaded packs (web/verticals/*.json),
-- so a new pack needs no database change.
alter table public.businesses drop constraint if exists businesses_vertical_check;

alter table public.businesses
  add column if not exists brand_color text,
  add column if not exists business_address text,
  add column if not exists public_contact text; -- phone number or Messenger link shown to customers

-- ---------------------------------------------------------------- bookings
alter table public.bookings
  add column if not exists reference_code text,
  add column if not exists preferred_day date,
  add column if not exists preferred_time_of_day text
    check (preferred_time_of_day in ('morning', 'afternoon', 'evening')),
  add column if not exists source text not null default 'chat'
    check (source in ('chat', 'form'));

create unique index if not exists bookings_business_reference_key
  on public.bookings (business_id, reference_code) where reference_code is not null;

-- ---------------------------------------------------------------- setup save
-- Same one-transaction save as 004, now also saving brand_color, business_address and
-- public_contact. The business type itself is checked against the packs by the server
-- action; here it must at least be a well-formed id.
create or replace function public.create_business_setup(p jsonb)
returns table (new_business_id uuid, new_slug text)
language plpgsql
as $$
declare
  v_id uuid;
  v_base text := coalesce(nullif(p->>'base_slug', ''), 'business');
  v_slug text := v_base;
  v_n int := 1;
  v_svc jsonb;
  v_staff jsonb;
  v_staff_id uuid;
  v_hour jsonb;
begin
  if coalesce(p->>'vertical', '') !~ '^[a-z][a-z0-9_]{1,40}$' then
    raise exception 'invalid business type';
  end if;

  while exists (select 1 from public.businesses b where b.booking_slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.businesses
    (name, vertical, booking_slug, owner_mobile, calendar_mode, setup_completed_at, config,
     brand_color, business_address, public_contact)
  values
    (p->>'name', p->>'vertical', v_slug, p->>'owner_mobile', 'requests', now(),
     coalesce(p->'config', '{}'::jsonb),
     nullif(p->>'brand_color', ''), nullif(p->>'business_address', ''), nullif(p->>'public_contact', ''))
  returning id into v_id;

  for v_svc in select value from jsonb_array_elements(coalesce(p->'services', '[]'::jsonb)) loop
    insert into public.services
      (business_id, name, duration_minutes, price_php, pricing_type, variants, active, sort_order)
    values (
      v_id,
      v_svc->>'name',
      (v_svc->>'duration_minutes')::int,
      (v_svc->>'price_php')::numeric,
      coalesce(v_svc->>'pricing_type', 'fixed'),
      case when jsonb_typeof(v_svc->'variants') = 'object' then v_svc->'variants' end,
      coalesce((v_svc->>'active')::boolean, true),
      coalesce((v_svc->>'sort_order')::int, 0)
    );
  end loop;

  for v_staff in select value from jsonb_array_elements(coalesce(p->'staff', '[]'::jsonb)) loop
    insert into public.staff (business_id, name)
    values (v_id, v_staff->>'name')
    returning id into v_staff_id;

    for v_hour in select value from jsonb_array_elements(coalesce(v_staff->'hours', '[]'::jsonb)) loop
      insert into public.staff_hours (business_id, staff_id, weekday, start_time, end_time)
      values (
        v_id,
        v_staff_id,
        (v_hour->>'weekday')::smallint,
        (v_hour->>'start_time')::time,
        (v_hour->>'end_time')::time
      );
    end loop;
  end loop;

  return query select v_id, v_slug;
end;
$$;

revoke execute on function public.create_business_setup(jsonb) from public, anon, authenticated;
grant execute on function public.create_business_setup(jsonb) to service_role;
