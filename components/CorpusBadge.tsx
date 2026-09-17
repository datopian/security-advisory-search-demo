import { useEffect, useRef, useState } from 'react'
import { CorpusStats, Role, visibleCountForRole } from '../lib/types'
import { CorpusDefinition } from '../lib/corpora'

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 9v4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10" cy="6.7" r="0.9" fill="currentColor" />
    </svg>
  )
}

export function CorpusBadge({
  accentColor,
  corpus,
  stats,
  role,
}: {
  accentColor: string
  corpus: CorpusDefinition
  stats: CorpusStats
  role: Role
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const visible = visibleCountForRole(stats, role)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1.5 text-xs text-gray-400">
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
      <span>
        Searching {visible} of {stats.total} {corpus.docNounPlural}
        <span className="hidden sm:inline"> · public demo data</span>
      </span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-gray-300 hover:text-gray-500 transition-colors shrink-0"
        aria-label="More about this demo"
      >
        <InfoIcon />
      </button>

      {open && (
        <div className="absolute z-20 top-full mt-2 left-0 w-80 max-w-[90vw] rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-600 leading-relaxed shadow-lg text-left animate-fade-up">
          <div className="flex items-center justify-center gap-1.5 mb-3 text-[11px] font-medium text-gray-500">
            <span className="px-2 py-1 rounded-full bg-gray-50 border border-gray-100">Your reports</span>
            <span style={{ color: accentColor }}>→</span>
            <span className="px-2 py-1 rounded-full bg-gray-50 border border-gray-100">This layer</span>
            <span style={{ color: accentColor }}>→</span>
            <span className="px-2 py-1 rounded-full bg-gray-50 border border-gray-100">Plain-English answers</span>
          </div>
          <p className="font-medium text-gray-800 mb-1.5">What this demo actually is</p>
          <p>
            This searches {stats.total} {corpus.docNounPlural} from {corpus.sourceName} — a public
            stand-in corpus, so this can be a live demo without touching anyone&apos;s real data.
          </p>
          <p className="mt-2">
            The real capability is pointing the same mechanism at your own internal reports, with
            results automatically limited to what each person&apos;s role is cleared to see — the
            count above updates with the role toggle for exactly that reason.
          </p>
        </div>
      )}
    </div>
  )
}
