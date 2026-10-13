import DownloadReportButton from "@/components/comp-91"
import { SiteHeader } from "@/components/site-header"

/* Dashboard frame: the page column plus the shadcn dashboard-01 site header. */
export function DashboardFrame({
  week,
  children,
  reportLabel = "",
  reportText = "",
  reportFileName = "weekly-report.txt",
}: {
  week: React.ReactNode
  children: React.ReactNode
  reportLabel?: string
  /** Real report body; the Download button only shows when there is one. */
  reportText?: string
  reportFileName?: string
}) {
  return (
    // Layout column only (width + padding); SidebarInset provides <main>.
    <div className="mx-auto w-full max-w-[1280px] px-5 pt-7 pb-16 sm:px-10 sm:pt-[34px] xl:px-14">
      <SiteHeader
        className="mb-10 sm:mb-12"
        title={week}
        actions={reportText ? <DownloadReportButton weekLabel={reportLabel} reportText={reportText} fileName={reportFileName} /> : null}
      />
      <h1 className="sr-only">Dashboard</h1>
      {children}
    </div>
  )
}
