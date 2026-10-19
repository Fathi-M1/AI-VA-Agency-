"use client"

// Customers: the same pulled table as Conversations.
// shadcn/ui "data-table-demo" (TanStack Table v9 + shadcn Table)
//   https://ui.shadcn.com/docs/components/data-table · License: MIT (shadcn-ui/ui)
//   TanStack Table: MIT (https://tanstack.com/table)
// Kept from the example: feature declaration, columnHelper columns, useTable with
// sorting / column filters / visibility / row selection / pagination, the select
// column, sortable header button, per-row actions DropdownMenu, Previous/Next footer.
// Adapted: customer columns (avatar + name + email, last message, next visit, status),
// the search box and "Everyone" Select in the site header, clicking a row opens the
// person in a shadcn Sheet (https://ui.shadcn.com/docs/components/sheet, MIT).
// Data: real customers from Supabase (server/db/views.ts) with their bookings,
// conversations and needs-you items; most recent first.
// Status badges: Origin UI comp-420 (https://coss.com/origin, MIT), reused.
// Avatar: shadcn Avatar (https://ui.shadcn.com/docs/components/avatar, MIT), reused.
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
import {
  ArrowUpDown,
  MessageSquareIcon,
  MessagesSquareIcon,
  MoreHorizontal,
  PhoneIcon,
  SearchIcon,
  type LucideIcon,
} from "lucide-react"

import StatusDotBadge from "@/components/comp-420"
import { CustomerDetail, statusTone, type CustomerRow } from "@/components/customers/customer-detail"
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
import { avatarTint, initials } from "@/lib/avatar"
import type { CustomerView } from "@/server/db/views"

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

const channelIcon: Record<string, LucideIcon> = {
  Chat: MessagesSquareIcon,
  Phone: PhoneIcon,
  Sms: MessageSquareIcon,
}

const columnHelper = createColumnHelper<typeof features, CustomerRow>()

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
        aria-label={`Select ${row.original.name}`}
        className="opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 data-checked:opacity-100"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }),
  columnHelper.accessor("name", {
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-2.5 h-8 px-2.5 text-xs font-normal text-muted-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-8">
          <AvatarFallback className={`text-xs font-medium ${avatarTint(row.original.name)}`}>
            {initials(row.original.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="max-w-[16rem] truncate font-medium">{row.original.name}</div>
          <div className="max-w-[16rem] truncate text-xs text-subtle">
            {row.original.email ?? "No email on file"}
          </div>
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
        Last message
        <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => {
      const l = row.original.lastContact
      if (!l) return <span className="text-subtle">No conversations yet</span>
      const Icon = channelIcon[l.channel] ?? MessagesSquareIcon
      return (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon aria-hidden="true" className="size-3.5 shrink-0 text-subtle" />
          <span className="tabular-nums">
            {l.channel} · {l.when}
          </span>
        </div>
      )
    },
  }),
  columnHelper.accessor("nextVisit", {
    header: "Next visit",
    cell: ({ row }) => {
      const v = row.original.nextVisit
      return !v ? (
        <span className="text-subtle">None booked</span>
      ) : (
        <span className="text-muted-foreground">{v}</span>
      )
    },
  }),
  columnHelper.accessor((r) => r.statuses.join(" "), {
    id: "status",
    header: "Status",
    filterFn: "includesString",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1.5">
        {row.original.statuses.map((s) => (
          <StatusDotBadge key={s} tone={statusTone[s]} status={false}>
            {s}
          </StatusDotBadge>
        ))}
      </div>
    ),
  }),
  // Hidden column the search box filters: name, email and phone (when on file).
  columnHelper.accessor(
    (r) => [r.name, r.email ?? "", r.phone ?? "", (r.phone ?? "").replace(/\D/g, "")].join(" "),
    { id: "search", filterFn: "includesString", enableHiding: true }
  ),
  // Hidden column for the "Everyone" Select.
  columnHelper.accessor(
    (r) =>
      [
        r.nextVisit ? "upcoming" : "",
        r.openNeedsYou ? "needs" : "",
      ].join(" "),
    { id: "segment", filterFn: "includesString", enableHiding: true }
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
            <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => open?.(c.id)}>Open customer</DropdownMenuItem>
            <DropdownMenuSeparator />
            {c.email ? (
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(c.email!)}>
                Copy email
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  }),
])

const SEGMENTS = {
  all: "Everyone",
  upcoming: "Has a visit booked",
  needs: "Needs you",
} as const

export function CustomerBook({
  customers,
  initialOpen,
}: {
  customers: CustomerView[]
  initialOpen?: string
}) {
  const total = customers.length
  const data = React.useMemo<CustomerRow[]>(
    () =>
      customers.map((c) => ({
        ...c,
        order: new Date(c.lastContact?.at ?? c.firstSeenAt).getTime(),
        statuses: [
          ...(c.openNeedsYou ? (["Needs you"] as const) : []),
          ...(c.bookedByAi ? (["Booked by AI"] as const) : []),
        ],
      })),
    [customers]
  )
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({
    search: false,
    segment: false,
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
    state: { sorting, columnFilters, columnVisibility, rowSelection },
  })

  const filterValue = (id: string) => (table.getColumn(id)?.getFilterValue() as string) ?? ""
  const setFilter = (id: string, v: string) =>
    table.getColumn(id)?.setFilterValue(v === "all" || v === "" ? undefined : v)
  const shown = table.getFilteredRowModel().rows.length
  const open = data.find((c) => c.id === openId) ?? null

  return (
    <div className="w-full">
      <SiteHeader
        className="mb-8"
        title={
          <div className="flex items-baseline gap-3">
            <h1 className="text-base font-semibold">Customers</h1>
            <span className="text-xs text-subtle">{total} people</span>
          </div>
        }
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2 max-sm:w-full">
            <label className="relative max-sm:flex-1">
              <span className="sr-only">Search customers</span>
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle"
              />
              <Input
                type="search"
                placeholder="Search name, phone or email"
                value={filterValue("search")}
                onChange={(e) => setFilter("search", e.target.value)}
                className="h-9 w-72 rounded-lg border-input bg-card pl-9 text-sm max-sm:w-full"
              />
            </label>
            <Select value={filterValue("segment") || "all"} onValueChange={(v) => setFilter("segment", v)}>
              <SelectTrigger
                aria-label="Show"
                data-active={!!filterValue("segment")}
                className="h-9! rounded-lg border-input bg-transparent px-3 text-sm data-[active=true]:border-foreground/40 data-[active=true]:bg-card"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SEGMENTS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                aria-label={`Open ${row.original.name}`}
                className="group/row cursor-pointer border-border hover:bg-card focus-visible:bg-card focus-visible:outline-none data-[state=selected]:bg-card"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={"py-3.5 " + (cell.column.id === "select" ? "pl-3" : "")}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="h-28 text-center text-sm text-muted-foreground">
                No one matches. Everyone who calls, chats or texts is added automatically.{" "}
                <button
                  className="underline underline-offset-3 hover:text-foreground"
                  onClick={() => table.resetColumnFilters()}
                >
                  Show everyone
                </button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-end gap-2 border-t border-border py-4">
        <div className="flex-1 text-xs text-muted-foreground">
          {shown} of {total} {total === 1 ? "customer" : "customers"}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg border-input bg-transparent"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg border-input bg-transparent"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      <Sheet open={open !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="gap-0 overflow-y-auto bg-card p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
          {open ? <CustomerDetail key={open.id} c={open} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
