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
// and 10K tokens/min. Small batches + fixed pacing keep us under both caps
// without needing a card on file (the free 200M-token allowance still
// applies either way).
const BATCH_SIZE = 16
const MIN_MS_BETWEEN_REQUESTS = 21_000
const MAX_RETRIES = 5
const API_KEY = process.env.VOYAGE_API_KEY

if (!API_KEY) {
  console.error('VOYAGE_API_KEY is not set. Put it in .env.local and run: npm run embed')
  process.exit(1)
}

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
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

  const batches = chunk(corpus, BATCH_SIZE)
  const entries = []
  for (let i = 0; i < batches.length; i++) {
    const requestStart = Date.now()
    const batch = batches[i]
    const texts = batch.map((d) => `${d.title}\n\n${d.description}`)
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
