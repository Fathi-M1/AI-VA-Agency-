-- 20261016000900 Cruz Family Dental becomes a normal business (blueprint: Data model —
-- "one booking system for everyone"): built-in schedule (calendar_mode = requests),
-- Asia/Manila, ₱. Its legacy Cal.com services (business_profile.settings.services) become
-- rows in services (price blank = "price on request"); its owner (settings.owner_name)
-- becomes its one team member with the old opening hours (settings.hours); Cal.com is
-- kept only as a switched-off connection (settings.calcom). Bookings are untouched.
-- Does nothing if Cruz isn't in the database; safe to re-run.
-- Rollback: update businesses set calendar_mode = 'calcom', timezone = 'Asia/Singapore'
--   where id = '4eb77e14-4742-42d2-84e8-8a7d88785f67'; delete its staff and services rows
--   created here; restore settings.services from businesses.config_legacy->'services'.

do $$
declare
  cruz constant uuid := '4eb77e14-4742-42d2-84e8-8a7d88785f67';
  s jsonb;
  svc jsonb;
  v_staff uuid;
  day record;
begin
  select settings into s from public.business_profile where business_id = cruz;
  if not found then
    return; -- Cruz isn't in this database
  end if;

  update public.businesses set calendar_mode = 'requests', timezone = 'Asia/Manila' where id = cruz;

  -- Legacy Cal.com services → services rows; remember their Cal.com ids on the switched-off connection.
  if jsonb_typeof(s->'services') = 'array' then
    for svc in select value from jsonb_array_elements(s->'services') loop
      if not exists (select 1 from public.services where business_id = cruz and name = svc->>'name') then
        insert into public.services (business_id, name, duration_minutes, price_php, pricing_type, active, sort_order)
        values (cruz, svc->>'name', (svc->>'duration_minutes')::int, null, 'fixed', true,
                (select count(*) from public.services where business_id = cruz));
      end if;
    end loop;
    s := (s - 'services') || jsonb_build_object('calcom', jsonb_build_object(
      'enabled', false,
      'event_types', coalesce((select jsonb_object_agg(x->>'name', (x->>'calcom_event_type_id')::bigint)
                                 from jsonb_array_elements(s->'services') x), '{}'::jsonb)
    ));
    update public.business_profile set settings = s, updated_at = now() where business_id = cruz;
  end if;

  -- The owner as the one team member, with the old opening hours.
  if not exists (select 1 from public.staff where business_id = cruz) and coalesce(s->>'owner_name', '') <> '' then
    insert into public.staff (business_id, name) values (cruz, s->>'owner_name') returning id into v_staff;
    for day in
      select d.weekday, s->'hours'->>d.key as span
      from (values ('sun', 0), ('mon', 1), ('tue', 2), ('wed', 3), ('thu', 4), ('fri', 5), ('sat', 6)) as d(key, weekday)
    loop
      if day.span ~ '^\d{2}:\d{2}-\d{2}:\d{2}$' then
        insert into public.staff_hours (business_id, staff_id, weekday, start_time, end_time)
        values (cruz, v_staff, day.weekday, split_part(day.span, '-', 1)::time, split_part(day.span, '-', 2)::time);
      end if;
    end loop;
  end if;
end $$;
