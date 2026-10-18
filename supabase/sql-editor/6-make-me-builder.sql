-- STEP 6 (optional, once, after step 5) — OPEN THE BUILDER CONSOLE FOR YOUR ACCOUNT
-- The builder console (/console, the old agent playground) is only for accounts with the
-- builder flag. Owners never see it unless they are also the builder (you are).
-- 1. On the line marked  <-- CHANGE THIS, put the Google email you signed in with
--    between the quotes. That is the only change.
-- 2. Paste into Supabase → SQL Editor → New query → Run.
-- What you should see: one row with your email and is_builder = true.

do $$
declare
  v_email text := 'PUT-YOUR-GOOGLE-EMAIL-HERE';  -- <-- CHANGE THIS
begin
  if v_email like 'PUT-YOUR-%' then
    raise exception 'Put your Google email on the line marked CHANGE THIS. Nothing was changed.';
  end if;
  update public.users set is_builder = true
   where id = (select id from auth.users where lower(email) = lower(btrim(v_email)));
  if not found then
    raise exception 'No account with that email yet. Sign in with Google once first. Nothing was changed.';
  end if;
end $$;

select email, is_builder from public.users where is_builder order by email;
