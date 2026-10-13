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

export async function linkConversationContact(
  businessId: string,
  conversationId: string,
  contactId: string
) {
  const { error } = await db()
    .from("conversations")
    .update({ contact_id: contactId })
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

/* ---------------------------------------------------------------- contacts */

export type Contact = { id: string; name: string | null; email: string | null }

export async function findContactByEmail(businessId: string, email: string): Promise<Contact | null> {
  const { data, error } = await db()
    .from("contacts")
    .select("id, name, email")
    .eq("business_id", businessId)
    .eq("email", email.toLowerCase())
    .maybeSingle()
  if (error) fail("find contact", error)
  return data
}

/** Insert or update the contact matched by email within this business (never duplicates). */
export async function upsertContact(
  businessId: string,
  c: { email: string; name?: string }
): Promise<Contact> {
  const row: Record<string, string> = { business_id: businessId, email: c.email.toLowerCase() }
  if (c.name) row.name = c.name // only overwrite the name when we actually have one
  const { data, error } = await db()
    .from("contacts")
    .upsert(row, { onConflict: "business_id,email" })
    .select("id, name, email")
    .single()
  if (error || !data) fail("upsert contact", error)
  return data
}

/* ---------------------------------------------------------------- bookings */

export type PastBooking = { service: string; slot_start: string; status: string }

export async function listContactBookings(
  businessId: string,
  contactId: string
): Promise<PastBooking[]> {
  const { data, error } = await db()
    .from("bookings")
    .select("service, slot_start, status")
    .eq("business_id", businessId)
    .eq("contact_id", contactId)
    .order("slot_start", { ascending: false })
    .limit(10)
  if (error) fail("list bookings", error)
  return data ?? []
}

export async function insertBooking(
  businessId: string,
  b: {
    contactId: string
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
    contact_id: b.contactId,
    conversation_id: b.conversationId,
    service: b.service,
    slot_start: b.slotStart,
    slot_end: b.slotEnd,
    calcom_booking_id: b.calcomBookingId,
    status: b.status,
  })
  if (error) fail("insert booking", error)
}

/* ---------------------------------------------------------------- escalations */

export async function insertEscalation(
  businessId: string,
  e: { contactId: string | null; conversationId: string; reason: string }
): Promise<string> {
  const { data, error } = await db()
    .from("escalations")
    .insert({
      business_id: businessId,
      contact_id: e.contactId,
      conversation_id: e.conversationId,
      reason: e.reason,
      status: "open",
    })
    .select("id")
    .single()
  if (error || !data) fail("insert escalation", error)
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
// Businesses in "requests" mode (set up through /setup): contacts are matched by mobile
// (09XXXXXXXXX), and the Booking agent writes requests the owner confirms on Today.

export type MobileContact = { id: string; name: string | null; mobile: string | null }

export async function findContactByMobile(businessId: string, mobile: string): Promise<MobileContact | null> {
  const { data, error } = await db()
    .from("contacts")
    .select("id, name, mobile")
    .eq("business_id", businessId)
    .eq("mobile", mobile)
    .maybeSingle()
  if (error) fail("find contact by mobile", error)
  return data
}

/** Insert or update the contact with this mobile within the business (never duplicates).
 *  consent_at is only set when the contact is created. */
export async function upsertContactByMobile(
  businessId: string,
  c: { mobile: string; name: string; consentAt?: string | null }
): Promise<MobileContact> {
  const existing = await findContactByMobile(businessId, c.mobile)
  if (existing) {
    const { data, error } = await db()
      .from("contacts")
      .update({ name: c.name })
      .eq("business_id", businessId)
      .eq("id", existing.id)
      .select("id, name, mobile")
      .single()
    if (error || !data) fail("update contact", error)
    return data
  }
  const { data, error } = await db()
    .from("contacts")
    .insert({ business_id: businessId, mobile: c.mobile, phone: c.mobile, name: c.name, consent_at: c.consentAt ?? null })
    .select("id, name, mobile")
    .single()
  if (error || !data) fail("create contact", error)
  return data
}

export async function insertBookingRequest(
  businessId: string,
  r: {
    contactId: string
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
      contact_id: r.contactId,
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

/** A contact's own requests and bookings (Support, after they've given their mobile). */
export async function listContactRequests(businessId: string, contactId: string) {
  const { data, error } = await db()
    .from("bookings")
    .select("service, status, slot_start, requested_time_text, created_at")
    .eq("business_id", businessId)
    .eq("contact_id", contactId)
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
