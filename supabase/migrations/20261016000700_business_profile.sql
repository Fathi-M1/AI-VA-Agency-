-- 20261016000700 business_profile: what customers and the AI team know about a business
-- (blueprint: Data model), 1:1 with businesses, filled from businesses.config.
-- Typed columns for the blueprint's fields; everything else from config moves into
-- business_profile.settings (jsonb, where structure varies by business type), so nothing
-- is lost. businesses gains timezone and onboarding_state. businesses.config is renamed
-- config_legacy and kept for one release as a rollback safety net (no code reads it).
-- create_business_setup now writes the profile and, for a signed-in user, the owner
-- membership in the same transaction.
-- Rollback: alter table public.businesses rename column config_legacy to config;
--   drop table public.business_profile; alter table public.businesses drop column
--   timezone, drop column onboarding_state; restore create_business_setup from
--   20261016000100_baseline.sql (legacy 005 version).

-- ---------------------------------------------------------------- table
create table if not exists public.business_profile (
  business_id        uuid primary key references public.businesses(id) on delete cascade,
  about              text,
  payment_methods    text[] not null default '{}',
  walk_ins           boolean,
  hmos               text[] not null default '{}',
  service_areas      text[] not null default '{}',
  emergency_message  text,
  approval_limits    jsonb not null default '{}'::jsonb,
  faqs               jsonb not null default '[]'::jsonb,
  -- everything else (hours, owner name, customer term, rules, extra charges, minimum,
  -- pack version, legacy Cal.com services, ...)
  settings           jsonb not null default '{}'::jsonb,
  updated_at         timestamptz not null default now()
);
alter table public.business_profile enable row level security;

alter table public.businesses
  add column if not exists timezone text not null default 'Asia/Manila',
  add column if not exists onboarding_state jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------- config → profile
create or replace function public.jsonb_text_array(v jsonb)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array(select jsonb_array_elements_text(case when jsonb_typeof(v) = 'array' then v else '[]'::jsonb end)), '{}')
$$;

-- The keys that get their own column; the rest of config becomes settings.
create or replace function public.profile_settings(c jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(c, '{}'::jsonb)
    - 'about' - 'payment_methods' - 'walk_ins' - 'hmos' - 'service_areas'
    - 'emergency_instruction' - 'emergency_line' - 'approval_limits' - 'refund_approval_limit_php'
    - 'faqs' - 'timezone' - 'onboarding'
$$;

create or replace function public.profile_approval_limits(c jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(case when jsonb_typeof(c->'approval_limits') = 'object' then c->'approval_limits' end, '{}'::jsonb)
    || case when c ? 'refund_approval_limit_php' then jsonb_build_object('refund_over', c->'refund_approval_limit_php') else '{}'::jsonb end
$$;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'businesses' and column_name = 'config') then
    insert into public.business_profile
      (business_id, about, payment_methods, walk_ins, hmos, service_areas, emergency_message, approval_limits, faqs, settings)
    select b.id,
           b.config->>'about',
           public.jsonb_text_array(b.config->'payment_methods'),
           (b.config->>'walk_ins')::boolean,
           public.jsonb_text_array(b.config->'hmos'),
           public.jsonb_text_array(b.config->'service_areas'),
           coalesce(b.config->>'emergency_instruction', b.config->>'emergency_line'),
           public.profile_approval_limits(b.config),
           coalesce(case when jsonb_typeof(b.config->'faqs') = 'array' then b.config->'faqs' end, '[]'::jsonb),
           public.profile_settings(b.config)
    from public.businesses b
    on conflict (business_id) do nothing;

    update public.businesses
      set timezone = coalesce(nullif(config->>'timezone', ''), 'Asia/Manila'),
          onboarding_state = coalesce(case when jsonb_typeof(config->'onboarding') = 'object' then config->'onboarding' end, '{}'::jsonb);

    alter table public.businesses rename column config to config_legacy;
  end if;
end $$;

-- Any business without a profile (none expected) gets an empty one.
insert into public.business_profile (business_id)
select id from public.businesses
on conflict (business_id) do nothing;

-- ---------------------------------------------------------------- access
drop policy if exists "business_profile: members read" on public.business_profile;
create policy "business_profile: members read" on public.business_profile
  for select to authenticated using ((select public.is_member(business_id)));
drop policy if exists "business_profile: owners insert" on public.business_profile;
create policy "business_profile: owners insert" on public.business_profile
  for insert to authenticated with check ((select public.is_owner(business_id)));
drop policy if exists "business_profile: owners update" on public.business_profile;
create policy "business_profile: owners update" on public.business_profile
  for update to authenticated using ((select public.is_owner(business_id))) with check ((select public.is_owner(business_id)));
drop policy if exists "business_profile: owners delete" on public.business_profile;
create policy "business_profile: owners delete" on public.business_profile
  for delete to authenticated using ((select public.is_owner(business_id)));

-- ---------------------------------------------------------------- setup save
-- One transaction: business, profile, services, team, hours, and (for a signed-in
-- user) their owner membership. Input as before: { name, vertical, base_slug,
-- owner_mobile, brand_color, business_address, public_contact, config, services, staff }.
-- security definer: businesses have no insert policy; this is the only way in.
create or replace function public.create_business_setup(p jsonb)
returns table (new_business_id uuid, new_slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_cfg jsonb := coalesce(p->'config', '{}'::jsonb);
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
    (name, vertical, booking_slug, owner_mobile, calendar_mode, setup_completed_at, timezone, onboarding_state,
     brand_color, business_address, public_contact)
  values
    (p->>'name', p->>'vertical', v_slug, p->>'owner_mobile', 'requests', now(),
     coalesce(nullif(v_cfg->>'timezone', ''), 'Asia/Manila'), '{}'::jsonb,
     nullif(p->>'brand_color', ''), nullif(p->>'business_address', ''), nullif(p->>'public_contact', ''))
  returning id into v_id;

  insert into public.business_profile
    (business_id, about, payment_methods, walk_ins, hmos, service_areas, emergency_message, approval_limits, faqs, settings)
  values (
    v_id,
    v_cfg->>'about',
    public.jsonb_text_array(v_cfg->'payment_methods'),
    (v_cfg->>'walk_ins')::boolean,
    public.jsonb_text_array(v_cfg->'hmos'),
    public.jsonb_text_array(v_cfg->'service_areas'),
    coalesce(v_cfg->>'emergency_instruction', v_cfg->>'emergency_line'),
    public.profile_approval_limits(v_cfg),
    coalesce(case when jsonb_typeof(v_cfg->'faqs') = 'array' then v_cfg->'faqs' end, '[]'::jsonb),
    public.profile_settings(v_cfg)
  );

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
      values (v_id, v_staff_id, (v_hour->>'weekday')::smallint, (v_hour->>'start_time')::time, (v_hour->>'end_time')::time);
    end loop;
  end loop;

  -- The signed-in person who finished onboarding owns the business.
  if (select auth.uid()) is not null then
    insert into public.memberships (user_id, business_id, role) values ((select auth.uid()), v_id, 'owner');
  end if;

  return query select v_id, v_slug;
end;
$$;

revoke execute on function public.create_business_setup(jsonb) from public, anon;
grant execute on function public.create_business_setup(jsonb) to authenticated, service_role;
revoke execute on function public.jsonb_text_array(jsonb) from public, anon;
revoke execute on function public.profile_settings(jsonb) from public, anon;
revoke execute on function public.profile_approval_limits(jsonb) from public, anon;
