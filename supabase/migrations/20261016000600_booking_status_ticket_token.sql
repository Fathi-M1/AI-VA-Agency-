-- 20261016000600 bookings: one set of statuses and a private ticket token
-- (blueprint: Core objects, Security). Statuses are exactly requested, confirmed,
-- declined, cancelled, completed, no_show, expired. Cal.com's 'accepted' → confirmed.
-- Any other value stops this migration with its name, so nothing is relabelled by guess.
-- ticket_token: 64 random hex characters (two v4 UUIDs), unique, for every booking;
-- the reference code stays for display only.
-- Keeps every row.
-- Rollback: drop constraint bookings_status_check; drop index bookings_ticket_token_key;
--   alter table public.bookings drop column ticket_token;
--   (statuses: 'confirmed' rows that had a calcom_booking_id were 'accepted' before.)

update public.bookings set status = 'confirmed' where status = 'accepted';
update public.bookings set status = 'cancelled' where status in ('canceled', 'cancelled');
update public.bookings set status = 'declined' where status = 'rejected';
update public.bookings set status = 'requested' where status = 'pending';

do $$
declare
  odd text;
begin
  select string_agg(distinct status, ', ') into odd from public.bookings
  where status not in ('requested', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show', 'expired');
  if odd is not null then
    raise exception 'bookings has unexpected status values: %. Decide how to map them, add the mapping to this migration, then run it again.', odd;
  end if;
end $$;

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('requested', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show', 'expired'));

-- ---------------------------------------------------------------- ticket token
alter table public.bookings add column if not exists ticket_token text;
update public.bookings
  set ticket_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
  where ticket_token is null;
alter table public.bookings
  alter column ticket_token set default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
alter table public.bookings alter column ticket_token set not null;
create unique index if not exists bookings_ticket_token_key on public.bookings (ticket_token);
alter table public.bookings drop constraint if exists bookings_ticket_token_length;
alter table public.bookings add constraint bookings_ticket_token_length check (length(ticket_token) >= 32);
