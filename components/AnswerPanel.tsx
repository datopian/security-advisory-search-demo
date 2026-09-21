import { CSSProperties, useEffect, useState } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { Citation } from '../lib/types'

const TIER_STYLE: Record<string, { dot: string; badge: string }> = {
  public: { dot: '#16a34a', badge: 'bg-emerald-50 text-emerald-700' },
  internal: { dot: '#d97706', badge: 'bg-amber-50 text-amber-700' },
  restricted: { dot: '#dc2626', badge: 'bg-rose-50 text-rose-700' },
}

const VISIBLE_BY_DEFAULT = 4
// Characters revealed per tick when animating a freshly-arrived answer —
// tuned to feel like fast, fluent reading rather than a slow typewriter or
// an instant dump.
const REVEAL_CHARS_PER_TICK = 6
const REVEAL_TICK_MS = 12

function useRevealedText(fullText: string | undefined, animate: boolean): string {
  const [revealed, setRevealed] = useState(animate ? '' : fullText || '')

  useEffect(() => {
    if (!fullText) {
      setRevealed('')
      return
    }
    if (!animate) {
      setRevealed(fullText)
      return
    }
    setRevealed('')
    let i = 0
    const id = setInterval(() => {
      i += REVEAL_CHARS_PER_TICK
      setRevealed(fullText.slice(0, i))
      if (i >= fullText.length) clearInterval(id)
    }, REVEAL_TICK_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullText])

  return revealed
}

function SparkleIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 20 20" fill={color} className="h-4 w-4 shrink-0">
      <path d="M10 2.5 11.4 7.6 16.5 9l-5.1 1.4L10 15.5 8.6 10.4 3.5 9l5.1-1.4L10 2.5Z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5 shrink-0">
      <rect x="4.5" y="8.5" width="11" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7.25 8.5V6.75a2.75 2.75 0 0 1 5.5 0V8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {questions.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onAsk(q)}
            className="text-sm px-3.5 py-2 rounded-xl font-medium transition-all hover:-translate-y-px hover:shadow-sm text-left"
            style={{ backgroundColor: accentColor + '0f', color: accentColor }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

function AnswerSkeleton({ accentColor, label }: { accentColor: string; label?: string }) {
  return (
    <div>
      {label && (
        <div className="flex items-center gap-2.5 mb-4 text-sm" style={{ color: accentColor }}>
          <div className="flex gap-1">
            <span className="thinking-dot h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
            <span className="thinking-dot h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
            <span className="thinking-dot h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
          </div>
          {label}
        </div>
      )}
      <div className="space-y-2.5 animate-pulse">
        <div className="h-3.5 rounded-full w-11/12" style={{ backgroundColor: accentColor + '14' }} />
        <div className="h-3.5 rounded-full w-full" style={{ backgroundColor: accentColor + '14' }} />
        <div className="h-3.5 rounded-full w-4/5" style={{ backgroundColor: accentColor + '14' }} />
      </div>
    </div>
  )
}

export function AnswerPanel({
  accentColor,
  question,
  brandSlug,
  answer,
  isAnswering,
  citations,
  totalMatching,
  visibleMatching,
  followups,
  fallbackSuggestions,
  onAskFollowup,
  showSuggestions = true,
  animate = false,
}: {
  accentColor: string
  question: string
  brandSlug: string
  answer?: string
  isAnswering: boolean
  citations: Citation[]
  totalMatching: number
  visibleMatching: number
  followups: string[]
  fallbackSuggestions: string[]
  onAskFollowup: (q: string) => void
  showSuggestions?: boolean
  animate?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const displayedAnswer = useRevealedText(answer, animate)
  const hiddenCount = citations.length - VISIBLE_BY_DEFAULT
  const visibleCitations = expanded ? citations : citations.slice(0, VISIBLE_BY_DEFAULT)
  const withheld = totalMatching - visibleMatching

  // Tailwind Typography reads these CSS variables, so the accent colours the
  // bold product/vendor names the model emits — the cheapest way to give the
  // answer visual rhythm without restyling every element.
  const proseVars = {
    '--tw-prose-bold': accentColor,
    '--tw-prose-body': '#374151',
  } as CSSProperties

  return (
    <div className="mt-6 animate-fade-up">
      <div className="grid lg:grid-cols-5 gap-5 items-start">
        <div className="lg:col-span-3 space-y-5">
          <div
            className="rounded-2xl border shadow-sm p-6 sm:p-7"
            style={{
              borderColor: accentColor + '26',
              background: `linear-gradient(180deg, ${accentColor}0a, #ffffff 120px)`,
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <SparkleIcon color={accentColor} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: accentColor }}>
                Answer
              </span>
            </div>
            {isAnswering || !answer ? (
              <AnswerSkeleton
                accentColor={accentColor}
                label={isAnswering ? `Found ${visibleMatching} relevant — writing your answer…` : undefined}
              />
            ) : (
              <div
                className="prose max-w-none prose-p:leading-7 prose-p:my-3 first:prose-p:mt-0 last:prose-p:mb-0 prose-strong:font-semibold prose-ul:my-3 prose-li:my-1 text-[15px]"
                style={proseVars}
              >
                <ReactMarkdown>{displayedAnswer}</ReactMarkdown>
              </div>
            )}
          </div>

          {showSuggestions &&
            !isAnswering &&
            (citations.length > 0 ? (
              <SuggestionChips label="Keep exploring" questions={followups} accentColor={accentColor} onAsk={onAskFollowup} />
            ) : (
              <SuggestionChips
                label="Try asking instead"
                questions={fallbackSuggestions}
                accentColor={accentColor}
                onAsk={onAskFollowup}
              />
            ))}
        </div>

        <aside className="lg:col-span-2 space-y-3">
          {totalMatching > 0 && (
            <div
              className="rounded-xl p-3.5 flex items-start gap-2.5"
              style={{ backgroundColor: accentColor + '0d', color: accentColor }}
            >
              <span className="mt-0.5">
                <LockIcon />
              </span>
              <div className="text-xs leading-relaxed">
                <p className="font-semibold">
                  {visibleMatching} of {totalMatching} documents used
                </p>
                <p className="opacity-80 mt-0.5">
                  {withheld > 0
                    ? `${withheld} more matched but sit above your access level.`
                    : 'You can see every matching document at this level.'}
                </p>
              </div>
            </div>
          )}

          {citations.length > 0 && (
            <div className="rounded-xl border border-gray-100 bg-white p-2">
              <p className="text-[11px] uppercase tracking-wide text-gray-400 px-2 pt-1 pb-1.5">Sources</p>
              <ul>
                {visibleCitations.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/documents/${c.id}?q=${encodeURIComponent(question)}&brand=${encodeURIComponent(brandSlug)}`}
                      className="block py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: TIER_STYLE[c.tier].dot }}
                        />
                        <span className="text-xs font-semibold text-gray-700 group-hover:underline">{c.id}</span>
                        <span
                          className={`text-[9px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full ml-auto shrink-0 ${TIER_STYLE[c.tier].badge}`}
                        >
                          {c.tier}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-snug">
                        {c.title.replace(/^CVE-[\d-]+:\s*/, '')}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
              {hiddenCount > 0 && !expanded && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="text-xs px-2 py-1.5 font-medium hover:underline"
                  style={{ color: accentColor }}
                >
                  + {hiddenCount} more source{hiddenCount > 1 ? 's' : ''}
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
