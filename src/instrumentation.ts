// Runs once when the server starts: load and check the business type packs, so a bad
// pack file stops the server with a clear message instead of failing mid-conversation.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./server/verticals")
  }
}
