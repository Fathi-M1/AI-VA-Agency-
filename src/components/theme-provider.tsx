"use client"

// Owner app theme (design-system.md: dark mode is owner-facing). Default light; we don't
// follow the OS, so the customer storefront and marketing — which have no theme toggle —
// always render light. Owners switch it from the account menu.
import { ThemeProvider as NextThemes } from "next-themes"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      {children}
    </NextThemes>
  )
}
