import { useTranslation } from 'react-i18next'
import type { AnswerResult } from '../types'
import { useStatus } from '../status'
import { bareTitle } from './format'

const EMBED_DIM = 384
const short = (model = '') => model.replace(/^Xenova\//, '')

/** The route this answer took: six steps hung on a rule, then every passage the model was given. */
export default function TracePanel({ result }: { result: AnswerResult }) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { trace, checks, meta } = result
  const quoted = new Set([...result.points, ...result.citations].filter((q) => q.verified).map((q) => q.source_id))
  const kept = trace.chunks.filter((c) => c.why === 'retrieved').length
  const embed = short(status?.retrieval.embed_model ?? 'multilingual-e5-small')
  const reranker = short(status?.retrieval.rerank_model ?? 'bge-reranker-base')

  const steps = [
    { title: t('trace.steps.question.title'), text: t('trace.steps.question.text', { model: embed, dim: EMBED_DIM }) },
    { title: t('trace.steps.library.title', { chunks: status?.corpus.chunks ?? '…' }), text: t('trace.steps.library.text', { docs: status?.corpus.documents ?? '…' }) },
    { title: t('trace.steps.found.title', { n: trace.candidates }), text: t('trace.steps.found.text', { ms: trace.ms.retrieve }) },
    { title: t('trace.steps.kept.title', { n: kept }), text: t('trace.steps.kept.text', { model: reranker, ms: trace.ms.rerank }) },
    { title: t('trace.steps.written.title'), text: t('trace.steps.written.text', { model: meta.model_served }) },
    { title: t('trace.steps.checked.title'), text: t('trace.steps.checked.text', { verified: checks.quotes_verified, total: checks.quotes_total }) },
  ]

  let rank = 0
  return (
    <details className="cn-trace">
      <summary>
        <span className="cn-label">{t('desk.sections.trace')}</span>
        <span className="small">{t('trace.summary', { candidates: trace.candidates, kept, verified: checks.quotes_verified, total: checks.quotes_total })}</span>
      </summary>
      <ol className="cn-map">
        {steps.map((s, i) => (
          <li key={i}>
            <span className="cn-map-t">{s.title}</span>
            <span className="cn-map-s">{s.text}</span>
          </li>
        ))}
      </ol>
      <div className="cn-scroll" tabIndex={0} role="region" aria-label={t('trace.heads.passage')}>
        <table className="cn-table cn-tracetable">
          <thead>
            <tr>
              <th scope="col" className="num">{t('trace.heads.rank')}</th>
              <th scope="col">{t('trace.heads.passage')}</th>
              <th scope="col" className="num">{t('trace.heads.score')}</th>
              <th scope="col" className="cn-hide-s">{t('trace.heads.why')}</th>
            </tr>
          </thead>
          <tbody>
            {trace.chunks.map((c) => {
              const retrieved = c.why === 'retrieved'
              if (retrieved) rank += 1
              const isQuoted = quoted.has(c.id)
              return (
                <tr key={c.id} data-on={isQuoted}>
                  <td className="cn-code num">{retrieved ? rank : '—'}</td>
                  <td>
                    <a className="cn-link" href={c.url} rel="noreferrer">
                      <span className="cn-code" data-quoted={isQuoted}>{c.doc}</span>{' '}
                      <span lang="en">{bareTitle(c.title)} · {c.section}</span>
                    </a>
                    {isQuoted && <span className="visually-hidden">, {t('trace.quoted')}</span>}
                  </td>
                  <td className="cn-code num">{c.rerank_score == null ? '—' : c.rerank_score.toFixed(2)}</td>
                  <td className="small cn-hide-s">{retrieved ? t('trace.why.retrieved') : t('trace.why.rule')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </details>
  )
}
