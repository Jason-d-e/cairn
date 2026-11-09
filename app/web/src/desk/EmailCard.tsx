import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@mantine/core'
import { IconCopy, IconMailForward } from '@tabler/icons-react'
import type { EmailDraft } from '../types'

/**
 * When the pages do not answer: the email the reader would send to ask, drafted by a template from the pages
 * themselves. Shown as plain text to copy or open in the reader's mail app; nothing is sent from here.
 */
export default function EmailCard({ email }: { email: EmailDraft }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const text = `${t('email.to')}: ${email.to || t('email.noAddress')}\n${t('email.subject')}: ${email.subject}\n\n${email.body}`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <section className="cn-email" aria-labelledby="email-title">
      <h3 className="cn-label" id="email-title">{t('email.title')}</h3>
      <p className="cn-hint">{t('email.lead')}</p>
      <dl className="cn-email-head">
        <dt>{t('email.to')}</dt>
        <dd>{email.to ? <span className="cn-code">{email.to}</span> : <span className="small">{t('email.noAddress')}</span>}</dd>
        <dt>{t('email.subject')}</dt>
        <dd lang="en">{email.subject}</dd>
      </dl>
      <pre className="cn-email-body" lang="en">{email.body}</pre>
      <p className="small">{email.note}</p>
      <div className="cn-email-actions">
        <Button variant="default" size="sm" leftSection={<IconCopy size={16} aria-hidden />} onClick={() => void copy()}>
          {copied ? t('email.copied') : t('email.copy')}
        </Button>
        <Button component="a" href={email.mailto} variant="filled" size="sm" leftSection={<IconMailForward size={16} aria-hidden />}>
          {t('email.open')}
        </Button>
      </div>
    </section>
  )
}
