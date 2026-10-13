# AI VA Agency — Product Blueprint

Oct 13, 2026 · @Fathi

## The product in one page

AI VA Agency gives a small Philippine service business an AI front desk: a booking page customers actually use, an AI team that answers and organizes requests, and one simple app where the owner confirms bookings and sees what needs them.

Who it's for. The owner of a 1–9 person appointment business (clinic, salon, aircon cleaning, vet, auto shop, and similar). The owner is the front desk, works from a phone between jobs, and today runs bookings through Messenger threads and a notebook.

The three goals every decision is checked against:

- Usable without help. An owner with little software experience goes from sign-up to taking booking requests in about 10 minutes, on a phone.

- Helps run the business, not just chat. Every customer contact ends as a clear outcome: a confirmed booking, an answered question, or an item that needs the owner, with the customer told what happens next.

- Teachable with minimal code. A learner on apexhuman.ai can understand the whole system from this blueprint and add a new business type or a new agent mostly by editing configuration.

The 30-second explanation (no app needed): A customer taps the business's booking link on Facebook. They pick a service, answer a few tap questions, choose who and when, and get a ticket. Behind the page, an AI team answers questions and turns every request into something clean and complete. The owner opens one app, sees today's requests, confirms them in a tap, and the customer gets a text. An Admin assistant watches over the team and tells the owner what needs them.

What it is not. Not a chatbot widget (the page is a booking flow; the AI helps it). Not a Messenger replacement (it gives owners a link to put where customers already are). Not a prototype: real sign-in, real data isolation, real notifications.

## Product hierarchy

A business is the unit of everything: its people, its AI team, its work, and its knowledge all live inside it, and nothing crosses from one business to another.

product hierarchy · platform, business, four branches

Read it top-down: the platform holds many businesses, and each business holds four branches. The AI team does the work, using only that business's knowledge. A person who books with two businesses is two separate customer records.

## Surfaces

The product has four surfaces. Each has one audience and one job; nothing appears on a surface that serves a different audience.

| Surface | Audience | Job | Address | Sign-in |
|---|---|---|---|---|
| Public website | Prospective owners | Explain the product honestly and get them to sign up | / | No |
| Owner app | Owner and their staff | Run the business: confirm requests, see what needs them, manage the AI team and business details | /app/... | Google sign-in, required |
| Customer storefront | The business's customers | Learn about the business, book, ask questions, track their bookings | /b/{business-link} | No (customers identify by mobile number) |
| Builder console | Builders and learners (apexhuman.ai) | Test agents in a chat, inspect what each agent did, run the test suite | /console | Google sign-in, builder role only |

Rules that come from this table:

- The public website only describes features that exist today. It is updated in the same change as the feature.

- The owner app never shows demo data. A new business starts empty, with kind empty states.

- The storefront never shows owner-only data (private mobile, internal notes, other customers).

- The chat playground moves out of the owner app into the builder console. Owners never see it.

## Owner app: six sections

The owner app has exactly six sections. Today, Dashboard, Escalations, Agents, Calendar, Contacts and Settings are merged into them, so each thing lives in one place.

| Section | The owner's question it answers | What's in it | What is NOT in it | Replaces |
|---|---|---|---|---|
| Home | "What needs me, and how is business going?" | Admin assistant's daily brief (one sentence); "Needs you" (booking requests to confirm, items the AI couldn't handle); today's appointments; this week's results (requests, confirmed, completed, no-shows, estimated value) | Full lists, settings, charts beyond one small weekly view | Today + Dashboard |
| Inbox | "Who contacted us and what happened?" | Every customer conversation in one list, newest first; filters: Needs you / Booking requests / All; open one = the full thread, what each agent did, the linked booking, and a "Take over" button to reply as a human | Booking management (lives in Schedule) | Conversations + Escalations |
| Schedule | "Who is booked when?" | Day and week view per team member; pending requests shown as dashed blocks; confirm, move, cancel, mark completed or no-show | Customer details beyond the booking | Calendar |
| Customers | "Who are my customers?" | Searchable list; each customer's bookings, conversations, notes, consent status | Marketing tools (later) | Contacts |
| Team | "Who works here, human and AI?" | Two tabs: People (staff, their services and working hours) and AI team (each agent's job, on/off, what it did this week, its rules; templates to add agents; the custom agent builder) | Business-wide settings | Agents + the hours part of setup |
| Business | "What do customers and my AI team know about us?" | Profile (name, type, address, contact, brand color, booking link); services and prices; policies (walk-ins, payment, cancellation); safety (emergency message, approval limits); account (members, plan, sign-out) | Anything already shown in Team | Settings + the rest of setup |

Navigation. Phone: a bottom bar with Home, Inbox, Schedule, Customers, and a "More" tab for Team and Business. Laptop and tablet: a left sidebar with all six, Home first. A count badge appears only on Home (things that need you) and Inbox (unread).

The Admin assistant is everywhere. A small "Ask your assistant" button sits in the top bar of every owner screen. It opens a side panel where the owner can ask ("What happened today?") or instruct ("Turn off Sales on Sundays"). Actions it proposes need a tap to confirm.

## Customer storefront

The storefront is the business's mini-website: customers learn about the business, book in a few taps, ask questions, and track every booking afterward. Booking is one part of it, not the whole page.

Pages:

| Page | Address | What the customer does there |
|---|---|---|
| Storefront home | /b/{link} | Sees the business: brand color, name, open/closed status, quick facts (payment, walk-ins, areas, HMO), short "About us", services with prices and durations, team, hours, address with a map link, FAQs. Big "Book now" button and "Ask a question" button. |
| Book | /b/{link}/book | The tap-through flow: service → detail questions → who & when → your details → send. A "Tell us what you need" box can fill the form from one sentence. A live receipt shows the estimate. |
| Ticket | /b/{link}/t/{private token} | Sees the request's status (waiting / confirmed / declined / rescheduled / cancelled / completed), adds it to their calendar, messages the business, cancels or asks to reschedule. |
| My bookings | /b/{link}/me | Enters their mobile number, receives a 6-digit text code, sees all their past and upcoming bookings with this business, and books again with one tap. |

The customer journey, end to end:

- Taps the link on the business's Facebook Page or a Messenger auto-reply.

- Storefront home answers "is this the right place?" in 5 seconds: what they do, prices, when they're open.

- Taps "Book now" (or types what they need) and finishes in under a minute, mostly by tapping.

- Gets a ticket on screen and a text message with the ticket link.

- When the owner confirms, gets a second text: "Confirmed for Sat, Oct 17, 2:00 PM with Joy." The ticket updates.

- The day before, gets a reminder text with "Reply 1 to confirm, 2 to reschedule." (Reminders are phase 2.)

- Returns any time through the ticket link or "My bookings" to reschedule, cancel, or book again.

Rules: the ticket link uses a long random token, not the guessable reference code; the ticket shows only the customer's first name; every free-text box runs the emergency check; the customer never has to sign in to book.

## The AI team

Five built-in agents, each allowed to do only its own job, plus custom agents the owner adds from templates or builds from a fixed menu of safe actions. Agents can't do anything they have no tool for; that is the core safety rule.

| Agent | Job | Sees | Can do (tools) | Can't do | Hands off to |
|---|---|---|---|---|---|
| Receptionist | Understand what the customer wants, route it | The message, business profile | Route to Booking, Sales or Support | Answer in depth, book, quote | Booking / Sales / Support |
| Booking | Turn a booking intent into a complete request | Services, team, hours, the business's question set | Fill the booking form from text, ask the next question, compute the estimate, create a request | Confirm a booking, invent times or prices | Owner (via Needs you) |
| Sales | Answer new customers' questions | Business profile, services, prices, FAQs | Answer from business data, start a booking | Discounts, promises outside policy | Booking |
| Support | Help existing customers | Their own bookings (after mobile is verified), policies | Look up their bookings, request reschedule/cancel, create a Needs-you item | Refunds, medical/legal advice | Owner (via Needs you) |
| Admin assistant | Onboard the owner, then oversee the team | Everything in this business | Daily brief, weekly report, flag problems, explain any conversation, change settings with the owner's tap to confirm | Act on customers directly, change anything without confirmation | Owner |

How the agents work together:

- One memory per customer. Every agent sees the same customer record and conversation, so nobody asks twice.

- Visible handoffs. Each handoff is logged with a reason ("Booking intent detected") and shown in the Inbox thread, so the owner can see who did what.

- The owner can step in. "Take over" in Inbox pauses the agents on that conversation until the owner hands it back.

- The Admin assistant watches outcomes, not chats. It flags patterns: requests waiting more than 2 hours, repeated unanswered questions ("5 people asked about parking this week — add an FAQ?"), rising no-shows.

Custom agents (the owner's own agents):

- Templates first: Reminder agent (texts the day before), Follow-up agent (checks in after a visit, asks for a review), Rebooking agent ("due for your next cleaning"), FAQ agent (answers one topic in depth).

- Builder: the owner gives the agent a name, a job in plain words, when it runs (a trigger: new booking, booking confirmed, visit completed, no-show, a schedule), and picks its actions from a fixed menu (send a text from a template, create a Needs-you item, tag a customer, suggest a booking). It cannot get any action outside the menu.

- Lifecycle: Draft → Test (run it against sample customers in a sandbox, see exactly what it would send) → Live → Paused. Every message it sends is logged in Inbox.

- Guardrails can't be edited: emergency handling, consent, no invented prices or times, owner confirmation for anything involving money.

## Core objects and their lifecycles

A booking's status is the single fact every screen reads: Home, Inbox, Schedule, the ticket, texts, and reports all show the same status at the same moment.

booking lifecycle · 6 states

Every status change sends the customer a text and updates their ticket. A request whose preferred day passes with no answer becomes Expired; the customer is texted to pick another time, and the Admin assistant flags requests unanswered for more than 2 hours.

| Object | States | Who moves it |
|---|---|---|
| Conversation | Open → Taken over (owner replying) → Open → Closed after 24 hours of no activity | Agents, owner (take over / hand back), system (auto-close) |
| Needs-you item | Open → Done | Created by agents or the safety check; closed by owner or staff |
| Customer | New → Returning (after a first completed booking) → Inactive (no booking in 6 months) | System, from bookings |
| Agent | Draft → Testing → Live → Paused | Owner |

## Feature specs (before any code)

Every feature is written in this format and approved before Claude Code starts. A feature is "done" only when its done-when checks pass in an automated browser test. Each spec below becomes the brainstorming input for that feature's build.

### F1. Sign in and create a business

- Trigger: "Register your business" on the website.

- Steps: Continue with Google → account created → no business yet → onboarding (F2). Returning owner → Home of their business. Owner of several businesses → business picker after sign-in.

- Data: user, business, membership (role owner).

- Edge cases: Google sign-in cancelled → back to website with "Sign-in was cancelled."; a staff invite link → joins that business as staff.

- Done when: a new Google account lands in onboarding; a returning one lands on its Home; nobody can open another business's pages by changing the address.

### F2. Onboarding with the Admin assistant

- Trigger: first sign-in with no business.

- Steps: 1) business type (search + cards; "Other" asks "Describe your business in a sentence" and the AI drafts services and booking questions for the owner to correct) 2) services and prices 3) team and hours, with the reason shown: "So customers can choose who serves them and your AI only offers times when someone works" 4) contact and safety → live. Then a guided tour: the Admin assistant walks through Home, Inbox, Schedule and Team with 4 short pointers, and offers "Send yourself a test booking."

- Data: business, services, staff, staff hours, profile; draft saved to the server (not the browser), so it survives devices.

- Edge cases: leaving mid-way → resume on any device; switching type → confirm reset; AI draft for "Other" fails → a blank service list with "Add your first service."

- Done when: a non-technical tester finishes in under 10 minutes without help; the tour can be replayed from Business.

### F3. Customer sends a booking request

- Trigger: "Book now" on the storefront.

- Steps: service → detail questions (tiles, steppers, short text) → who & when (team member, day, part of day) → name, mobile, consent if required → send → ticket → text message with ticket link.

- Data: customer (matched by mobile), conversation, booking (status requested), ticket token.

- Edge cases: emergency words → emergency message + Needs-you item; "Fill it for me" slow or failing → the tap flow still works, with "We couldn't read that. Please pick below."; text fails to send → ticket still shown, owner sees a warning.

- Done when: a customer on a 390px phone finishes in under 60 seconds; the request appears on Home within 5 seconds.

### F4. Owner confirms or declines, customer is told

- Trigger: request card in Home or Inbox.

- Steps: Confirm → day, team member and time preselected from the request → confirm → the customer gets a text automatically and the ticket updates. Decline → reason → customer text + ticket "Not available" with "Request another time."

- Data: booking status, exact time, staff; message log.

- Edge cases: overlapping booking → blocked with the conflicting time shown; customer cancels first → card shows "Cancelled by customer".

- Done when: confirming takes 3 taps; the customer's ticket and text match the confirmed time.

### F5. Owner takes over a conversation

- Steps: Inbox → open thread → "Take over" → owner replies by text (sent to the customer's mobile) → "Hand back to AI."

- Done when: agents stay silent while the owner has taken over; every message is logged in order.

### F6. Daily brief and weekly report

- Steps: each morning the Admin assistant writes Home's one-sentence brief from real data; every Monday a short weekly report (requests, confirmed, completed, no-shows, estimated value, top unanswered questions) appears in Home and can be texted or emailed to the owner.

- Done when: every number matches the database; zero states read kindly.

### F7. Custom agent

- Steps: Team → AI team → Add agent → template or blank → name, job, trigger, actions from the menu, message templates → Test with sample customers → Go live.

- Done when: a Reminder agent built from the template sends the right text to a test booking, and cannot perform any action outside its menu.

### F8. Edit business details

- Steps: Business → any section opens the same friendly editors used in onboarding; changes apply to the storefront and agents immediately.

- Done when: changing a price on Business changes the storefront and the AI's answer within one minute.

### F9. Customer's "My bookings"

- Steps: enter mobile → 6-digit text code → list of bookings → reschedule request, cancel, or book again.

- Done when: a wrong code 5 times locks for 15 minutes; a customer only ever sees their own bookings.

## Data model

One set of tables is the only source of truth. Every screen, agent and report reads from it; nothing is computed from conversations, demo values, or a second calendar. Every row except users carries a business_id.

| Entity | What it is | Key fields | Belongs to |
|---|---|---|---|
| users | A person who signs in with Google | id, email, name, avatar | — |
| businesses | One business (tenant) | name, type, link, timezone, brand color, address, public contact, onboarding state | — |
| memberships | Who can access a business, and how | user_id, business_id, role (owner / staff), status | users + businesses |
| business_profile | What customers and agents know | about text, policies, payment methods, walk-ins, HMOs, service areas, emergency message, approval limits, FAQs | businesses (1:1) |
| services | What can be booked | name, pricing type, price, duration, variants, active | businesses |
| staff | People who serve customers | name, linked user (optional), active | businesses |
| staff_services | Who can do which service | staff_id, service_id | staff + services |
| staff_hours | When each person works (split shifts allowed) | weekday, start, end | staff |
| customers | A customer of this business | name, mobile (unique per business), email, consent time, notes | businesses |
| conversations | One thread with a customer, any channel | customer_id, channel (storefront, chat, sms), status, taken over by | customers |
| messages | Every message in a thread | role (customer / agent / owner / system), agent name, content, time | conversations |
| bookings | A request that may become an appointment | customer_id, service_id, staff_id, status, preferred day + part of day, exact start/end, details, estimate, reference code, ticket token, source | customers |
| needs_you_items | Something the owner must handle | type (emergency, question, refund, complaint, other), reason, status, links to customer/conversation/booking | businesses |
| agents | Built-in and custom agents of this business | kind (built-in / template / custom), name, job text, trigger, allowed actions, status (draft / test / live / paused) | businesses |
| agent_runs | Every time an agent acted | agent_id, input, actions taken, result, tokens, time | agents |
| notifications | Every text or email sent | to, channel, template, status (queued / sent / failed), linked booking | businesses |
| audit_log | Who changed what | actor (user / agent), action, before/after, time | businesses |

Rules:

- Statuses live in one place: a booking's status drives Home, Inbox, Schedule, the ticket, and the weekly report. No screen keeps its own count.

- The legacy Cruz Family Dental data is migrated into these tables as a normal business (pesos, built-in calendar). Cal.com becomes an optional connection, not a separate product.

- Business-type packs stay as files; at onboarding they are copied into the business's own rows, so the owner can edit everything.

## Security and production readiness

The product moves from "server key does everything" to real accounts and per-business access enforced by the database itself, so a bug in one page can't leak another business's data.

Sign-in and access

- Google sign-in through Supabase Auth. The "Switch business (demo)" page and the biz cookie are removed.

- Every owner page and API checks the signed-in user's membership for that business, on the server.

- Roles: owner (everything, including members and money-related settings) and staff (Home, Inbox, Schedule, Customers; no Business or Team edits).

- Staff join only through an invite link the owner creates; links expire after 7 days.

Database protection

- Row-level security on every table, with policies based on membership: a signed-in user can read and write only rows whose business_id they belong to.

- The service-role key is used only by trusted server jobs (sending texts, agent runs), never in request paths that a user controls without a membership check.

- Customer-facing actions (booking, tickets, My bookings) go through narrow server functions scoped to one business link, never through direct table access.

Public endpoints (storefront, booking, AI parsing, Ask)

- Rate limits per IP and per mobile number (for example: 10 AI requests per minute per visitor; 5 booking requests per hour per mobile).

- Bot protection on the booking form (an invisible challenge) before AI calls are spent.

- Ticket links use 32+ character random tokens; reference codes are display-only.

- My bookings uses one-time text codes: 6 digits, 10-minute expiry, 5 attempts then a 15-minute lock.

Privacy (Data Privacy Act)

- Explicit consent recorded with time before collecting health details (types that require it).

- Collect the minimum: name and mobile to book; email optional.

- Owners can export or delete a customer's data from Customers; deletion removes messages and personal fields and keeps anonymous booking counts.

- A privacy notice and terms page linked from the storefront and sign-up.

- Registration with the National Privacy Commission to be checked before real health businesses go live (we'd hold sensitive data for many businesses).

Operations

- Two environments: staging and production, each with its own Supabase project and keys. Changes reach production only after tests pass on staging.

- Error monitoring and alerts (for example Sentry) on server and browser errors.

- Daily database backups with a tested restore.

- Secrets only in environment variables; never in code, logs, or the browser.

- An audit log of every change by owners and agents.

## Platform services and open decisions

Four outside services carry the product. Two are decided; two need your decision before the build reaches them.

| Service | Used for | Status | Notes |
|---|---|---|---|
| Supabase | Database, Google sign-in, row-level security, storage | Decided | Already in use; add Auth and policies |
| Vercel | Hosting the app (staging + production) | Decided | Already deployed |
| Text messaging (SMS) | Request received, confirmed, declined, reminders, My-bookings codes | Open | Costs money per message. Needs a provider that delivers reliably to PH numbers with a business sender name. I'll research PH options and costs before recommending one. |
| AI model | Agents, "Fill it for me", Admin assistant | Open | Groq's free tier is too slow and rate-limited for live customers ("Fill it for me" took 10–12 seconds and failed under load). Options: a paid tier, or a different provider. Must support tool calling and structured output. |
| Email | Weekly report, staff invites, receipts | Later | Optional in v1; SMS covers customers |
| Calendar sync | Google Calendar two-way sync | Later | The built-in schedule is the source of truth; sync is an add-on |
| Payments | Deposits via GCash/QR Ph | Later | Many salons require deposits; phase 3 |

Rule: every outside service sits behind one small adapter in the code (for example, sendText()), so switching providers changes one file. This also keeps the code teachable.

## Glossary

One name per concept, used the same way in the UI, the code, the agents and this doc. Retired names must not appear anywhere in the product.

| Use this | Meaning | Never say |
|---|---|---|
| Business | One customer account of the platform (a clinic, a salon) | Tenant, workspace |
| Owner / Staff | People who sign in to run a business | Admin user, operator |
| Customer | A person who books with a business | Patient (except in clinic copy), lead, contact |
| Storefront | The business's public page | Hosted page, booking widget |
| Booking link | The storefront's address | Slug, URL |
| Booking request | A booking the customer sent, not yet confirmed | Appointment, reservation |
| Booking | A confirmed time with a team member | Event, slot |
| Ticket | The customer's page for one booking | Receipt, confirmation page |
| Needs you | Something the owner must handle | Escalation |
| Inbox | All conversations | Conversations log |
| AI team | The agents working for a business | Bots, chatbot |
| Your assistant | The Admin assistant | Setup agent (after onboarding) |
| Team | Human staff + AI team | Agents page |
| Business type | Dental clinic, salon, etc. | Vertical, pack (in the UI) |
| Estimate | The computed price before confirmation | Quote, price (unconfirmed) |

## Scope and how we build

v1 is a real product for one owner with a small team: sign-in, onboarding, storefront with booking and tickets, the six-section owner app, texts to customers, and the five built-in agents. Custom agents, reminders and payments follow.

| In v1 | Phase 2 | Later |
|---|---|---|
| Google sign-in, owner + staff roles | Reminders and follow-up texts | Deposits (GCash/QR Ph) |
| Onboarding + Admin assistant tour | Custom agents (templates + builder) | Google Calendar sync |
| Storefront, booking, ticket, My bookings | Weekly report by text/email | Messenger connection |
| Home, Inbox, Schedule, Customers, Team, Business | More researched business types | Voice (phone or Messenger calls) |
| Texts: received, confirmed, declined | Customer reviews | Multi-location businesses |
| Five built-in agents, take-over in Inbox |  |  |

How we build every feature (the workflow Claude Code must follow):

- Spec in this blueprint first. The feature's spec (section "Feature specs") is the approved design. Nothing is built without one.

- Brainstorm the gaps with Superpowers' brainstorming skill, using the spec as the input, so questions are only about what the spec leaves open.

- Write the plan with Superpowers' writing-plans skill: small tasks, each with its test.

- Build test-first with Superpowers' test-driven-development skill: a failing test, then the code, then the passing test, then a commit.

- Test the real journey with Anthropic's webapp-testing skill: automated browser runs of the feature's done-when checks at 390, 768 and 1280px.

- Verify and review with Superpowers' verification and code-review skills; log anything that broke in MISTAKES.md.

- Ship to staging, then production, and update the public website if the feature is customer-visible.

Step zero: put the project under git with a GitHub repository (Superpowers works through commits and branches), and create the staging environment.

Skills to install in Claude Code: Superpowers (obra) for the workflow; Anthropic's webapp-testing, frontend-design and skill-creator; our premium-ui-design skill for sourcing UI components.

The build runs in five phases; each starts only when the previous gate passes.

build roadmap · 5 phases, a gate after each

Phase 0 comes first because sign-in, data rules and one data model are what every later screen stands on. The pilot puts the product in front of three real businesses before any phase-2 feature is built.

## Diagram text versions

The three diagrams above, written out so exports and coding agents get the same information.

- Product hierarchy: Platform → many Businesses. Each Business has: People (Owner, Staff, Customers); AI team (Receptionist, Booking, Sales, Support, Admin assistant, Custom agents); Work (Conversations, Booking requests, Bookings, Needs-you items, Texts sent); Knowledge (Profile and policies, Services and prices, Staff and hours, Business-type pack).

- Booking lifecycle: Requested → Confirmed (owner confirms) → Completed or No-show (owner marks). Requested → Declined (owner declines). Requested or Confirmed → Cancelled (customer or owner). Confirmed → Confirmed with a new time (reschedule). Requested → Expired (preferred day passes with no answer).

- Build roadmap: 0 Foundation (git + staging, Google sign-in, data rules, one data model; gate: security tests pass) → 1 Onboarding (gate: setup under 10 minutes, unaided) → 2 Storefront (gate: booking under 60 seconds on a phone) → 3 Owner app (gate: full journey test green) → 4 Pilot with 3 real businesses (gate: owners use it every week).

