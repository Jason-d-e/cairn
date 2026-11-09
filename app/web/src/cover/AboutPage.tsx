import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Shell from '../components/Shell'

import { REPO, W3C_LICENSE } from '../links'

/** Where the fine print lives, as in mature products: one page, linked from the footers, never a banner on every screen. */
export default function AboutPage() {
  const { t } = useTranslation()
  const sections = t('about.sections', { returnObjects: true }) as { title: string; text: string }[]

  useEffect(() => {
    document.title = `${t('about.title')} · Cairn`
  }, [t])

  return (
    <Shell page="about">
      <article className="cn-about">
        <h1 className="cn-h1">{t('about.title')}</h1>
        {sections.map((s, i) => (
          <section key={s.title} aria-labelledby={`about-${i}`}>
            <h2 id={`about-${i}`} className="cn-h2">{s.title}</h2>
            <p>{s.text}</p>
          </section>
        ))}
        <p className="cn-about-links">
          <a className="cn-link" href={REPO} rel="noreferrer">{t('about.source')}</a>
          <a className="cn-link" href={W3C_LICENSE} rel="noreferrer">{t('about.license')}</a>
          <a className="cn-link" href="#/">{t('about.back')}</a>
        </p>
      </article>
    </Shell>
  )
}
