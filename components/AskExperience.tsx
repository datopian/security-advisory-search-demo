import { useEffect, useRef, useState } from 'react'
import { BrandHeader } from './BrandHeader'
import { Footer } from './Footer'
import { RoleToggle } from './RoleToggle'
import { AnswerPanel } from './AnswerPanel'
import { CorpusBadge } from './CorpusBadge'
import { BrandConfig } from '../lib/brands'
import { Citation, ROLE_LABELS, Role } from '../lib/types'

const EXAMPLE_QUESTIONS = [
  'Which vulnerabilities affect remote access software this year?',
  'Are there any critical flaws in widely used content management systems?',
  'What advisories mention privilege escalation?',
  'Are there any critical vulnerabilities in networking equipment like routers?',
  'What flaws affect media or streaming server software?',
  'Are there any SQL injection vulnerabilities reported?',
]

const ROLE_HINT_AUTO_DISMISS_MS = 6000

type TurnStatus = 'searching' | 'answering' | 'done' | 'error'

interface Turn {
  id: number
  question: string
  role: Role
  status: TurnStatus
  error: string | null
  answer?: string
  citations: Citation[]
  totalMatching: number
  visibleMatching: number
  followups: string[]
}

function AskIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-gray-400">
      <path
        d="M17 10.5c0 3.6-3.1 6.5-7 6.5-1 0-1.9-.16-2.75-.46L3 18l1.1-3.3C3.4 13.5 3 12.05 3 10.5 3 6.9 6.1 4 10 4s7 2.9 7 6.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SearchingIndicator({ color }: { color: string }) {
  return (
    <div className="mt-5 flex items-center gap-3 text-sm text-gray-500">
      <div className="flex gap-1">
        <span className="thinking-dot h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="thinking-dot h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="thinking-dot h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      </div>
      Searching 300 recent advisories…
    </div>
  )
}

export function AskExperience({ brand }: { brand: BrandConfig }) {
  const [inputValue, setInputValue] = useState('')
  const [role, setRole] = useState<Role>('public')
  const [turns, setTurns] = useState<Turn[]>([])
  const [showRoleHint, setShowRoleHint] = useState(false)
  const nextId = useRef(0)
  const hintTimer = useRef<ReturnType<typeof setTimeout>>()
  const hasShownRoleHint = useRef(false)

  const isBusy = turns.some((t) => t.status === 'searching' || t.status === 'answering')

  useEffect(() => {
    return () => clearTimeout(hintTimer.current)
  }, [])

  function patchTurn(id: number, patch: Partial<Turn>) {
    setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  async function ask(question: string, r: Role) {
    if (!question.trim() || isBusy) return
    const id = nextId.current++
    setTurns((prev) => [
      ...prev,
      {
        id,
        question,
        role: r,
        status: 'searching',
        error: null,
        citations: [],
        totalMatching: 0,
        visibleMatching: 0,
        followups: [],
      },
    ])

    try {
      const retrieveRes = await fetch('/api/ask/retrieve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question, role: r }),
      })
      const retrieveData = await retrieveRes.json()
      if (!retrieveRes.ok) throw new Error(retrieveData.error || 'Request failed')

      if (retrieveData.done) {
        patchTurn(id, {
          status: 'done',
          answer: retrieveData.answer,
          citations: retrieveData.citations,
          totalMatching: retrieveData.totalMatching,
          visibleMatching: retrieveData.visibleMatching,
          followups: [],
        })
        return
      }

      patchTurn(id, {
        status: 'answering',
        citations: retrieveData.citations,
        totalMatching: retrieveData.totalMatching,
        visibleMatching: retrieveData.visibleMatching,
      })

      const answerRes = await fetch('/api/ask/answer', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question, role: r, contextDocIds: retrieveData.contextDocIds }),
      })
      const answerData = await answerRes.json()
      if (!answerRes.ok) throw new Error(answerData.error || 'Request failed')

      patchTurn(id, { status: 'done', answer: answerData.answer, followups: answerData.followups })

      if (!hasShownRoleHint.current && r === 'public') {
        hasShownRoleHint.current = true
        setShowRoleHint(true)
        hintTimer.current = setTimeout(() => setShowRoleHint(false), ROLE_HINT_AUTO_DISMISS_MS)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      patchTurn(id, { status: 'error', error: message })
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = inputValue
    setInputValue('')
    ask(q, role)
  }

  function handleRoleChange(newRole: Role) {
    setRole(newRole)
    const lastQuestion = turns[turns.length - 1]?.question
    if (lastQuestion) ask(lastQuestion, newRole)
  }

  function dismissRoleHint() {
    clearTimeout(hintTimer.current)
    setShowRoleHint(false)
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `radial-gradient(900px circle at 15% -5%, ${brand.accentColor}14, transparent 50%), radial-gradient(900px circle at 85% 0%, ${brand.accentColor}0d, transparent 45%), #fafafa`,
      }}
    >
      <BrandHeader
        brand={brand}
        subtitle={<CorpusBadge accentColor={brand.accentColor} />}
        right={
          <RoleToggle
            role={role}
            onChange={handleRoleChange}
            accentColor={brand.accentColor}
            showHint={showRoleHint}
            onDismissHint={dismissRoleHint}
          />
        }
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-10 py-10 sm:py-14">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-light tracking-tight leading-[1.15] text-gray-900 text-[36px] sm:text-5xl">
            Ask a question about recent security{' '}
            <span style={{ color: brand.accentColor }}>advisories</span>
          </h2>
          <p className="text-gray-500 mt-3 text-base">
            Plain English in, a cited answer out — no keywords, no filters to figure out.
          </p>

          <form onSubmit={handleSubmit} className="flex gap-2 mt-7">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2">
                <AskIcon />
              </span>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about a security vulnerability or affected product..."
                className="w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-4 py-4 text-[15px] focus:outline-none transition-shadow"
                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 3px ${brand.accentColor}22`)}
                onBlur={(e) => (e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)')}
              />
            </div>
            <button
              type="submit"
              disabled={isBusy || !inputValue.trim()}
              className="px-7 py-4 rounded-2xl text-sm font-medium text-white disabled:opacity-40 shadow-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: brand.accentColor }}
            >
              {isBusy ? 'Asking…' : 'Ask'}
            </button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-4">
            {turns.length === 0 && (
              <div className="w-full max-w-2xl">
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">Try one of these</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXAMPLE_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => ask(q, role)}
                      className="text-sm px-3.5 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:-translate-y-px hover:shadow-sm transition-all text-left truncate"
                      style={{ borderColor: brand.accentColor + '26' }}
                      title={q}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-5">
                  Every answer is checked against real documents — never invented.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 space-y-12">
          {turns.map((turn, i) => {
            const isLast = i === turns.length - 1
            return (
              <div key={turn.id} className={i > 0 ? 'pt-10 border-t border-gray-200/70' : ''}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <p className="text-lg sm:text-xl font-medium text-gray-900">{turn.question}</p>
                  <span
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
                    style={{ backgroundColor: brand.accentColor + '0f', color: brand.accentColor }}
                  >
                    {ROLE_LABELS[turn.role]}
                  </span>
                </div>

                {turn.error && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm p-4">
                    {turn.error}
                  </div>
                )}

                {turn.status === 'searching' && <SearchingIndicator color={brand.accentColor} />}

                {(turn.status === 'answering' || turn.status === 'done') && (
                  <AnswerPanel
                    accentColor={brand.accentColor}
                    question={turn.question}
                    answer={turn.answer}
                    isAnswering={turn.status === 'answering'}
                    citations={turn.citations}
                    totalMatching={turn.totalMatching}
                    visibleMatching={turn.visibleMatching}
                    followups={turn.followups}
                    fallbackSuggestions={EXAMPLE_QUESTIONS}
                    onAskFollowup={(q) => ask(q, role)}
                    showSuggestions={isLast && turn.status === 'done'}
                    animate={isLast}
                  />
                )}
              </div>
            )
          })}
        </div>
      </main>

      <Footer brand={brand} />
    </div>
  )
}
