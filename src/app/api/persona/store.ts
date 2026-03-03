// Shared in-memory persona store.
// Persists for the lifetime of the server process (resets on restart/redeploy).

export interface PersonaEntry {
  slug: string
  title: string
  layout: string
  background?: string
  publishedAt: string
}

export const personaStore = new Map<string, PersonaEntry>()
