import Link from 'next/link'
import { BrandConfig } from '../lib/brands'

export function BrandHeader({ brand }: { brand: BrandConfig }) {
  const heading = brand.displayName ? `${brand.displayName} — Threat Advisory Search` : 'Threat Advisory Search'

  return (
    <header className="border-b" style={{ borderColor: brand.accentColor + '33' }}>
      <div className="max-w-3xl mx-auto px-4 py-6 flex items-center gap-3">
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logoUrl} alt={`${brand.displayName} logo`} className="h-8 w-auto" />
        ) : null}
        <div>
          <Link href="/" className="block">
            <h1 className="text-xl font-semibold" style={{ color: brand.accentColor }}>
              {heading}
            </h1>
          </Link>
          {brand.tagline ? <p className="text-sm text-gray-500 mt-0.5">{brand.tagline}</p> : null}
        </div>
      </div>
    </header>
  )
}
