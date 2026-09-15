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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <BrandHeader brand={brand} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h2 className="text-lg font-medium text-gray-800">Ask a question about these advisories…</h2>
          <RoleToggle role={role} onChange={handleRoleChange} accentColor={brand.accentColor} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about these advisories..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2"
            style={{ boxShadow: 'none' }}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="px-5 py-3 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: brand.accentColor }}
          >
            {loading ? 'Asking…' : 'Ask'}
          </button>
        </form>

        {!result && !loading && (
          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setQuestion(q)
                  ask(q, role)
                }}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:border-gray-300"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm p-4">{error}</div>
        )}

        {loading && <div className="mt-6 text-sm text-gray-400">Retrieving relevant advisories and drafting an answer…</div>}

        {result && !loading && <AnswerPanel result={result} accentColor={brand.accentColor} question={question} />}
      </main>

      <Footer brand={brand} />
    </div>
  )
}
