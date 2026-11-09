// Shapes returned by ../server.js. Kept in one place so a server change shows up as a type error here.

export type Status = 'answered' | 'not_covered' | 'needs_clarification' | 'withheld'
/** A campus code the server knows; 'all' marks a page that applies at every campus. */
export type CampusCode = 'all' | 'au' | 'my' | 'id'
/** Who wrote the answer: the model (needs a key) or the local engine (sentences chosen by a local model, no API). */
export type EngineName = 'model' | 'local'

export interface ApiError {
  code: string
  message: string
  retryable?: boolean
}

export interface CorpusMeta {
  source: string
  commit: string
  fetched?: string[]
  documents: number
  chunks: number
  license: string
  notice: string
  campuses?: Record<string, string>
  topics?: Record<string, string>
}

export interface StatusInfo {
  model_configured: boolean
  model: string
  corpus: CorpusMeta
  retrieval: {
    method: string
    candidates: number
    context: number
    max_context: number
    embed_model: string
    rerank_model: string
    chunk_size: number
    chunk_overlap: number
  }
  campuses: Record<string, string>
  topics: Record<string, string>
  engines?: Record<EngineName, boolean>
}

/** A quote the model gave, after the server looked for it in the passage it cites. */
export interface Quote {
  source_id: string
  quote: string
  verified: boolean
  reason: 'unknown_source' | 'empty_quote' | 'quote_not_in_source' | null
  doc?: string
  title?: string
  section?: string
  level?: string | null
  campus?: CampusCode | null
  topic?: string | null
  url?: string
  source_text?: string
  span?: { start: number; end: number } | null
}

export interface Point extends Quote {
  text: string
}

export interface TraceChunk {
  id: string
  doc: string
  title: string
  section: string
  level: string | null
  campus: CampusCode | null
  topic: string | null
  url: string
  retrieval_rank: number | null
  rerank_score: number | null
  why: 'retrieved' | 'rule text of a retrieved document'
}

export interface Trace {
  method: string
  campus: CampusCode | null
  /** The text that was searched: the question, or its English rendering. */
  query: string
  translated_from: string | null
  candidates: number
  ms: { translate?: number; retrieve: number; rerank: number }
  chunks: TraceChunk[]
}

/** A page (in another corpus, a rule) an answer rests on, taken from verified quotes only. */
export interface SourceDoc {
  id: string
  title: string
  level: string | null
  campus: CampusCode | null
  topic: string | null
  url: string
}

/** The email the reader could send when the pages do not answer: a template, with a documented address when the pages give one. */
export interface EmailDraft {
  to: string
  to_source: { source_id: string; title: string; url?: string } | null
  subject: string
  body: string
  mailto: string
  note: string
}

export interface AnswerResult {
  status: Status
  model_status: Exclude<Status, 'withheld'>
  answer: string
  points: Point[]
  citations: Quote[]
  criteria: SourceDoc[]
  missing_info: string
  clarifying_question: string
  checks: { quotes_total: number; quotes_verified: number; withheld: boolean }
  trace: Trace
  email?: EmailDraft
  meta: {
    prompt_version: string
    engine?: EngineName
    campus: CampusCode | null
    corpus: string
    model_requested: string
    model_served: string
    effort: string
    latency_ms: number
    retrieval_ms: number
    stop_reason: string
    usage: { input_tokens: number | null; output_tokens: number | null }
    sentence_scores?: { id: string; score: number }[]
  }
}

export interface LibraryDoc {
  id: string
  title: string
  campus: CampusCode
  topic: string
  url: string
  fetched: string
  words: number
  chunks: number
}

export interface Library {
  meta: CorpusMeta & { built_at: string; embed_model: string; chunk_size: number; chunk_overlap: number }
  documents: LibraryDoc[]
}

export interface Gaps {
  questions: number
  answered: number
  gaps: { question: string; asked: number; last: string; missing_info: string }[]
}

export interface QualityRow {
  method: string
  lang: 'en' | 'zh' | 'all'
  n: number
  hit1: number
  hit3: number
  hit5: number
  mrr: number
}

export interface Quality {
  file?: string
  summary: QualityRow[]
}
