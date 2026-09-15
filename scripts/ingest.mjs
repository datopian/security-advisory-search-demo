// Ingests recent CVE records from the NIST NVD CVE 2.0 API (no API key
// required at this volume), tags each with a deterministic access tier
// from its CVSS score, and writes data/corpus.json + data/datapackage.json.
//
// Usage: npm run ingest

import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')

const TARGET_MIN_DOCS = 150
const TARGET_MAX_DOCS = 300
const RESULTS_PER_PAGE = 2000
const API = 'https://services.nvd.nist.gov/rest/json/cves/2.0'

function isoDaysAgo(days) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().split('.')[0]
}

async function fetchWindow(startDays, endDays) {
  const params = new URLSearchParams({
    pubStartDate: `${isoDaysAgo(startDays)}.000`,
    pubEndDate: `${isoDaysAgo(endDays)}.000`,
    resultsPerPage: String(RESULTS_PER_PAGE),
  })
  const url = `${API}?${params.toString()}`
  const res = await fetch(url, { headers: { 'user-agent': 'security-advisory-search-demo/1.0' } })
  if (!res.ok) {
    throw new Error(`NVD API request failed: ${res.status} ${res.statusText} — ${await res.text()}`)
  }
  return res.json()
}

function extractDescription(cve) {
  const en = (cve.descriptions || []).find((d) => d.lang === 'en')
  return en ? en.value : ''
}

function extractCvss(cve) {
  const metrics = cve.metrics || {}
  const candidates = [
    ...(metrics.cvssMetricV31 || []),
    ...(metrics.cvssMetricV30 || []),
    ...(metrics.cvssMetricV2 || []),
  ]
  if (candidates.length === 0) return { score: null, severity: 'UNKNOWN' }
  // Prefer the primary source's metric if present.
  const primary = candidates.find((c) => c.type === 'Primary') || candidates[0]
  const score = primary.cvssData?.baseScore ?? null
  const severity = primary.cvssData?.baseSeverity || primary.baseSeverity || 'UNKNOWN'
  return { score, severity }
}

function tierFor(score) {
  if (score === null) return 'public'
  if (score >= 9.0) return 'restricted'
  if (score >= 4.0) return 'internal'
  return 'public'
}

function summarize(text, maxLen = 100) {
  if (text.length <= maxLen) return text
  const cut = text.slice(0, maxLen)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : maxLen)}…`
}

async function main() {
  console.log('Fetching recent CVE records from NVD...')
  let windowStart = 30
  let windowEnd = 0
  let vulnerabilities = []

  // Expand the publish-date window until we have enough documents.
  // NVD 2.0 caps a single date-filtered request to a 120-day span.
  while (vulnerabilities.length < TARGET_MIN_DOCS && windowStart <= 120) {
    const data = await fetchWindow(windowStart, windowEnd)
    vulnerabilities = data.vulnerabilities || []
    console.log(`  window ${windowStart}-${windowEnd} days ago -> ${vulnerabilities.length} records`)
    if (vulnerabilities.length < TARGET_MIN_DOCS) {
      windowStart += 15
    }
  }

  const docs = []
  for (const entry of vulnerabilities) {
    const cve = entry.cve
    const description = extractDescription(cve)
    if (!description) continue
    const { score, severity } = extractCvss(cve)
    const id = cve.id
    docs.push({
      id,
      title: `${id}: ${summarize(description, 70)}`,
      summary: summarize(description, 220),
      description,
      date: (cve.published || '').split('T')[0],
      sourceUrl: `https://nvd.nist.gov/vuln/detail/${id}`,
      cvss: score,
      severity,
      tier: tierFor(score),
    })
    if (docs.length >= TARGET_MAX_DOCS) break
  }

  if (docs.length < 20) {
    throw new Error(`Only ingested ${docs.length} documents — NVD response shape may have changed.`)
  }

  const tierCounts = docs.reduce((acc, d) => {
    acc[d.tier] = (acc[d.tier] || 0) + 1
    return acc
  }, {})

  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(path.join(DATA_DIR, 'corpus.json'), JSON.stringify(docs, null, 2))

  const datapackage = {
    name: 'security-advisory-corpus',
    title: 'Security Advisory Corpus (NVD CVE records)',
    description:
      'CVE vulnerability records ingested from the NIST National Vulnerability Database (NVD) CVE 2.0 API for the Threat Advisory Search demo. Each record is tagged with a simulated access tier derived deterministically from its CVSS base score (>=9.0 restricted, 4.0-8.9 internal, otherwise public).',
    licenses: [{ name: 'CC0-1.0', title: 'Public Domain (NVD data is public domain, per NIST)' }],
    sources: [{ title: 'NIST National Vulnerability Database', path: 'https://nvd.nist.gov/' }],
    resources: [
      {
        name: 'corpus',
        path: 'corpus.json',
        format: 'json',
        schema: {
          fields: [
            { name: 'id', type: 'string', description: 'CVE identifier' },
            { name: 'title', type: 'string' },
            { name: 'summary', type: 'string' },
            { name: 'description', type: 'string', description: 'Full NVD English-language description' },
            { name: 'date', type: 'date', description: 'Publication date' },
            { name: 'sourceUrl', type: 'string', description: 'Canonical NVD detail page' },
            { name: 'cvss', type: 'number', description: 'CVSS base score (null if unscored)' },
            { name: 'severity', type: 'string' },
            { name: 'tier', type: 'string', description: 'Simulated access tier: public | internal | restricted' },
          ],
        },
      },
    ],
  }
  await writeFile(path.join(DATA_DIR, 'datapackage.json'), JSON.stringify(datapackage, null, 2))

  console.log(`\nIngested ${docs.length} documents.`)
  console.log('Tier distribution:', tierCounts)
  console.log('Wrote data/corpus.json and data/datapackage.json')
  console.log('\nNext: set VOYAGE_API_KEY in .env.local and run `npm run embed`.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
