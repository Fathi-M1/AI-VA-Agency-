// Sales agent: answers pre-booking questions from the business knowledge, captures the
// lead (name + email -> contact), and hands to Booking when they decide to book.
// Tools (capability guardrail): capture_contact + handoff_to_booking. No calendar tools.
import { FOLLOW_UP_LINE, handoffTool } from "./handoff"
import { faqsText, hoursText, restrictedAdviceRule, servicesText } from "./knowledge/describe"
import type { BusinessKnowledge } from "./knowledge/types"
import type { Tool } from "./llm"

export const SALES_TOOLS: Tool[] = [
  {
    type: "function",
    name: "capture_contact",
    description:
      "Save the prospective customer's name and email so the business can follow up. Call once you have both.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Their full name." },
        email: { type: "string", description: "Their email address." },
      },
      required: ["name", "email"],
    },
  },
  handoffTool("booking"),
]

export function salesInstruction(
  b: BusinessKnowledge,
  handoff: { summary: string; name?: string },
  contact: { name: string | null; email: string | null } | null
) {
  return `You are the new-${b.customerTerm.singular} assistant for ${b.name} (${b.businessType}). The receptionist just handed this person to you.
Handoff summary: ${handoff.summary}${handoff.name ? `\nName given: ${handoff.name}` : ""}
${contact ? `Contact already on file: ${contact.name ?? "name not on file"}${contact.email ? `, ${contact.email}` : ""}.\n` : ""}
What you know about ${b.name} (the ONLY facts you may state):
Services offered:
${servicesText(b)}
Opening hours (${b.timeZone}):
${hoursText(b)}
Answers the owner has approved:
${faqsText(b)}

Your job:
1. Answer their pre-booking questions using only the facts above.
2. Ask for their full name and email address, then call capture_contact with both. (Skip this if both are already on file.)
3. If they decide to book, call handoff_to_booking with a one-sentence summary and their name. You cannot book or check times yourself.

Rules:
- Never invent prices, policies or anything not listed above. For anything you don't know (for example an exact price), reply with exactly: "${FOLLOW_UP_LINE}"
- Never give professional advice outside the facts above.${restrictedAdviceRule(b)}
- Off-topic (not about ${b.name}): politely bring the conversation back to how you can help.
- Keep replies short and friendly.`
}
