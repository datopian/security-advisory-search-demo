import { useRef, useState } from 'react'
import { BrandHeader } from './BrandHeader'
import { Footer } from './Footer'
import { RoleToggle } from './RoleToggle'
import { AnswerPanel } from './AnswerPanel'
import { CorpusBadge } from './CorpusBadge'
import { BrandConfig } from '../lib/brands'
import { AskResponse, ROLE_LABELS, Role } from '../lib/types'

const EXAMPLE_QUESTIONS = [
  'Which vulnerabilities affect remote access software this year?',
  'Are there any critical flaws in widely used content management systems?',
  'What advisories mention privilege escalation?',
  'Are there any critical vulnerabilities in networking equipment like routers?',
  'What flaws affect media or streaming server software?',
  'Are there any SQL injection vulnerabilities reported?',
]

interface Turn {
  id: number
  question: string
  role: Role
  loading: boolean
  error: string | null
  result: AskResponse | null
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

function ThinkingIndicator({ color }: { color: string }) {
  return (
    <div className="mt-4 flex items-center gap-3 text-sm text-gray-500">
      <div className="flex gap-1">
        <span className="thinking-dot h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="thinking-dot h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="thinking-dot h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      </div>
      Retrieving relevant advisories and drafting an answer…
    </div>
  )
}

export function AskExperience({ brand }: { brand: BrandConfig }) {
  const [inputValue, setInputValue] = useState('')
  const [role, setRole] = useState<Role>('public')
  const [turns, setTurns] = useState<Turn[]>([])
  const nextId = useRef(0)

  const isBusy = turns.some((t) => t.loading)

  async function ask(question: string, r: Role) {
    if (!question.trim() || isBusy) return
    const id = nextId.current++
    setTurns((prev) => [...prev, { id, question, role: r, loading: true, error: null, result: null }])

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question, role: r }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Request failed')
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, loading: false, result: json } : t)))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, loading: false, error: message } : t)))
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

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `radial-gradient(1200px circle at 50% -10%, ${brand.accentColor}12, transparent 55%), #fafafa`,
      }}
    >
      <BrandHeader brand={brand} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12">
        <div className="text-center mb-5">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Ask a question about recent security advisories
          </h2>
          <p className="text-gray-500 mt-2 text-sm sm:text-base">
            Plain English in, a synthesized and cited answer out — no keywords, no filters to figure out.
          </p>
        </div>

        <div className="mb-8 flex justify-center">
          <CorpusBadge accentColor={brand.accentColor} />
        </div>

        <div className="mb-6 flex justify-center">
          <RoleToggle role={role} onChange={handleRoleChange} accentColor={brand.accentColor} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2">
              <AskIcon />
            </span>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about a security vulnerability or affected product..."
              className="w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-4 py-3.5 text-sm shadow-sm focus:outline-none focus:ring-2 transition-shadow"
              style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
              onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 3px ${brand.accentColor}22`)}
              onBlur={(e) => (e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)')}
            />
          </div>
          <button
            type="submit"
            disabled={isBusy || !inputValue.trim()}
            className="px-6 py-3.5 rounded-2xl text-sm font-medium text-white disabled:opacity-40 shadow-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: brand.accentColor }}
          >
            {isBusy ? 'Asking…' : 'Ask'}
          </button>
        </form>

        {turns.length === 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q, role)}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="mt-10 space-y-10">
          {turns.map((turn, i) => {
            const isLast = i === turns.length - 1
            return (
              <div key={turn.id} className={i > 0 ? 'pt-8 border-t border-gray-100' : ''}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <p className="text-base sm:text-lg font-medium text-gray-800">{turn.question}</p>
                  <span className="text-[11px] text-gray-400 whitespace-nowrap mt-1.5">
                    Asked as {ROLE_LABELS[turn.role]}
                  </span>
                </div>

                {turn.error && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm p-4">
                    {turn.error}
                  </div>
                )}

                {turn.loading && <ThinkingIndicator color={brand.accentColor} />}

                {turn.result && (
                  <AnswerPanel
                    result={turn.result}
                    accentColor={brand.accentColor}
                    question={turn.question}
                    fallbackSuggestions={EXAMPLE_QUESTIONS}
                    onAskFollowup={(q) => ask(q, role)}
                    showSuggestions={isLast}
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
