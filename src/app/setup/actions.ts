"use server"

// "Finish setup": checks the draft again (incl. that the business type is a loaded
// pack), then saves the business, its services, team and hours in ONE database
// transaction (create_business_setup, migrations 004/005), and makes it the current
// business (demo cookie, no logins yet).
import { cookies } from "next/headers"

import { db } from "@/server/db/client"
import { BUSINESS_COOKIE } from "@/server/tenant"
import { getPack, isVertical } from "@/server/verticals"
import { BRAND_COLORS, DEFAULT_BRAND, HAIR_LENGTHS, slugBase, staffHours, stepErrors, type SetupDraft } from "@/lib/setup"

import { packLite } from "./pack-lite"

const money = (v: string | undefined) => (!v || v.trim() === "" ? null : Number(v))

export async function finishSetup(d: SetupDraft): Promise<{ ok: true } | { ok: false }> {
  if (!isVertical(d.vertical)) return { ok: false }
  const pack = getPack(d.vertical)
  const lite = packLite(pack)
  const errors = { ...stepErrors(1, d, lite), ...stepErrors(2, d, lite), ...stepErrors(3, d, lite), ...stepErrors(4, d, lite) }
  if (Object.keys(errors).length) return { ok: false }

  const config: Record<string, unknown> = {
    timezone: "Asia/Manila",
    payment_methods: d.payment,
    emergency_instruction: d.emergency.trim(),
    refund_approval_limit_php: Number(d.refundLimit),
    pack_version: 2,
  }
  if (pack.asks_walk_ins) config.walk_ins = d.walkIns
  if (pack.accepts_hmo) config.hmos = d.hmos
  if (pack.uses_service_areas) config.service_areas = d.areas
  for (const x of pack.extra_charges ?? []) {
    const v = money(d.extras[x.config_key])
    if (v !== null) config[x.config_key] = v
  }
  if (pack.minimum_booking && money(d.minimum) !== null) config.minimum_booking_php = money(d.minimum)

  const payload = {
    name: d.name.trim(),
    vertical: d.vertical,
    base_slug: slugBase(d.name) || "business",
    owner_mobile: d.mobile.trim(),
    brand_color: BRAND_COLORS.some((c) => c.hex === d.brandColor) ? d.brandColor : DEFAULT_BRAND,
    business_address: d.address.trim(),
    public_contact: d.publicContact.trim(),
    config,
    services: d.services.map((s, i) => ({
      name: s.name.trim(),
      duration_minutes: s.variants ? s.variants.short.duration : s.duration,
      price_php: s.variants ? null : money(s.price),
      pricing_type: s.pricing_type,
      variants: s.variants
        ? Object.fromEntries(
            HAIR_LENGTHS.map(({ key }) => [
              key,
              { price_php: money(s.variants![key].price), duration_minutes: s.variants![key].duration },
            ])
          )
        : null,
      active: s.on,
      sort_order: i,
    })),
    staff: d.staff.map((m) => ({ name: m.name.trim(), hours: staffHours(m) })),
  }

  try {
    const { data, error } = await db().rpc("create_business_setup", { p: payload })
    const row = Array.isArray(data) ? data[0] : data
    if (error || !row?.new_business_id) {
      console.error("[setup] save failed:", error?.message ?? "no row")
      return { ok: false }
    }
    ;(await cookies()).set(BUSINESS_COOKIE, row.new_business_id, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
    })
    return { ok: true }
  } catch (err) {
    console.error("[setup] save failed:", err instanceof Error ? err.message : "unknown error")
    return { ok: false }
  }
}
