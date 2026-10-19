# Phase 1 proposals & decisions (2026-10-19)

Researched Fresha/Squire (services), date-picker UX, and booking-confirmation UX.
Owner decisions in **bold**.

## 1. Services setup — **B. Pick-from-menu**
Today: a fixed preset list per business type you toggle. Chosen: show common services for
the business type as a checklist; tick what you offer; each ticked row expands to set
price/duration (or "price on request"); "add your own"; reorder. Feels like choosing from a
real menu, still fast. (Fresha pattern: name, duration, price, variants, keep menu current.)
Later: option C (Setup agent drafts services from plain words) folds into C-Hybrid.

## 2. Customer date picker — **B. Compact calendar**
Today: a scrolling row of day chips ("unclear"). Chosen: a small month calendar; closed days
disabled; tap a day → Morning/Afternoon/Evening. This is **requests mode** — we capture day +
time-of-day and the business confirms the exact time. (UX research: avoid spinners, show
weekday+date, disable unavailable days, a calendar reads clearer.)

## 3. Ticket (confirmation) — **A. Polished status card**
Today: works, unpolished. Chosen: a clean pass-style single-column card: status badge
(Requested → Confirmed/Declined), big service + date/time + team member, estimate, business
contact, add-to-calendar (existing ICS), and "what happens next". (UX research: single column,
clear status headline, summary, prominent reschedule/contact, 44px targets, no clutter.)

## C-Hybrid agentic journey — staged (needs dev-head sign-off)
- **Stage 0 — attribution** ✅ done: one named conversation per real request; a bare form
  parse no longer creates a fake "Unknown customer" conversation.
- **Stage 1** — an always-on "book with us" agent chat on the booking page that can *complete*
  a booking, not just answer. Reuses the existing orchestrator + booking tools; safety intact
  (never invents prices/times, owner confirms every booking). The form stays the fast path.
- **Stage 2** — unify form + chat into one consistent, correctly-attributed conversation;
  make agent attribution honest across Dashboard/Agents.
- **Stage 3** — owner-side Setup/Admin assistant; also powers the first-time walkthrough.
- **Dev-head calls:** model/cost guardrails, what the agent may do vs must defer to the owner,
  rate limiting / bot protection (excluded from Phase 0).

## Build order for this round
Customer-facing first (every customer sees them): ticket → date picker → services (onboarding).
Broader onboarding visual polish follows if time allows.
