// Server-side checks: the model's quotes are never trusted. Each one must appear, word for word, in the passage it cites.
// (The matching approach is reused from our TraceDesk project.)
import { STATUSES } from './prompt.js'

export class ModelOutputError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ModelOutputError'
  }
}

/** Lenient comparison form: unify quotes, dashes and width, collapse spaces, lowercase. */
export function normalizeForMatch(text) {
  return String(text)
    .normalize('NFKC')
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function findSpan(text, quote) {
  const q = normalizeForMatch(quote).replace(/[.\s]+$/, '')
  if (!q) return null
  // Map the match in the normalised text back to the original by walking both strings.
  const norm = normalizeForMatch(text)
  const at = norm.indexOf(q)
  if (at === -1) return null
  const direct = text.toLowerCase().indexOf(quote.trim().replace(/[.\s]+$/, '').toLowerCase())
  if (direct !== -1) return { start: direct, end: direct + quote.trim().replace(/[.\s]+$/, '').length }
  return null
}

export function verifyQuote({ source_id, quote }, chunkById) {
  const chunk = chunkById.get(source_id)
  const base = { source_id, quote }
  if (!chunk) return { ...base, verified: false, reason: 'unknown_source' }
  const details = { doc: chunk.doc, title: chunk.title, section: chunk.section, level: chunk.level ?? null, campus: chunk.campus ?? null, topic: chunk.topic ?? null, url: chunk.url, source_text: chunk.text }
  const q = normalizeForMatch(quote).replace(/[.\s]+$/, '')
  if (q.length < 3) return { ...base, ...details, verified: false, reason: 'empty_quote', span: null }
  if (!normalizeForMatch(chunk.text).includes(q)) return { ...base, ...details, verified: false, reason: 'quote_not_in_source', span: null }
  return { ...base, ...details, verified: true, reason: null, span: findSpan(chunk.text, quote) }
}

function assertShape(p) {
  const problems = []
  if (!p || typeof p !== 'object') problems.push('not an object')
  else {
    if (!STATUSES.includes(p.status)) problems.push('bad status')
    for (const k of ['answer', 'missing_info', 'clarifying_question']) if (typeof p[k] !== 'string') problems.push(`${k} not a string`)
    for (const k of ['points', 'citations']) if (!Array.isArray(p[k])) problems.push(`${k} not a list`)
  }
  if (problems.length) throw new ModelOutputError(`Model output failed validation: ${problems.join(', ')}`)
}

/**
 * Verify every quote. An answer with no verified quote at all is withheld; the criteria an answer rests on
 * are taken from its verified sources, never from the model's own words.
 */
export function checkAnswer(parsed, chunkById) {
  assertShape(parsed)
  const seen = new Set()
  const citations = []
  for (const c of parsed.citations) {
    const key = `${c.source_id}|${normalizeForMatch(c.quote)}`
    if (seen.has(key)) continue
    seen.add(key)
    citations.push(verifyQuote(c, chunkById))
  }
  const points = parsed.points.filter((p) => p.text?.trim()).map((p) => ({ text: p.text.trim(), ...verifyQuote(p, chunkById) }))
  const verified = [...citations, ...points].filter((x) => x.verified)
  let status = parsed.status
  if (status === 'answered' && verified.length === 0) status = 'withheld'
  // The sources an answer rests on (one entry per page), taken from verified quotes only.
  const criteria = [...new Map(verified.map((v) => [v.doc, { id: v.doc, title: v.title, level: v.level ?? null, campus: v.campus ?? null, topic: v.topic ?? null, url: v.url }])).values()]
  return {
    status,
    model_status: parsed.status,
    answer: parsed.answer.trim(),
    points,
    citations,
    criteria,
    missing_info: parsed.missing_info.trim(),
    clarifying_question: parsed.clarifying_question.trim(),
    checks: {
      quotes_total: citations.length + points.length,
      quotes_verified: verified.length,
      withheld: status === 'withheld',
    },
  }
}
