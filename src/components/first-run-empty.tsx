import { PhoneCallIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { primaryBtn } from "@/lib/styles"

/* First-run state shared by list screens (same treatment as the Dashboard's first week). */
export function FirstRunEmpty({
  title,
  body,
  action = { label: "Place a test call", href: "tel:+15550142290" },
  icon: Icon = PhoneCallIcon,
}: {
  title: string
  body: string
  action?: { label: string; href: string } | null
  icon?: React.ComponentType<{ "aria-hidden"?: boolean }>
}) {
  return (
    <Empty className="items-start rounded-xl border border-dashed border-input px-8 py-12 text-left">
      <EmptyHeader className="max-w-md items-start">
        <EmptyMedia variant="icon" className="bg-secondary">
          <Icon aria-hidden />
        </EmptyMedia>
        <EmptyTitle className="text-lg font-semibold">{title}</EmptyTitle>
        <EmptyDescription className="text-sm">{body}</EmptyDescription>
      </EmptyHeader>
      {action ? (
        <EmptyContent className="items-start">
          <Button asChild className={primaryBtn}>
            <a href={action.href}>{action.label}</a>
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  )
}
