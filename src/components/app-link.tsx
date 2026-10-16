"use client"

// A link to a page inside the current business: <AppLink to="/conversations?open=…">
// becomes /app/[businessId]/conversations?open=…, with the business taken from the URL.
// Works from server and client components alike. useAppPath() does the same for
// router.push in client code.
import Link from "next/link"
import { useParams } from "next/navigation"

import { appPath } from "@/lib/app-path"

export function useAppPath() {
  const { businessId } = useParams<{ businessId: string }>()
  return (path: string) => appPath(businessId, path)
}

export function AppLink({ to, ...props }: Omit<React.ComponentProps<typeof Link>, "href"> & { to: string }) {
  const toApp = useAppPath()
  return <Link href={toApp(to)} {...props} />
}
