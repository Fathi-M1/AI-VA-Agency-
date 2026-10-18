# Migration runbook — Phase 0 data model (Release 2)

You paste four SQL files into the Supabase SQL editor, in order. No commands, no installs.
They change the **production** database (project `aoyadctzaqgnicxeigvs`), the only Supabase
project until the pilot. Claude never runs anything against it.

The files are in `web/supabase/sql-editor/`:

| Step | File | Changes the database? |
|---|---|---|
| 1 | `1-backup.sql` | Adds a private backup copy only |
| 2 | `2-before-check.sql` | No (read-only) |
| 3 | `3-migrate.sql` | **Yes** — all 10 migrations in one go |
| 4 | `4-after-check.sql` | No (read-only) |

Takes about 10 minutes. Between step 3 and Claude's merge the live site shows errors (the
old code reads tables that were just renamed); it's behind the lock, so only you see that.

**Golden rule:** any step shows an error or something unexpected → **stop**, copy the whole
message, send it to Claude. Don't retry.

## How to paste a file

1. Open the file in VS Code or Notepad (in `web/supabase/sql-editor/`), select everything
   (Ctrl+A), copy (Ctrl+C).
2. Supabase dashboard → your project → **SQL Editor** (left menu) → **New query**.
3. Paste (Ctrl+V) → click **Run** (or Ctrl+Enter).
4. If Supabase warns about "destructive operations", that's the renames in step 3; confirm.

Use a **new query** for each file.

## Step 1 — Backup (`1-backup.sql`)

Copies every app table into a private schema `backup_phase0` inside your database.

✅ You should see a small table: businesses, contacts (customers), conversations, messages,
bookings, escalations (needs you), each with a row count.
❌ `schema "backup_phase0" already exists` → a backup is already there; go on to step 2.

## Step 2 — Before-check (`2-before-check.sql`)

✅ Six `count` rows and **no** `blocker` rows. **Write the six numbers down.**
❌ Any `blocker` row → stop and send it to Claude.

## Step 3 — Apply the migrations (`3-migrate.sql`)

All 10 migrations run in **one transaction**: if anything fails, **nothing** is changed. It
refuses to run before step 1 and refuses to run twice, and it records the migrations in
Supabase's migration history.

✅ `Success. No rows returned`.
❌ Any error → nothing was changed. Send Claude the whole error. Don't run it again.

## Step 4 — After-check (`4-after-check.sql`)

✅ The six `count` rows show **the same numbers as step 2** (customers = old contacts,
needs_you_items = old escalations); every `check` row says `ok` (11 rows); `Cruz business`
says `requests, Asia/Manila`.
❌ Anything else → send Claude the whole result.

## Then

Tell Claude **"migrations done"** and paste the step 4 result. Claude checks, merges the new
code to `main`, and the live site updates in about 2 minutes.

The backup stays in `backup_phase0` until you decide to remove it (Claude will give you
the one line for that once everything has been working for a while).
