import { useState } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { AskResponse } from '../lib/types'

const TIER_DOT: Record<string, string> = {
  public: '#16a34a',
  internal: '#d97706',
  restricted: '#dc2626',
}

const TIER_BADGE: Record<string, string> = {
  public: 'bg-green-50 text-green-700',
  internal: 'bg-amber-50 text-amber-700',
  restricted: 'bg-red-50 text-red-700',
}

const VISIBLE_BY_DEFAULT = 3

function SparkleIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 20 20" fill={color} className="h-4 w-4 shrink-0">
      <path d="M10 2.5 11.4 7.6 16.5 9l-5.1 1.4L10 15.5 8.6 10.4 3.5 9l5.1-1.4L10 2.5Z" />
    </svg>
  )
}

function SuggestionChips({
  label,
  questions,
  accentColor,
  onAsk,
}: {
  label: string
  questions: string[]
  accentColor: string
  onAsk: (q: string) => void
}) {
  if (questions.length === 0) return null
  return (
    <div className="px-1">
      <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {questions.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onAsk(q)}
            className="text-xs px-3 py-1.5 rounded-full border transition-colors"
            style={{ borderColor: accentColor + '40', color: accentColor }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

export function AnswerPanel({
  result,
  accentColor,
  question,
  fallbackSuggestions,
  onAskFollowup,
  showSuggestions = true,
}: {
  result: AskResponse
  accentColor: string
  question: string
  fallbackSuggestions: string[]
  onAskFollowup: (q: string) => void
  showSuggestions?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const hiddenCount = result.citations.length - VISIBLE_BY_DEFAULT
  const visibleCitations = expanded ? result.citations : result.citations.slice(0, VISIBLE_BY_DEFAULT)

  return (
    <div className="mt-8 space-y-4 animate-fade-up">
      <div
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm relative overflow-hidden"
        style={{ borderLeftWidth: 3, borderLeftColor: accentColor }}
      >
        <div className="flex items-center gap-2 mb-3">
          <SparkleIcon color={accentColor} />
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: accentColor }}>
            Synthesized answer
          </span>
        </div>
        <div className="prose prose-sm max-w-none text-gray-900 prose-p:leading-relaxed prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0 prose-strong:text-gray-900 prose-strong:font-semibold prose-ul:my-2 prose-li:my-0.5 text-[15px]">
          <ReactMarkdown>{result.answer}</ReactMarkdown>
        </div>
      </div>

      <div className="flex items-center justify-between px-1 gap-3 flex-wrap">
        <span
          className="text-xs font-medium px-3 py-1 rounded-full"
          style={{ backgroundColor: accentColor + '14', color: accentColor }}
        >
          {result.visibleMatching} of {result.totalMatching} matching documents visible at your access level
        </span>
      </div>

      {result.citations.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1 px-1">Sources</p>
          <ul>
            {visibleCitations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/documents/${c.id}?q=${encodeURIComponent(question)}`}
                  className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: TIER_DOT[c.tier] }} />
                  <span
                    className="text-sm truncate group-hover:underline flex-1 min-w-0"
                    style={{ color: accentColor }}
                  >
                    {c.title}
                  </span>
                  <span
                    className={`text-[9px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${TIER_BADGE[c.tier]}`}
                  >
                    {c.tier}
                  </span>
                  <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">{c.date}</span>
                </Link>
              </li>
            ))}
          </ul>
          {hiddenCount > 0 && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-xs px-2 py-1 mt-0.5 font-medium hover:underline"
              style={{ color: accentColor }}
            >
              + {hiddenCount} more source{hiddenCount > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {showSuggestions &&
        (result.citations.length > 0 ? (
          <SuggestionChips
            label="Keep exploring"
            questions={result.followups}
            accentColor={accentColor}
            onAsk={onAskFollowup}
          />
        ) : (
          <SuggestionChips
            label="Try asking instead"
            questions={fallbackSuggestions}
            accentColor={accentColor}
            onAsk={onAskFollowup}
          />
        ))}
    </div>
  )
}
