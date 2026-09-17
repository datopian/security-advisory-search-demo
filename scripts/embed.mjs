// Computes one embedding per document in data/<corpus>/corpus.json via the
// Voyage AI embeddings API and writes the flat vector index to
// data/<corpus>/embeddings.json. This runs once at ingestion time; the app
// does in-process cosine similarity against this file at query time (no
// vector database).
//
// Usage: npm run embed:security | npm run embed:governance
//        node --env-file=.env.local scripts/embed.mjs <corpus-id>

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const corpusId = process.argv[2]
if (!corpusId) {
  console.error('Usage: node scripts/embed.mjs <corpus-id>  (e.g. security, governance)')
  process.exit(1)
}
const DATA_DIR = path.join(__dirname, '..', 'data', corpusId)

const MODEL = 'voyage-4-lite'
// Voyage throttles accounts with no payment method on file to 3 requests/min
// and 10K tokens/min. Fixed pacing keeps us under the request-rate cap; a
// token-budget-based batch size (rather than a fixed doc count) keeps us
// under the token cap regardless of how long a given corpus's documents
// are — a batch of 16 short CVE descriptions is nowhere near 10K tokens,
// but 16 long GOV.UK guidance pages comfortably blows past it.
const TARGET_TOKENS_PER_BATCH = 8_000
const MAX_DOCS_PER_BATCH = 40
const CHARS_PER_TOKEN_ESTIMATE = 4
const MIN_MS_BETWEEN_REQUESTS = 21_000
const MAX_RETRIES = 5
const API_KEY = process.env.VOYAGE_API_KEY

if (!API_KEY) {
  console.error('VOYAGE_API_KEY is not set. Put it in .env.local and run: npm run embed')
  process.exit(1)
}

// Greedily fills each batch up to TARGET_TOKENS_PER_BATCH (estimated from
// text length) or MAX_DOCS_PER_BATCH docs, whichever comes first.
function batchByTokenBudget(docs, textOf) {
  const batches = []
  let current = []
  let currentTokens = 0
  for (const doc of docs) {
    const tokens = Math.ceil(textOf(doc).length / CHARS_PER_TOKEN_ESTIMATE)
    if (current.length > 0 && (currentTokens + tokens > TARGET_TOKENS_PER_BATCH || current.length >= MAX_DOCS_PER_BATCH)) {
      batches.push(current)
      current = []
      currentTokens = 0
    }
    current.push(doc)
    currentTokens += tokens
  }
  if (current.length > 0) batches.push(current)
  return batches
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function embedBatch(texts, attempt = 1) {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      input: texts,
      model: MODEL,
      input_type: 'document',
    }),
  })
  if (res.status === 429 && attempt <= MAX_RETRIES) {
    const retryAfter = Number(res.headers.get('retry-after'))
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 20_000 * attempt
    console.log(`  rate limited, waiting ${Math.round(waitMs / 1000)}s before retry ${attempt}/${MAX_RETRIES}...`)
    await sleep(waitMs)
    return embedBatch(texts, attempt + 1)
  }
  if (!res.ok) {
    throw new Error(`Voyage API request failed: ${res.status} ${res.statusText} — ${await res.text()}`)
  }
  const json = await res.json()
  return json.data.map((d) => d.embedding)
}

async function main() {
  const corpus = JSON.parse(await readFile(path.join(DATA_DIR, 'corpus.json'), 'utf-8'))
  console.log(`Embedding ${corpus.length} documents with ${MODEL}...`)

  const textOf = (d) => `${d.title}\n\n${d.description}`
  const batches = batchByTokenBudget(corpus, textOf)
  console.log(`Split into ${batches.length} token-budget batches (target ~${TARGET_TOKENS_PER_BATCH} tokens each).`)
  const entries = []
  for (let i = 0; i < batches.length; i++) {
    const requestStart = Date.now()
    const batch = batches[i]
    const texts = batch.map(textOf)
    const vectors = await embedBatch(texts)
    for (let j = 0; j < batch.length; j++) {
      entries.push({ id: batch[j].id, vector: vectors[j] })
    }
    console.log(`  batch ${i + 1}/${batches.length} done (${entries.length}/${corpus.length})`)

    const elapsed = Date.now() - requestStart
    const remainingWait = MIN_MS_BETWEEN_REQUESTS - elapsed
    if (i < batches.length - 1 && remainingWait > 0) await sleep(remainingWait)
  }

  await writeFile(path.join(DATA_DIR, 'embeddings.json'), JSON.stringify(entries))
  console.log(`Wrote data/${corpusId}/embeddings.json (${entries.length} vectors, dim=${entries[0]?.vector.length})`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
