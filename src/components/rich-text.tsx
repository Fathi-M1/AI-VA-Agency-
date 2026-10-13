// Renders the agents' light markdown as clean text: **bold**, "- " / "1. " lists and line
// breaks. Anything else is shown as plain text (no HTML is ever injected).
import * as React from "react"

function inline(text: string, key: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={`${key}-${i}`} className="font-semibold text-foreground">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <React.Fragment key={`${key}-${i}`}>{p.replace(/(^|\s)\*(?=\S)|(?<=\S)\*(\s|$)/g, "$1$2")}</React.Fragment>
    )
  )
}

export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.replace(/\r/g, "").split("\n")
  const blocks: React.ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  const flush = () => {
    if (!list) return
    const Tag = list.ordered ? "ol" : "ul"
    blocks.push(
      <Tag key={`l${blocks.length}`} className={`my-1 space-y-1 pl-5 ${list.ordered ? "list-decimal" : "list-disc"} marker:text-subtle`}>
        {list.items.map((it, i) => (
          <li key={i}>{inline(it, `li${blocks.length}-${i}`)}</li>
        ))}
      </Tag>
    )
    list = null
  }
  lines.forEach((raw, i) => {
    const line = raw.trim()
    const bullet = /^[-*•]\s+(.*)$/.exec(line)
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line)
    if (bullet || numbered) {
      const ordered = !!numbered
      if (!list || list.ordered !== ordered) {
        flush()
        list = { ordered, items: [] }
      }
      list.items.push((bullet ?? numbered)![1])
      return
    }
    flush()
    if (!line) return
    blocks.push(
      <p key={`p${i}`} className="my-1 first:mt-0 last:mb-0">
        {inline(line.replace(/^#+\s*/, ""), `p${i}`)}
      </p>
    )
  })
  flush()
  return <div className={className}>{blocks}</div>
}
