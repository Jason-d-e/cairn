import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Burger, Menu, SegmentedControl } from '@mantine/core'
import { LANGS, setLang, type Lang } from '../i18n'
import { useStatus } from '../status'
import { IS_STATIC } from '../api'
import type { Page } from '../App'
import Logo from './Logo'

export function LanguageSwitch() {
  const { t, i18n } = useTranslation()
  return (
    <SegmentedControl
      size="xs"
      value={i18n.language as Lang}
      onChange={(v) => setLang(v as Lang)}
      data={LANGS.map((l) => ({ value: l.value, label: l.label }))}
      aria-label={t('app.language')}
    />
  )
}

const NAV: { page: Page; href: string }[] = [
  { page: 'desk', href: '#/ask' },
  { page: 'library', href: '#/library' },
  { page: 'quality', href: '#/quality' },
  { page: 'about', href: '#/about' },
]

/** The app screens' chrome: a bar with the wordmark, the four pages, the model state and the two switches.
 *  The fine print is one quiet line per screen: in this footer, or under the question box on the desk. */
export default function Shell({ page, children, foot = true }: { page: Page; children: ReactNode; foot?: boolean }) {
  const { t } = useTranslation()
  const { status, error } = useStatus()
  const [open, setOpen] = useState(false)
  const model = IS_STATIC ? null : error ? 'unreachable' : !status ? 'checking' : status.model_configured ? 'connected' : 'offline'

  return (
    <div className="cn-app">
      <header className="cn-bar">
        <div className="container cn-bar-inner">
          <Logo />
          <nav className="cn-nav" aria-label={t('app.menu')}>
            {NAV.map((n) => (
              <a key={n.page} href={n.href} aria-current={page === n.page ? 'page' : undefined}>
                {t(`app.nav.${n.page}`)}
              </a>
            ))}
          </nav>
          <div className="cn-bar-right">
            {model && model !== 'checking' && (
              <span className="cn-model" data-state={model}>
                {t(`app.model.${model}`)}
              </span>
            )}
            <LanguageSwitch />
            <Menu opened={open} onChange={setOpen} position="bottom-end" width={220} offset={8}>
              <Menu.Target>
                <Burger opened={open} size="sm" hiddenFrom="md" aria-label={t('app.menu')} />
              </Menu.Target>
              <Menu.Dropdown>
                {NAV.map((n) => (
                  <Menu.Item key={n.page} component="a" href={n.href} aria-current={page === n.page ? 'page' : undefined}>
                    {t(`app.nav.${n.page}`)}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          </div>
        </div>
      </header>
      <main className="container cn-main">{children}</main>
      {foot && (
        <footer className="container cn-foot">
          <p className="small">
            {t('app.license')}{' '}
            <a href="#/about" className="cn-link">{t('app.about')}</a>
          </p>
        </footer>
      )}
    </div>
  )
}
