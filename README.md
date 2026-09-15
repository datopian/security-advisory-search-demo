# Security Advisory Search — Demo

Public sales demo: ask a plain-language question about recent CVE advisories
and get a synthesized, cited answer, with a simulated role toggle that
changes which advisories are visible.

See the build spec and internal notes in the `sales` repo at
`docs/poc-demos/security-knowledge-search-demo-spec.md` and
`docs/poc-demos/security-knowledge-search-demo-notes.md`.

## Local development

```
npm install
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY and VOYAGE_API_KEY
npm run ingest                # re-fetch the CVE corpus from NVD (optional, already committed)
npm run embed                 # recompute embeddings (optional, already committed)
npm run dev
```
