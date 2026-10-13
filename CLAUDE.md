# CLAUDE.md — permanent rules for this project

Read this file, `docs/BLUEPRINT.md`, and `MISTAKES.md` at the start of every session.

## Source of truth
- `docs/BLUEPRINT.md` is the approved product design. Every feature must match it.
- If a request conflicts with the blueprint, or the blueprint is silent on something that matters, STOP and ask. Never guess.
- Use the blueprint's Glossary terms everywhere (UI, code, agent prompts). Never use the retired names.
- Never add a feature, workaround, or temporary measure I haven't approved. Before building anything not in the approved plan, tell me: what it is, what I will see, why it's needed, and when it will be removed. Wait for my yes.

## How every task is built (Superpowers workflow)
1. **Brainstorm** with the Superpowers brainstorming skill, using the blueprint section and the task prompt as the approved design. Ask only about what they leave open.
2. **Write a plan** with the writing-plans skill: small tasks, each with its test. Save spec and plan under `docs/superpowers/`.
3. **STOP and show me the plan.** Do not execute until I approve it.
4. **Build test-first** with the test-driven-development skill: failing test → code → passing test → commit.
5. **Test real journeys** with the webapp-testing skill (Playwright) at 390, 768, and 1280px for anything a person sees.
6. **Verify and review** with Superpowers' verification and code-review skills before calling anything done.
7. Work on the `staging` git branch. Only merge to `main` (production) when I say so.

## Definition of done
- A task is DONE only when its tests pass and you show the evidence (test output, screenshots). Otherwise it is PARTIAL or NOT DONE.
- Every task ends with the FINAL REPORT format at the bottom of this file.

## Security rules (never break these)
- Row-level security on every table. Access is decided by the user's membership in the business.
- Never use the Supabase service-role key in a request path a user controls without a server-side membership check. List every service-role use in the final report.
- Never put secrets in code, logs, commits, or the browser bundle. Use environment variables. `.env*` stays out of git.
- Public (customer) actions go through narrow server functions scoped to one business, never direct table access.

## Product rules
- One source of truth: every screen and agent reads the same tables and the same status values. No screen keeps its own counts. No hardcoded demo data.
- Never invent prices, times, policies, or facts. Missing data → say so, or leave it blank with a kind empty state.
- English only. Currency ₱. Timezone Asia/Manila. Mobile-first.
- UI components: follow the premium-ui-design skill (search the catalog, report source + license). Fewer cards: max one card per section, no card inside a card.
- Agents can only do what their tools allow. Emergency check runs before any model call on customer text.

## Working habits
- Log every mistake in `MISTAKES.md`: symptom / root cause / fix / prevention. Never repeat a logged mistake.
- Never run `next build` while `npm run dev` is running.
- Database changes go through migration files in the repo (Supabase CLI), never the SQL editor.
- Until the pilot there is ONE Supabase project (production) and development runs on localhost. Before running any migration, back up the database. Tests that create users or businesses clean them up afterward.
- A separate staging Supabase project must exist before the pilot phase (Phase 4).
- Test data uses only @example.com emails or the owner's own email and 0917-000-xxxx style numbers. Never type a real person's contact details.

## FINAL REPORT format (end of every task)
1. What I built — each part DONE / PARTIAL / NOT DONE.
2. What I did not build or changed from the spec, and why.
3. Test results — pass/fail with evidence.
4. Assumptions I made that the spec didn't specify.
5. What you need to do (manual steps, SQL, keys).
6. Known issues and risks.
7. Mistakes logged this run.

## Next.js version notes
@AGENTS.md
