import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Shell from '../components/Shell'
import { IS_STATIC } from '../api'

import { MONASH_STUDENTS, REPO } from '../links'

/** Where the fine print lives, as in mature products: one page, linked from the footers, never a banner on every screen. */
export default function AboutPage() {
  const { t } = useTranslation()
  const all = t('about.sections', { returnObjects: true }) as { title: string; text: string }[]
  // The online demo says what it is here, once, instead of in a badge or a banner.
  const sections = IS_STATIC ? [all[0], t('about.staticDemo', { returnObjects: true }) as { title: string; text: string }, ...all.slice(1)] : all

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
          <a className="cn-link" href={MONASH_STUDENTS} rel="noreferrer">{t('about.monash')}</a>
          <a className="cn-link" href="#/">{t('about.back')}</a>
        </p>
      </article>
    </Shell>
  )
}
