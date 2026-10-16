# Phase 0 Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (native, chosen by the owner). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the locked prototype into a real foundation — honest website, security headers and CI now; one aligned data model with row-level security next; Google sign-in with membership checks after the owner's Google setup.

**Architecture:** Three releases. R1 ships to `main` immediately (site lock stays). R2 is SQL migrations (owner runs them with the Supabase CLI via a runbook) plus a code branch that switches to the new names and one metrics module, merged only after the migrations run. R3 is a branch that adds `@supabase/ssr` sessions, `/sign-in`, `/app/[businessId]/…`, membership checks and the security suite, merged only after the owner's Google setup.

**Tech Stack:** Next.js 16.3.6 (App Router, `proxy.ts`), React 19, Supabase (Postgres, Auth, RLS), Supabase CLI, `@supabase/ssr`, Node 24 built-in test runner, PGlite (local Postgres in Node, tests only), Playwright, GitHub Actions.

**Spec:** `docs/PHASE-0-foundation.md` (with its change-of-plan note) + `docs/BLUEPRINT.md` sections Surfaces, Data model, Security and production readiness, Glossary. Owner's approval message of Oct 16, 2026 (Releases 1–3) is the approved scope; brainstorming was skipped at the owner's instruction.

## Global Constraints

- Never run anything against the production database. Only the owner runs migrations (runbook).
- Migrations: numbered files in `supabase/migrations/` (Supabase CLI naming `YYYYMMDDHHMMSS_name.sql`), each keeps all existing data, each starts with a rollback note.
- Booking statuses exactly: `requested`, `confirmed`, `declined`, `cancelled`, `completed`, `no_show`, `expired`.
- `needs_you_items.type` exactly: `emergency`, `question`, `refund`, `complaint`, `other`.
- `messages.role` exactly: `customer`, `agent`, `owner`, `system`. Roles: `owner` | `staff`.
- `ticket_token`: random, ≥32 characters, unique; reference code is display-only.
- Retired names (section 8) must have zero matches in code, types and UI: `contacts`/`contact`, `escalations`/`escalation`.
- English only; ₱; Asia/Manila; tests use `@example.com` emails and `0917-000-xxxx` numbers and clean up their own data.
- Nothing outside this plan gets added without asking (CLAUDE.md).
- Never `next build` while `npm run dev` runs (MISTAKES #1).

## Review Focus

1. **Existing production data with values the migrations don't expect** (e.g. a Cal.com booking status other than `accepted`): the migration must stop with a clear message, never silently relabel. → Task R2.3 test "unknown status aborts".
2. **A migration half-applied**: each file is one transaction; re-running after a fix must not duplicate rows (agents seed, Cruz staff). → Task R2.6/R2.7 tests "idempotent re-run".
3. **Row-level security that blocks the owner's own work**: an owner must still read and write their own rows after RLS. → Task R2.2 test "member can read and write own business".
4. **Old links**: `/contacts`, `/escalations`, old ticket links `/book/x/r/CODE` → redirect or a kind not-found, never a crash. → Task R2.9 test.
5. **Dashboard vs Today counts for the same week**: both must come from `metrics.ts` and match for the same business. → Task R2.8 test "same numbers".

---

## File map

**R1:** `.env.example` (new) · `src/components/landing/*` (copy) · `next.config.ts` (headers) · `.github/workflows/ci.yml` (new) · `eslint.config.mjs` or `src/components/reui/**` (lint fixes) · `tests/security-headers.unit.test.ts` (new) · `tests/website-honesty.unit.test.ts` (new).

**R2 SQL:** `supabase/config.toml` (supabase init) · `supabase/migrations/20261016000100_baseline.sql` … `…000900_cruz_normal_business.sql` · old `supabase/migrations/00x_*.sql`, `schema.sql`, `seed.sql` → `supabase/legacy/` · `tests/db/harness.ts` (PGlite + auth stub + seed) · `tests/db/*.db.test.ts`.

**R2 code:** `src/server/db/business-config.ts` (reads/writes `business_profile`) · `src/server/db/store.ts`, `views.ts`, `today.ts`, `tickets.ts`, `business-profile.ts` (new names) · `src/server/metrics.ts` (new) · routes `/customers`, `/needs-you` (renamed), ticket route by token · `docs/MIGRATION-RUNBOOK.md`.

**R3:** `src/server/supabase/{server,browser,service}.ts` · `src/server/auth.ts` (session, membership guards) · `src/app/sign-in`, `src/app/auth/callback`, `src/app/app/(owner)/[businessId]/…`, `src/app/app/businesses`, `src/app/console` · `src/proxy.ts` (session refresh + lock kept until merge decision) · `scripts/claim-businesses.ts` · `tests/security/*.test.ts`, `tests/e2e/*.spec.ts`.

---

## RELEASE 1 — ships to `main` (site lock stays)

### Task R1.1: Docs for the no-staging decision
Already committed on `staging` as `0ec0610` (CLAUDE.md + PHASE-0 change-of-plan note). `web/.env.staging.local` never existed.
- [ ] Verify: `grep -n "ONE Supabase project" CLAUDE.md` and `grep -n "Change of plan" docs/PHASE-0-foundation.md` both match; `test ! -e .env.staging.local`.

### Task R1.2: `.env.example`
**Files:** Create `.env.example`; Test `tests/env-example.unit.test.ts`.
- [ ] Test: every `process.env.X` referenced under `src/` and `tests/` appears in `.env.example`; no line has a value after `=`.
- [ ] Run → FAIL (file missing). Write the file (each var + one-line comment). Run → PASS. Commit.

### Task R1.3: Website honesty (section 10)
**Files:** Modify `src/components/landing/landing-hero.tsx`, `landing-sections.tsx`, `landing-header.tsx`, `landing-footer.tsx`; Test `tests/website-honesty.unit.test.ts`.
- [ ] Test: landing sources contain none of: "interviews you", "books real appointments into your calendar", "about 15 minutes" / "15-minute", "Open demo dashboard", "Demo dashboard"; and contain a "Sign in" link.
- [ ] Run → FAIL. Edit copy: Setup agent → describes the setup form honestly; booking → "sends you booking requests to confirm"; remove time claim; demo links → "Sign in" (→ `/today` in R1, `/sign-in` in R3). Run → PASS. Commit.

### Task R1.4: Security headers
**Files:** Modify `next.config.ts`; Test `tests/security-headers.unit.test.ts`.
- [ ] Test (imports `next.config.ts`, calls `headers()`): every route gets `X-Frame-Options: SAMEORIGIN`, CSP with `frame-ancestors 'self'`, `base-uri 'self'`, `object-src 'none'`, `form-action 'self'`; `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy` with `camera=()`, `geolocation=()`, `microphone=(self)`.
- [ ] FAIL → implement `headers()` → PASS → verify headers on `next start` with curl → commit. (SAMEORIGIN, not DENY: `/setup/live` frames the booking page from the same origin.)

### Task R1.5: CI (type-check, lint, unit tests)
**Files:** Create `.github/workflows/ci.yml`; fix the 4 lint errors in `src/components/reui/event-calendar/*` (React Compiler ref/setState rules) without changing behavior.
- [ ] `npx eslint src` → 0 errors; `npx tsc --noEmit` → 0; `npm run test:unit` → pass.
- [ ] Workflow: on push to `staging` and PRs to `main`: `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm run test:unit`. Commit.

### Task R1.6: Ship R1
- [ ] Merge `staging` → `main` (fast-forward), push both. Live checks: lock still 401 on `/dashboard`, `/` 200 with new copy, headers present.

---

## RELEASE 2 — data model (live after the owner runs the migrations)

All SQL is tested in PGlite: `tests/db/harness.ts` creates a fresh database, stubs Supabase's `auth` schema (`auth.users`, `auth.uid()` reading `request.jwt.claim.sub`), the `anon`/`authenticated`/`service_role` roles, applies the migrations in order, and seeds a copy of today's data shape (two businesses, customers, conversations, messages incl. `role='user'` and emergency replies, bookings incl. Cal.com `accepted`, escalations incl. `Emergency words: …`).

### Task R2.1: Baseline + CLI layout
**Files:** `supabase init` → `supabase/config.toml`; move old SQL to `supabase/legacy/`; Create `20261016000100_baseline.sql` = schema.sql + 002 + 004 + 005, fully idempotent; Test `tests/db/baseline.db.test.ts`.
- [ ] Test: applying baseline twice succeeds; all 9 current tables exist; `create_business_setup` exists.

### Task R2.2: Memberships, users, is_member(), RLS policies
**Files:** `…000200_memberships.sql`, `…000300_rls_policies.sql`; Test `tests/db/rls.db.test.ts`.
- `public.users` (id → auth.users, email, name, avatar_url, is_builder default false; trigger copies new auth users), `memberships` (user_id, business_id, role owner|staff, status active|invited|removed, created_at, unique(user_id,business_id)), `is_member(uuid)`, `is_owner(uuid)` security definer, `search_path=''`.
- Policies on every table with `business_id` (+ `businesses` by `id`): members select/insert/update/delete; owner-only writes for `businesses`, `memberships`, `services`, `staff`, `staff_hours`, settings tables, `agents`.
- [ ] Tests: user A reads/writes A's rows; A sees 0 rows of B on every table and can't insert/update/delete B's rows; staff can't update `businesses`/`services`/`staff`/`agents`; anon sees nothing.

### Task R2.3: Renames + roles + statuses + token
**Files:** `…000400_customers_needs_you.sql`, `…000500_messages_conversations.sql`, `…000600_booking_status_ticket_token.sql`; Test `tests/db/renames.db.test.ts`.
- `contacts`→`customers`, `contact_id`→`customer_id`; `escalations`→`needs_you_items` + `type` (backfill: `Emergency words%`→emergency, refund→refund, complaint→complaint, else other) + `booking_id`; status `resolved`→`done`.
- `messages.role` user→customer, agent with null agent→system; check constraint. `conversations.taken_over_by`.
- Booking statuses: accepted→confirmed, cancelled/canceled→cancelled, rejected→declined, pending→requested; unknown → `raise exception` naming the values; check constraint. `ticket_token` default 64 hex chars, backfilled, unique, not null.
- [ ] Tests: row counts unchanged; FKs follow; types backfilled; unknown status aborts the migration; tokens unique & ≥32 chars.

### Task R2.4: business_profile
**Files:** `…000700_business_profile.sql`; Test `tests/db/business-profile.db.test.ts`.
- 1:1 table: about, payment_methods, walk_ins, hmos, service_areas, emergency_message, approval_limits jsonb, faqs jsonb, settings jsonb (everything else from `config`); `businesses.timezone` column. Backfill from `config`; `config` kept (renamed `config_legacy`) for one release as rollback safety. RLS: members read, owners write. `create_business_setup` writes the profile and (when `auth.uid()` is set) an owner membership in the same transaction.
- [ ] Tests: every key of every business's config is present after backfill (lossless); setup RPC with a user creates business + profile + owner membership atomically; failure rolls all back.

### Task R2.5: New empty tables + built-in agents
**Files:** `…000800_agents_and_logs.sql`; Test `tests/db/agents.db.test.ts`.
- `staff_services`, `agents`, `agent_runs`, `notifications`, `audit_log` with RLS; seed receptionist, booking, sales, support (live) and admin_assistant (paused, not built yet) per business; trigger seeds new businesses.
- [ ] Tests: each business has exactly 5 built-in agents; re-run adds none; new business gets 5.

### Task R2.6: Cruz as a normal business
**Files:** `…000900_cruz_normal_business.sql`; Test `tests/db/cruz.db.test.ts`.
- `calendar_mode='requests'`, timezone Asia/Manila, Cal.com stored as an off connection in `settings`, legacy `config.services` → `services` rows, one staff row from `owner_name` with `config.hours`.
- [ ] Tests: idempotent; Cruz has services + staff hours; bookings kept.

### Task R2.7: Code — data adapters to the new schema
**Files:** `src/server/db/business-config.ts`, `business-profile.ts`, `store.ts`, `views.ts`, `today.ts`, `tickets.ts`, orchestrator & agents, setup action; Test `tests/unit/profile-mapping.unit.test.ts`.
- Profile row ⇄ `BusinessConfig` mapping in one module (pure, unit-tested both ways).
- All queries use `customers`, `needs_you_items`, `customer_id`, new roles/statuses.
- [ ] Unit tests for mapping; `tsc`; retired-name scan = 0 matches (`tests/retired-names.unit.test.ts`).

### Task R2.8: One metrics module
**Files:** Create `src/server/metrics.ts` (pure core `computeMetrics(rows, range)` + DB loader); Modify Dashboard + Today to use it; fix checklist rendering twice; Test `tests/unit/metrics.unit.test.ts`.
- [ ] Tests: counts (conversations, requests, confirmed, completed, no-shows, needs-you) for a Manila week from fixed rows; Dashboard and Today read the same function; "no conversations yet" only when the count is 0.

### Task R2.9: Routes + ticket by token
- `/contacts`→`/customers`, `/escalations`→`/needs-you` (old paths redirect); ticket `/book/[slug]/t/[token]`; old `/r/[code]` → kind not-found.
- [ ] Tests: redirects; ticket by token returns it; by code returns nothing.

### Task R2.10: Runbook, then STOP
**Files:** `docs/MIGRATION-RUNBOOK.md` — backup (`supabase db dump`), `supabase link`, `supabase db push --dry-run`, `supabase db push`, check query; success signs and failure steps per step. Then wait for "migrations done" → read-only schema check → merge → live check.

---

## RELEASE 3 — sign-in (branch `feat/google-signin`, merge only after Google setup)

### Task R3.1: Supabase clients + session
`@supabase/ssr` server/browser clients; service client isolated in one file used only by agent runs and the claim script; `proxy.ts` refreshes the session cookie.
### Task R3.2: `/sign-in`, `/auth/callback`, sign-out
"Continue with Google"; cancelled → website with "Sign-in was cancelled."; return to the page they wanted.
### Task R3.3: `/app` routes + guards
Owner pages under `/app/[businessId]/…`; old paths redirect; every page and server action calls `requireMember(businessId)` (owner-only actions `requireOwner`); session client so RLS applies; picker at `/app/businesses`; onboarding at `/app/onboarding`.
### Task R3.4: Remove demo scaffolding
Delete `/switch`, the `biz` cookie and cookie-based `getCurrentBusinessId`; playground → `/console`, builder flag only.
### Task R3.5: Customer actions through narrow functions
Storefront read, booking request, ticket by token via `security definer` SQL functions (added in R2 migrations) called with the anon key.
### Task R3.6: Claim script
`scripts/claim-businesses.ts` (owner runs once with `OWNER_CLAIM_EMAIL`, then deletes it).
### Task R3.7: Security suite (section 12)
Tests 1–9; Google-dependent ones skipped with the reason until the setup is done.

## Self-review
- Spec coverage: sections 2 (R1.1/R1.6, branches), 3 (R2.1, R2.10), 4 (R3.2), 5 (R2.2, R2.4, R3.3, R3.6), 6 (R3.4), 7 (R2.2, R3.1, R3.5), 8 (R2.3–R2.7), 9 (R2.8), 10 (R1.3), 11 (R1.4, R1.5; Sentry skipped — no `SENTRY_DSN`), 12 (R3.7), 13 (skills installed).
- Known deviation from the skill format: steps name each test's assertions instead of pasting full code, to keep this plan readable; the tests themselves are in the repo with each commit.
