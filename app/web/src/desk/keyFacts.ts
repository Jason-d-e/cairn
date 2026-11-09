// Key facts: the numbers in the answer sentence that the verified quotes back up.
// A number is marked only when its digits appear in a verified quote (or it is a rule the answer rests on),
// so a figure the model made up is never emphasised. Times (11.55pm), days, dates, amounts and percentages
// all count; a bare one-digit number ("2 points") does not.

export interface Span {
  start: number
  end: number
}

const RULE = /\b\d\.\d\.\d{1,2}\b/g
const UNITS =
  'CSS\\s*pixels?|pixels?|px|%|:\\s?1|business\\s+days?|working\\s+days?|calendar\\s+days?|days?|weeks?|months?|years?|hours?|minutes?|seconds?|ms|am|pm|credit\\s+points?' +
  '|January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec' +
  '|毫秒|秒|分钟|小时|个?工作日|天|周|个月|年|点|日|月|学分|CSS\\s*像素|像素|倍'
const CURRENCY = '(?:RM|MYR|AUD|A\\$|US\\$|USD|IDR|Rp|\\$)'
// A measure: an optional currency, a number (12, 11.55, 11:55, 1,000), an optional "by" pair, an optional unit not followed by more letters.
const MEASURE = new RegExp(`${CURRENCY}?\\s*\\d+(?:[.,:]\\d+)*(?:\\s*(?:by|×|x)\\s*\\d+(?:[.,:]\\d+)*)?(?:\\s*(?:${UNITS})(?![A-Za-z]))?`, 'gi')
const HAS_UNIT = new RegExp(`(?:${UNITS})\\s*$`, 'i')
const HAS_CURRENCY = new RegExp(`^${CURRENCY}`, 'i')

/** "11:55", "11.55" and "1,000" compare as the same digits. */
const norm = (s: string) => s.replace(/(\d)[,:](\d)/g, '$1.$2')

export function keyFactSpans(text: string, quotes: string[], rules: string[]): Span[] {
  const hay = norm(quotes.join('\n').toLowerCase())
  const spans: Span[] = []
  const take = (start: number, end: number) => {
    if (!spans.some((s) => start < s.end && end > s.start)) spans.push({ start, end })
  }
  for (const m of text.matchAll(RULE)) if (rules.includes(m[0])) take(m.index, m.index + m[0].length)
  for (const m of text.matchAll(MEASURE)) {
    const found = m[0].trim()
    if (!found) continue
    const nums = found.match(/\d+(?:[.,:]\d+)*/g) ?? []
    if (!HAS_UNIT.test(found) && !HAS_CURRENCY.test(found) && found.replace(/\D/g, '').length < 2) continue
    if (nums.length && nums.every((n) => hay.includes(norm(n)))) {
      const start = m.index + m[0].indexOf(found)
      take(start, start + found.length)
    }
  }
  return spans.sort((a, b) => a.start - b.start)
}
