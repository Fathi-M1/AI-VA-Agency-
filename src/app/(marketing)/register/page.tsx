import { redirect } from "next/navigation"

// Owner onboarding moved to /setup (form-based, Prompt 01). The chat-based Setup agent
// (register-chat.tsx, /api/setup) stays in the repo but is no longer linked.
export default function RegisterPage() {
  redirect("/setup")
}
