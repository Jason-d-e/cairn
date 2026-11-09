import { useTranslation } from 'react-i18next'

/** The wordmark: a cairn (three stones, the rust base line) and the name in the display face. Links to the cover. */
export default function Logo() {
  const { t } = useTranslation()
  return (
    <a href="#/" className="cn-logo" aria-label={t('app.home')}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden focusable="false">
        <rect x="12" y="3" width="8" height="5" fill="currentColor" />
        <rect x="9" y="10" width="14" height="6" fill="currentColor" />
        <rect x="5" y="18" width="22" height="8" fill="currentColor" />
        <rect x="5" y="27" width="22" height="2" fill="var(--color-accent)" />
      </svg>
      <span className="cn-logo-name">Cairn</span>
    </a>
  )
}
