// Key facts: the numbers in the answer sentence that the verified quotes back up.
// A number is marked only when its digits appear in a verified quote (or it is a criterion the answer rests on),
// so a figure the model made up is never emphasised.

export interface Span {
  start: number
  end: number
}

const SC = /\b\d\.\d\.\d{1,2}\b/g
// A measure: a number, an optional "by"/"×" pair, and an optional unit in English or Chinese.
const MEASURE = /\d+(?:[.,]\d+)?(?:\s*(?:by|×|x)\s*\d+(?:[.,]\d+)?)?(?:\s*(?:CSS\s*pixels?|pixels?|px|%|:\s?1|seconds?|minutes?|hours?|ms|毫秒|秒|分钟|小时|CSS\s*像素|像素|倍))?/gi
const UNIT = /(?:pixels?|px|%|:\s?1|seconds?|minutes?|hours?|ms|毫秒|秒|分钟|小时|像素|倍)\s*$/i

export function keyFactSpans(text: string, quotes: string[], criteria: string[]): Span[] {
  const hay = quotes.join('\n').toLowerCase()
  const spans: Span[] = []
  const take = (start: number, end: number) => {
    if (!spans.some((s) => start < s.end && end > s.start)) spans.push({ start, end })
  }
  for (const m of text.matchAll(SC)) if (criteria.includes(m[0])) take(m.index, m.index + m[0].length)
  for (const m of text.matchAll(MEASURE)) {
    const found = m[0].trim()
    const nums = found.match(/\d+(?:[.,]\d+)?/g) ?? []
    // A bare one-digit number ("2 points") is not a fact worth marking; a unit or two digits is.
    if (!UNIT.test(found) && found.replace(/\D/g, '').length < 2) continue
    if (nums.length && nums.every((n) => hay.includes(n))) take(m.index, m.index + found.length)
  }
  return spans.sort((a, b) => a.start - b.start)
}
