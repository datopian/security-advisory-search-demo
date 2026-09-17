import type { NextApiRequest, NextApiResponse } from 'next'
import { retrieveForQuestion } from '../../../lib/rag'
import { RetrieveResponse, Role } from '../../../lib/types'
import { isCorpusId } from '../../../lib/corpora'
import { checkRateLimit, clientIp } from '../../../lib/rateLimit'

const VALID_ROLES: Role[] = ['public', 'analyst', 'admin']

// Structured, single-line logs so they're greppable in Vercel's Runtime Logs
// (or via a log drain later) — the only monitoring this demo has, since
// there's no auth/accounts to attach abuse to. Every log line carries the
// caller's IP so a spike from one address is visible without extra tooling.
function log(event: string, fields: Record<string, unknown>) {
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...fields }))
}

// Phase 1 of the two-phase ask flow (see lib/rag.ts): search only, no LLM
// call. Rate limiting is enforced here, once per question — phase 2
// (pages/api/ask/answer.ts) is only ever reachable after this succeeds.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RetrieveResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ip = clientIp(req)
  const { question, role, corpusId } = req.body || {}

  if (typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ error: 'A non-empty "question" string is required.' })
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `"role" must be one of: ${VALID_ROLES.join(', ')}` })
  }
  if (!isCorpusId(corpusId)) {
    return res.status(400).json({ error: '"corpusId" must be a known corpus.' })
  }

  const rateLimit = checkRateLimit(ip)
  res.setHeader('X-RateLimit-Limit', String(rateLimit.limit))
  res.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining))
  if (!rateLimit.allowed) {
    log('rate_limited', { ip, role, corpusId, questionLength: question.length })
    return res.status(429).json({ error: 'Too many questions from this address. Please try again later.' })
  }

  const startedAt = Date.now()
  try {
    const result = await retrieveForQuestion(corpusId, question.trim(), role as Role)
    log('ask_retrieve_ok', {
      ip,
      role,
      corpusId,
      questionLength: question.length,
      done: result.done,
      totalMatching: result.totalMatching,
      visibleMatching: result.visibleMatching,
      durationMs: Date.now() - startedAt,
    })
    return res.status(200).json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('ask_retrieve_error', {
      ip,
      role,
      corpusId,
      questionLength: question.length,
      error: message,
      durationMs: Date.now() - startedAt,
    })
    return res.status(502).json({ error: `Could not search the documents: ${message}` })
  }
}
