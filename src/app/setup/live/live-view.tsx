"use client"

// "You're live" (Part C) with fewer cards: (1) a launch hero with the booking link
// inside it, plus a phone-frame live preview on wide screens; (2) one "Share your
// link" panel with tabs; (3) the AI team as a relay. Checkmark: Lucide Animated
// circle-check (MIT, https://lucide-animated.com/icons/circle-check), skipped for
// reduced motion. Tabs: shadcn Tabs (MIT).
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckIcon, CopyIcon, ExternalLinkIcon, Share2Icon } from "lucide-react"

import { CircleCheckIcon, type CircleCheckIconHandle } from "@/components/ui/circle-check"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCopy } from "@/components/flow/booking-link"
import { FlowCanvas, PrimaryAction, StickyFooter } from "@/components/flow/flow-ui"
import { CardTitle, GlassCard, HeroPanel } from "@/components/workspace/surface"
import { markOnboarding } from "@/app/onboarding-actions"

import { TeamRelay } from "./team-relay"

function CopyButton({ text, label, onCopied }: { text: string; label: string; onCopied?: () => void }) {
  const { copied, copy } = useCopy()
  return (
    <button
      type="button"
      onClick={async () => {
        await copy(text)
        onCopied?.()
      }}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/25 bg-card px-4 text-base font-medium hover:border-primary/50"
    >
      {copied ? <CheckIcon className="size-4" aria-hidden="true" /> : <CopyIcon className="size-4" aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Copied!" : label}</span>
    </button>
  )
}

const Steps = ({ steps }: { steps: string[] }) => (
  <ol className="flex list-decimal flex-col gap-2 pl-6 text-base marker:text-muted-foreground">
    {steps.map((s) => (
      <li key={s}>{s}</li>
    ))}
  </ol>
)

export function LiveView({
  name,
  slug,
  url,
  bookingExample,
  sampleRequest,
}: {
  name: string
  slug: string
  url: string
  bookingExample: string
  sampleRequest: string
}) {
  const router = useRouter()
  const check = React.useRef<CircleCheckIconHandle>(null)
  const { copied, copy } = useCopy()
  const canShare = React.useSyncExternalStore(
    () => () => {},
    () => "share" in navigator,
    () => false
  )
  React.useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) check.current?.startAnimation()
  }, [])
  const shared = () => markOnboarding("shared_link_at").catch(() => {})
  const autoReply = `Hi! Ask us anything or book here: ${url}`
  const post = `We now take bookings online! Pick your service and time here: ${url}`

  return (
    <FlowCanvas>
      <main className="mx-auto flex min-h-svh w-full max-w-[1280px] flex-col gap-6 px-4 pt-4 md:px-6 md:pt-10 lg:px-10">
        {/* Row 1: launch hero (+ phone preview from tablet up) */}
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <HeroPanel className="p-6 sm:p-8 lg:p-10">
            <CircleCheckIcon ref={check} size={56} className="text-[oklch(0.9_0.1_145)]" aria-hidden="true" />
            <h1 className="mt-5 font-serif text-[2.25rem] leading-[1.05] tracking-[-0.01em] lg:text-5xl">{name} is live!</h1>
            <p className="mt-3 text-lg text-primary-foreground/85">Your AI team is ready to take booking requests.</p>

            <div className="mt-7 flex flex-col gap-2 rounded-2xl border border-primary-foreground/25 bg-primary-foreground/10 p-2 backdrop-blur-xl sm:flex-row sm:items-center sm:rounded-full">
              <p className="min-w-0 flex-1 truncate px-3 py-2 text-base font-medium" title={url}>
                <span className="sr-only">Your booking link: </span>
                {url}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await copy(url)
                    shared()
                  }}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary-foreground px-5 text-base font-semibold text-primary sm:flex-none"
                >
                  {copied ? <CheckIcon className="size-4" aria-hidden="true" /> : <CopyIcon className="size-4" aria-hidden="true" />}
                  <span aria-live="polite">{copied ? "Copied!" : "Copy"}</span>
                </button>
                {canShare ? (
                  <button
                    type="button"
                    onClick={() => navigator.share({ url }).then(shared, () => {})}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-primary-foreground/30 px-5 text-base font-medium sm:flex-none"
                  >
                    <Share2Icon className="size-4" aria-hidden="true" /> Share
                  </button>
                ) : null}
              </div>
            </div>
            <Link
              href={`/book/${slug}`}
              target="_blank"
              rel="noopener"
              onClick={() => markOnboarding("tried_as_customer_at").catch(() => {})}
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-base font-medium text-primary-foreground underline-offset-4 hover:underline"
            >
              See it as a customer <ExternalLinkIcon className="size-4" aria-hidden="true" />
            </Link>
          </HeroPanel>

          {/* Phone-frame live preview of the real booking page (tablet: centered under the hero) */}
          <figure className="mx-auto hidden flex-col items-center gap-3 md:flex">
            <div className="h-[600px] w-[330px] overflow-hidden rounded-[2.75rem] border-[10px] border-foreground/85 bg-background shadow-2xl">
              <iframe
                src={`/book/${slug}`}
                title={`${name} booking page preview`}
                className="h-[714px] w-[390px] origin-top-left scale-[0.795] border-0"
                loading="lazy"
              />
            </div>
            <figcaption className="text-base text-muted-foreground">This is what your customers see.</figcaption>
          </figure>
        </div>

        {/* Row 2: share panel (7/12) + relay (5/12) */}
        <div className="grid gap-6 lg:grid-cols-12">
          <GlassCard className="p-5 sm:p-6 lg:col-span-7" aria-labelledby="share-h">
            <CardTitle id="share-h" title="Share your link" />
            <Tabs defaultValue="button" className="mt-4">
              <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl p-1">
                <TabsTrigger value="button" className="min-h-11 rounded-lg text-sm whitespace-normal sm:text-base">
                  Facebook button
                </TabsTrigger>
                <TabsTrigger value="reply" className="min-h-11 rounded-lg text-sm whitespace-normal sm:text-base">
                  Messenger auto-reply
                </TabsTrigger>
                <TabsTrigger value="post" className="min-h-11 rounded-lg text-sm whitespace-normal sm:text-base">
                  Pinned post
                </TabsTrigger>
              </TabsList>
              <TabsContent value="button" className="mt-5">
                <Steps steps={["Open your Facebook Page.", "Tap Edit, then Add action button.", "Choose Book now and paste your link."]} />
              </TabsContent>
              <TabsContent value="reply" className="mt-5 flex flex-col gap-4">
                <Steps steps={["Open Meta Business Suite and go to Inbox.", "Open Automations, then Instant reply, and add this message:"]} />
                <blockquote className="rounded-2xl border-l-4 border-primary/50 bg-muted/40 px-4 py-3 text-base break-words">{autoReply}</blockquote>
                <div>
                  <CopyButton text={autoReply} label="Copy message" onCopied={shared} />
                </div>
              </TabsContent>
              <TabsContent value="post" className="mt-5 flex flex-col gap-4">
                <Steps steps={["Post your link on your Page.", "Pin the post to the top.", "Add it to your Page's bio too."]} />
                <blockquote className="rounded-2xl border-l-4 border-primary/50 bg-muted/40 px-4 py-3 text-base break-words">{post}</blockquote>
                <div>
                  <CopyButton text={post} label="Copy post" onCopied={shared} />
                </div>
              </TabsContent>
            </Tabs>
            <p className="mt-5 border-t border-border/70 pt-4 text-sm text-muted-foreground">
              Facebook menus change sometimes. Look for similar words if yours look different.
            </p>
          </GlassCard>

          <section aria-labelledby="relay-h" className="lg:col-span-5">
            <CardTitle id="relay-h" title="How your AI team works" className="mb-5" />
            <TeamRelay bookingExample={bookingExample} sampleRequest={sampleRequest} />
          </section>
        </div>

        <StickyFooter className="md:flex-row md:justify-end md:border-t md:border-border/70 md:py-6">
          <PrimaryAction onClick={() => router.push("/today")} className="md:w-auto md:px-8">
            Go to my Today screen
          </PrimaryAction>
        </StickyFooter>
      </main>
    </FlowCanvas>
  )
}
