# Mistakes log

Append an entry whenever something breaks during a build: symptom / root cause / fix /
prevention. Read this before building. Never repeat a logged mistake.

---

## #1 — Stale `.next` cache made every route 404

- **Symptom:** `/playground` returned "Sorry, something went wrong" and all routes
  (including `/` and `/api/agent`) returned 404.
- **Root cause:** a stale `.next` cache after running `next build` while the dev server
  (`npm run dev`) was running against the same `.next` folder.
- **Fix:** stop the dev server, delete `web/.next`, restart `npm run dev`.
- **Prevention:** never run `next build` while `npm run dev` is running.

## #2 — A "table exists" check that passed on missing tables

- **Symptom:** checking the Supabase tables with
  `.select('*', { count: 'exact', head: true })` reported every table as OK (count
  `null`, no error), but the tables did not exist.
- **Root cause:** a HEAD request has no response body, so supabase-js returns
  `error: null` and `count: null` even when PostgREST answers 404 / `PGRST205`
  ("Could not find the table").
- **Fix:** probe with a real `select('*').limit(1)` and read `error.code`; `PGRST205`
  means the table is missing.
- **Prevention:** never use `head: true` count queries to prove a table exists; treat
  `count: null` as "unknown", not "empty".

## #3 — A model outage leaves a half-saved turn

- **Symptom:** in the proof run, "I want to book a cleaning" returned "Sorry, something
  went wrong"; the retry worked, but `messages` now holds that user message twice and
  the first copy has no agent reply.
- **Root cause:** Gemini returned `503 … currently experiencing high demand` (temporary,
  Google's side). The user message is saved (and added to the in-memory model history)
  before the model is called, and nothing is rolled back when the call fails.
- **Fix:** retried the same message once; it succeeded.
- **Prevention:** read the server log before retrying (it named the 503). Not fixed in
  code yet (no retry/rollback was in scope); until it is, expect a duplicate user row
  whenever a model call fails mid-turn.

## #4 — A changed key in `.env.local` isn't picked up by a running server

- **Symptom (caught before it bit):** a new `GEMINI_API_KEY` was saved to `.env.local`
  while the dev server was already running.
- **Root cause:** `src/server/agent/llm.ts` creates the Gemini client once and caches
  it with whatever key it read first, so even if Next reloads env vars, the old
  client (old key) keeps being used until the process restarts.
- **Fix:** restarted the dev server.
- **Prevention:** after changing any key in `.env.local`, restart `npm run dev` (stop,
  then start; do NOT run `next build`, see #1) before testing.

## #5 — Groq rejects a tool call when an optional argument is `null`

- **Symptom:** after switching to Groq (`openai/gpt-oss-120b`), "I want to book a
  cleaning" returned "Sorry, something went wrong". Server log:
  `400 tool_use_failed … parameters for tool handoff_to_booking did not match schema:
  /name: expected string, but got null`.
- **Root cause:** Groq validates tool-call arguments against the JSON schema server-side
  (Gemini did not). The model sent `"name": null` for the optional `name` field, whose
  schema only allowed `"string"`.
- **Fix:** the optional field's schema is now `type: ["string", "null"]` (the
  orchestrator already treats a missing/empty name as "no name").
- **Prevention:** on Groq, every optional tool parameter must allow `null` in its
  schema; check the server log (`[agent] …`) before retrying a failed turn.

## #6 — The model misspelled a tool name, and the chat got stuck

- **Symptom:** proof step 2 ("ok book me", Sales -> Booking) returned "Sorry, something
  went wrong" twice in the same chat. Server log both times: `400 tool_use_failed …
  attempted to call tool 'handful_to_booking' which was not in request.tools`.
- **Root cause:** `openai/gpt-oss-120b` generated a wrong tool name (`handful_to_booking`
  instead of `handoff_to_booking`); Groq rejects any call to an undeclared tool with a
  400. In that chat it repeated the same mistake on resend. In a fresh chat the same
  steps worked first time. Each failed turn also left a duplicate user row (see #3).
- **Fix:** none in code yet. Proven in a fresh chat; asked whether to add a bounded
  retry (Groq's errors page says hallucination errors should be retried).
- **Prevention:** read `failed_generation` in the log; don't assume a resend fixes a
  model error, because it may repeat on the same history.

## #7 — A multi-file edit script stopped halfway

- **Symptom:** while wiring the sidebar badge to real data, `tsc` failed with
  `Property 'count' does not exist` in `app-sidebar.tsx`.
- **Root cause:** one Python edit script changed three files in sequence; an assertion
  failed after the first file was written, so the sidebar was half-edited and the shell
  and layout weren't touched at all.
- **Fix:** read the actual markup, then finished the remaining edits with exact
  matches; `tsc` and `eslint` clean.
- **Prevention:** one file per edit step, or validate every replacement before writing
  any file; always run `tsc` right after a scripted edit.

## #8 — Git Bash rewrote a URL path argument

- **Symptom:** a screenshot script failed with `Cannot navigate to invalid URL`.
- **Root cause:** Git Bash (MSYS) converts arguments that start with `/` into Windows
  paths, so `/conversations` became `C:/Program Files/Git/conversations`.
- **Fix:** pass page names without the leading slash (the script adds it).
- **Prevention:** never pass `/path` arguments to node scripts from Git Bash; drop the
  slash or set `MSYS_NO_PATHCONV=1`.

## #9 — Rewired the Dashboard by deleting tiles instead of computing them

- **Symptom:** after the real-data wiring the Dashboard showed only 3 counts; the hero,
  trend chart, after-hours ring and two stat tiles were gone. The owner asked why the
  design changed and why it didn't just show numbers (0 where there's nothing yet).
- **Root cause:** I treated "no real source" too broadly. After-hours (conversation
  time vs configured hours), average first reply (message timestamps) and resolved
  escalations WERE computable from existing rows; I hid them, and changed the layout.
- **Fix:** restored the original Dashboard design; every tile now reads real data or
  shows 0 (revenue shows $0 with a note: no average job value is configured).
- **Prevention:** "real data only" means swap the data source, keep the design. Derive
  what can be derived; show 0 (with a short note when it's 0 by definition); never
  remove a tile without asking.

## #10 — Repeated #7 (multi-file edit script)

- **Symptom:** an edit script touching four files stopped on its second file.
- **Root cause:** ignored #7's prevention and batched files again.
- **Fix:** no half-edited file this time (each file asserts before writing); finished
  the rest one file at a time with exact edits; `tsc` clean.
- **Prevention:** #7 stands: one file per edit step. Re-read MISTAKES.md before each build.

## #11 — Speech recognition can't be proven in automated Chrome

- **Symptom:** testing voice mode with Chrome's fake microphone (a WAV of "hi" /
  "I want to book a cleaning"), recognition always ended with no words and no error,
  in both headless and visible Chrome 154.
- **Root cause:** Chrome's SpeechRecognition sends audio to Google's speech service.
  Event logging showed the audio arriving (audiostart, soundstart, speechstart) and the
  fake mic carrying the file correctly, but the service returned nothing for the
  automated (puppeteer) browser. I first misread a peak level of 1.0 as "the file
  isn't playing"; a level-over-time check proved the file was fine.
- **Fix:** (a) the UI now says "Didn't catch any words…" instead of silently going
  back to Ready when recognition returns nothing; (b) everything after transcription
  (real agents, Cal.com, Supabase channel "voice", real speechSynthesis) was verified in
  a visible Chrome with a stand-in recognizer; (c) the real-mic test is left to a human.
- **Prevention:** don't claim speech-to-text works from automation. Check audio with a
  level-over-time probe, not a single peak value; `getUserMedia` needs a secure
  context (localhost), not `about:blank`.

## #12 — Replaced the owner's logo instead of removing the icon they meant

- **Symptom:** asked to "remove this logo, I can't see it" (with a screenshot of the
  sparkles icon), I replaced the V/A logo with a sparkles mark.
- **Root cause:** read "logo" literally and didn't match it to the attached image.
- **Fix:** restored the V/A logo + favicon; removed the sparkles icon everywhere.
- **Prevention:** when a request comes with an image, act on what the image shows; if
  the words and the image disagree, ask before changing a brand asset.

## #13 — Setup agent created a business without the owner's confirmation

- **Symptom:** in the first registration test the agent called create_business
  straight after collecting details, without showing a summary or waiting for "yes".
- **Root cause:** "confirm first" was only an instruction in the prompt.
- **Fix:** two-step handshake in code: propose_business stores a validated draft and
  returns a summary; create_business refuses unless the draft came from an earlier
  turn (the owner has replied). Re-tested: summary shown, created only after "yes".
- **Prevention:** anything irreversible must be gated in code, not just in prompts.

## #14 — Updated image didn't show (stale next/image cache)

- **Symptom:** after re-shooting the hero screenshot, the page kept showing the old one.
- **Root cause:** next/image's dev optimizer caches by URL; same filename = old image.
- **Fix:** gave the new file a new name (`app-conversations-v2.webp`).
- **Prevention:** version the filename when replacing an image in `public/`.

## #15 — New Prompt-01 files failed the React hooks lint rules

- **Symptom:** after building /setup, /book and /today, `eslint` flagged 7 errors in my
  new files: setState called directly inside effects (draft restore, online status,
  share support, sheet resets) and `Date.now()` during a server render.
- **Root cause:** reached for "reset/sync state in useEffect" out of habit; this
  project's lint config (React Compiler rules) forbids it.
- **Fix:** `useSyncExternalStore` for browser state (mounted, online, share), keyed
  child components for per-request sheet state, a derived value instead of a
  clearing effect, the online event for the offline queue, and one `nowMs` read in
  the cached Today loader. `tsc` and `eslint` clean on every new/changed file.
- **Prevention:** run `eslint` on new files right after writing them, not only `tsc`;
  don't sync state in effects — derive it, key it, or subscribe to it.

## #16 — A shell heredoc turned "\n" escapes into real newlines

- **Symptom:** after a scripted edit of `requests.ts`, `tsc` reported "Unterminated
  string literal" in `.join("\n")` and two template strings.
- **Root cause:** the Python edit was passed to the shell as an inline heredoc; the
  `\n` escapes in it reached the file as real line breaks.
- **Fix:** restored the four escapes with a script file that builds `\n` from parts;
  `tsc` clean.
- **Prevention:** never put backslash escapes in inline heredoc edits; write the edit
  script to a file first (as #7 says) and run `tsc` right after.

## #18 — The honesty test missed the page description

- **Symptom:** after Release 1 went live, the landing page's meta description (the text
  search results show) still said the agents "book real appointments into your calendar".
- **Root cause:** the website-honesty test only read `src/components/landing/`; the
  page metadata lives in `src/app/(marketing)/page.tsx`.
- **Fix:** the test now scans the landing components, every file under
  `src/app/(marketing)/` and the root layout; description reworded to match the hero.
- **Prevention:** a copy test scans every file that renders public text (pages,
  layouts, metadata), not just the component folder; check the live HTML after a release.
