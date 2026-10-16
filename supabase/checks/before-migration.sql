-- READ-ONLY. Run against production BEFORE `supabase db push` (docs/MIGRATION-RUNBOOK.md):
--   npx supabase db query --linked -f supabase/checks/before-migration.sql
-- section = count   → how many rows exist today (write these down; the after-check must match)
-- section = blocker → a value the migrations would refuse. Any blocker row = STOP, don't push.
-- Uses today's (old) table names: contacts, escalations.
select 'count' as section, 'businesses' as item, count(*)::text as value from public.businesses
union all select 'count', 'customers', count(*)::text from public.contacts
union all select 'count', 'conversations', count(*)::text from public.conversations
union all select 'count', 'messages', count(*)::text from public.messages
union all select 'count', 'bookings', count(*)::text from public.bookings
union all select 'count', 'needs_you_items', count(*)::text from public.escalations
union all
select distinct 'blocker', 'booking status', coalesce(status, '(empty)') from public.bookings
  where status is null or status not in ('requested', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show', 'expired',
                                         'accepted', 'canceled', 'rejected', 'pending')
union all
select distinct 'blocker', 'message role', coalesce(role, '(empty)') from public.messages
  where role is null or role not in ('customer', 'agent', 'owner', 'system', 'user')
union all
select distinct 'blocker', 'escalation status', coalesce(status, '(empty)') from public.escalations
  where status is null or status not in ('open', 'done', 'resolved')
order by 1 desc, 2;
