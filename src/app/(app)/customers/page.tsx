import { UsersIcon } from "lucide-react"

import { CustomerBook } from "@/components/customers/customer-book"
import { FirstRunEmpty } from "@/components/first-run-empty"
import { SiteHeader } from "@/components/site-header"
import { listCustomers } from "@/server/db/views"
import { getCurrentBusinessId } from "@/server/tenant"

// Real customers from Supabase for the current business.
// Review switch: ?demo=error. ?open=<id> opens a person directly ("Open customer"
// in Conversations).
export default async function CustomersPage({ searchParams }: PageProps<"/customers">) {
  const { demo, open } = await searchParams
  if (demo === "error") throw new Error("Customers unavailable")
  const businessId = await getCurrentBusinessId()

  const customers = await listCustomers(businessId)

  return (
    // Same page column as the other screens.
    <div className="mx-auto w-full max-w-[1280px] px-5 pt-7 pb-16 sm:px-10 sm:pt-[34px] xl:px-14">
      {customers.length === 0 ? (
        <>
          <SiteHeader className="mb-10" title={<h1 className="text-base font-semibold">Customers</h1>} />
          <FirstRunEmpty
            icon={UsersIcon}
            title="No customers yet"
            body="Everyone who gives their email in a chat is added here automatically, with their conversations and bookings."
            action={null}
          />
        </>
      ) : (
        <CustomerBook customers={customers} initialOpen={typeof open === "string" ? open : undefined} />
      )}
    </div>
  )
}
