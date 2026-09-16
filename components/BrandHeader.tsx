import Link from 'next/link'
import { BrandConfig } from '../lib/brands'

export function BrandHeader({ brand }: { brand: BrandConfig }) {
  const heading = brand.displayName ? `${brand.displayName} — Threat Advisory Search` : 'Threat Advisory Search'

  return (
    <header className="sticky top-0 z-10 backdrop-blur bg-white/80 border-b border-gray-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-3">
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logoUrl} alt={`${brand.displayName} logo`} className="h-8 w-auto shrink-0" />
        ) : (
          <div
            className="h-9 w-9 shrink-0 rounded-xl grid place-items-center text-white font-semibold text-sm"
            style={{ backgroundColor: brand.accentColor }}
          >
            {(brand.displayName || 'T').charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <Link href="/" className="flex items-center gap-2 group">
            <h1
              className="text-lg font-semibold tracking-tight truncate group-hover:opacity-80 transition-opacity"
              style={{ color: brand.accentColor }}
            >
              {heading}
            </h1>
            <span className="hidden sm:inline-block text-[10px] font-medium uppercase tracking-wider text-gray-400 border border-gray-200 rounded-full px-2 py-0.5 shrink-0">
              Demo
            </span>
          </Link>
          {brand.tagline ? <p className="text-sm text-gray-500 mt-0.5 truncate">{brand.tagline}</p> : null}
        </div>
      </div>
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${brand.accentColor}, transparent)` }} />
    </header>
  )
}
