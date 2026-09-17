// Server-only: retrieval + generation for the /api/ask/* endpoints.
// Never import this from client components — it pulls in the full corpus
// text (including restricted-tier documents) which must not reach the
// browser bundle for any role.
import securityCorpusData from '../data/security/corpus.json'
import securityEmbeddingsData from '../data/security/embeddings.json'
import governanceCorpusData from '../data/governance/corpus.json'
import governanceEmbeddingsData from '../data/governance/embeddings.json'
import { CorpusDoc, Citation, CorpusStats, Role, Tier, TIER_ALLOWED_FOR_ROLE } from './types'
import { CorpusId, getCorpus } from './corpora'

interface EmbeddingEntry {
  id: string
  vector: number[]
}

interface LoadedCorpus {
  docs: CorpusDoc[]
  byId: Map<string, CorpusDoc>
  embeddings: Map<string, number[]>
}

function load(corpusData: unknown, embeddingsData: unknown): LoadedCorpus {
  const docs = corpusData as CorpusDoc[]
  return {
    docs,
    byId: new Map(docs.map((d) => [d.id, d])),
    embeddings: new Map((embeddingsData as EmbeddingEntry[]).map((e) => [e.id, e.vector])),
  }
}

const LOADED: Record<CorpusId, LoadedCorpus> = {
  security: load(securityCorpusData, securityEmbeddingsData),
  governance: load(governanceCorpusData, governanceEmbeddingsData),
}

const VOYAGE_MODEL = 'voyage-4-lite'
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'
const CANDIDATE_POOL_SIZE = 15
const CONTEXT_DOC_COUNT = 5
// Cosine similarity floor below which a document doesn't count as "matching"
// at all, regardless of tier. Calibrated empirically against the security
// corpus' voyage-4-lite embeddings: off-topic small talk ("How are you
// doing?") scores ~0.14 on its best match, a generic-but-plausible on-topic
// question scores ~0.36, and real on-corpus questions score ~0.5+. Without
// this floor, cosine similarity always returns *some* ranking — including 5
// essentially-random "citations" for a question that isn't about the corpus
// at all. Applied the same way across corpora since it's a property of the
// embedding model, not the topic.
const RELEVANCE_THRESHOLD = 0.3

function cosineSim(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

async function embedQuery(question: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) throw new Error('VOYAGE_API_KEY is not configured on the server.')

  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: [question],
      model: VOYAGE_MODEL,
      input_type: 'query',
    }),
  })
  if (!res.ok) {
    throw new Error(`Voyage embedding request failed: ${res.status} ${res.statusText}`)
  }
  const json = await res.json()
  return json.data[0].embedding as number[]
}

interface ScoredDoc {
  doc: CorpusDoc
  score: number
}

function rankCorpus(corpusId: CorpusId, queryVector: number[]): ScoredDoc[] {
  const { docs, embeddings } = LOADED[corpusId]
  return docs
    .map((doc) => {
      const vec = embeddings.get(doc.id)
      const score = vec ? cosineSim(queryVector, vec) : -1
      return { doc, score }
    })
    .filter(({ score }) => score >= RELEVANCE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, CANDIDATE_POOL_SIZE)
}

function toCitation(doc: CorpusDoc): Citation {
  return { id: doc.id, title: doc.title, date: doc.date, sourceUrl: doc.sourceUrl, tier: doc.tier }
}

export interface RetrievalOutcome {
  done: boolean
  answer?: string
  citations: Citation[]
  totalMatching: number
  visibleMatching: number
  contextDocIds?: string[]
}

// Phase 1: embed the question and rank the corpus. Fast (no LLM call), so
// the client can show a genuine "searching" state bounded by real work,
// then a genuine "writing" state once phase 2 starts — not an arbitrary
// timer standing in for progress.
export async function retrieveForQuestion(
  corpusId: CorpusId,
  question: string,
  role: Role
): Promise<RetrievalOutcome> {
  const allowedTiers: Tier[] = TIER_ALLOWED_FOR_ROLE[role]
  const corpus = getCorpus(corpusId)

  const queryVector = await embedQuery(question)
  const ranked = rankCorpus(corpusId, queryVector)

  const totalMatching = ranked.length
  const visible = ranked.filter(({ doc }) => allowedTiers.includes(doc.tier))
  const visibleMatching = visible.length

  if (totalMatching === 0) {
    return {
      done: true,
      answer: `Nothing in this corpus covers that. Try asking about a ${corpus.docNounSingular} — for example, "${corpus.exampleQuestions[0]}"`,
      citations: [],
      totalMatching,
      visibleMatching: 0,
    }
  }
  if (visible.length === 0) {
    return {
      done: true,
      answer: `None of the ${corpus.docNounPlural} that match this question are visible at your current access level. Switch roles, or ask about a topic covered by public ${corpus.docNounPlural}.`,
      citations: [],
      totalMatching,
      visibleMatching: 0,
    }
  }

  const contextDocs = visible.slice(0, CONTEXT_DOC_COUNT).map((r) => r.doc)
  return {
    done: false,
    citations: contextDocs.map(toCitation),
    totalMatching,
    visibleMatching,
    contextDocIds: contextDocs.map((d) => d.id),
  }
}

async function synthesizeAnswer(
  corpusId: CorpusId,
  question: string,
  context: CorpusDoc[]
): Promise<{ answer: string; followups: string[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured on the server.')
  const corpus = getCorpus(corpusId)

  const contextBlock = context
    .map((d, i) => `[${i + 1}] ${d.id}${d.meta ? ` (${d.meta})` : ''} — published ${d.date}\n${d.description}`)
    .join('\n\n')

  const system = `You are an assistant for a demo search tool over a corpus of ${corpus.docNounPlural}. Answer the visitor's question using ONLY the excerpts provided below as context. Do not use any outside knowledge, even if you know more about the topic than what's shown.

Rules:
- Every claim in your answer must be traceable to one of the numbered excerpts. Cite the document ID inline for each claim, e.g. "(${context[0]?.id ?? 'DOC-ID'})".
- If the provided excerpts don't actually answer the question, say plainly that the permitted ${corpus.docNounPlural} don't cover it — do not guess or fall back on general knowledge.
- Keep the answer concise: 2-5 sentences, plain language, no bullet-point dumps of every excerpt.
- Never mention documents outside the provided excerpts.
- After your answer, on its own final line, add exactly: FOLLOWUPS: <question 1> | <question 2>
  Two short, natural follow-up questions (each under 12 words) a curious reader might ask next, in
  plain everyday language. This corpus only contains ${corpus.docNounPlural} — descriptions/guidance,
  not a help desk — so every follow-up must be a NEW LOOKUP QUESTION IN THE SAME STYLE AS THE
  ORIGINAL QUESTION, asking about other documents/topics/entities this same kind of corpus could
  plausibly cover — never a "how do I fix/protect/implement..." question that assumes advice content
  this corpus doesn't have. If you can't think of two sensible lookup-style follow-ups, write
  FOLLOWUPS: NONE. This must be the very last line of your output and must never appear anywhere
  else in your answer.

Context excerpts:
${contextBlock}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      system,
      messages: [{ role: 'user', content: question }],
    }),
  })
  if (!res.ok) {
    throw new Error(`Anthropic request failed: ${res.status} ${res.statusText}`)
  }
  const json = await res.json()
  const raw = json.content?.[0]?.text?.trim() || ''
  return extractFollowups(raw)
}

function extractFollowups(raw: string): { answer: string; followups: string[] } {
  const match = raw.match(/\n?FOLLOWUPS:\s*(.*)$/is)
  if (!match || match.index === undefined) return { answer: raw.trim(), followups: [] }

  const answer = raw.slice(0, match.index).trim()
  const rest = match[1].trim()
  if (!rest || /^none\b/i.test(rest)) return { answer, followups: [] }

  const followups = rest
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2)
  return { answer, followups }
}

export interface AnswerOutcome {
  answer: string
  followups: string[]
}

// Phase 2: given the context doc IDs phase 1 already determined were
// permitted for this role, generate the answer. Re-validates role
// permission against the actual corpus rather than trusting the client's
// echoed IDs, so a tampered request can never smuggle a restricted
// document into the LLM's context.
export async function answerForContext(
  corpusId: CorpusId,
  question: string,
  role: Role,
  contextDocIds: string[]
): Promise<AnswerOutcome | null> {
  const allowedTiers: Tier[] = TIER_ALLOWED_FOR_ROLE[role]
  const { byId } = LOADED[corpusId]
  const contextDocs = contextDocIds
    .map((id) => byId.get(id))
    .filter((d): d is CorpusDoc => !!d && allowedTiers.includes(d.tier))
    .slice(0, CONTEXT_DOC_COUNT)

  if (contextDocs.length === 0) return null

  return synthesizeAnswer(corpusId, question, contextDocs)
}

// Tier counts only — safe to pass to the client (no document text/titles),
// used to make the pre-query "searching N documents" line and the "visible
// as {role}" count react to the role toggle instead of showing a fixed
// corpus-wide total.
export function getCorpusStats(corpusId: CorpusId): CorpusStats {
  const { docs } = LOADED[corpusId]
  const stats: CorpusStats = { total: docs.length, public: 0, internal: 0, restricted: 0 }
  for (const d of docs) stats[d.tier] += 1
  return stats
}
