import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { keyFactSpans } from './keyFacts'
import { bareTitle } from './format'

export interface Criterion {
  id: string
  title?: string
  level?: string
}

const SC_ONLY = /^\d\.\d\.\d{1,2}$/

/**
 * The key facts as pills under the sentence: the success criteria first (number, level, name),
 * then every figure the sentence marks, each once. The same detector as the marks, so nothing
 * appears here that the verified quotes do not back up.
 */
export default function Facts({ text, quotes, criteria }: { text: string; quotes: string[]; criteria: Criterion[] }) {
  const { t } = useTranslation()
  const facts = useMemo(() => {
    const spans = keyFactSpans(text, quotes, criteria.map((c) => c.id))
    const seen = new Set<string>()
    const out: string[] = []
    for (const s of spans) {
      const value = text.slice(s.start, s.end).trim()
      if (SC_ONLY.test(value)) continue
      const key = value.toLowerCase().replace(/\s+/g, ' ')
      if (!seen.has(key)) {
        seen.add(key)
        out.push(value)
      }
    }
    return out
  }, [text, quotes, criteria])

  if (criteria.length === 0 && facts.length === 0) return null
  return (
    <ul className="cn-facts" aria-label={t('desk.facts')}>
      {criteria.map((c) => (
        <li key={c.id} className="cn-fact cn-fact--sc">
          <span className="cn-code">{c.id}</span>
          {c.level && <span className="cn-level-l">{c.level}</span>}
          {c.title && <span className="cn-fact-title" lang="en">{bareTitle(c.title)}</span>}
        </li>
      ))}
      {facts.map((f) => (
        <li key={f} className="cn-fact">{f}</li>
      ))}
    </ul>
  )
}
