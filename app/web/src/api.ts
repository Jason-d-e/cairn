// A thin client over the server's JSON API. (The error-wrapping pattern is reused from our TraceDesk project.)
import type { AnswerResult, ApiError, Gaps, Library, Quality, StatusInfo, Trace } from './types'

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

export const api = {
  status: () => call<StatusInfo>('/api/status'),
  ask: (question: string) =>
    call<AnswerResult>('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) }),
  search: (q: string) => call<Trace>(`/api/search?q=${encodeURIComponent(q)}`),
  library: () => call<Library>('/api/library'),
  gaps: () => call<Gaps>('/api/gaps'),
  quality: () => call<Quality>('/api/quality'),
}
