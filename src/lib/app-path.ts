// Owner pages live under /app/[businessId]/… (Phase 0 §4). `path` is the page inside the
// business, starting with a slash, plus any query (for example the Today page).
export const appPath = (businessId: string, path: string) => `/app/${businessId}${path}`
