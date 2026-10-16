-- 20261016000300 row-level security policies, based on membership (blueprint: Security).
-- Every table with a business_id: members can read and write their own business's rows.
-- Owner-only writes: the business itself, its services, team (staff, hours) and members.
-- Staff (blueprint: Home, Inbox, Schedule, Customers) can work on customers,
-- conversations, messages, bookings and needs-you items. Policies apply to signed-in
-- users only; the public anon key gets nothing (customer actions use narrow functions).
-- The server's service-role key bypasses RLS (used only by trusted server jobs).
-- Keeps all existing data (policies only). Policies follow tables through later renames.
-- Rollback: drop the policies created here (each is named "<table>: …");
--   the tables keep RLS on with no policies (deny all), as before this migration.

-- ---------------------------------------------------------------- businesses
drop policy if exists "businesses: members read" on public.businesses;
create policy "businesses: members read" on public.businesses
  for select to authenticated using ((select public.is_member(id)));
drop policy if exists "businesses: owners update" on public.businesses;
create policy "businesses: owners update" on public.businesses
  for update to authenticated using ((select public.is_owner(id))) with check ((select public.is_owner(id)));
-- No insert/delete policies: new businesses are created by create_business_setup().

-- ---------------------------------------------------------------- memberships
drop policy if exists "memberships: read own or as owner" on public.memberships;
create policy "memberships: read own or as owner" on public.memberships
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_owner(business_id)));
drop policy if exists "memberships: owners insert" on public.memberships;
create policy "memberships: owners insert" on public.memberships
  for insert to authenticated with check ((select public.is_owner(business_id)));
drop policy if exists "memberships: owners update" on public.memberships;
create policy "memberships: owners update" on public.memberships
  for update to authenticated using ((select public.is_owner(business_id))) with check ((select public.is_owner(business_id)));
drop policy if exists "memberships: owners delete" on public.memberships;
create policy "memberships: owners delete" on public.memberships
  for delete to authenticated using ((select public.is_owner(business_id)));

-- ---------------------------------------------------------------- users
drop policy if exists "users: read own" on public.users;
create policy "users: read own" on public.users
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists "users: update own" on public.users;
create policy "users: update own" on public.users
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Users may change only their name and picture, never the builder flag.
revoke update on public.users from anon, authenticated;
grant update (name, avatar_url) on public.users to authenticated;
revoke insert, delete on public.users from anon, authenticated;

-- ---------------------------------------------------------------- member-writable tables
do $$
declare
  t text;
begin
  foreach t in array array['contacts', 'conversations', 'messages', 'bookings', 'escalations'] loop
    execute format('drop policy if exists "%1$s: members read" on public.%1$I', t);
    execute format('create policy "%1$s: members read" on public.%1$I for select to authenticated using ((select public.is_member(business_id)))', t);
    execute format('drop policy if exists "%1$s: members insert" on public.%1$I', t);
    execute format('create policy "%1$s: members insert" on public.%1$I for insert to authenticated with check ((select public.is_member(business_id)))', t);
    execute format('drop policy if exists "%1$s: members update" on public.%1$I', t);
    execute format('create policy "%1$s: members update" on public.%1$I for update to authenticated using ((select public.is_member(business_id))) with check ((select public.is_member(business_id)))', t);
    execute format('drop policy if exists "%1$s: members delete" on public.%1$I', t);
    execute format('create policy "%1$s: members delete" on public.%1$I for delete to authenticated using ((select public.is_member(business_id)))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- owner-writable tables
do $$
declare
  t text;
begin
  foreach t in array array['services', 'staff', 'staff_hours'] loop
    execute format('drop policy if exists "%1$s: members read" on public.%1$I', t);
    execute format('create policy "%1$s: members read" on public.%1$I for select to authenticated using ((select public.is_member(business_id)))', t);
    execute format('drop policy if exists "%1$s: owners insert" on public.%1$I', t);
    execute format('create policy "%1$s: owners insert" on public.%1$I for insert to authenticated with check ((select public.is_owner(business_id)))', t);
    execute format('drop policy if exists "%1$s: owners update" on public.%1$I', t);
    execute format('create policy "%1$s: owners update" on public.%1$I for update to authenticated using ((select public.is_owner(business_id))) with check ((select public.is_owner(business_id)))', t);
    execute format('drop policy if exists "%1$s: owners delete" on public.%1$I', t);
    execute format('create policy "%1$s: owners delete" on public.%1$I for delete to authenticated using ((select public.is_owner(business_id)))', t);
  end loop;
end $$;
