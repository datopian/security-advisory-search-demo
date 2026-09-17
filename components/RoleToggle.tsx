import { useEffect, useRef, useState } from 'react'
import { Role } from '../lib/types'

const ROLES: Role[] = ['public', 'analyst', 'admin']

// Shorter than ROLE_LABELS — this sits in the header, where space is tight.
const ROLE_SHORT: Record<Role, string> = {
  public: 'Public',
  analyst: 'Analyst',
  admin: 'Admin',
}

const ROLE_ICON: Record<Role, JSX.Element> = {
  public: (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
      <path
        d="M10 4.5c-4 0-7 3-8 5.5 1 2.5 4 5.5 8 5.5s7-3 8-5.5c-1-2.5-4-5.5-8-5.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  analyst: (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4 17c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
      <path
        d="M10 2.5 16 5v4.5c0 4-2.6 6.9-6 8-3.4-1.1-6-4-6-8V5l6-2.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M7.5 10 9 11.5 12.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 9v4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10" cy="6.7" r="0.9" fill="currentColor" />
    </svg>
  )
}

export function RoleToggle({
  role,
  onChange,
  accentColor,
}: {
  role: Role
  onChange: (role: Role) => void
  accentColor: string
}) {
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
    <div ref={ref} className="relative flex items-center gap-1.5">
      <span className="hidden md:inline text-[10px] uppercase tracking-wider text-gray-400">Demo role</span>
      <div className="flex items-center gap-0.5 rounded-full border border-gray-200 p-0.5 bg-white shadow-sm">
        {ROLES.map((r) => {
          const active = r === role
          return (
            <button
              key={r}
              type="button"
              onClick={() => onChange(r)}
              title={`View as ${ROLE_SHORT[r]}`}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full transition-all"
              style={active ? { backgroundColor: accentColor, color: 'white' } : { color: '#6b7280' }}
            >
              {ROLE_ICON[r]}
              <span className="hidden sm:inline">{ROLE_SHORT[r]}</span>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-gray-300 hover:text-gray-500 transition-colors"
        aria-label="About the role selector"
      >
        <InfoIcon />
      </button>

      {open && (
        <div className="absolute z-30 top-full right-0 mt-2 w-72 max-w-[85vw] rounded-xl border border-gray-200 bg-white p-3.5 text-xs text-gray-600 leading-relaxed shadow-lg text-left animate-fade-up">
          Switching roles re-runs your last question and changes which documents can be used to answer
          it. Simulated for this demo — a real deployment ties roles to your SSO/identity provider and
          enforces this server-side.
        </div>
      )}
    </div>
  )
}
