-- STEP 1 of 4 — BACKUP (paste into Supabase → SQL Editor → New query → Run)
-- Copies every table in the app (schema "public") into a private schema "backup_phase0",
-- inside your database. Changes nothing else. The API can't reach this schema.
-- Run it ONCE: if it says "schema backup_phase0 already exists", a backup is already there; go on to step 2.
-- What you should see: a list of tables with their row counts (the same numbers step 2 shows).

create schema backup_phase0;
revoke all on schema backup_phase0 from public;

do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' order by tablename loop
    execute format('create table backup_phase0.%I as table public.%I', t, t);
  end loop;
end $$;

select 'businesses' as backed_up, count(*) as rows from backup_phase0.businesses
union all select 'contacts (customers)', count(*) from backup_phase0.contacts
union all select 'conversations', count(*) from backup_phase0.conversations
union all select 'messages', count(*) from backup_phase0.messages
union all select 'bookings', count(*) from backup_phase0.bookings
union all select 'escalations (needs you)', count(*) from backup_phase0.escalations;
