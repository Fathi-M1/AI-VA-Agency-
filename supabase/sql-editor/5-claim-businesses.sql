-- STEP 5 (once, AFTER you have signed in with Google on the site once) — CLAIM YOUR BUSINESSES
-- Makes your Google account the owner of every existing business that has no owner yet.
-- 1. On the line marked  <-- CHANGE THIS, put the Google email you signed in with
--    between the quotes. That is the only change.
-- 2. Paste into Supabase → SQL Editor → New query → Run.
-- What you should see: a list of your businesses with role "owner".
-- Safe to run again: it never adds a business twice and never touches a business that
-- already has an owner. (Phase 0 §5; replaces the planned scripts/claim-businesses.ts.)

do $$
declare
  v_email text := 'PUT-YOUR-GOOGLE-EMAIL-HERE';  -- <-- CHANGE THIS
  v_user uuid;
begin
  if v_email like 'PUT-YOUR-%' then
    raise exception 'Put your Google email on the line marked CHANGE THIS. Nothing was changed.';
  end if;
  select id into v_user from auth.users where lower(email) = lower(btrim(v_email));
  if v_user is null then
    raise exception 'No account with that email yet. Sign in with Google once first, then run this again. Nothing was changed.';
  end if;
  insert into public.memberships (user_id, business_id, role, status)
  select v_user, b.id, 'owner', 'active'
    from public.businesses b
   where not exists (select 1 from public.memberships m where m.business_id = b.id and m.role = 'owner')
  on conflict (user_id, business_id) do nothing;
end $$;

select b.name as business, m.role, m.status, u.email as owner
  from public.memberships m
  join public.businesses b on b.id = m.business_id
  join auth.users u on u.id = m.user_id
 where m.role = 'owner'
 order by b.name;
