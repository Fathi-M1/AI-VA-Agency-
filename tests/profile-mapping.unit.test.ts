// The one place that maps business_profile rows ⇄ the BusinessConfig shape the app uses.
// Must split config exactly like the SQL migration (20261016000700) and lose nothing.
import assert from "node:assert/strict"
import { test } from "node:test"

import { configFromProfile, profileFromConfig } from "../src/server/db/profile-mapping.ts"

const DENTAL = {
  business_type: "Dental clinic",
  owner_name: "Ana Example",
  timezone: "Asia/Singapore",
  hours: { mon: "08:00-17:00", tue: null, wed: null, thu: null, fri: null, sat: null, sun: null },
  emergency_line: "Call 911.",
  faqs: [{ question: "Parking?", answer: "Yes, free." }],
  restricted_advice: ["medical advice"],
  rules: { emergency_keywords: ["bleeding"] },
  approval_limits: { refund_over: 500 },
  avg_job_value: 1500,
}

const SALON = {
  timezone: "Asia/Manila",
  payment_methods: ["Cash", "GCash"],
  walk_ins: true,
  emergency_instruction: "Go to the ER.",
  refund_approval_limit_php: 1000,
  pack_version: 2,
  addon_inverter_php: 250,
  onboarding: { shared_link_at: "2026-10-12T00:00:00Z" },
}

test("profileFromConfig puts each field in its column and the rest in settings", () => {
  const out = profileFromConfig(DENTAL)
  assert.equal(out.timezone, "Asia/Singapore")
  assert.equal(out.profile.emergency_message, "Call 911.")
  assert.deepEqual(out.profile.faqs, DENTAL.faqs)
  assert.deepEqual(out.profile.approval_limits, { refund_over: 500 })
  assert.deepEqual(out.profile.settings, {
    business_type: "Dental clinic",
    owner_name: "Ana Example",
    hours: DENTAL.hours,
    restricted_advice: ["medical advice"],
    rules: { emergency_keywords: ["bleeding"] },
    avg_job_value: 1500,
  })
})

test("profileFromConfig keeps payment, walk-ins, refund limit, extras and onboarding", () => {
  const out = profileFromConfig(SALON)
  assert.deepEqual(out.profile.payment_methods, ["Cash", "GCash"])
  assert.equal(out.profile.walk_ins, true)
  assert.equal(out.profile.emergency_message, "Go to the ER.")
  assert.deepEqual(out.profile.approval_limits, { refund_over: 1000 })
  assert.deepEqual(out.profile.settings, { pack_version: 2, addon_inverter_php: 250 })
  assert.deepEqual(out.onboarding_state, { shared_link_at: "2026-10-12T00:00:00Z" })
})

test("configFromProfile gives the app the same config back (round trip)", () => {
  for (const c of [DENTAL, SALON]) {
    const { profile, timezone, onboarding_state } = profileFromConfig(c)
    const back = configFromProfile({ timezone, onboarding_state }, profile)
    for (const [k, v] of Object.entries(c)) {
      if (k === "emergency_line" || k === "emergency_instruction") {
        assert.equal(back.emergency_line, v) // one name per value
        assert.equal(back.emergency_instruction, undefined)
      } else if (k === "refund_approval_limit_php") {
        assert.deepEqual(back.approval_limits, { refund_over: v }) // one name per value
        assert.equal(back.refund_approval_limit_php, undefined)
      } else {
        assert.deepEqual((back as Record<string, unknown>)[k], v, k)
      }
    }
  }
})

test("configFromProfile copes with a business that has no profile row yet", () => {
  const back = configFromProfile({ timezone: "Asia/Manila", onboarding_state: {} }, null)
  assert.equal(back.timezone, "Asia/Manila")
  assert.deepEqual(back.services, [])
  assert.equal(back.emergency_line, "")
})

test("editing the emergency message or refund limit in Settings is not undone on save", () => {
  // Settings loads the config, changes a field, and saves the whole object back.
  const { profile, timezone, onboarding_state } = profileFromConfig(SALON)
  const loaded = configFromProfile({ timezone, onboarding_state }, profile)
  const edited = { ...loaded, emergency_line: "New message.", approval_limits: { refund_over: 2000 } }
  const saved = profileFromConfig(edited)
  assert.equal(saved.profile.emergency_message, "New message.")
  assert.deepEqual(saved.profile.approval_limits, { refund_over: 2000 })
})
