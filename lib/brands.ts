import brandConfigData from '../brand-config.json'

export interface BrandConfig {
  displayName: string
  accentColor: string
  tagline?: string
  logoUrl?: string | null
}

export const DEFAULT_BRAND: BrandConfig = {
  displayName: '',
  accentColor: '#4f46e5',
  tagline: 'Ask a plain-language question, get a cited answer.',
  logoUrl: null,
}

const BRANDS = brandConfigData as Record<string, BrandConfig>

// Unrecognized or missing brand keys always fall back to the neutral default.
export function getBrand(brand: string | undefined | null): BrandConfig {
  if (!brand) return DEFAULT_BRAND
  const entry = BRANDS[brand.toLowerCase()]
  return entry ? { ...DEFAULT_BRAND, ...entry } : DEFAULT_BRAND
}

export function listBrandSlugs(): string[] {
  return Object.keys(BRANDS)
}
