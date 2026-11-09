// Shapes returned by ../server.js. Kept in one place so a server change shows up as a type error here.

export type Status = 'answered' | 'not_covered' | 'needs_clarification' | 'withheld'

export interface ApiError {
  code: string
  message: string
  retryable?: boolean
}

export interface CorpusMeta {
  source: string
  commit: string
  documents: number
  chunks: number
  license: string
  notice: string
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
  level?: string
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
  level: string
  url: string
  retrieval_rank: number | null
  rerank_score: number | null
  why: 'retrieved' | 'rule text of a retrieved criterion'
}

export interface Trace {
  method: string
  candidates: number
  ms: { retrieve: number; rerank: number }
  chunks: TraceChunk[]
}

export interface AnswerResult {
  status: Status
  model_status: Exclude<Status, 'withheld'>
  answer: string
  points: Point[]
  citations: Quote[]
  criteria: { id: string; title: string; level: string }[]
  missing_info: string
  clarifying_question: string
  checks: { quotes_total: number; quotes_verified: number; withheld: boolean }
  trace: Trace
  meta: {
    prompt_version: string
    corpus: string
    model_requested: string
    model_served: string
    effort: string
    latency_ms: number
    retrieval_ms: number
    stop_reason: string
    usage: { input_tokens: number | null; output_tokens: number | null }
  }
}

export interface LibraryDoc {
  id: string
  title: string
  level: string
  guideline: string
  added_in: string
  obsolete: boolean
  url: string
  understanding_url: string
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
