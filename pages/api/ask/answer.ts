import type { NextApiRequest, NextApiResponse } from 'next'
import { answerForContext } from '../../../lib/rag'
import { AnswerResponse, Role } from '../../../lib/types'
import { getCorpus, isCorpusId } from '../../../lib/corpora'
import { clientIp } from '../../../lib/rateLimit'

const VALID_ROLES: Role[] = ['public', 'analyst', 'admin']
const MAX_CONTEXT_IDS = 10

function log(event: string, fields: Record<string, unknown>) {
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...fields }))
}

// Phase 2 of the two-phase ask flow: only reachable with contextDocIds a
// prior /api/ask/retrieve call already vetted for this role — and this
// route re-checks that vetting itself (see answerForContext), so a client
// that tampers with the IDs still can't smuggle a restricted document into
// the LLM's context. Not rate-limited on its own; phase 1 already counted
// this question against the caller's quota.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnswerResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ip = clientIp(req)
  const { question, role, contextDocIds, corpusId } = req.body || {}

  if (typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ error: 'A non-empty "question" string is required.' })
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `"role" must be one of: ${VALID_ROLES.join(', ')}` })
  }
  if (!isCorpusId(corpusId)) {
    return res.status(400).json({ error: '"corpusId" must be a known corpus.' })
  }
  if (!Array.isArray(contextDocIds) || contextDocIds.length === 0 || contextDocIds.length > MAX_CONTEXT_IDS) {
    return res.status(400).json({ error: '"contextDocIds" must be a non-empty array.' })
  }
  if (!contextDocIds.every((id) => typeof id === 'string')) {
    return res.status(400).json({ error: '"contextDocIds" must contain only strings.' })
  }

  const startedAt = Date.now()
  try {
    const result = await answerForContext(corpusId, question.trim(), role as Role, contextDocIds)
    if (!result) {
      // Every id got filtered out on re-check (tampered role/ids, or a
      // race with the corpus changing) — same message a normal
      // role-restricted retrieve() would have returned.
      const corpus = getCorpus(corpusId)
      return res.status(200).json({
        answer: `None of the ${corpus.docNounPlural} that match this question are visible at your current access level. Switch roles, or ask about a topic covered by public ${corpus.docNounPlural}.`,
        followups: [],
      })
    }
    log('ask_answer_ok', {
      ip,
      role,
      corpusId,
      questionLength: question.length,
      contextDocCount: contextDocIds.length,
      durationMs: Date.now() - startedAt,
    })
    return res.status(200).json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('ask_answer_error', {
      ip,
      role,
      corpusId,
      questionLength: question.length,
      error: message,
      durationMs: Date.now() - startedAt,
    })
    return res.status(502).json({ error: `Could not generate an answer: ${message}` })
  }
}
