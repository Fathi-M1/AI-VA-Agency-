"use server"

// Dev-only business switcher (no logins yet): remembers the chosen business in a cookie.
import { cookies } from "next/headers"
import { refresh } from "next/cache"
import { redirect } from "next/navigation"

import { BUSINESS_COOKIE, listBusinesses } from "@/server/tenant"

export async function switchBusiness(id: string) {
  const all = await listBusinesses()
  if (!all.some((b) => b.id === id)) return { ok: false as const }
  ;(await cookies()).set(BUSINESS_COOKIE, id, { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 24 * 365 })
  refresh()
  return { ok: true as const }
}

/** "Switch business (demo)": set the business, then go to its Today screen. */
export async function switchBusinessAndGoToday(id: string) {
  const res = await switchBusiness(id)
  if (res.ok) redirect("/today")
}
