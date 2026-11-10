import { useTranslation } from 'react-i18next'
import { IconBan, IconCheck, IconExternalLink, IconFileSearch, IconHelpCircle } from '@tabler/icons-react'
import type { AnswerResult, Quote } from '../types'
import KeySentence from './KeySentence'
import Facts from './Facts'
import TracePanel from './TracePanel'
import EmailCard from './EmailCard'
import { bareTitle } from './format'

export { bareTitle }

const ICONS = { answered: IconCheck, withheld: IconBan, not_covered: IconFileSearch, needs_clarification: IconHelpCircle }

/** Where a quote comes from: the page and its section, the campus it applies to, the check, the link. */
function SourceLine({ q }: { q: Quote }) {
  const { t } = useTranslation()
  return (
    <p className="cn-source">
      <span className="cn-code" lang="en">{bareTitle(q.title)}</span>
      {q.section && q.section !== q.title && <span lang="en">{q.section}</span>}
      {q.level && <span>{t('desk.level', { level: q.level })}</span>}
      {q.campus && <span>{t('campus.appliesTo', { campus: t(`campus.names.${q.campus}`, { defaultValue: q.campus }) })}</span>}
      <span className="cn-tag" data-ok={q.verified}>{q.verified ? t('desk.quote.verified') : t('desk.quote.failed')}</span>
      {q.url && (
        <a className="cn-link" href={q.url} rel="noreferrer">
          {t('desk.quote.read')} <IconExternalLink size={12} aria-hidden style={{ verticalAlign: '-1px' }} />
        </a>
      )}
    </p>
  )
}

function Passage({ q }: { q: Quote }) {
  const { t } = useTranslation()
  if (!q.source_text) return null
  const text = q.source_text
  return (
    <details className="cn-passage">
      <summary>{t('desk.quote.passage')}</summary>
      {q.span ? (
        <p lang="en">
          {text.slice(0, q.span.start)}
          <mark>{text.slice(q.span.start, q.span.end)}</mark>
          {text.slice(q.span.end)}
        </p>
      ) : (
        <p lang="en">{text}</p>
      )}
    </details>
  )
}

/** A quote in English with its source line; the whole passage behind a native disclosure. */
function QuoteBlock({ q }: { q: Quote }) {
  return (
    <div className="cn-quotebox" data-ok={q.verified}>
      <blockquote lang="en" className="cn-quote" cite={q.url}>
        <p>{q.verified ? <mark>{q.quote}</mark> : q.quote}</p>
      </blockquote>
      <SourceLine q={q} />
      <Passage q={q} />
    </div>
  )
}

/**
 * The answer, in reading order: the question (the card's heading), its status and the campus it was answered for;
 * the bottom line with its key figures marked; the points; then how it was made.
 *
 * The model writes in the reader's language, so each of its sentences sits over the page's sentence it rests on.
 * The local engine answers with the page's own sentences, so each is shown once, with its source line beneath:
 * never the same sentence twice.
 */
export default function AnswerCard({ question, result }: { question: string; result: AnswerResult }) {
  const { t } = useTranslation()
  const Icon = ICONS[result.status]
  const local = result.meta.engine === 'local'
  // A question back to the reader stands alone: no quotes under it.
  const asking = result.status === 'needs_clarification'
  const all = asking ? [] : [...result.points, ...result.citations]
  const verifiedQuotes = all.filter((q) => q.verified).map((q) => q.quote)
  const okPoints = asking ? [] : result.points.filter((p) => p.verified)
  const okCitations = asking ? [] : result.citations.filter((c) => c.verified)
  // A citation is shown once: not again when it is the bottom line itself, or the sentence already quoted under a point.
  const underPoint = (c: Quote) => okPoints.some((p) => p.source_id === c.source_id && (p.quote.includes(c.quote) || c.quote.includes(p.quote)))
  const moreCitations = okCitations.filter((c) => c.quote !== result.answer && !underPoint(c))
  const own = okCitations.find((c) => c.quote === result.answer)
  // Quotes that failed the check are shown where they matter: beside an answer, or to explain a withheld one.
  const failed = result.status === 'answered' || result.status === 'withheld' ? all.filter((q) => !q.verified) : []
  const sourceIds = result.criteria.map((c) => c.id)
  const campus = result.meta.campus ? t(`campus.names.${result.meta.campus}`, { defaultValue: result.meta.campus }) : null

  return (
    <article className="cn-card cn-answercard" aria-labelledby="answer-q">
      <header className="cn-answerhead">
        <h2 className="cn-asked" id="answer-q">{question}</h2>
        <p className="cn-status" data-status={result.status}>
          <Icon size={18} aria-hidden /> {t(`desk.status.${result.status}`)}
          {campus && <span className="cn-forcampus">{t('campus.answeredFor', { campus })}</span>}
          <span className="cn-tag cn-engine-tag">{t(`engine.badge.${result.meta.engine ?? 'model'}`)}</span>
        </p>
      </header>

      {result.status === 'needs_clarification' ? (
        <section>
          <h3 className="cn-label">{t('desk.sections.clarify')}</h3>
          <p className="cn-bottom">{result.clarifying_question || result.answer}</p>
        </section>
      ) : result.status === 'withheld' ? (
        <section>
          <h3 className="cn-label">{t('desk.sections.answer')}</h3>
          <p className="cn-hint">{t('desk.statusHint.withheld')}</p>
        </section>
      ) : result.status === 'not_covered' ? (
        <section>
          {/* The model says what the pages leave out; the local engine can only point to the closest page. */}
          <h3 className="cn-label">{t(local && result.missing_info ? 'desk.sections.closest' : 'desk.sections.missing')}</h3>
          <p className="cn-hint">{result.missing_info || result.answer || t('desk.statusHint.not_covered')}</p>
        </section>
      ) : own ? (
        <section>
          <h3 className="cn-label">{t('desk.sections.answerLocal')}</h3>
          <p className="cn-bottom" lang="en">
            <KeySentence text={result.answer} quotes={verifiedQuotes} criteria={sourceIds} />
          </p>
          <SourceLine q={own} />
          <Passage q={own} />
        </section>
      ) : (
        <section>
          <h3 className="cn-label">{t('desk.sections.answer')}</h3>
          <p className="cn-bottom">
            <KeySentence text={result.answer} quotes={verifiedQuotes} criteria={sourceIds} />
          </p>
          <Facts text={result.answer} quotes={verifiedQuotes} criteria={result.criteria} />
        </section>
      )}

      {okPoints.length > 0 && (
        <section>
          <h3 className="cn-label">{t(local ? 'desk.sections.pointsLocal' : 'desk.sections.points')}</h3>
          <ol className="cn-steps">
            {okPoints.map((p, i) => (
              <li key={`${p.source_id}-${i}`} className="cn-step">
                <span className="cn-step-n" aria-hidden>{i + 1}</span>
                {p.text === p.quote ? (
                  <div className="cn-step-body">
                    <p className="cn-step-text" lang="en">{p.quote}</p>
                    <SourceLine q={p} />
                    <Passage q={p} />
                  </div>
                ) : (
                  <div className="cn-step-body">
                    <p className="cn-step-text">{p.text}</p>
                    <QuoteBlock q={p} />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {moreCitations.length > 0 && (
        <section>
          <h3 className="cn-label">{t('desk.sections.citations')}</h3>
          <div className="cn-cites">
            {moreCitations.map((c, i) => <QuoteBlock key={`${c.source_id}-${i}`} q={c} />)}
          </div>
        </section>
      )}

      {failed.length > 0 && (
        <section>
          <h3 className="cn-label">{t('desk.sections.failed')}</h3>
          <div className="cn-cites">
            {failed.map((c, i) => <QuoteBlock key={`bad-${i}`} q={c} />)}
          </div>
        </section>
      )}

      {result.email && <EmailCard email={result.email} />}

      <TracePanel result={result} />

      <footer className="cn-answerfoot small">
        {all.length > 0 && (result.status === 'answered' || result.status === 'withheld') && (
          <>
            {t('desk.checks', { verified: result.checks.quotes_verified, total: result.checks.quotes_total })}
            {' · '}
          </>
        )}
        {t(local ? 'desk.timingLocal' : 'desk.timing', { retrieval: result.meta.retrieval_ms, model: result.meta.latency_ms })}
        {!local && (
          <>
            {' · '}
            <span className="cn-code">{result.meta.model_served}</span>
          </>
        )}
      </footer>
    </article>
  )
}
