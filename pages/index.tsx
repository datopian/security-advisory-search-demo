import Head from 'next/head'
import { AskExperience } from '../components/AskExperience'
import { DEFAULT_BRAND } from '../lib/brands'

export default function Home() {
  return (
    <>
      <Head>
        <title>Threat Advisory Search</title>
        <meta
          name="description"
          content="Ask a plain-language question about public security advisories and get a synthesized, cited answer."
        />
      </Head>
      <AskExperience brand={DEFAULT_BRAND} />
    </>
  )
}
