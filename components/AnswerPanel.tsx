import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { AskResponse } from '../lib/types'

const TIER_BADGE: Record<string, string> = {
  public: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200',
  internal: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  restricted: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
}

function SparkleIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 20 20" fill={color} className="h-4 w-4 shrink-0">
      <path d="M10 2.5 11.4 7.6 16.5 9l-5.1 1.4L10 15.5 8.6 10.4 3.5 9l5.1-1.4L10 2.5Z" />
    </svg>
  )
}

export function AnswerPanel({
  result,
  accentColor,
  question,
}: {
  result: AskResponse
  accentColor: string
  question: string
}) {
  return (
    <div className="mt-8 space-y-5 animate-fade-up">
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
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-2 px-1">Sources</p>
          <ul className="grid gap-2">
            {result.citations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/documents/${c.id}?q=${encodeURIComponent(question)}`}
                  className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-white p-3.5 hover:shadow-md hover:border-gray-200 transition-all group"
                >
                  <div className="min-w-0">
                    <p
                      className="text-sm font-medium truncate group-hover:underline"
                      style={{ color: accentColor }}
                    >
                      {c.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.date}</p>
                  </div>
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wide px-2 py-1 rounded-full whitespace-nowrap ${TIER_BADGE[c.tier]}`}
                  >
                    {c.tier}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
