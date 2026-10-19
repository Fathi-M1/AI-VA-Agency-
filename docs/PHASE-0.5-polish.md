# Phase 0.5 — polish & fixes (locked 2026-10-19)

Agreed with the owner after first full test of the live app. Phase 0 (auth, data model,
security) is done and live. This is the agreed follow-up.

## In this update (bugs + attribution + live page)
1. Sidebar collapses/reopens when switching business — hover/open-state bug.
2. Appointments need a manual refresh to appear — missing revalidation after confirm.
3. Booking link is hidden from first-time owners on Today — make it prominent.
4. Sign-in / "Set up your business" loop — the onboarding link on /sign-in dead-ends.
5. "Business is live" page — keep the success card, drop the phone mockup, fix the UI
   bug beneath it; make the booking link the clear next action.
6. Attribution fix: a bare "Fill it for me" parse must not create a "conversation
   handled by Booking" with an "Unknown customer". A conversation + customer is recorded
   only on a real exchange or a submitted request (with a name/mobile).

## Staged (own phases, after this)
- **C-Hybrid agentic journey.** Keep the fast form; add an always-on agent chat that can
  also complete a booking; one customer interaction = one correctly-attributed
  conversation. Build in stages: (a) attribution (above), (b) the booking agent chat in
  the customer journey, (c) unify logging/surfaces. Needs dev-head sign-off.
- **Services setup.** Research Fresha / Squire / Calendly; bring the owner 2-3 concrete
  options before building. Keep a starting template but make editing first-class.
- **Phase 1 redesigns** (blueprint): onboarding (all 4 steps), customer storefront (date
  picker, ticket), Setup/Admin walkthrough agent for first-time owners.
