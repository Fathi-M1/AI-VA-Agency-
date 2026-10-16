# Migration runbook — Phase 0 data model (Release 2)

You run these commands yourself. They change the **production** database
(project `aoyadctzaqgnicxeigvs`), the only Supabase project until the pilot.
Claude never runs anything against it.

Takes about 20 minutes. Do it in one sitting: between step 6 and the merge
afterwards, the live site shows errors (the old code reads tables that were just
renamed). The site is behind the lock, so only you can see that.

**Golden rules**
- Any step fails → **stop**. Copy the whole error and send it to Claude. Don't retry,
  don't improvise.
- Never run the baseline migration a second time, and never run `supabase migration repair`
  or `supabase db reset` unless Claude has given you the exact command for that situation.
- Every migration file has a **Rollback** note at the top, if a step ever has to be undone.

---

## Before you start (once)

1. **Docker Desktop**, installed and running (the whale icon in the taskbar says "running").
   Only the backup in step 2 needs it: `supabase db dump` runs `pg_dump` inside Docker.
   Get it from docker.com/products/docker-desktop.
2. **Your database password.** Supabase dashboard → Project Settings → Database. If you
   don't know it, click *Reset database password* and save the new one in your password
   manager. The app doesn't use this password (it uses API keys), so resetting it breaks nothing.
3. **Git Bash**, open in the `web` folder, on the branch with the migrations:

```bash
git switch feat/data-model
```

```bash
git status
```

   ✅ Success: `On branch feat/data-model` and `nothing to commit, working tree clean`.

---

## Step 1 — Log in and link the project (changes nothing in the database)

The backup command needs to know which project to read from, so linking comes first.
Linking only saves the project ID in `supabase/.temp/` (that folder is git-ignored).

```bash
npx supabase login
```

✅ Success: a browser tab opens, you approve, and the terminal says `You are now logged in`.

```bash
npx supabase link --project-ref aoyadctzaqgnicxeigvs
```

Paste your database password when asked (the characters don't show; that's normal).

✅ Success: `Finished supabase link.` Warnings that the local config differs from the
project are fine. Nothing is pushed.

❌ `password authentication failed` → the password is wrong. Reset it (Before you start,
item 2) and run `link` again.
❌ `Access token not provided` → run `npx supabase login` again.

---

## Step 2 — Back up the database

Three files: roles, structure, data. They hold customer data, so they live **outside**
the repo and never go to GitHub.

```bash
mkdir -p ~/Documents/ai-va-backups/2026-10-16
```

```bash
npx supabase db dump --linked --role-only -f ~/Documents/ai-va-backups/2026-10-16/roles.sql
```

```bash
npx supabase db dump --linked -f ~/Documents/ai-va-backups/2026-10-16/schema.sql
```

```bash
npx supabase db dump --linked --data-only --use-copy -f ~/Documents/ai-va-backups/2026-10-16/data.sql
```

```bash
ls -l ~/Documents/ai-va-backups/2026-10-16
```

✅ Success: three files, none of them 0 bytes. `schema.sql` is the biggest. Then:

```bash
grep -c "COPY public" ~/Documents/ai-va-backups/2026-10-16/data.sql
```

✅ Success: a number above 0 (one per table with data).

❌ `Cannot connect to the Docker daemon` → start Docker Desktop, wait until it says
running, then repeat the command.
❌ Anything else, or you can't get Docker running → **stop here**. Don't push without a backup.

---

## Step 3 — Before-check (read-only)

```bash
npx supabase db query --linked -f supabase/checks/before-migration.sql
```

✅ Success: six `count` rows (businesses, customers, conversations, messages, bookings,
needs_you_items) and **no `blocker` rows**. **Write the six numbers down.** Step 7 must
show the same numbers.

❌ Any `blocker` row (for example `booking status | on_hold`) → **stop**. That's a value
the migrations don't know how to rename, and they would refuse to run. Send Claude the
rows; the mapping gets added and tested first.

---

## Step 4 — See what's already applied (read-only)

```bash
npx supabase migration list --linked
```

✅ Success: ten rows. The **Local** column lists `20261016000100` … `20261016001000`, and
the **Remote** column is empty for every row (nothing applied yet).

❌ Anything already in the Remote column → **stop** and send Claude the output.

---

## Step 5 — Dry run (read-only)

```bash
npx supabase db push --linked --dry-run
```

✅ Success: it says it *would* push these ten files, in this order:

1. `20261016000100_baseline.sql` — records today's tables as the starting point (no data changes)
2. `20261016000200_memberships.sql` — users, memberships, `is_member`/`is_owner`
3. `20261016000300_rls_policies.sql` — row-level security by membership
4. `20261016000400_customers_needs_you.sql` — contacts → customers, escalations → needs_you_items
5. `20261016000500_messages_conversations.sql` — message roles customer/agent/owner/system
6. `20261016000600_booking_status_ticket_token.sql` — new booking statuses + private ticket tokens
7. `20261016000700_business_profile.sql` — business_profile table, filled from today's settings
8. `20261016000800_agents_and_logs.sql` — agents, agent runs, notifications, audit log
9. `20261016000900_cruz_normal_business.sql` — Cruz becomes a normal Requests-mode business
10. `20261016001000_public_functions.sql` — the narrow customer functions (storefront, booking request, ticket)

❌ A different list → **stop** and send Claude the output.

---

## Step 6 — Push (this is the step that changes production)

```bash
npx supabase db push --linked
```

It asks `Do you want to push these migrations?` → type `Y` and Enter.

✅ Success: `Applying migration 20261016000100_baseline.sql...` and so on for all ten,
then `Finished supabase db push.`

❌ It stops with an error naming a file. The CLI applies files one at a time: the files
before the failing one stay applied, and the failing one is undone. **Stop.** Don't run
push again, and don't try to fix the database by hand. Send Claude:
- the full error text
- the output of `npx supabase migration list --linked`

Claude then works out the fix against a local copy and gives you the exact next command.
The backup from step 2 is there if a full restore is ever needed; Claude will give you
the exact restore steps for that situation rather than a generic recipe.

From this moment the live site shows errors until Claude merges the new code. That's expected.

---

## Step 7 — After-check (read-only)

```bash
npx supabase db query --linked -f supabase/checks/after-migration.sql
```

✅ Success:
- the six `count` rows show **exactly the numbers from step 3** (customers = old contacts,
  needs_you_items = old escalations)
- every `check` row says `ok` (11 rows)
- `info | Cruz business` says `requests, Asia/Manila`

❌ A count is different, or any row says `PROBLEM: …` → **stop** and send Claude the full output.

---

## Step 8 — Tell Claude "migrations done"

Paste the step 7 output with it. Claude then:
1. checks the schema read-only
2. merges `feat/data-model` into `main` and pushes (Vercel deploys in about 2 minutes)
3. asks you to sign in through the site lock in the browser pane (Claude never types your
   password), then confirms Today, Customers, Needs you, the booking page and a ticket all
   work on the live site
