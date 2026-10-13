# PHASE 0 — Foundation: git, Google sign-in, data rules, one data model

> **Change of plan (Oct 13, 2026, approved by the owner):** no separate staging Supabase project yet. We have no real users and the site is locked, so Phase 0 works against the current project (production) from localhost. Guardrails: every database change is a migration file in the repo (Supabase CLI), never the SQL editor; back up the database before running any migration; tests that create users or businesses clean them up; Google sign-in redirect URLs are localhost and the production URL only. A staging Supabase project must exist before the pilot phase (Phase 4). The repo already exists (public), so it isn't created again. The emergency site lock stays until Google sign-in replaces it.

> Paste instruction for Claude Code: "Read PHASE-0-foundation.md and follow CLAUDE.md. Start with Superpowers brainstorming, then show me the plan before building."

## Goal
Turn the deployed prototype into a real product foundation. **No new features and no redesign in this phase.** When Phase 0 is done, the app looks almost the same, but:
- owners sign in with Google and can only see their own business,
- the database itself blocks one business from reading another's data,
- every screen reads one consistent data model,
- every change goes through git (the `staging` branch), migrations, and tests.

**Gate to pass:** the security test suite (section 12) is green against the current project, run from localhost.

Read first: `CLAUDE.md`, `docs/BLUEPRINT.md` (sections: Surfaces, Data model, Security and production readiness, Glossary, Scope and how we build), `MISTAKES.md`.

---

## 1. Manual steps I (the owner) must do — guide me, then verify
Give me exact click-by-click instructions for each, wait for me to say "done", then verify what you can.
1. **GitHub:** ~~create a private repository~~ done: the repo exists (public) and is connected.
2. **Staging database:** skipped until before the pilot (see the change of plan above).
3. **Google sign-in:** in Google Cloud Console create an OAuth client (Web application) and an OAuth consent screen with only the email and profile scopes. Add the Supabase project's Google callback URL as the redirect URI. Enable the Google provider in Supabase Auth, and set the allowed redirect URLs for localhost and the production URL only.
4. **Vercel:** production deploys from `main` (already set up). No separate staging deployment until the staging project exists.
5. **Skills:** install Superpowers and Anthropic's skills in Claude Code (commands are in section 13).

---

## 2. Git and branches
- Initialize git (if not already), add a `.gitignore` that excludes `.env*`, `node_modules`, `.next`, build output, and test artifacts.
- Scan the working tree for secrets before the first commit; if any key was ever hardcoded, tell me so I can rotate it.
- Branches: `main` = production, `staging` = integration. All Phase 0 work happens on `staging` (feature branches merged into it).
- Add `.env.example` listing every variable name (no values) with a one-line comment each.

## 3. Database migrations in the repo
- Move from "paste SQL in the editor" to Supabase CLI migrations stored in `supabase/migrations/`.
- Capture the current production schema as the baseline migration, so the database can be rebuilt from the repo.
- From now on: write migration → I approve → back up the database → apply → test.

## 4. Google sign-in
- Use Supabase Auth with the Google provider and `@supabase/ssr` for server-side sessions in Next.js.
- Pages: `/sign-in` (one button: "Continue with Google"), sign-out in the account menu.
- Route protection: all owner pages move under `/app/...` and require a session. Old owner paths (`/today`, `/dashboard`, `/conversations`, etc.) redirect to their `/app/...` equivalents. Not signed in → `/sign-in`, then back to the page they wanted.
- Edge cases from blueprint F1: cancelled sign-in returns to the website with "Sign-in was cancelled."

## 5. Memberships, roles, and existing businesses
- Add `memberships` (user_id, business_id, role `owner`|`staff`, status, created_at).
- After sign-in: no membership → onboarding (the existing `/setup` flow, moved to `/app/onboarding`; Phase 1 redesigns it). One membership → that business's Home. Several → a simple business picker at `/app/businesses`.
- Finishing onboarding creates the business AND an owner membership in the same transaction.
- **Claim existing businesses once:** a one-time, server-only script assigns every existing business to the Google account whose email is in `OWNER_CLAIM_EMAIL`, as owner. Run it once (after a backup), then delete the script and the variable.
- Staff invites are Phase 1; just make the `staff` role exist and be enforced.

## 6. Remove the demo scaffolding
- Delete `/switch`, the `biz` cookie, `getCurrentBusinessId()`-from-cookie, and every "Switch business (demo)" link.
- The current business comes from the URL (`/app/[businessId]/...` or the picker selection stored server-side) AND is always re-checked against the signed-in user's membership.
- The chat playground moves to `/console` (builder console), visible only to users with a `builder` flag on their account. Owners never see it.

## 7. Row-level security on every table
- Create a `security definer` SQL helper, e.g. `is_member(business_id)`, returning true if `auth.uid()` has an active membership for that business.
- Add RLS policies to every table that has a `business_id`: select/insert/update/delete only when `is_member(business_id)`; owner-only writes for business settings, members, and agents.
- Remove the service-role key from every request path a user controls. Owner pages use the user's session client so RLS applies.
- Customer (public) actions — read storefront by link, create a booking request, read a ticket by token — go through narrow `security definer` functions that take the business link or ticket token and touch only what they must.
- In the final report, list every remaining service-role use and why it's needed (e.g. background jobs).

## 8. One data model (align the schema with the blueprint)
Write migrations that keep all existing data and align names and structures with the blueprint's Data model and Glossary:
- `contacts` → `customers`; `escalations` → `needs_you_items` (with `type`: emergency, question, refund, complaint, other).
- Business knowledge currently in `businesses.config` → a `business_profile` table (1:1 with businesses). Keep the same information; jsonb inside it is fine where structure varies.
- `bookings`: statuses exactly `requested`, `confirmed`, `declined`, `cancelled`, `completed`, `no_show`, `expired`; add `ticket_token` (random, 32+ characters, unique) and backfill it; reference code stays display-only.
- `conversations`: add `taken_over_by` (nullable user id). `messages.role`: `customer`, `agent`, `owner`, `system`.
- New empty tables for later phases, with RLS: `staff_services`, `agents`, `agent_runs`, `notifications`, `audit_log`. Seed the five built-in agents for each business in `agents`.
- **Cruz Family Dental** becomes a normal business: currency ₱, built-in schedule (`calendar_mode` = requests), Cal.com kept only as an optional connection that is switched off. One booking system for everyone.
- Update all code, types, and UI text to the new names. No old names left (search the codebase and report zero matches).

## 9. One source of truth for numbers
- Create one server module (e.g. `src/server/metrics.ts`) that computes every count shown anywhere (conversations, requests, confirmed, completed, no-shows, needs-you) for a business and a date range in Asia/Manila.
- Point Dashboard and Today at it so they can't disagree (Phase 3 merges them into Home). Fix the contradictions seen live: Today saying "No conversations yet" for a business that has them, the checklist rendering twice, "this week" counts disagreeing.

## 10. Website honesty (small)
- Remove claims the product doesn't meet today: the Setup agent "interviews you", "books real appointments into your calendar", "set up in about 15 minutes", and the "Open demo dashboard" links. Replace demo links with "Sign in". Keep the existing design.

## 11. Operations basics
- Security headers (Next.js config): no framing of owner pages, sensible content-security basics.
- Error monitoring: wire Sentry only if `SENTRY_DSN` is set; otherwise skip and note it.
- GitHub Actions: run type-check, lint, unit tests, and the security suite on every push to `staging` and on pull requests to `main`.

## 12. Security test suite (this is the gate)
Write these as automated tests (unit/integration with two seeded test users and two businesses, created by the tests and cleaned up afterward, plus Playwright where a browser is needed):
1. Signed-out visitor opening any `/app/...` page is sent to `/sign-in`.
2. User A, signed in, cannot read or change Business B's rows through the Supabase client with A's session — for every table with `business_id`.
3. User A cannot open Business B's pages by changing the URL (gets "not found" or the picker, never B's data).
4. Every owner server action rejects a request for a business the user isn't a member of.
5. A ticket can be opened only with its token; the reference code alone returns nothing.
6. The storefront and booking request still work for an anonymous customer.
7. The service-role key does not appear in any client bundle (build the client and search it).
8. Staff role cannot edit business settings or agents.
9. A full sign-in → land on Home → sign-out journey passes at 390px and 1280px.

## 13. Skills to install (give me these steps in section 1)
- **Superpowers:** `/plugin install superpowers@claude-plugins-official` — or `/plugin marketplace add obra/superpowers-marketplace` then `/plugin install superpowers@superpowers-marketplace`.
- **Anthropic skills (webapp-testing, frontend-design, skill-creator):** `/plugin marketplace add anthropics/skills` then `/plugin install example-skills@anthropic-agent-skills`. If a skill doesn't appear, copy it from https://github.com/anthropics/skills into `.claude/skills/`.
- Keep `premium-ui-design/` in the project.
- Confirm in the report which skills are installed and that you used them.

## NOT in Phase 0
The six-section owner app (Phase 3), onboarding redesign and staff invites (Phase 1), storefront redesign, rate limiting, bot protection, My bookings (Phase 2), text messaging, changing the AI model, custom agents.

## Deliver
- The approved plan (before building), then the work on `staging`.
- Security suite results with evidence; the list of remaining service-role uses; the zero-matches search for retired names.
- The FINAL REPORT from CLAUDE.md.
