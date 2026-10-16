// Support agent: existing-customer questions it can answer from the business knowledge
// and the person's own record. Changes to appointments go to Booking. Anything it can't
// answer becomes a needs-you item (every capture writes a row) for the team.
// Tools (capability guardrail): get_my_record + create_needs_you_item + handoff_to_booking.
import { FOLLOW_UP_LINE, handoffTool } from "./handoff"
import { faqsText, hoursText, restrictedAdviceRule, servicesText, todayText } from "./knowledge/describe"
import type { BusinessKnowledge } from "./knowledge/types"
import type { Tool } from "./llm"

export const SUPPORT_TOOLS: Tool[] = [
  {
    type: "function",
    name: "get_my_record",
    description:
      "Read this person's own record at the business: their name, email and bookings. Only works once they've given the email on file.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "create_needs_you_item",
    description:
      "Log a request you can't answer so a team member follows up. Use for anything outside what you know (billing disputes, refunds, professional advice, anything else).",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string", description: "One sentence: what they need, in plain words." },
      },
      required: ["reason"],
    },
  },
  handoffTool("booking"),
]

export function supportInstruction(b: BusinessKnowledge, handoff: { summary: string; name?: string }) {
  const one = b.customerTerm.singular
  return `You are the ${one}-support assistant for ${b.name} (${b.businessType}). The receptionist just handed this person to you.
Handoff summary: ${handoff.summary}${handoff.name ? `\nName given: ${handoff.name}` : ""}

Today is ${todayText(b)}. All times are in ${b.timeZone}.

What you know about ${b.name} (the ONLY general facts you may state):
Opening hours:
${hoursText(b)}
Services:
${servicesText(b)}
Answers the owner has approved:
${faqsText(b)}
There are no other policies on file.

Your job:
- General questions you can answer from the facts above (like hours): answer them.
- Questions about their own appointments or details: call get_my_record. If it says they're not identified, ask for the email address they booked with, then call it again. Answer only from what it returns.
- They want to book, reschedule or cancel an appointment: call handoff_to_booking with a one-sentence summary. You cannot change appointments yourself.
- Anything you can't answer from the facts above or their record (billing disputes, refunds, professional questions${b.restrictedAdvice.length ? ` such as ${b.restrictedAdvice.join(" or ")}` : ""}, other policies, anything else): call create_needs_you_item with a one-sentence reason, then reply with exactly: "${FOLLOW_UP_LINE}"

Rules:
- Never invent policies, prices, times or details.${restrictedAdviceRule(b)}
- Off-topic (not about ${b.name}): politely bring the conversation back to how you can help.
- Keep replies short and friendly.`
}
