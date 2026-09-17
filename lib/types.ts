export type Tier = 'public' | 'internal' | 'restricted'

export type Role = 'public' | 'analyst' | 'admin'

export const ROLE_LABELS: Record<Role, string> = {
  public: 'Public visitor',
  analyst: 'Analyst',
  admin: 'Admin',
}

export const TIER_ALLOWED_FOR_ROLE: Record<Role, Tier[]> = {
  public: ['public'],
  analyst: ['public', 'internal'],
  admin: ['public', 'internal', 'restricted'],
}

// Per-tier document counts for a corpus — safe, aggregate-only metadata (no
// titles/text), so it can be computed at build time and passed straight to
// the client to make the "searching N documents" line react to the role
// toggle instead of showing one fixed total regardless of role.
export interface CorpusStats {
  total: number
  public: number
  internal: number
  restricted: number
}

export function visibleCountForRole(stats: CorpusStats, role: Role): number {
  return TIER_ALLOWED_FOR_ROLE[role].reduce((sum, tier) => sum + stats[tier], 0)
}

// A single ingested document, shared shape across every corpus. `meta` is a
// short, corpus-specific label shown next to the tier badge on the document
// page (e.g. "HIGH · CVSS 8.1" for security, "Guidance" for governance) —
// optional and free-form so a new corpus never needs a schema change here.
export interface CorpusDoc {
  id: string
  title: string
  summary: string
  description: string
  date: string
  sourceUrl: string
  tier: Tier
  meta?: string
}

export interface Citation {
  id: string
  title: string
  date: string
  sourceUrl: string
  tier: Tier
}

// Two-phase ask flow: /api/ask/retrieve resolves fast (search only) so the
// client can show real, meaningful progress; /api/ask/answer does the LLM
// generation. This lets the UI show genuine "searching" vs "writing" states
// instead of one opaque round trip, and lets sources render before the
// answer text is ready.
export interface RetrieveResponse {
  done: boolean
  answer?: string
  citations: Citation[]
  totalMatching: number
  visibleMatching: number
  contextDocIds?: string[]
}

export interface AnswerResponse {
  answer: string
  followups: string[]
}
