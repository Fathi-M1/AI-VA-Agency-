-- STEP 4 of 4 — AFTER-CHECK (read-only; paste into a new query → Run)
-- What you should see: the six "count" rows show the SAME numbers as step 2;
-- every "check" row says "ok" (11 rows); "Cruz business" says "requests, Asia/Manila".
-- Anything else → send Claude the whole result.

-- READ-ONLY. Run against production AFTER `supabase db push` (docs/MIGRATION-RUNBOOK.md):
--   npx supabase db query --linked -f supabase/checks/after-migration.sql
-- section = count → must equal the numbers the before-check gave you
-- section = check → every row must say "ok"; "PROBLEM: …" names what is wrong
-- section = info  → for your eyes only
with
  want_tables(t) as (values ('customers'), ('needs_you_items'), ('business_profile'), ('memberships'), ('users'),
                            ('agents'), ('agent_runs'), ('notifications'), ('audit_log'), ('staff_services')),
  want_functions(f) as (values ('is_member'), ('is_owner'), ('public_storefront'), ('create_booking_request'), ('public_ticket')),
  public_tables as (select c.relname, c.relrowsecurity from pg_class c
                     where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'),
  checks(item, problems) as (
    select 'new tables exist',
      (select string_agg(t, ', ') from want_tables where t not in (select relname from public_tables))
    union all select 'old tables are gone (contacts, escalations)',
      (select string_agg(relname, ', ') from public_tables where relname in ('contacts', 'escalations'))
    union all select 'row-level security on every table',
      (select 'off on ' || string_agg(relname, ', ' order by relname) from public_tables where not relrowsecurity)
    union all select 'every business has a profile',
      (select count(*) || ' without one' from public.businesses b
        where not exists (select 1 from public.business_profile p where p.business_id = b.id) having count(*) > 0)
    union all select 'every business has its 5 built-in agents',
      (select count(*) || ' businesses missing some' from public.businesses b
        where (select count(*) from public.agents a where a.business_id = b.id
                and a.key in ('receptionist', 'booking', 'sales', 'support', 'admin_assistant')) < 5 having count(*) > 0)
    union all select 'booking statuses use the new names',
      (select string_agg(distinct status, ', ') from public.bookings
        where status not in ('requested', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show', 'expired'))
    union all select 'every booking has a private ticket token',
      (select count(*) || ' without one' from public.bookings
        where ticket_token is null or length(ticket_token) < 32 having count(*) > 0)
    union all select 'message roles use the new names',
      (select string_agg(distinct role, ', ') from public.messages where role not in ('customer', 'agent', 'owner', 'system'))
    union all select 'needs-you statuses are open or done',
      (select string_agg(distinct status, ', ') from public.needs_you_items where status not in ('open', 'done'))
    union all select 'public and membership functions exist',
      (select 'missing ' || string_agg(f, ', ') from want_functions
        where f not in (select proname from pg_proc where pronamespace = 'public'::regnamespace))
    union all select 'customers (anon) cannot run create_business_setup',
      (select 'anon can run it' from pg_proc p where p.pronamespace = 'public'::regnamespace
        and p.proname = 'create_business_setup' and has_function_privilege('anon', p.oid, 'execute') limit 1)
  )
select 'count' as section, 'businesses' as item, count(*)::text as value from public.businesses
union all select 'count', 'customers', count(*)::text from public.customers
union all select 'count', 'conversations', count(*)::text from public.conversations
union all select 'count', 'messages', count(*)::text from public.messages
union all select 'count', 'bookings', count(*)::text from public.bookings
union all select 'count', 'needs_you_items', count(*)::text from public.needs_you_items
union all select 'check', item, case when problems is null then 'ok' else 'PROBLEM: ' || problems end from checks
union all select 'info', 'Cruz business',
  coalesce((select calendar_mode || ', ' || timezone from public.businesses
             where id = '4eb77e14-4742-42d2-84e8-8a7d88785f67'), 'not found')
order by 1, 2;
