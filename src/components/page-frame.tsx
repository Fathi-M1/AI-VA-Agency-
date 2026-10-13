import { SidebarTrigger } from "@/components/ui/sidebar"

/* The Dashboard's page frame, shared: same padding, same quiet top bar. */
export function PageFrame({
  lead,
  actions,
  width = "narrow",
  airy = false,
  children,
}: {
  lead: React.ReactNode
  actions?: React.ReactNode
  width?: "narrow" | "wide" | "full"
  /** Dashboard only: the extra 72px pause before the hero figure. */
  airy?: boolean
  children: React.ReactNode
}) {
  const max =
    width === "narrow" ? "max-w-[920px]" : width === "wide" ? "max-w-[1160px]" : "max-w-none"
  return (
    // SidebarInset already provides the <main> landmark.
    <div className={`w-full ${max} px-5 pt-7 pb-18 sm:px-14 sm:pt-[34px]`}>
      <div className={`mb-12 flex min-h-9 items-center justify-between gap-4 ${airy ? "sm:mb-18" : "sm:mb-14"}`}>
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="-ml-1 md:hidden" />
          {lead}
        </div>
        {actions}
      </div>
      {children}
    </div>
  )
}

/* Page title in the top bar: the size of the Dashboard's week label, never louder
   than the screen's one loud element. */
export function PageTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex min-w-0 items-baseline gap-3">
      <h1 className="text-base font-semibold">{title}</h1>
      {meta ? <span className="truncate text-xs text-subtle">{meta}</span> : null}
    </div>
  )
}
