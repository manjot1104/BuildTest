// Shared in-memory design store.
// Persists for the lifetime of the server process (resets on restart/redeploy).

export interface DesignEntry {
  slug: string
  title: string
  layout: string
  background?: string
  publishedAt: string
}

export const designStore = new Map<string, DesignEntry>()
