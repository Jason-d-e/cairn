import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Loader, TextInput } from '@mantine/core'
import { IconAlertTriangle, IconArrowRight } from '@tabler/icons-react'
import Shell from '../components/Shell'
import AnswerCard from './AnswerCard'
import { api, IS_STATIC, RequestError } from '../api'
import type { AnswerResult, Status } from '../types'

const HISTORY_KEY = 'cairn-history'
interface HistoryItem {
  q: string
  status: Status
  at: string
}

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.slice(0, 8) : []
  } catch {
    return []
  }
}
function saveHistory(list: HistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 8)))
  } catch {
    /* storage unavailable */
  }
}

export default function DeskPage({ active }: { active: boolean }) {
  const { t } = useTranslation()
  const [question, setQuestion] = useState('')
  const [asked, setAsked] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory)
  const answers = useRef(new Map<string, AnswerResult>())
  const busyRef = useRef(false)
  const examples = t('desk.examples', { returnObjects: true }) as string[]

  const ask = useCallback(async (q: string) => {
    const text = q.trim()
    if (!text || busyRef.current) return
    setQuestion(text)
    setAsked(text)
    setError(null)
    const known = answers.current.get(text)
    if (known) {
      setResult(known)
      return
    }
    busyRef.current = true
    setBusy(true)
    setResult(null)
    try {
      const r = await api.ask(text)
      answers.current.set(text, r)
      setResult(r)
      setHistory((h) => {
        const next = [{ q: text, status: r.status, at: new Date().toISOString() }, ...h.filter((x) => x.q !== text)].slice(0, 8)
        saveHistory(next)
        return next
      })
    } catch (e) {
      setError(e instanceof RequestError ? e.info.code : 'generic')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [])

  // '#/ask?q=…' from the cover: ask it, then drop the query so a reload does not ask again.
  useEffect(() => {
    if (!active) return
    const m = window.location.hash.match(/[?&]q=([^&]+)/)
    if (m) {
      window.history.replaceState(null, '', '#/ask')
      void ask(decodeURIComponent(m[1].replace(/\+/g, ' ')))
    }
  }, [active, ask])

  useEffect(() => {
    if (active) document.title = `${t('app.nav.desk')} · Cairn`
  }, [active, t])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void ask(question)
  }

  return (
    <Shell page="desk">
      <div className="cn-desk">
        <section className="cn-ask" aria-labelledby="desk-title">
          <h1 id="desk-title" className="cn-h1">{t('desk.title')}</h1>
          <p className="lead">{t(IS_STATIC ? 'desk.demoLead' : 'desk.lead')}</p>
          <form className="cn-card cn-askcard" onSubmit={submit}>
            <TextInput
              size="lg"
              label={t('desk.label')}
              labelProps={{ className: 'visually-hidden' }}
              placeholder={t('desk.placeholder')}
              value={question}
              onChange={(e) => setQuestion(e.currentTarget.value)}
              maxLength={500}
              disabled={busy}
              classNames={{ root: 'cn-askfield' }}
              autoComplete="off"
            />
            <Button type="submit" size="lg" loading={busy} rightSection={<IconArrowRight size={18} aria-hidden />}>
              {t('desk.ask')}
            </Button>
          </form>
          <div className="cn-examples">
            <span className="small">{t('desk.examplesLabel')}</span>
            <ul>
              {examples.map((q) => (
                <li key={q}>
                  <button type="button" className="cn-chip" onClick={() => void ask(q)} disabled={busy}>
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <p className="small cn-caveat">
            {t('app.caveat')} <a href="#/about" className="cn-link">{t('app.about')}</a>
          </p>
        </section>

        <section className="cn-answer" aria-label={t('desk.sections.answer')}>
          <p className="visually-hidden" aria-live="polite">
            {busy ? t('desk.asking') : result ? t(`desk.status.${result.status}`) : ''}
          </p>
          {busy && (
            <p className="cn-busy">
              <Loader size="sm" /> {t('desk.asking')}
            </p>
          )}
          {error && !busy && (
            <Alert color="red" icon={<IconAlertTriangle aria-hidden />} title={t(`desk.errors.${error}`, { defaultValue: t('desk.errors.generic') })}>
              {error !== 'static_demo' && (
                <Button variant="default" size="sm" mt="sm" onClick={() => void ask(asked)}>
                  {t('desk.errors.retry')}
                </Button>
              )}
            </Alert>
          )}
          {!result && !busy && !error && (
            <section className="cn-card cn-intro" aria-labelledby="intro-title">
              <h2 id="intro-title" className="cn-h3">{t('desk.intro.title')}</h2>
              <p>{t('desk.intro.text')}</p>
              <a className="cn-link" href="#/?s=what">{t('desk.intro.link')}</a>
            </section>
          )}
          {result && !busy && !error && <AnswerCard question={asked} result={result} />}
        </section>

        <aside className="cn-history" aria-labelledby="history-title">
          <h2 id="history-title" className="cn-h3">{t('desk.history.title')}</h2>
          {history.length === 0 ? (
            <p className="small">{t('desk.history.empty')}</p>
          ) : (
            <ul>
              {history.map((h) => (
                <li key={h.q}>
                  <button type="button" className="cn-hist" aria-current={h.q === asked ? 'true' : undefined} onClick={() => void ask(h.q)}>
                    <span>{h.q}</span>
                    <span className="small">{t(`desk.status.${h.status}`)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {history.length > 0 && (
            <div>
              <Button variant="subtle" size="xs" onClick={() => { setHistory([]); saveHistory([]) }}>
                {t('desk.history.clear')}
              </Button>
            </div>
          )}
        </aside>
      </div>
    </Shell>
  )
}
