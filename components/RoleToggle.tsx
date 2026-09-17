import { Role, ROLE_LABELS } from '../lib/types'

const ROLES: Role[] = ['public', 'analyst', 'admin']

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

export function RoleToggle({
  role,
  onChange,
  accentColor,
}: {
  role: Role
  onChange: (role: Role) => void
  accentColor: string
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="uppercase tracking-wide">Viewing as</span>
      </div>
      <div className="flex items-center gap-1 rounded-full border border-gray-200 p-1 bg-white shadow-sm">
        {ROLES.map((r) => {
          const active = r === role
          return (
            <button
              key={r}
              type="button"
              onClick={() => onChange(r)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full transition-all"
              style={
                active
                  ? { backgroundColor: accentColor, color: 'white' }
                  : { color: '#4b5563' }
              }
            >
              {ROLE_ICON[r]}
              {ROLE_LABELS[r]}
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-gray-400 max-w-[420px] text-center leading-snug">
        Try another role — the answer above updates instantly. (Simulated for this demo; a real
        deployment ties roles to your SSO/identity provider and enforces this server-side.)
      </p>
    </div>
  )
}
