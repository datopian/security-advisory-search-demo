import { BrandConfig } from '../lib/brands'
import { getCorpus } from '../lib/corpora'

// Attribution + next-step call to action (spec 5a): present, identical, and
// unaffected by branding on every skin — a branded page only changes the
// header, never this. Plain anchors only: no analytics, tracking pixels,
// link wrappers, or session recording.
export function Footer({ brand }: { brand: BrandConfig }) {
  const corpus = getCorpus(brand.corpusId)
  const disclaimer = brand.displayName
    ? `Illustrative example built on public ${corpus.topicLabel} data, not on ${brand.displayName}'s own systems.`
    : `Illustrative example built on public ${corpus.topicLabel} data.`

  return (
    <footer className="max-w-7xl mx-auto w-full px-4 sm:px-10 py-8 mt-8 border-t border-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-xs text-gray-400 text-center sm:text-left">
          Built by{' '}
          <a
            href="https://datopian.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline"
            style={{ color: brand.accentColor }}
          >
            Datopian
          </a>
          , using{' '}
          <a
            href="https://portaljs.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline"
            style={{ color: brand.accentColor }}
          >
            PortalJS
          </a>
          .
        </p>

        <a
          href="https://datopian.com/contact"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full transition-all hover:-translate-y-px hover:shadow-sm self-center"
          style={{ backgroundColor: brand.accentColor + '14', color: brand.accentColor }}
        >
          Want this running on your own documents?
          <span aria-hidden="true">→</span>
        </a>
      </div>

      <p className="text-xs text-gray-400 mt-5 text-center sm:text-left">{disclaimer}</p>
    </footer>
  )
}
