import Head from 'next/head'
import { GetStaticPaths, GetStaticProps } from 'next'
import { AskExperience } from '../../components/AskExperience'
import { BrandConfig, getBrand, listBrandSlugs } from '../../lib/brands'

export default function BrandedDemo({ brand }: { brand: BrandConfig }) {
  const title = brand.displayName ? `${brand.displayName} — Threat Advisory Search` : 'Threat Advisory Search'
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <AskExperience brand={brand} />
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = listBrandSlugs().map((slug) => ({ params: { brand: slug } }))
  // fallback: 'blocking' so an unrecognized /demo/<brand> still renders
  // (getBrand falls back to the neutral default) instead of 404ing.
  return { paths, fallback: 'blocking' }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const brandParam = typeof params?.brand === 'string' ? params.brand : undefined
  const brand = getBrand(brandParam)
  return { props: { brand } }
}
