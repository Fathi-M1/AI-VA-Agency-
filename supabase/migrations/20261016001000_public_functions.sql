-- 20261016001000 customer (public) actions, as narrow functions scoped to ONE booking
-- link or ticket token (CLAUDE.md security rules; blueprint: Security). The public anon
-- key can call these and nothing else: it still has no table access at all.
--   public_storefront(link)            what a customer may see: no owner mobile, no internal settings
--   create_booking_request(link, req)  upserts the customer by mobile, creates a 'requested'
--                                      booking with a reference code and a private ticket token
--   public_ticket(token)               the ticket, by its 32+ character token only (never by code)
-- The server still validates every choice against the business's real options before
-- calling create_booking_request; this function enforces the basics on its own too.
-- Keeps all existing data (functions only).
-- Rollback: drop function public.public_storefront(text), public.create_booking_request(text, jsonb),
--   public.public_ticket(text);

-- ---------------------------------------------------------------- storefront
create or replace function public.public_storefront(p_link text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'business', jsonb_build_object(
      'id', b.id, 'name', b.name, 'vertical', b.vertical, 'booking_slug', b.booking_slug,
      'calendar_mode', b.calendar_mode, 'timezone', b.timezone, 'brand_color', b.brand_color,
      'business_address', b.business_address, 'public_contact', b.public_contact),
    'profile', jsonb_build_object(
      'about', p.about, 'payment_methods', to_jsonb(p.payment_methods), 'walk_ins', p.walk_ins,
      'hmos', to_jsonb(p.hmos), 'service_areas', to_jsonb(p.service_areas),
      'emergency_message', p.emergency_message, 'faqs', p.faqs,
      -- customer-relevant settings only (hours, rules, extra charges, minimum, ...)
      'settings', p.settings - 'calcom' - 'owner_name' - 'avg_job_value' - 'on_call'),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'duration_minutes', s.duration_minutes, 'price_php', s.price_php,
        'pricing_type', s.pricing_type, 'variants', s.variants) order by s.sort_order, s.name)
      from public.services s where s.business_id = b.id and s.active), '[]'::jsonb),
    'staff', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'name', m.name,
        'hours', coalesce((select jsonb_agg(jsonb_build_object(
                    'weekday', h.weekday, 'start_time', to_char(h.start_time, 'HH24:MI'), 'end_time', to_char(h.end_time, 'HH24:MI'))
                    order by h.weekday, h.start_time)
                  from public.staff_hours h where h.staff_id = m.id), '[]'::jsonb)) order by m.created_at)
      from public.staff m where m.business_id = b.id and m.active), '[]'::jsonb)
  )
  from public.businesses b
  left join public.business_profile p on p.business_id = b.id
  where b.booking_slug = p_link and b.setup_completed_at is not null
$$;

-- ---------------------------------------------------------------- booking request
create or replace function public.create_booking_request(p_link text, req jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business public.businesses%rowtype;
  v_mobile text := regexp_replace(coalesce(req->>'mobile', ''), '[\s-]', '', 'g');
  v_name text := left(btrim(coalesce(req->>'name', '')), 80);
  v_email text := nullif(lower(btrim(coalesce(req->>'email', ''))), '');
  v_customer uuid;
  v_conversation uuid;
  v_staff uuid;
  v_words text[];
  v_initials text;
  v_code text;
  v_token text;
  v_attempt int := 0;
begin
  select * into v_business from public.businesses where booking_slug = p_link and setup_completed_at is not null;
  if not found then
    raise exception 'This booking link isn''t active.';
  end if;
  if v_business.calendar_mode <> 'requests' then
    raise exception 'This business doesn''t take booking requests here.';
  end if;

  if v_mobile ~ '^\+639\d{9}$' then
    v_mobile := '0' || substr(v_mobile, 4);
  end if;
  if v_mobile !~ '^09\d{9}$' then
    raise exception 'Enter an 11-digit mobile number starting with 09.' using errcode = '22023', hint = 'mobile';
  end if;
  if v_name = '' then
    raise exception 'Enter your name.' using errcode = '22023';
  end if;
  if coalesce(req->>'service', '') = '' or not exists (
    select 1 from public.services where business_id = v_business.id and active and name = req->>'service'
  ) then
    raise exception 'Pick a service.' using errcode = '22023';
  end if;
  if coalesce(req->>'preferred_time_of_day', '') not in ('morning', 'afternoon', 'evening') then
    raise exception 'Pick a time of day.' using errcode = '22023';
  end if;

  -- Optional team member and conversation must belong to this business.
  if nullif(req->>'staff_id', '') is not null then
    select id into v_staff from public.staff where id = (req->>'staff_id')::uuid and business_id = v_business.id and active;
  end if;
  if nullif(req->>'conversation_id', '') is not null then
    select id into v_conversation from public.conversations where id = (req->>'conversation_id')::uuid and business_id = v_business.id;
  end if;

  -- One customer per mobile within the business (consent recorded once, when given).
  select id into v_customer from public.customers where business_id = v_business.id and mobile = v_mobile;
  if v_customer is null then
    insert into public.customers (business_id, name, mobile, phone, consent_at)
    values (v_business.id, v_name, v_mobile, v_mobile, case when (req->>'consent')::boolean then now() end)
    returning id into v_customer;
  else
    update public.customers
      set name = v_name,
          consent_at = coalesce(consent_at, case when (req->>'consent')::boolean then now() end)
      where id = v_customer;
  end if;
  if v_email is not null and v_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
     and not exists (select 1 from public.customers where business_id = v_business.id and email = v_email) then
    update public.customers set email = v_email where id = v_customer and email is null;
  end if;
  if v_conversation is not null then
    update public.conversations set customer_id = v_customer where id = v_conversation;
  end if;

  -- Reference code (display only): two initials + 4 digits, unique per business.
  -- "Bella Hair Studio" → BH; one-word names use their first two letters ("Juans" → JU).
  v_words := array_remove(regexp_split_to_array(btrim(regexp_replace(v_business.name, '[^A-Za-z ]', '', 'g')), '\s+'), '');
  v_initials := upper(case
    when coalesce(array_length(v_words, 1), 0) >= 2 then left(v_words[1], 1) || left(v_words[2], 1)
    else left(coalesce(v_words[1], '') || 'KK', 2)
  end);

  loop
    v_attempt := v_attempt + 1;
    v_code := v_initials || '-' || lpad((floor(random() * 10000))::int::text, 4, '0');
    begin
      insert into public.bookings
        (business_id, customer_id, conversation_id, service, staff_id, details, requested_time_text,
         preferred_day, preferred_time_of_day, customer_mobile, status, source, reference_code)
      values
        (v_business.id, v_customer, v_conversation, req->>'service', v_staff,
         case when jsonb_typeof(req->'details') = 'object' then req->'details' end,
         left(coalesce(req->>'requested_time_text', ''), 200),
         nullif(req->>'preferred_day', '')::date, req->>'preferred_time_of_day', v_mobile,
         'requested', 'form', v_code)
      returning ticket_token into v_token;
      exit;
    exception when unique_violation then
      if v_attempt >= 8 then
        raise;
      end if;
    end;
  end loop;

  return jsonb_build_object('ticket_token', v_token, 'reference_code', v_code, 'customer_id', v_customer);
end;
$$;

-- ---------------------------------------------------------------- ticket
create or replace function public.public_ticket(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'reference_code', k.reference_code,
    'status', k.status,
    'service', k.service,
    'details', k.details,
    'requested_time_text', k.requested_time_text,
    'preferred_day', k.preferred_day,
    'preferred_time_of_day', k.preferred_time_of_day,
    'slot_start', k.slot_start,
    'slot_end', k.slot_end,
    'staff_id', k.staff_id,
    'team_member', (select m.name from public.staff m where m.id = k.staff_id),
    'first_name', split_part(btrim(coalesce(c.name, '')), ' ', 1),
    'business', jsonb_build_object(
      'name', b.name, 'booking_slug', b.booking_slug, 'brand_color', b.brand_color,
      'business_address', b.business_address, 'public_contact', b.public_contact, 'timezone', b.timezone)
  )
  from public.bookings k
  join public.businesses b on b.id = k.business_id
  left join public.customers c on c.id = k.customer_id
  where length(p_token) >= 32 and k.ticket_token = p_token
$$;

revoke execute on function public.public_storefront(text) from public;
revoke execute on function public.create_booking_request(text, jsonb) from public;
revoke execute on function public.public_ticket(text) from public;
grant execute on function public.public_storefront(text) to anon, authenticated, service_role;
grant execute on function public.create_booking_request(text, jsonb) to anon, authenticated, service_role;
grant execute on function public.public_ticket(text) to anon, authenticated, service_role;
