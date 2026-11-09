// A thin client over the server's JSON API. (The error-wrapping pattern is reused from our TraceDesk project.)
// Built with VITE_STATIC=1 (the GitHub Pages demo), it reads the JSON that scripts/export-static.js wrote instead,
// and serves the stored real answers for the example questions (one per engine); any other question gets a 'static_demo' error.
import type { AnswerResult, ApiError, Gaps, Library, Quality, StatusInfo, Trace } from './types'
import type { Campus } from './campus'
import type { Engine } from './engine'

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
  questions: { q: string; key: string; lang: string; campus: string; engine?: string; file: string }[]
}
/** The same normalisation scripts/export-static.js used when it wrote the index. */
const keyOf = (q: string) => q.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[?？。.!！\s]+$/, '')
let index: Promise<StaticIndex> | null = null

/** The stored answer for this question, campus and engine; failing that, the nearest recorded one for the same question. */
async function askStatic(question: string, campus: Campus, engine: Engine): Promise<AnswerResult> {
  index ??= call<StaticIndex>(`${STATIC_BASE}answers/index.json`)
  const list = (await index).questions
  const key = keyOf(question)
  const entry =
    list.find((e) => e.key === key && e.campus === campus && (e.engine ?? 'model') === engine) ??
    list.find((e) => e.key === key && (e.engine ?? 'model') === engine) ??
    list.find((e) => e.key === key)
  if (!entry) throw new RequestError({ code: 'static_demo', message: 'static demo', retryable: false })
  return call<AnswerResult>(`${STATIC_BASE}${entry.file}`)
}

const searchUrl = (q: string, campus?: Campus | null) => `/api/search?q=${encodeURIComponent(q)}${campus ? `&campus=${campus}` : ''}`

export const api = IS_STATIC
  ? {
      status: () => call<StatusInfo>(`${STATIC_BASE}status.json`),
      ask: askStatic,
      search: (q: string, campus?: Campus | null) => call<Trace>(searchUrl(q, campus)),
      library: () => call<Library>(`${STATIC_BASE}library.json`),
      gaps: () => call<Gaps>(`${STATIC_BASE}gaps.json`),
      quality: () => call<Quality>(`${STATIC_BASE}quality.json`),
    }
  : {
      status: () => call<StatusInfo>('/api/status'),
      ask: (question: string, campus: Campus, engine: Engine) =>
        call<AnswerResult>('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, campus, engine }) }),
      search: (q: string, campus?: Campus | null) => call<Trace>(searchUrl(q, campus)),
      library: () => call<Library>('/api/library'),
      gaps: () => call<Gaps>('/api/gaps'),
      quality: () => call<Quality>('/api/quality'),
    }
