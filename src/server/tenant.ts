// Which business the app is serving for this request.
// DEV-ONLY until logins exist: the business is picked by a cookie (set when a business
// registers through the Setup agent, or from the sidebar switcher). Anyone can switch,
// so this is NOT access control. Entry points read it here and pass the id down;
// nothing below them hardcodes a business.
import { cache } from "react"
import { cookies } from "next/headers"

import { db } from "./db/client"

/** The seeded demo business (Cruz Family Dental, supabase/seed.sql). */
export const DEFAULT_BUSINESS_ID = "4eb77e14-4742-42d2-84e8-8a7d88785f67"
export const BUSINESS_COOKIE = "biz"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The current business id: the cookie's, if it names a real business; else the default. */
export const getCurrentBusinessId = cache(async (): Promise<string> => {
  const id = (await cookies()).get(BUSINESS_COOKIE)?.value
  if (!id || !UUID.test(id)) return DEFAULT_BUSINESS_ID
  const { data } = await db().from("businesses").select("id").eq("id", id).maybeSingle()
  return data?.id ?? DEFAULT_BUSINESS_ID
})

/** All businesses on the platform, for the dev switcher. */
export async function listBusinesses(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await db().from("businesses").select("id, name, created_at").order("created_at")
  if (error || !data) throw new Error(`DB list businesses failed: ${error?.message ?? "no data"}`)
  return data.map((b) => ({ id: b.id, name: b.name }))
}
