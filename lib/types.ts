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

export interface AdvisoryDoc {
  id: string
  title: string
  summary: string
  description: string
  date: string
  sourceUrl: string
  cvss: number | null
  severity: string
  tier: Tier
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
