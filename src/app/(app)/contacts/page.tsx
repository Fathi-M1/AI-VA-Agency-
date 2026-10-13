import { UsersIcon } from "lucide-react"

import { ContactBook } from "@/components/contacts/contact-book"
import { FirstRunEmpty } from "@/components/first-run-empty"
import { SiteHeader } from "@/components/site-header"
import { listContacts } from "@/server/db/views"
import { getCurrentBusinessId } from "@/server/tenant"

// Real contacts from Supabase for the current business.
// Review switch: ?demo=error. ?open=<id> opens a person directly ("Open contact"
// in Conversations).
export default async function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  const { demo, open } = await searchParams
  if (demo === "error") throw new Error("Contacts unavailable")
  const businessId = await getCurrentBusinessId()

  const contacts = await listContacts(businessId)

  return (
    // Same page column as the other screens.
    <div className="mx-auto w-full max-w-[1280px] px-5 pt-7 pb-16 sm:px-10 sm:pt-[34px] xl:px-14">
      {contacts.length === 0 ? (
        <>
          <SiteHeader className="mb-10" title={<h1 className="text-base font-semibold">Contacts</h1>} />
          <FirstRunEmpty
            icon={UsersIcon}
            title="No contacts yet"
            body="Everyone who gives their email in a chat is added here automatically, with their conversations and bookings."
            action={null}
          />
        </>
      ) : (
        <ContactBook contacts={contacts} initialOpen={typeof open === "string" ? open : undefined} />
      )}
    </div>
  )
}
