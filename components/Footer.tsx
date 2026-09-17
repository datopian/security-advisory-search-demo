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
    <footer className="max-w-7xl mx-auto w-full px-4 sm:px-10 py-8 mt-8 border-t border-gray-100 text-center sm:text-left">
      <p className="text-xs text-gray-400">
        Built by{' '}
        <a href="https://datopian.com" target="_blank" rel="noopener noreferrer" className="hover:underline">
          Datopian
        </a>
        , using{' '}
        <a href="https://portaljs.com" target="_blank" rel="noopener noreferrer" className="hover:underline">
          PortalJS
        </a>
        .
      </p>
      <p className="text-xs text-gray-400 mt-1">
        Want this running on your own documents?{' '}
        <a href="https://datopian.com/contact" target="_blank" rel="noopener noreferrer" className="hover:underline">
          Get in touch
        </a>
        .
      </p>
      <p className="text-xs text-gray-400 mt-3">{disclaimer}</p>
    </footer>
  )
}
