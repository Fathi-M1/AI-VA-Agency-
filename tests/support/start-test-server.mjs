// Starts the built app (next start) on port 3100 with throwaway test values, for the HTTP
// security tests and Playwright. Nothing points at the real Supabase project: the Supabase
// address is a local port with nothing on it. Build first with the same NEXT_PUBLIC_* values.
import { spawn } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const WEB = join(dirname(fileURLToPath(import.meta.url)), "..", "..")

const env = {
  ...process.env,
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_SERVICE_ROLE_KEY: "bundle-test-service-role-marker",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
  GROQ_API_KEY: "bundle-test-groq-marker",
}
const child = spawn("npx", ["next", "start", "-p", "3100"], { env, cwd: WEB, stdio: "inherit", shell: true })
child.on("exit", (code) => process.exit(code ?? 0))
