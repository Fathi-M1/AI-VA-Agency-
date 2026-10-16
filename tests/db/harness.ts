// Local Postgres for migration and row-level-security tests (PGlite: Postgres compiled
// to run inside Node — no server, no Docker, never the production database).
// Stubs the parts of Supabase the migrations rely on: the `auth` schema (`auth.users`,
// `auth.uid()`), and the `anon` / `authenticated` / `service_role` roles with Supabase's
// default grants. Tests use only @example.com emails and 0917-000-xxxx numbers.
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { PGlite } from "@electric-sql/pglite"

export const MIGRATIONS_DIR = join(import.meta.dirname, "..", "..", "supabase", "migrations")

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{14}_.+\.sql$/.test(f))
    .sort()
}

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`

/** A fresh database with the Supabase stub (no migrations applied yet). */
export async function freshDb(): Promise<PGlite> {
  const db = new PGlite()
  await db.exec(SUPABASE_STUB)
  return db
}

/** Applies migrations in order. `until` (inclusive) stops after that file's prefix. */
export async function migrate(db: PGlite, opts: { from?: string; until?: string } = {}) {
  for (const f of migrationFiles()) {
    if (opts.from && f < opts.from) continue
    if (opts.until && f.slice(0, 14) > opts.until) break
    try {
      await db.exec(readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
    } catch (err) {
      throw new Error(`${f}: ${err instanceof Error ? err.message : err}`)
    }
  }
}

/** Runs `fn` as a signed-in user (authenticated role + JWT sub), then resets. */
export async function asUser<T>(db: PGlite, userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(userId ? `set role authenticated; set request.jwt.claim.sub = '${userId}';` : `set role anon; set request.jwt.claim.sub = '';`)
  try {
    return await fn()
  } finally {
    await db.exec(`reset role; reset request.jwt.claim.sub;`)
  }
}

export async function count(db: PGlite, sql: string, params: unknown[] = []): Promise<number> {
  const r = await db.query<{ n: number }>(`select count(*)::int as n from (${sql}) t`, params)
  return r.rows[0].n
}

/* ---------------------------------------------------------------- seeded world */

export const BIZ_A = "aaaaaaaa-0000-4000-8000-000000000001"
export const BIZ_B = "bbbbbbbb-0000-4000-8000-000000000002"
export const USER_A = "aaaaaaaa-1111-4000-8000-000000000001" // owner of A
export const USER_B = "bbbbbbbb-1111-4000-8000-000000000002" // owner of B
export const STAFF_A = "aaaaaaaa-2222-4000-8000-000000000003" // staff of A

/** Today's production data shape (old names), inserted right after the baseline. */
export const LEGACY_SEED = `
  insert into businesses (id, name, config, vertical, booking_slug, calendar_mode, setup_completed_at) values
    ('${BIZ_A}', 'Alpha Dental (test)', '{"business_type":"Dental clinic","owner_name":"Ana Example","timezone":"Asia/Singapore",
      "hours":{"mon":"08:00-17:00","tue":"08:00-17:00","wed":null,"thu":null,"fri":"08:00-13:00","sat":null,"sun":null},
      "services":[{"name":"Cleaning & exam","duration_minutes":60,"calcom_event_type_id":111}],
      "emergency_line":"Call 911.","faqs":[{"question":"Parking?","answer":"Yes, free."}],"restricted_advice":["medical advice"],
      "rules":{"emergency_keywords":["bleeding"]},"approval_limits":{"refund_over":500},"avg_job_value":1500}',
      'dental', 'alpha-dental-test', 'calcom', now()),
    ('${BIZ_B}', 'Beta Salon (test)', '{"timezone":"Asia/Manila","payment_methods":["Cash","GCash"],"walk_ins":true,
      "emergency_instruction":"Go to the ER.","refund_approval_limit_php":1000,"pack_version":2,
      "onboarding":{"shared_link_at":"2026-10-12T00:00:00Z"}}',
      'salon', 'beta-salon-test', 'requests', now());
  insert into services (business_id, name, duration_minutes, price_php, pricing_type) values
    ('${BIZ_B}', 'Haircut', 45, 300, 'fixed');
  insert into staff (id, business_id, name) values ('cccccccc-0000-4000-8000-00000000000b', '${BIZ_B}', 'Joy');
  insert into staff_hours (business_id, staff_id, weekday, start_time, end_time) values
    ('${BIZ_B}', 'cccccccc-0000-4000-8000-00000000000b', 2, '10:00', '19:00');
  insert into contacts (id, business_id, name, email, mobile) values
    ('dddddddd-0000-4000-8000-00000000000a', '${BIZ_A}', 'Priya Example', 'priya@example.com', null),
    ('dddddddd-0000-4000-8000-00000000000b', '${BIZ_B}', 'Maya Example', null, '09170000001');
  insert into conversations (id, business_id, contact_id, channel) values
    ('eeeeeeee-0000-4000-8000-00000000000a', '${BIZ_A}', 'dddddddd-0000-4000-8000-00000000000a', 'chat'),
    ('eeeeeeee-0000-4000-8000-00000000000b', '${BIZ_B}', 'dddddddd-0000-4000-8000-00000000000b', 'web');
  insert into messages (business_id, conversation_id, role, agent, content) values
    ('${BIZ_A}', 'eeeeeeee-0000-4000-8000-00000000000a', 'user', null, 'Hi, I want a cleaning'),
    ('${BIZ_A}', 'eeeeeeee-0000-4000-8000-00000000000a', 'agent', 'receptionist', 'Hello!'),
    ('${BIZ_A}', 'eeeeeeee-0000-4000-8000-00000000000a', 'agent', null, 'Call 911.'),
    ('${BIZ_B}', 'eeeeeeee-0000-4000-8000-00000000000b', 'user', null, 'Rebond please');
  insert into bookings (business_id, contact_id, conversation_id, service, slot_start, slot_end, calcom_booking_id, status) values
    ('${BIZ_A}', 'dddddddd-0000-4000-8000-00000000000a', 'eeeeeeee-0000-4000-8000-00000000000a', 'Cleaning & exam',
      '2026-10-05T02:00:00Z', '2026-10-05T03:00:00Z', 'cal-uid-1', 'accepted');
  insert into bookings (business_id, contact_id, conversation_id, service, status, requested_time_text, customer_mobile, reference_code, source) values
    ('${BIZ_B}', 'dddddddd-0000-4000-8000-00000000000b', 'eeeeeeee-0000-4000-8000-00000000000b', 'Haircut',
      'requested', 'Sat, Oct 17 · Afternoon', '09170000001', 'BS-0001', 'form');
  insert into escalations (business_id, contact_id, conversation_id, reason, status) values
    ('${BIZ_A}', 'dddddddd-0000-4000-8000-00000000000a', 'eeeeeeee-0000-4000-8000-00000000000a', 'Emergency words: bleeding', 'open'),
    ('${BIZ_A}', 'dddddddd-0000-4000-8000-00000000000a', 'eeeeeeee-0000-4000-8000-00000000000a', 'Customer asks for a refund', 'resolved'),
    ('${BIZ_B}', 'dddddddd-0000-4000-8000-00000000000b', 'eeeeeeee-0000-4000-8000-00000000000b', 'Unknown question about parking', 'open');
`

/** Baseline → today's data → remaining migrations (up to `until`) → test users. */
export async function seededWorld(opts: { until?: string } = {}): Promise<PGlite> {
  const db = await freshDb()
  await migrate(db, { until: "20261016000100" })
  await db.exec(LEGACY_SEED)
  await migrate(db, { from: "20261016000101", until: opts.until })
  await db.exec(`
    insert into auth.users (id, email) values
      ('${USER_A}', 'owner-a@example.com'), ('${USER_B}', 'owner-b@example.com'), ('${STAFF_A}', 'staff-a@example.com');
  `)
  const hasMemberships = await db.query("select 1 from pg_tables where schemaname = 'public' and tablename = 'memberships'")
  if (hasMemberships.rows.length) {
    await db.exec(`
      insert into memberships (user_id, business_id, role) values
        ('${USER_A}', '${BIZ_A}', 'owner'), ('${USER_B}', '${BIZ_B}', 'owner'), ('${STAFF_A}', '${BIZ_A}', 'staff');
    `)
  }
  return db
}

/** Every public table that carries a business_id column. */
export async function tablesWithBusinessId(db: PGlite): Promise<string[]> {
  const r = await db.query<{ table_name: string }>(
    `select table_name from information_schema.columns
      where table_schema = 'public' and column_name = 'business_id' order by table_name`
  )
  return r.rows.map((x) => x.table_name)
}
