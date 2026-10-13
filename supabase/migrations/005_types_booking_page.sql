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
