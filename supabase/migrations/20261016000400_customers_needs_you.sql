-- 20261016000400 blueprint names: contacts → customers, escalations → needs_you_items
-- (Glossary: "Customer", "Needs you"). Renames keep every row, foreign key and policy.
-- needs_you_items gets a type (emergency, question, refund, complaint, other), backfilled
-- from the reason text, a link to a booking, and statuses open → done.
-- Rollback: alter table public.needs_you_items rename to escalations; drop the type and
--   booking_id columns and the check constraints; update status 'done' → 'resolved';
--   alter table public.customers rename to contacts; rename each customer_id column back
--   to contact_id (conversations, bookings, escalations).

do $$
begin
  -- ------------------------------------------------------------ contacts → customers
  if to_regclass('public.contacts') is not null and to_regclass('public.customers') is null then
    alter table public.contacts rename to customers;
  end if;
  if exists (select 1 from pg_constraint where conname = 'contacts_business_email_key') then
    alter table public.customers rename constraint contacts_business_email_key to customers_business_email_key;
  end if;
  if to_regclass('public.contacts_business_mobile_key') is not null then
    alter index public.contacts_business_mobile_key rename to customers_business_mobile_key;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'conversations' and column_name = 'contact_id') then
    alter table public.conversations rename column contact_id to customer_id;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'bookings' and column_name = 'contact_id') then
    alter table public.bookings rename column contact_id to customer_id;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'escalations' and column_name = 'contact_id') then
    alter table public.escalations rename column contact_id to customer_id;
  end if;
  if to_regclass('public.conversations_contact_idx') is not null then
    alter index public.conversations_contact_idx rename to conversations_customer_idx;
  end if;
  if to_regclass('public.bookings_contact_idx') is not null then
    alter index public.bookings_contact_idx rename to bookings_customer_idx;
  end if;

  -- ------------------------------------------------------------ escalations → needs_you_items
  if to_regclass('public.escalations') is not null and to_regclass('public.needs_you_items') is null then
    alter table public.escalations rename to needs_you_items;
  end if;
  if to_regclass('public.escalations_business_idx') is not null then
    alter index public.escalations_business_idx rename to needs_you_items_business_idx;
  end if;
end $$;

-- Policy names follow the new table names (policies themselves moved with the tables).
do $$
declare
  p record;
begin
  for p in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and (policyname like 'contacts:%' or policyname like 'escalations:%')
  loop
    execute format('alter policy %I on public.%I rename to %I', p.policyname, p.tablename,
      replace(replace(p.policyname, 'contacts:', 'customers:'), 'escalations:', 'needs_you_items:'));
  end loop;
end $$;

-- ---------------------------------------------------------------- needs-you type + booking link
alter table public.needs_you_items
  add column if not exists type text,
  add column if not exists booking_id uuid references public.bookings(id) on delete set null;

update public.needs_you_items set type = case
    when reason ilike 'Emergency words%' then 'emergency'
    when reason ilike '%refund%' then 'refund'
    when reason ilike '%complain%' then 'complaint'
    else 'other'
  end
where type is null;

alter table public.needs_you_items alter column type set default 'other';
alter table public.needs_you_items alter column type set not null;
alter table public.needs_you_items drop constraint if exists needs_you_items_type_check;
alter table public.needs_you_items
  add constraint needs_you_items_type_check check (type in ('emergency', 'question', 'refund', 'complaint', 'other'));

-- Statuses: Open → Done (blueprint: Core objects).
update public.needs_you_items set status = 'done' where status = 'resolved';
do $$
declare
  odd text;
begin
  select string_agg(distinct status, ', ') into odd from public.needs_you_items where status not in ('open', 'done');
  if odd is not null then
    raise exception 'needs_you_items has unexpected status values: %. Map them in this migration before running it.', odd;
  end if;
end $$;
alter table public.needs_you_items drop constraint if exists needs_you_items_status_check;
alter table public.needs_you_items add constraint needs_you_items_status_check check (status in ('open', 'done'));
create index if not exists needs_you_items_booking_idx on public.needs_you_items (booking_id);
