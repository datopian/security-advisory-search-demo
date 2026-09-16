import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { GetStaticPaths, GetStaticProps } from 'next'
import corpus from '../../data/corpus.json'
import { AdvisoryDoc } from '../../lib/types'

const TIER_BADGE: Record<string, string> = {
  public: 'bg-green-50 text-green-700',
  internal: 'bg-amber-50 text-amber-700',
  restricted: 'bg-red-50 text-red-700',
}

export default function DocumentView({ doc }: { doc: AdvisoryDoc }) {
  const router = useRouter()
  const question = typeof router.query.q === 'string' ? router.query.q : null

  return (
    <>
      <Head>
        <title>{doc.id} — Threat Advisory Search</title>
      </Head>
      <div className="min-h-screen bg-[#fafafa]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
            ← Back to search
          </Link>

          <div className="mt-5 flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{doc.id}</h1>
            <span className={`text-[10px] font-medium uppercase tracking-wide px-2 py-1 rounded-full ${TIER_BADGE[doc.tier]}`}>
              {doc.tier}
            </span>
            <span className="text-xs text-gray-400">
              {doc.severity !== 'UNKNOWN' ? `${doc.severity}${doc.cvss ? ` · CVSS ${doc.cvss}` : ''}` : 'Unscored'}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">Published {doc.date}</p>

          {question && (
            <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
              <p className="text-xs uppercase tracking-wide text-indigo-500 mb-1">Relevant to: “{question}”</p>
              <p className="text-sm text-indigo-900">{doc.summary}</p>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Full advisory text</p>
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-[15px]">{doc.description}</p>
          </div>

          <div className="mt-6">
            <a
              href={doc.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:underline"
            >
              View original source at NVD →
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const docs = corpus as AdvisoryDoc[]
  return {
    paths: docs.map((d) => ({ params: { id: d.id } })),
    fallback: false,
  }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const docs = corpus as AdvisoryDoc[]
  const doc = docs.find((d) => d.id === params?.id)
  if (!doc) return { notFound: true }
  return { props: { doc } }
}
