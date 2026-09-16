import { useEffect, useRef, useState } from 'react'

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 9v4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10" cy="6.7" r="0.9" fill="currentColor" />
    </svg>
  )
}

export function CorpusBadge({ accentColor }: { accentColor: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
        300 NVD CVE advisories · public demo data
        <span style={{ color: accentColor }}>
          <InfoIcon />
        </span>
      </button>

      {open && (
        <div className="absolute z-20 top-full mt-2 left-1/2 -translate-x-1/2 w-80 max-w-[90vw] rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-600 leading-relaxed shadow-lg text-left animate-fade-up">
          <p className="font-medium text-gray-800 mb-1.5">What this demo actually is</p>
          <p>
            This searches 300 recent CVE vulnerability records from the public National Vulnerability
            Database — a public stand-in corpus, so this can be a live demo without touching anyone&apos;s
            real data.
          </p>
          <p className="mt-2">
            The real capability is pointing the same mechanism at your own internal reports (threat
            intel, incident write-ups, whatever your team already has sitting in a folder nobody can
            search), with results automatically limited to what each person&apos;s role is cleared to see.
          </p>
        </div>
      )}
    </div>
  )
}
