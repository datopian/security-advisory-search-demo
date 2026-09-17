import Head from 'next/head'
import { GetStaticProps } from 'next'
import { AskExperience } from '../components/AskExperience'
import { BrandConfig, resolveBrand } from '../lib/brands'
import { getCorpus } from '../lib/corpora'
import { getCorpusStats } from '../lib/rag'
import { CorpusStats } from '../lib/types'

// The bare domain root predates the multi-corpus/brand routing and may
// already be linked from sent sales emails, so it keeps working — it
// renders the same neutral security-corpus experience as /demo/security
// directly (a getStaticProps `redirect` here hits a Next.js prerendering
// limitation on a page with no dynamic segment).
export default function Home({ brand, corpusStats }: { brand: BrandConfig; corpusStats: CorpusStats }) {
  const corpus = getCorpus(brand.corpusId)
  return (
    <>
      <Head>
        <title>{corpus.label}</title>
        <meta
          name="description"
          content="Ask a plain-language question about public security advisories and get a synthesized, cited answer."
        />
      </Head>
      <AskExperience brand={brand} corpusStats={corpusStats} />
    </>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  const brand = resolveBrand('security')
  const corpusStats = getCorpusStats(brand.corpusId)
  return { props: { brand, corpusStats } }
}
