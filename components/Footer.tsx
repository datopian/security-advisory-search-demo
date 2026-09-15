import { BrandConfig } from '../lib/brands'

export function Footer({ brand }: { brand: BrandConfig }) {
  const disclaimer = brand.displayName
    ? `Illustrative example built on public advisory data, not on ${brand.displayName}'s own systems.`
    : 'Illustrative example built on public advisory data.'

  return (
    <footer className="max-w-3xl mx-auto px-4 py-8 mt-8 border-t border-gray-100">
      <p className="text-xs text-gray-400">{disclaimer}</p>
    </footer>
  )
}
