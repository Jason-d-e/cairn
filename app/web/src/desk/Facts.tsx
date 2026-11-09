import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { keyFactSpans } from './keyFacts'
import { bareTitle } from './format'

/** A page or rule an answer rests on. */
export interface Source {
  id: string
  title?: string
  level?: string | null
  campus?: string | null
}

const RULE_ID = /^\d+(?:\.\d+)+$/

/**
 * The key facts as pills under the sentence: the pages the answer rests on first (title, and the campus
 * it applies to; a numbered rule shows its number and level), then every figure the sentence marks, each once.
 * The same detector as the marks, so nothing appears here that the verified quotes do not back up.
 */
export default function Facts({ text, quotes, criteria }: { text: string; quotes: string[]; criteria: Source[] }) {
  const { t } = useTranslation()
  const facts = useMemo(() => {
    const spans = keyFactSpans(text, quotes, criteria.map((c) => c.id))
    const seen = new Set<string>()
    const out: string[] = []
    for (const s of spans) {
      const value = text.slice(s.start, s.end).trim()
      if (RULE_ID.test(value)) continue
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
          {RULE_ID.test(c.id) && <span className="cn-code">{c.id}</span>}
          {c.title && <span className="cn-fact-title" lang="en">{bareTitle(c.title)}</span>}
          {c.level && <span className="cn-level-l">{c.level}</span>}
          {c.campus && <span className="cn-level-l">{t(`campus.names.${c.campus}`, { defaultValue: c.campus })}</span>}
        </li>
      ))}
      {facts.map((f) => (
        <li key={f} className="cn-fact">{f}</li>
      ))}
    </ul>
  )
}
