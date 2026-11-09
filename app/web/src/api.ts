// A thin client over the server's JSON API. (The error-wrapping pattern is reused from our TraceDesk project.)
// Built with VITE_STATIC=1 (the GitHub Pages demo), it reads the JSON that scripts/export-static.js wrote instead,
// and serves the stored real answers for the example questions; any other question gets a 'static_demo' error.
import type { AnswerResult, ApiError, Gaps, Library, Quality, StatusInfo, Trace } from './types'

export const IS_STATIC = import.meta.env.VITE_STATIC === '1'
const STATIC_BASE = `${import.meta.env.BASE_URL}static/`

export class RequestError extends Error {
  info: ApiError
  constructor(info: ApiError) {
    super(info.message)
    this.info = info
  }
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch {
    throw new RequestError({ code: 'network', message: 'network', retryable: true })
  }
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    /* not JSON */
  }
  const err = (body as { error?: ApiError } | null)?.error
  if (!res.ok || err) throw new RequestError(err ?? { code: 'generic', message: `HTTP ${res.status}`, retryable: true })
  return body as T
}

interface StaticIndex {
  generated: string
  questions: { q: string; key: string; lang: string; file: string }[]
}
/** The same normalisation scripts/export-static.js used when it wrote the index. */
const keyOf = (q: string) => q.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[?？。.!！\s]+$/, '')
let index: Promise<StaticIndex> | null = null

async function askStatic(question: string): Promise<AnswerResult> {
  index ??= call<StaticIndex>(`${STATIC_BASE}answers/index.json`)
  const entry = (await index).questions.find((e) => e.key === keyOf(question))
  if (!entry) throw new RequestError({ code: 'static_demo', message: 'static demo', retryable: false })
  return call<AnswerResult>(`${STATIC_BASE}${entry.file}`)
}

export const api = IS_STATIC
  ? {
      status: () => call<StatusInfo>(`${STATIC_BASE}status.json`),
      ask: askStatic,
      search: (q: string) => call<Trace>(`/api/search?q=${encodeURIComponent(q)}`),
      library: () => call<Library>(`${STATIC_BASE}library.json`),
      gaps: () => call<Gaps>(`${STATIC_BASE}gaps.json`),
      quality: () => call<Quality>(`${STATIC_BASE}quality.json`),
    }
  : {
      status: () => call<StatusInfo>('/api/status'),
      ask: (question: string) =>
        call<AnswerResult>('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) }),
      search: (q: string) => call<Trace>(`/api/search?q=${encodeURIComponent(q)}`),
      library: () => call<Library>('/api/library'),
      gaps: () => call<Gaps>('/api/gaps'),
      quality: () => call<Quality>('/api/quality'),
    }
