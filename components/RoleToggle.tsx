import { Role, ROLE_LABELS } from '../lib/types'

const ROLES: Role[] = ['public', 'analyst', 'admin']

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
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-gray-400 mr-1">Viewing as</span>
      <div className="flex rounded-full border border-gray-200 p-0.5 bg-gray-50">
        {ROLES.map((r) => {
          const active = r === role
          return (
            <button
              key={r}
              type="button"
              onClick={() => onChange(r)}
              className="px-3 py-1 text-sm rounded-full transition-colors"
              style={active ? { backgroundColor: accentColor, color: 'white' } : { color: '#374151' }}
            >
              {ROLE_LABELS[r]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
