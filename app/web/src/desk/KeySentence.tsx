import { useMemo, type ReactNode } from 'react'
import { keyFactSpans } from './keyFacts'

/** The bottom line with its backed-up numbers underlined in rust (a <mark>, so they also read as emphasis). */
export default function KeySentence({ text, quotes, criteria }: { text: string; quotes: string[]; criteria: string[] }) {
  const spans = useMemo(() => keyFactSpans(text, quotes, criteria), [text, quotes, criteria])
  if (!spans.length) return <>{text}</>
  const parts: ReactNode[] = []
  let at = 0
  spans.forEach((s, i) => {
    if (s.start > at) parts.push(<span key={`t${i}`}>{text.slice(at, s.start)}</span>)
    parts.push(<mark key={`m${i}`} className="cn-key">{text.slice(s.start, s.end)}</mark>)
    at = s.end
  })
  if (at < text.length) parts.push(<span key="tail">{text.slice(at)}</span>)
  return <>{parts}</>
}
