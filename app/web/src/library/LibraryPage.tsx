import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SegmentedControl, TextInput } from '@mantine/core'
import { IconExternalLink } from '@tabler/icons-react'
import Shell from '../components/Shell'
import { api } from '../api'
import { getCampus } from '../campus'
import type { Gaps, Library } from '../types'

const CAMPUS_FILTERS = ['all', 'au', 'my', 'id'] as const
const TOPIC_ORDER = ['special-consideration', 'exams', 'withdrawal', 'dates', 'disability', 'contacts']

/** The pages the desk knows, grouped by topic, filtered by the campus they apply to; then the questions it could not answer. */
export default function LibraryPage() {
  const { t, i18n } = useTranslation()
  const [lib, setLib] = useState<Library | null>(null)
  const [gaps, setGaps] = useState<Gaps | null>(null)
  const [campus, setCampus] = useState<string>(getCampus() ?? 'all')
  const [q, setQ] = useState('')

  useEffect(() => {
    api.library().then(setLib).catch(() => setLib(null))
    api.gaps().then(setGaps).catch(() => setGaps(null))
  }, [])
  useEffect(() => {
    document.title = `${t('app.nav.library')} · Cairn`
  }, [t])

  const needle = q.trim().toLowerCase()
  const docs = (lib?.documents ?? []).filter((d) => (campus === 'all' || d.campus === 'all' || d.campus === campus) && (!needle || d.title.toLowerCase().includes(needle)))
  const topics = [...TOPIC_ORDER, ...Object.keys(lib?.meta.topics ?? {}).filter((k) => !TOPIC_ORDER.includes(k))]
  const groups = topics.map((topic) => ({ topic, docs: docs.filter((d) => d.topic === topic) })).filter((g) => g.docs.length)
  const topicName = (topic: string) => t(`library.topics.${topic}`, { defaultValue: lib?.meta.topics?.[topic] ?? topic })
  const campusName = (c: string) => t(`campus.names.${c}`, { defaultValue: c })
  const locale = i18n.language === 'zh' ? 'zh-CN' : 'en-GB'
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <Shell page="library">
      <div className="cn-page-head">
        <h1 className="cn-h1">{t('library.title')}</h1>
        {lib && <p className="lead">{t('library.lead', { docs: lib.meta.documents, chunks: lib.meta.chunks, commit: fmt(lib.meta.commit) })}</p>}
      </div>

      <div className="cn-filters">
        <SegmentedControl
          value={campus}
          onChange={setCampus}
          data={CAMPUS_FILTERS.map((v) => ({ value: v, label: campusName(v) }))}
          aria-label={t('campus.label')}
        />
        <TextInput className="cn-search" value={q} onChange={(e) => setQ(e.currentTarget.value)} placeholder={t('library.search')} aria-label={t('library.search')} />
        <span className="small num" aria-live="polite">{t('library.count', { n: docs.length })}</span>
      </div>

      {lib && docs.length === 0 && <p>{t('library.none')}</p>}
      {docs.length > 0 && (
        <div className="cn-scroll" tabIndex={0} role="region" aria-label={t('library.title')}>
          <table className="cn-table cn-lib">
            <thead>
              <tr>
                <th scope="col">{t('library.heads.title')}</th>
                <th scope="col">{t('library.heads.campus')}</th>
                <th scope="col" className="num">{t('library.heads.passages')}</th>
                <th scope="col" className="cn-hide-s num">{t('library.heads.words')}</th>
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.topic}>
                <tr className="cn-group">
                  <th scope="rowgroup" colSpan={4}>{topicName(g.topic)}</th>
                </tr>
                {g.docs.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <a className="cn-link" href={d.url} rel="noreferrer" aria-label={t('library.open', { title: d.title })} lang="en">
                        {d.title} <IconExternalLink size={12} aria-hidden style={{ verticalAlign: '-1px' }} />
                      </a>
                    </td>
                    <td><span className="cn-level-l">{campusName(d.campus)}</span></td>
                    <td className="cn-code num">{d.chunks}</td>
                    <td className="cn-code num cn-hide-s">{d.words}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
      {lib && <p className="small" style={{ marginTop: 'var(--space-md)', maxWidth: '72ch' }}>{t('library.built', { date: fmt(lib.meta.built_at), commit: fmt(lib.meta.commit) })}</p>}

      <section className="cn-section" aria-labelledby="gaps-title" id="gaps">
        <div className="cn-page-head" style={{ marginBottom: 0 }}>
          <h2 id="gaps-title" className="cn-h2">{t('library.gaps.title')}</h2>
          <p className="lead">{t('library.gaps.lead')}</p>
          {gaps && <p className="small num">{t('library.gaps.stats', { questions: gaps.questions, answered: gaps.answered })}</p>}
        </div>
        {gaps && gaps.gaps.length === 0 && <p>{t('library.gaps.empty')}</p>}
        {gaps && gaps.gaps.length > 0 && (
          <div className="cn-scroll" tabIndex={0} role="region" aria-label={t('library.gaps.title')}>
            <table className="cn-table">
              <thead>
                <tr>
                  <th scope="col">{t('library.gaps.heads.question')}</th>
                  <th scope="col" className="num">{t('library.gaps.heads.asked')}</th>
                  <th scope="col" className="cn-hide-s">{t('library.gaps.heads.missing')}</th>
                  <th scope="col" className="cn-hide-s">{t('library.gaps.heads.last')}</th>
                </tr>
              </thead>
              <tbody>
                {gaps.gaps.map((g) => (
                  <tr key={g.question}>
                    <td>{g.question}</td>
                    <td className="cn-code num">{g.asked}</td>
                    <td className="small cn-hide-s">{g.missing_info}</td>
                    <td className="small cn-hide-s num">{fmt(g.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Shell>
  )
}
