// Corpus registry: adding a new corpus means adding one entry here (plus an
// ingestion script under scripts/ and the two generated data files under
// data/<id>/) — retrieval, ranking, and UI code never hardcodes a topic.
export type CorpusId = 'security' | 'governance'

export const CORPUS_IDS: CorpusId[] = ['security', 'governance']

export interface CorpusDefinition {
  id: CorpusId
  /** Full page/heading label, e.g. "{Prospect} — {label}" */
  label: string
  /** What one document is called in prose, e.g. "security vulnerability report" */
  docNounSingular: string
  docNounPlural: string
  /** Hero heading, with the last word/phrase highlighted in the accent color */
  heroPrefix: string
  heroHighlight: string
  /** Ask-box placeholder */
  placeholder: string
  /** Where the corpus badge says the documents come from */
  sourceName: string
  /** Short phrase for the footer disclaimer: "public {topicLabel} data" */
  topicLabel: string
  /** Example questions shown in the empty state and as fallback suggestions */
  exampleQuestions: string[]
  /** Neutral default tagline shown under the header title */
  defaultTagline: string
}

export const CORPORA: Record<CorpusId, CorpusDefinition> = {
  security: {
    id: 'security',
    label: 'Threat Advisory Search',
    docNounSingular: 'security vulnerability report',
    docNounPlural: 'security vulnerability reports',
    heroPrefix: 'Ask a question about recent security',
    heroHighlight: 'advisories',
    placeholder: 'Ask about a security vulnerability or affected product...',
    sourceName: 'the National Vulnerability Database',
    topicLabel: 'security advisory',
    exampleQuestions: [
      'Which vulnerabilities affect remote access software this year?',
      'Are there any critical flaws in widely used content management systems?',
      'What advisories mention privilege escalation?',
      'Are there any critical vulnerabilities in networking equipment like routers?',
      'What flaws affect media or streaming server software?',
      'Are there any SQL injection vulnerabilities reported?',
    ],
    defaultTagline: 'Ask a plain-language question, get a cited answer.',
  },
  governance: {
    id: 'governance',
    label: 'Data Governance Guidance Search',
    docNounSingular: 'data governance guidance document',
    docNounPlural: 'data governance guidance documents',
    heroPrefix: 'Ask a question about public-sector data',
    heroHighlight: 'governance',
    placeholder: 'Ask about a data standard, policy, or governance practice...',
    sourceName: 'GOV.UK',
    topicLabel: 'data governance guidance',
    exampleQuestions: [
      'What guidance exists on improving data quality?',
      'How should we document data ownership and stewardship?',
      'What does good practice look like for data standards?',
      'Are there any guides on data ethics or responsible data use?',
      'What guidance covers publishing data as open data?',
      'How should teams handle data quality assurance processes?',
    ],
    defaultTagline: 'Ask a plain-language question, get a cited answer.',
  },
}

export function isCorpusId(value: string | undefined | null): value is CorpusId {
  return !!value && (CORPUS_IDS as string[]).includes(value)
}

export function getCorpus(id: CorpusId): CorpusDefinition {
  return CORPORA[id]
}
