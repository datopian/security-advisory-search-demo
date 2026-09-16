import { useState } from 'react'
import { BrandHeader } from './BrandHeader'
import { Footer } from './Footer'
import { RoleToggle } from './RoleToggle'
import { AnswerPanel } from './AnswerPanel'
import { BrandConfig } from '../lib/brands'
import { AskResponse, Role } from '../lib/types'

const EXAMPLE_QUESTIONS = [
  'Which vulnerabilities affect remote access software this year?',
  'Are there any critical flaws in widely used content management systems?',
  'What advisories mention privilege escalation?',
]

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
    <div className="mt-8 flex items-center gap-3 text-sm text-gray-500">
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
  const [question, setQuestion] = useState('')
  const [role, setRole] = useState<Role>('public')
  const [result, setResult] = useState<AskResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function ask(q: string, r: Role) {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: q, role: r }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Request failed')
      setResult(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    ask(question, role)
  }

  function handleRoleChange(newRole: Role) {
    setRole(newRole)
    if (question.trim() && result) {
      ask(question, newRole)
    }
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
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Ask a question about these advisories
          </h2>
          <p className="text-gray-500 mt-2 text-sm sm:text-base">
            Plain English in, a synthesized and cited answer out — no keywords, no filters to figure out.
          </p>
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
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about these advisories..."
              className="w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-4 py-3.5 text-sm shadow-sm focus:outline-none focus:ring-2 transition-shadow"
              style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
              onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 3px ${brand.accentColor}22`)}
              onBlur={(e) => (e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)')}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="px-6 py-3.5 rounded-2xl text-sm font-medium text-white disabled:opacity-40 shadow-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: brand.accentColor }}
          >
            {loading ? 'Asking…' : 'Ask'}
          </button>
        </form>

        {!result && !loading && (
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setQuestion(q)
                  ask(q, role)
                }}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm p-4">{error}</div>
        )}

        {loading && <ThinkingIndicator color={brand.accentColor} />}

        {result && !loading && <AnswerPanel result={result} accentColor={brand.accentColor} question={question} />}
      </main>

      <Footer brand={brand} />
    </div>
  )
}
