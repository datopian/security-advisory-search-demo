import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { GetStaticPaths, GetStaticProps } from 'next'
import securityCorpus from '../../data/security/corpus.json'
import governanceCorpus from '../../data/governance/corpus.json'
import { CorpusDoc } from '../../lib/types'
import { CORPORA, CorpusId, getCorpus } from '../../lib/corpora'

const TIER_BADGE: Record<string, string> = {
  public: 'bg-green-50 text-green-700',
  internal: 'bg-amber-50 text-amber-700',
  restricted: 'bg-red-50 text-red-700',
}

const CORPUS_DATA: Record<CorpusId, CorpusDoc[]> = {
  security: securityCorpus as CorpusDoc[],
  governance: governanceCorpus as CorpusDoc[],
}

export default function DocumentView({ doc, corpusId }: { doc: CorpusDoc; corpusId: CorpusId }) {
  const router = useRouter()
  const question = typeof router.query.q === 'string' ? router.query.q : null
  const corpus = getCorpus(corpusId)

  return (
    <>
      <Head>
        <title>
          {doc.id} — {corpus.label}
        </title>
      </Head>
      <div className="min-h-screen bg-[#fafafa]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
          <Link
            href={`/demo/${corpusId}`}
            className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
          >
            ← Back to search
          </Link>

          <div className="mt-5 flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 break-words">{doc.id}</h1>
            <span className={`text-[10px] font-medium uppercase tracking-wide px-2 py-1 rounded-full ${TIER_BADGE[doc.tier]}`}>
              {doc.tier}
            </span>
            {doc.meta && <span className="text-xs text-gray-400">{doc.meta}</span>}
          </div>
          <p className="text-sm text-gray-400 mt-1">Published {doc.date}</p>

          {question && (
            <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
              <p className="text-xs uppercase tracking-wide text-indigo-500 mb-1">Relevant to: “{question}”</p>
              <p className="text-sm text-indigo-900">{doc.summary}</p>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Full document text</p>
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-[15px]">{doc.description}</p>
          </div>

          <div className="mt-6">
            <a
              href={doc.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:underline"
            >
              View original source at {corpus.sourceName} →
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = (Object.keys(CORPORA) as CorpusId[]).flatMap((corpusId) =>
    CORPUS_DATA[corpusId].map((d) => ({ params: { id: d.id } }))
  )
  return { paths, fallback: false }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const id = params?.id
  for (const corpusId of Object.keys(CORPORA) as CorpusId[]) {
    const doc = CORPUS_DATA[corpusId].find((d) => d.id === id)
    if (doc) return { props: { doc, corpusId } }
  }
  return { notFound: true }
}
