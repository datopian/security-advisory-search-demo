import Link from 'next/link'
import { AskResponse } from '../lib/types'

const TIER_BADGE: Record<string, string> = {
  public: 'bg-green-50 text-green-700',
  internal: 'bg-amber-50 text-amber-700',
  restricted: 'bg-red-50 text-red-700',
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
    <div className="mt-6 space-y-4">
      <div className="rounded-lg border border-gray-200 p-5 bg-white">
        <p className="text-gray-900 leading-relaxed">{result.answer}</p>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>
          {result.visibleMatching} of {result.totalMatching} matching documents visible at your access level
        </span>
      </div>

      {result.citations.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-2 px-1">Sources</p>
          <ul className="space-y-2">
            {result.citations.map((c) => (
              <li key={c.id} className="rounded-md border border-gray-100 p-3 flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/documents/${c.id}?q=${encodeURIComponent(question)}`}
                    className="text-sm font-medium hover:underline"
                    style={{ color: accentColor }}
                  >
                    {c.title}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">{c.date}</p>
                </div>
                <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full whitespace-nowrap ${TIER_BADGE[c.tier]}`}>
                  {c.tier}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
