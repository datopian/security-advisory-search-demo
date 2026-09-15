import type { NextApiRequest, NextApiResponse } from 'next'
import { answerQuestion } from '../../lib/rag'
import { AskResponse, Role } from '../../lib/types'
import { checkRateLimit, clientIp } from '../../lib/rateLimit'

const VALID_ROLES: Role[] = ['public', 'analyst', 'admin']

// Structured, single-line logs so they're greppable in Vercel's Runtime Logs
// (or via a log drain later) — the only monitoring this demo has, since
// there's no auth/accounts to attach abuse to. Every log line carries the
// caller's IP so a spike from one address is visible without extra tooling.
function log(event: string, fields: Record<string, unknown>) {
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...fields }))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<AskResponse | { error: string }>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ip = clientIp(req)
  const { question, role } = req.body || {}

  if (typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ error: 'A non-empty "question" string is required.' })
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `"role" must be one of: ${VALID_ROLES.join(', ')}` })
  }

  const rateLimit = checkRateLimit(ip)
  res.setHeader('X-RateLimit-Limit', String(rateLimit.limit))
  res.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining))
  if (!rateLimit.allowed) {
    log('rate_limited', { ip, role, questionLength: question.length })
    return res.status(429).json({ error: 'Too many questions from this address. Please try again later.' })
  }

  const startedAt = Date.now()
  try {
    const result = await answerQuestion(question.trim(), role as Role)
    log('ask_ok', {
      ip,
      role,
      questionLength: question.length,
      totalMatching: result.totalMatching,
      visibleMatching: result.visibleMatching,
      citations: result.citations.length,
      durationMs: Date.now() - startedAt,
    })
    return res.status(200).json({ ...result, role })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('ask_error', { ip, role, questionLength: question.length, error: message, durationMs: Date.now() - startedAt })
    return res.status(502).json({ error: `Could not generate an answer: ${message}` })
  }
}
