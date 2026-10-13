-- 002: allow the Sales and Support agents in messages.agent.
-- Apply: Supabase dashboard -> SQL Editor -> paste -> Run (after schema.sql / seed.sql).
-- Postgres names an inline column check "<table>_<column>_check".
alter table public.messages drop constraint if exists messages_agent_check;
alter table public.messages
  add constraint messages_agent_check
  check (agent in ('receptionist', 'booking', 'sales', 'support'));
