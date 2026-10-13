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
