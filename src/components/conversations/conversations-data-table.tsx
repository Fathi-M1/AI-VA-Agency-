"use client"

// shadcn/ui "data-table-demo" (TanStack Table v9 + shadcn Table)
// Source: https://ui.shadcn.com/docs/components/data-table
//   code: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/examples/data-table-demo.tsx
//   (copied: the CLI install fails because its "data-table" registry dependency
//   doesn't exist; that item only brings in @tanstack/react-table, installed from npm)
// License: MIT (shadcn-ui/ui). TanStack Table: MIT (https://tanstack.com/table).
// Structure kept from the example: the feature declaration, columnHelper columns,
// useTable with sorting / column filters / visibility / row selection /
// pagination, the select-checkbox column, sortable header button, the per-row
// actions DropdownMenu and the Previous/Next footer.
// Adapted: conversation columns (avatar + customer, when, channel, agents, outcome,
// messages); the toolbar is our search + three filter Selects wired to TanStack
// column filters; the outer bordered box is removed to match the open sections;
// checkboxes show on row hover or when selected; clicking a row opens the detail
// Sheet; the Dashboard's type and colours.
// Data: real conversations from Supabase (server/db/views.ts), newest first.
import * as React from "react"
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, SearchIcon } from "lucide-react"

import StatusDotBadge from "@/components/comp-420"
import { ConversationDetail, outcomeTone } from "@/components/conversations/conversation-detail"
import { SiteHeader } from "@/components/site-header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { panel } from "@/lib/styles"
import type { ConversationView } from "@/server/db/views"
import { AppLink } from "@/components/app-link"

// New in v9: declare the features this table uses (tree-shaken otherwise).
const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
})

type Row = ConversationView & { order: number; agentList: string }

const columnHelper = createColumnHelper<typeof features, Row>()

// Restrained, low-chroma avatar tints on the warm neutral base.
const AVATAR_TINTS = [
  "bg-[oklch(0.93_0.03_155)] text-[oklch(0.38_0.06_155)]",
  "bg-[oklch(0.94_0.035_75)] text-[oklch(0.45_0.08_70)]",
  "bg-[oklch(0.93_0.025_250)] text-[oklch(0.42_0.06_250)]",
  "bg-[oklch(0.93_0.03_20)] text-[oklch(0.45_0.07_20)]",
  "bg-[oklch(0.92_0.015_85)] text-[oklch(0.42_0.02_85)]",
]
const tint = (name: string) =>
  AVATAR_TINTS[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR_TINTS.length]
const initials = (name: string) =>
  name.startsWith("(") ? "#" : name.split(" ").map((p) => p[0]).slice(0, 2).join("")

const columns = columnHelper.columns([
  columnHelper.display({
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Select ${row.original.customer}`}
        className="opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 data-checked:opacity-100"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }),
  columnHelper.accessor("customer", {
    header: "Customer",
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-8">
          <AvatarFallback className={`text-xs font-medium ${tint(row.original.customer)}`}>
            {initials(row.original.customer)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate font-medium">{row.original.customer}</div>
          <div className="truncate text-xs text-subtle">{row.original.customerNote}</div>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor("order", {
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-2.5 h-8 px-2.5 text-xs font-normal text-muted-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        When
        <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => <div className="tabular-nums">{row.original.when}</div>,
  }),
  columnHelper.accessor("channel", {
    header: "Channel",
    filterFn: "includesString",
    cell: ({ row }) => <div className="text-muted-foreground">{row.getValue("channel")}</div>,
  }),
  columnHelper.accessor("agentList", {
    header: "Agents",
    filterFn: "includesString",
    cell: ({ row }) => (
      <div className="text-muted-foreground">{row.original.agents.join(" → ") || "None"}</div>
    ),
  }),
  columnHelper.accessor("outcome", {
    header: "Outcome",
    filterFn: "includesString",
    cell: ({ row }) => (
      <StatusDotBadge tone={outcomeTone[row.original.outcome]} status={false}>
        {row.original.outcome}
      </StatusDotBadge>
    ),
  }),
  columnHelper.accessor("messageCount", {
    header: () => <div className="text-right">Messages</div>,
    cell: ({ row }) => (
      <div className="text-right text-muted-foreground tabular-nums">{row.original.messageCount}</div>
    ),
  }),
  // Hidden column the search box filters: name, email and everything said.
  columnHelper.accessor(
    (r) => [r.customer, r.customerNote, ...r.transcript.map((t) => t.text)].join(" "),
    { id: "search", filterFn: "includesString", enableHiding: true }
  ),
  columnHelper.display({
    id: "actions",
    enableHiding: false,
    cell: ({ row, table }) => {
      const c = row.original
      const open = (table.options.meta as { open?: (id: string) => void } | undefined)?.open
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => open?.(c.id)}>View conversation</DropdownMenuItem>
            {c.customerId ? (
              <DropdownMenuItem asChild>
                <AppLink to={`/customers?open=${c.customerId}`}>Open customer</AppLink>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(c.id)}>
              Copy conversation ID
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  }),
])

const ALL = "all"

export function ConversationsDataTable({
  items,
  initialOpen,
}: {
  items: ConversationView[]
  /** ?open=<conversation id> opens that conversation (linked from Customers). */
  initialOpen?: string
}) {
  const data = React.useMemo<Row[]>(
    () =>
      items.map((c) => ({
        ...c,
        order: new Date(c.startedAt).getTime(),
        agentList: c.agents.join(" "),
      })),
    [items]
  )
  const channels = React.useMemo(() => [...new Set(items.map((c) => c.channel))], [items])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({
    search: false,
  })
  const [rowSelection, setRowSelection] = React.useState({})
  const [openId, setOpenId] = React.useState<string | null>(initialOpen ?? null)

  const table = useTable({
    features,
    data,
    columns,
    getRowId: (r) => r.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    meta: { open: setOpenId },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  const filterValue = (id: string) => (table.getColumn(id)?.getFilterValue() as string) ?? ""
  const setFilter = (id: string, v: string) =>
    table.getColumn(id)?.setFilterValue(v === ALL || v === "" ? undefined : v)
  const filtering = columnFilters.length > 0
  const shown = table.getFilteredRowModel().rows.length
  const open = items.find((c) => c.id === openId) ?? null

  return (
    <div className="w-full">
      {/* Toolbar: title + count left, search + filters right (the shadcn site header). */}
      <SiteHeader
        className="mb-8 flex-wrap"
        title={
          <div className="flex items-baseline gap-3">
            <h1 className="text-base font-semibold">Conversations</h1>
            <span className="text-xs text-subtle">
              {shown} shown · {items.length} in total
            </span>
          </div>
        }
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className="relative">
              <span className="sr-only">Search conversations</span>
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle"
              />
              <Input
                type="search"
                placeholder="Search a name or anything said"
                value={filterValue("search")}
                onChange={(e) => setFilter("search", e.target.value)}
                className="h-9 w-72 rounded-[9px] border-input bg-card pl-9 text-sm max-sm:w-full"
              />
            </label>
            <Filter label="Channel" value={filterValue("channel") || ALL} onChange={(v) => setFilter("channel", v)} options={channels} />
            <Filter label="Agent" value={filterValue("agentList") || ALL} onChange={(v) => setFilter("agentList", v)} options={["Receptionist", "Booking", "Sales", "Support"]} />
            <Filter label="Outcome" value={filterValue("outcome") || ALL} onChange={(v) => setFilter("outcome", v)} options={["Booked", "Needs you", "Open"]} />
            {filtering ? (
              <Button
                variant="ghost"
                className="h-9 rounded-[9px] px-2.5 text-xs text-muted-foreground"
                onClick={() => table.resetColumnFilters()}
              >
                Clear
              </Button>
            ) : null}
          </div>
        }
      />

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-border hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={
                    "h-10 text-xs font-normal text-muted-foreground " +
                    (header.column.id === "select" ? "w-10 pl-3" : "") +
                    (header.column.id === "actions" ? "w-12" : "")
                  }
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={(row.getIsSelected() || openId === row.id) && "selected"}
                onClick={() => setOpenId(row.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setOpenId(row.id)
                  }
                }}
                tabIndex={0}
                aria-label={`Open conversation with ${row.original.customer}`}
                className="group/row cursor-pointer border-border hover:bg-card focus-visible:bg-card focus-visible:outline-none data-[state=selected]:bg-card"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={"py-3 " + (cell.column.id === "select" ? "pl-3" : "")}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="h-28 text-center text-sm text-muted-foreground">
                No conversations match.{" "}
                <button
                  className="underline underline-offset-3 hover:text-foreground"
                  onClick={() => table.resetColumnFilters()}
                >
                  Clear filters
                </button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-end gap-2 border-t border-border py-4">
        <div className="flex-1 text-xs text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} selected
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-[9px] border-input bg-transparent"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-[9px] border-input bg-transparent"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      {/* Row detail: shadcn Sheet with the transcript, what the AI did, customer link. */}
      <Sheet open={open !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className={`${panel} overflow-y-auto`}>
          {open ? <ConversationDetail c={open} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        data-active={value !== ALL}
        className="h-9! rounded-[9px] border-input bg-transparent px-3 text-sm data-[active=true]:border-foreground/40 data-[active=true]:bg-card"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{`Any ${label.toLowerCase()}`}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
