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

-- ---------------------------------------------------------------- 5.7 Cruz Family Dental
-- Only these columns; Cruz's config and Cal.com services stay as they are.
update public.businesses
set vertical = 'dental',
    booking_slug = 'cruz-family-dental',
    calendar_mode = 'calcom',
    setup_completed_at = coalesce(setup_completed_at, now())
where id = '4eb77e14-4742-42d2-84e8-8a7d88785f67';

-- ---------------------------------------------------------------- setup save
-- "Finish setup" saves the business, its services, team and hours in ONE transaction
-- (a function body runs atomically: any error rolls everything back).
-- The booking link gets -2, -3, ... appended if the base is taken.
-- Input: { name, vertical, base_slug, owner_mobile, config,
--          services: [{ name, duration_minutes, price_php, pricing_type, variants, active, sort_order }],
--          staff:    [{ name, hours: [{ weekday, start_time, end_time }] }] }
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
  while exists (select 1 from public.businesses b where b.booking_slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.businesses
    (name, vertical, booking_slug, owner_mobile, calendar_mode, setup_completed_at, config)
  values
    (p->>'name', p->>'vertical', v_slug, p->>'owner_mobile', 'requests', now(),
     coalesce(p->'config', '{}'::jsonb))
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

-- Only the server (service role) may call it; not the public API keys.
revoke execute on function public.create_business_setup(jsonb) from public, anon, authenticated;
grant execute on function public.create_business_setup(jsonb) to service_role;
