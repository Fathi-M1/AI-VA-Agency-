-- 20261016000500 messages and conversations (blueprint: Data model).
-- messages.role: customer / agent / owner / system ('user' → 'customer'; the safety
-- net's emergency reply, stored as an agent message with no agent, → 'system').
-- conversations.taken_over_by: the owner or staff member replying instead of the AI.
-- Keeps every row.
-- Rollback: drop constraint messages_role_check; update role 'customer' → 'user' and
--   'system' → 'agent'; re-add check (role in ('user','agent'));
--   alter table public.conversations drop column taken_over_by;

alter table public.messages drop constraint if exists messages_role_check;
update public.messages set role = 'customer' where role = 'user';
update public.messages set role = 'system' where role = 'agent' and agent is null;
do $$
declare
  odd text;
begin
  select string_agg(distinct role, ', ') into odd from public.messages where role not in ('customer', 'agent', 'owner', 'system');
  if odd is not null then
    raise exception 'messages has unexpected role values: %. Map them in this migration before running it.', odd;
  end if;
end $$;
alter table public.messages add constraint messages_role_check check (role in ('customer', 'agent', 'owner', 'system'));

alter table public.conversations
  add column if not exists taken_over_by uuid references auth.users(id) on delete set null;
