// Ingests public-sector data-governance / IT-modernization guidance from
// GOV.UK's public Search API (https://www.gov.uk/api/search.json) and
// Content API (https://www.gov.uk/api/content/<path>) — no API key
// required. Seeded from the Government Data Quality Hub and broadened to
// related Central Digital and Data Office / data-standards guidance to
// reach the 100-300 document target (the Hub collection alone is too
// small). Writes data/governance/corpus.json + datapackage.json.
//
// Usage: npm run ingest:governance

import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data', 'governance')

const TARGET_MAX_DOCS = 300
const SEARCH_COUNT = 100
const REQUEST_DELAY_MS = 150
// GOV.UK guidance runs far longer than a CVE description (some detailed
// guides exceed 100K characters) — cap it so a doc's full text stays a
// practical size for the document page and, more importantly, so per-batch
// embedding requests don't blow Voyage's 10K-tokens/min throttle for
// accounts with no payment method on file (see scripts/embed.mjs).
const MAX_DESCRIPTION_CHARS = 5000

const SEARCH_QUERIES = [
  'data quality',
  'data governance',
  'data standards',
  'data ethics',
  'open data',
  'data sharing guidance',
  'data management',
  'data interoperability',
  'data strategy',
  'data architecture',
]

// Substantive, text-bearing publication types only — excludes link-list
// pages (document_collection), announcement posts (news_story), and other
// formats with little or no real body text.
const ALLOWED_FORMATS = new Set([
  'guidance',
  'policy_paper',
  'consultation',
  'consultation_outcome',
  'corporate_report',
  'statutory_guidance',
  'impact_assessment',
  'transparency',
  'detailed_guide',
  'case_study',
  'research',
  'official_statistics',
  'data_ethics_guidance_document',
  'correspondence',
  'decision',
])

// Tier rule: restricted overrides on sensitivity-classification language,
// or format == impact_assessment (pre-decision risk analysis — the closest
// analogue GOV.UK's own taxonomy has to "not meant for casual public
// reading"); internal = policy/process documents aimed at a government
// audience rather than the general public; public = everything else
// (openly published how-to guidance, case studies, statistics).
const RESTRICTED_FORMATS = new Set(['impact_assessment'])
const INTERNAL_FORMATS = new Set([
  'policy_paper',
  'consultation',
  'consultation_outcome',
  'corporate_report',
  'statutory_guidance',
  'correspondence',
  'research',
])
const SENSITIVE_TERMS = [
  'official-sensitive',
  'official sensitive',
  'security classification',
  'government security classifications',
  'protective marking',
  'not for public release',
]

const FORMAT_LABELS = {
  guidance: 'Guidance',
  policy_paper: 'Policy paper',
  consultation: 'Consultation',
  consultation_outcome: 'Consultation outcome',
  corporate_report: 'Corporate report',
  statutory_guidance: 'Statutory guidance',
  impact_assessment: 'Impact assessment',
  transparency: 'Transparency data',
  detailed_guide: 'Detailed guide',
  case_study: 'Case study',
  research: 'Research',
  official_statistics: 'Official statistics',
  data_ethics_guidance_document: 'Data ethics guidance',
  correspondence: 'Correspondence',
  decision: 'Decision',
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function searchGovUk(query) {
  const url = `https://www.gov.uk/api/search.json?q=${encodeURIComponent(query)}&count=${SEARCH_COUNT}`
  const res = await fetch(url, { headers: { 'user-agent': 'governance-search-demo/1.0' } })
  if (!res.ok) {
    throw new Error(`GOV.UK search failed for "${query}": ${res.status} ${res.statusText}`)
  }
  const json = await res.json()
  return json.results || []
}

async function fetchContent(link) {
  const url = `https://www.gov.uk/api/content${link}`
  const res = await fetch(url, { headers: { 'user-agent': 'governance-search-demo/1.0' } })
  if (!res.ok) return null
  return res.json()
}

function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function extractBodyText(content) {
  const details = content.details || {}
  if (typeof details.body === 'string' && details.body.trim()) {
    return stripHtml(details.body)
  }
  if (Array.isArray(details.parts) && details.parts.length > 0) {
    return details.parts
      .map((p) => `${p.title ? p.title + '. ' : ''}${stripHtml(p.body || '')}`)
      .join(' ')
      .trim()
  }
  return ''
}

function summarize(text, maxLen = 220) {
  if (text.length <= maxLen) return text
  const cut = text.slice(0, maxLen)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : maxLen)}…`
}

function tierFor(format, fullText) {
  const lower = fullText.toLowerCase()
  if (SENSITIVE_TERMS.some((term) => lower.includes(term))) return 'restricted'
  if (RESTRICTED_FORMATS.has(format)) return 'restricted'
  if (INTERNAL_FORMATS.has(format)) return 'internal'
  return 'public'
}

async function main() {
  console.log('Searching GOV.UK for data-governance / IT-modernization guidance...')
  const candidates = new Map() // link -> { title, format, description }

  for (const query of SEARCH_QUERIES) {
    const results = await searchGovUk(query)
    let kept = 0
    for (const r of results) {
      if (!r.link || candidates.has(r.link)) continue
      if (!ALLOWED_FORMATS.has(r.format)) continue
      candidates.set(r.link, { title: r.title, format: r.format, description: r.description || '' })
      kept++
    }
    console.log(`  "${query}" -> ${results.length} results, ${kept} new candidates (total ${candidates.size})`)
    await sleep(REQUEST_DELAY_MS)
    if (candidates.size >= TARGET_MAX_DOCS) break
  }

  const candidateLinks = Array.from(candidates.keys()).slice(0, TARGET_MAX_DOCS)
  console.log(`\nFetching full text for ${candidateLinks.length} candidates via the Content API...`)

  const docs = []
  for (const link of candidateLinks) {
    const content = await fetchContent(link)
    await sleep(REQUEST_DELAY_MS)
    if (!content) continue

    const bodyText = extractBodyText(content)
    if (!bodyText || bodyText.length < 200) continue // too thin to be useful context

    const format = candidates.get(link).format
    const title = content.title || candidates.get(link).title
    const date = (content.public_updated_at || content.first_published_at || '').split('T')[0]
    const tier = tierFor(format, `${title} ${bodyText}`)

    docs.push({
      id: link.replace(/^\//, '').replace(/\//g, '-'),
      title,
      summary: summarize(content.description || bodyText, 220),
      description: summarize(bodyText, MAX_DESCRIPTION_CHARS),
      date,
      sourceUrl: `https://www.gov.uk${link}`,
      tier,
      meta: FORMAT_LABELS[format] || format,
    })
  }

  if (docs.length < 20) {
    throw new Error(`Only ingested ${docs.length} documents — GOV.UK API response shape may have changed.`)
  }

  const tierCounts = docs.reduce((acc, d) => {
    acc[d.tier] = (acc[d.tier] || 0) + 1
    return acc
  }, {})

  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(path.join(DATA_DIR, 'corpus.json'), JSON.stringify(docs, null, 2))

  const datapackage = {
    name: 'data-governance-guidance-corpus',
    title: 'Data Governance Guidance Corpus (GOV.UK)',
    description:
      'Public-sector data-governance and IT-modernization guidance documents ingested from GOV.UK via its public Search and Content APIs, for the Data Governance Guidance Search demo. Each record is tagged with a simulated access tier derived deterministically from its GOV.UK publication format (impact assessments, or sensitivity-classification language -> restricted; policy papers/consultations/corporate reports/statutory guidance/correspondence/research -> internal; otherwise public).',
    licenses: [{ name: 'OGL-UK-3.0', title: 'Open Government Licence v3.0' }],
    sources: [{ title: 'GOV.UK', path: 'https://www.gov.uk/' }],
    resources: [
      {
        name: 'corpus',
        path: 'corpus.json',
        format: 'json',
        schema: {
          fields: [
            { name: 'id', type: 'string', description: 'Derived from the GOV.UK path' },
            { name: 'title', type: 'string' },
            { name: 'summary', type: 'string' },
            { name: 'description', type: 'string', description: 'Full plain-text body' },
            { name: 'date', type: 'date', description: 'Publication or last-updated date' },
            { name: 'sourceUrl', type: 'string', description: 'Canonical gov.uk page' },
            { name: 'tier', type: 'string', description: 'Simulated access tier: public | internal | restricted' },
            { name: 'meta', type: 'string', description: 'GOV.UK publication format label' },
          ],
        },
      },
    ],
  }
  await writeFile(path.join(DATA_DIR, 'datapackage.json'), JSON.stringify(datapackage, null, 2))

  console.log(`\nIngested ${docs.length} documents.`)
  console.log('Tier distribution:', tierCounts)
  console.log('Wrote data/governance/corpus.json and data/governance/datapackage.json')
  console.log('\nNext: set VOYAGE_API_KEY in .env.local and run `npm run embed:governance`.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
