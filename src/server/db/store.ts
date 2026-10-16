// Persistence for the agents. Every read and write is scoped by business_id, which the
// caller passes in; nothing here knows which business it is.
import type { BusinessKnowledge } from "../agent/knowledge/types"
import { customerTermOf, getBusinessRow } from "./business-config"
import { db } from "./client"

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`DB ${what} failed: ${error?.message ?? "no row"}`)
}

/* ---------------------------------------------------------------- businesses */

/** Loads one business's knowledge (what the agents see) from its config row. */
export async function loadBusiness(businessId: string): Promise<BusinessKnowledge> {
  const { id, name, config: c } = await getBusinessRow(businessId)
  return {
    id,
    name,
    businessType: c.business_type ?? "business",
    customerTerm: customerTermOf(c),
    timeZone: c.timezone,
    hours: c.hours,
    services: c.services.map((s) => ({
      name: s.name,
      durationMinutes: s.duration_minutes,
      calcomEventTypeId: s.calcom_event_type_id,
    })),
    faqs: c.faqs ?? [],
    restrictedAdvice: c.restricted_advice ?? [],
    emergencyLine: c.emergency_line,
    emergencyKeywords: c.rules?.emergency_keywords ?? [],
  }
}

/* ---------------------------------------------------------------- conversations */

export async function createConversation(businessId: string, channel: string): Promise<string> {
  const { data, error } = await db()
    .from("conversations")
    .insert({ business_id: businessId, channel })
    .select("id")
    .single()
  if (error || !data) fail("create conversation", error)
  return data.id
}

export async function linkConversationCustomer(
  businessId: string,
  conversationId: string,
  customerId: string
) {
  const { error } = await db()
    .from("conversations")
    .update({ customer_id: customerId })
    .eq("business_id", businessId)
    .eq("id", conversationId)
  if (error) fail("link conversation", error)
}

/* ---------------------------------------------------------------- messages */

export async function saveMessage(
  businessId: string,
  conversationId: string,
  msg: {
    role: "user" | "agent"
    agent: "receptionist" | "booking" | "sales" | "support" | null
    content: string
  }
) {
  const { error } = await db().from("messages").insert({
    business_id: businessId,
    conversation_id: conversationId,
    role: msg.role,
    agent: msg.agent,
    content: msg.content,
  })
  if (error) fail("save message", error)
}

/* ---------------------------------------------------------------- customers */

export type Customer = { id: string; name: string | null; email: string | null }

export async function findCustomerByEmail(businessId: string, email: string): Promise<Customer | null> {
  const { data, error } = await db()
    .from("customers")
    .select("id, name, email")
    .eq("business_id", businessId)
    .eq("email", email.toLowerCase())
    .maybeSingle()
  if (error) fail("find customer", error)
  return data
}

/** Insert or update the customer matched by email within this business (never duplicates). */
export async function upsertCustomer(
  businessId: string,
  c: { email: string; name?: string }
): Promise<Customer> {
  const row: Record<string, string> = { business_id: businessId, email: c.email.toLowerCase() }
  if (c.name) row.name = c.name // only overwrite the name when we actually have one
  const { data, error } = await db()
    .from("customers")
    .upsert(row, { onConflict: "business_id,email" })
    .select("id, name, email")
    .single()
  if (error || !data) fail("upsert customer", error)
  return data
}

/* ---------------------------------------------------------------- bookings */

export type PastBooking = { service: string; slot_start: string; status: string }

export async function listCustomerBookings(
  businessId: string,
  customerId: string
): Promise<PastBooking[]> {
  const { data, error } = await db()
    .from("bookings")
    .select("service, slot_start, status")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .order("slot_start", { ascending: false })
    .limit(10)
  if (error) fail("list bookings", error)
  return data ?? []
}

export async function insertBooking(
  businessId: string,
  b: {
    customerId: string
    conversationId: string
    service: string
    slotStart: string
    slotEnd: string
    calcomBookingId: string
    status: string
  }
) {
  const { error } = await db().from("bookings").insert({
    business_id: businessId,
    customer_id: b.customerId,
    conversation_id: b.conversationId,
    service: b.service,
    slot_start: b.slotStart,
    slot_end: b.slotEnd,
    calcom_booking_id: b.calcomBookingId,
    status: b.status,
  })
  if (error) fail("insert booking", error)
}

/* ---------------------------------------------------------------- needs-you items */

export async function insertNeedsYouItem(
  businessId: string,
  e: { customerId: string | null; conversationId: string; reason: string }
): Promise<string> {
  const { data, error } = await db()
    .from("needs_you_items")
    .insert({
      business_id: businessId,
      customer_id: e.customerId,
      conversation_id: e.conversationId,
      reason: e.reason,
      status: "open",
    })
    .select("id")
    .single()
  if (error || !data) fail("insert needs-you item", error)
  return data.id
}

/** Marks a conversation's channel (e.g. "voice" once voice mode is used in it). */
export async function setConversationChannel(businessId: string, conversationId: string, channel: string) {
  const { error } = await db()
    .from("conversations")
    .update({ channel })
    .eq("business_id", businessId)
    .eq("id", conversationId)
  if (error) fail("set conversation channel", error)
}

/* ---------------------------------------------------------------- booking requests */
// Businesses in "requests" mode (set up through /setup): customers are matched by mobile
// (09XXXXXXXXX), and the Booking agent writes requests the owner confirms on Today.

export type MobileCustomer = { id: string; name: string | null; mobile: string | null }

export async function findCustomerByMobile(businessId: string, mobile: string): Promise<MobileCustomer | null> {
  const { data, error } = await db()
    .from("customers")
    .select("id, name, mobile")
    .eq("business_id", businessId)
    .eq("mobile", mobile)
    .maybeSingle()
  if (error) fail("find customer by mobile", error)
  return data
}

/** Insert or update the customer with this mobile within the business (never duplicates).
 *  consent_at is only set when the customer is created. */
export async function upsertCustomerByMobile(
  businessId: string,
  c: { mobile: string; name: string; consentAt?: string | null }
): Promise<MobileCustomer> {
  const existing = await findCustomerByMobile(businessId, c.mobile)
  if (existing) {
    const { data, error } = await db()
      .from("customers")
      .update({ name: c.name })
      .eq("business_id", businessId)
      .eq("id", existing.id)
      .select("id, name, mobile")
      .single()
    if (error || !data) fail("update customer", error)
    return data
  }
  const { data, error } = await db()
    .from("customers")
    .insert({ business_id: businessId, mobile: c.mobile, phone: c.mobile, name: c.name, consent_at: c.consentAt ?? null })
    .select("id, name, mobile")
    .single()
  if (error || !data) fail("create customer", error)
  return data
}

export async function insertBookingRequest(
  businessId: string,
  r: {
    customerId: string
    conversationId: string
    service: string
    staffId: string | null
    details: Record<string, unknown>
    requestedTimeText: string
    customerMobile: string
  }
): Promise<string> {
  const { data, error } = await db()
    .from("bookings")
    .insert({
      business_id: businessId,
      customer_id: r.customerId,
      conversation_id: r.conversationId,
      service: r.service,
      staff_id: r.staffId,
      details: r.details,
      requested_time_text: r.requestedTimeText,
      customer_mobile: r.customerMobile,
      status: "requested",
    })
    .select("id")
    .single()
  if (error || !data) fail("insert booking request", error)
  return data.id
}

/** A customer's own requests and bookings (Support, after they've given their mobile). */
export async function listCustomerRequests(businessId: string, customerId: string) {
  const { data, error } = await db()
    .from("bookings")
    .select("service, status, slot_start, requested_time_text, created_at")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(10)
  if (error) fail("list requests", error)
  return (data ?? []) as {
    service: string
    status: string
    slot_start: string | null
    requested_time_text: string | null
    created_at: string
  }[]
}
