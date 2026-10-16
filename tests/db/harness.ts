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
