import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SegmentedControl, TextInput } from '@mantine/core'
import { IconExternalLink } from '@tabler/icons-react'
import Shell from '../components/Shell'
import { api } from '../api'
import type { Gaps, Library } from '../types'

const PRINCIPLES = ['1', '2', '3', '4'] as const

export default function LibraryPage() {
  const { t, i18n } = useTranslation()
  const [lib, setLib] = useState<Library | null>(null)
  const [gaps, setGaps] = useState<Gaps | null>(null)
  const [level, setLevel] = useState('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    api.library().then(setLib).catch(() => setLib(null))
    api.gaps().then(setGaps).catch(() => setGaps(null))
  }, [])
  useEffect(() => {
    document.title = `${t('app.nav.library')} · Cairn`
  }, [t])

  const needle = q.trim().toLowerCase()
  const docs = (lib?.documents ?? []).filter((d) => (level === 'all' || d.level === level) && (!needle || `${d.id} ${d.title}`.toLowerCase().includes(needle)))
  const groups = PRINCIPLES.map((p) => ({ p, docs: docs.filter((d) => d.id.startsWith(`${p}.`)) })).filter((g) => g.docs.length)
  const locale = i18n.language === 'zh' ? 'zh-CN' : 'en-GB'
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <Shell page="library">
      <div className="cn-page-head">
        <h1 className="cn-h1">{t('library.title')}</h1>
        {lib && <p className="lead">{t('library.lead', { docs: lib.meta.documents, chunks: lib.meta.chunks, commit: lib.meta.commit })}</p>}
      </div>

      <div className="cn-filters">
        <SegmentedControl
          value={level}
          onChange={setLevel}
          data={['all', 'A', 'AA', 'AAA'].map((v) => ({ value: v, label: t(`library.levels.${v}`) }))}
          aria-label={t('library.heads.level')}
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
                <th scope="col">{t('library.heads.code')}</th>
                <th scope="col">{t('library.heads.title')}</th>
                <th scope="col" className="cn-hide-s">{t('library.heads.guideline')}</th>
                <th scope="col">{t('library.heads.level')}</th>
                <th scope="col" className="num">{t('library.heads.passages')}</th>
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.p}>
                <tr className="cn-group">
                  <th scope="rowgroup" colSpan={5}>
                    <span className="cn-code">{g.p}</span>
                    {t(`library.principles.${g.p}`)}
                  </th>
                </tr>
                {g.docs.map((d) => (
                  <tr key={d.id}>
                    <td className="cn-code">{d.id}</td>
                    <td>
                      <a className="cn-link" href={d.understanding_url} rel="noreferrer" aria-label={t('library.open', { id: d.id })} lang="en">
                        {d.title} <IconExternalLink size={12} aria-hidden style={{ verticalAlign: '-1px' }} />
                      </a>
                    </td>
                    <td className="small cn-hide-s" lang="en">{d.guideline}</td>
                    <td><span className="cn-level-l">{d.level}</span></td>
                    <td className="cn-code num">{d.chunks}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
      {lib && <p className="small" style={{ marginTop: 'var(--space-md)' }}>{t('library.built', { date: fmt(lib.meta.built_at), source: lib.meta.source.replace('https://github.com/', ''), commit: lib.meta.commit })}</p>}

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
