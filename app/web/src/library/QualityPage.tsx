import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SegmentedControl } from '@mantine/core'
import Shell from '../components/Shell'
import { api } from '../api'
import type { Quality } from '../types'

const IN_USE = 'translate + vector + rerank'
type LangFilter = 'all' | 'en' | 'zh'

export default function QualityPage() {
  const { t } = useTranslation()
  const [quality, setQuality] = useState<Quality | null>(null)
  const [lang, setLangFilter] = useState<LangFilter>('all')
  const explain = t('quality.explain.items', { returnObjects: true }) as { title: string; text: string }[]

  useEffect(() => {
    api.quality().then(setQuality).catch(() => setQuality({ summary: [] }))
  }, [])
  useEffect(() => {
    document.title = `${t('app.nav.quality')} · Cairn`
  }, [t])

  const rows = (quality?.summary ?? []).filter((r) => r.lang === lang)
  const total = (quality?.summary ?? []).find((r) => r.lang === 'all')?.n ?? 0
  const date = quality?.file?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? ''

  return (
    <Shell page="quality">
      <div className="cn-page-head">
        <h1 className="cn-h1">{t('quality.title')}</h1>
        {total > 0 && <p className="lead">{t('quality.lead', { n: total })}</p>}
      </div>

      {quality && quality.summary.length === 0 && <p>{t('quality.empty')}</p>}
      {rows.length > 0 && (
        <>
          <div className="cn-filters">
            <SegmentedControl
              value={lang}
              onChange={(v) => setLangFilter(v as LangFilter)}
              data={(['all', 'en', 'zh'] as const).map((v) => ({ value: v, label: t(`quality.langs.${v}`) }))}
              aria-label={t('quality.langs.all')}
            />
          </div>
          <div className="cn-scroll" tabIndex={0} role="region" aria-label={t('quality.title')}>
            <table className="cn-table">
              <thead>
                <tr>
                  <th scope="col">{t('quality.heads.method')}</th>
                  <th scope="col" className="num">{t('quality.heads.hit1')}</th>
                  <th scope="col" className="num">{t('quality.heads.hit3')}</th>
                  <th scope="col" className="num">{t('quality.heads.hit5')}</th>
                  <th scope="col" className="num">{t('quality.heads.mrr')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.method} data-on={r.method === IN_USE}>
                    <td>
                      {t(`quality.methods.${r.method}`, { defaultValue: r.method })}
                      {r.method === IN_USE && <span className="cn-code cn-inuse">{t('quality.inUse')}</span>}
                    </td>
                    <td className="cn-code num">{r.hit1} / {r.n}</td>
                    <td className="cn-code num">{r.hit3} / {r.n}</td>
                    <td className="cn-code num">{r.hit5} / {r.n}</td>
                    <td className="cn-code num">{r.mrr.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {date && <p className="small" style={{ marginTop: 'var(--space-md)', maxWidth: '72ch' }}>{t('quality.note', { date })}</p>}
        </>
      )}

      <section className="cn-section" aria-labelledby="methods-title">
        <h2 id="methods-title" className="cn-h2">{t('quality.explain.title')}</h2>
        <ul className="cn-explain">
          {explain.map((m) => (
            <li key={m.title}>
              <h3>{m.title}</h3>
              <p>{m.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </Shell>
  )
}
