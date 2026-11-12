import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Loader, TextInput } from '@mantine/core'
import { IconAlertTriangle, IconArrowRight, IconInfoCircle } from '@tabler/icons-react'
import Shell from '../components/Shell'
import CampusPicker from '../components/CampusPicker'
import EngineSwitch from '../components/EngineSwitch'
import AnswerCard from './AnswerCard'
import { api, IS_STATIC, RequestError } from '../api'
import { getCampus, useCampus, type Campus } from '../campus'
import { getEngine, useEngine, type Engine } from '../engine'
import { useStatus } from '../status'
import type { AnswerResult, Status } from '../types'

const HISTORY_KEY = 'cairn-history'
interface HistoryItem {
  q: string
  campus: Campus | null
  engine?: Engine
  status: Status
  at: string
}

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.filter((x) => typeof x?.q === 'string').slice(0, 8) : []
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

/** The desk: pick a campus and an engine, ask; the answer; the recent questions. */
export default function DeskPage({ active }: { active: boolean }) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const [campus, setCampus] = useCampus()
  const [engineChoice, setEngine] = useEngine()
  const [question, setQuestion] = useState('')
  const [asked, setAsked] = useState('')
  const [pending, setPending] = useState<string | null>(null) // a question waiting for a campus
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory)
  const answers = useRef(new Map<string, AnswerResult>())
  const busyRef = useRef(false)
  const examples = t('desk.examples', { returnObjects: true }) as string[]

  // The static demo recorded both engines; a live server offers the model only when it has a key.
  const available: Record<Engine, boolean> = { model: IS_STATIC || !!status?.engines?.model, local: true }
  const engine: Engine = engineChoice && available[engineChoice] ? engineChoice : available.model ? 'model' : 'local'

  const ask = useCallback(async (q: string, c: Campus | null = getCampus(), e?: Engine) => {
    const text = q.trim()
    if (!text || busyRef.current) return
    setQuestion(text)
    setError(null)
    if (!c) {
      // No campus yet: keep the question and ask it the moment one is chosen.
      setPending(text)
      return
    }
    const eng: Engine = e ?? getEngine() ?? 'model'
    setPending(null)
    setAsked(text)
    const key = `${eng}|${c}|${text}`
    const known = answers.current.get(key)
    if (known) {
      setResult(known)
      return
    }
    busyRef.current = true
    setBusy(true)
    setResult(null)
    try {
      const r = await api.ask(text, c, eng)
      answers.current.set(key, r)
      setResult(r)
      setHistory((h) => {
        const next = [{ q: text, campus: c, engine: eng, status: r.status, at: new Date().toISOString() }, ...h.filter((x) => !(x.q === text && x.campus === c && (x.engine ?? 'model') === eng))].slice(0, 8)
        saveHistory(next)
        return next
      })
    } catch (err) {
      setError(err instanceof RequestError ? err.info.code : 'generic')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [])

  const chooseCampus = (c: Campus) => {
    setCampus(c)
    if (pending) void ask(pending, c, engine)
  }
  const chooseEngine = (e: Engine) => {
    setEngine(e)
    // The same question again, by the other engine, so the two can be compared.
    if (asked && campus && !busy) void ask(asked, campus, e)
  }

  // '#/ask?q=…' from the cover (or typed in): ask it, then drop the query so a reload does not ask again.
  // Checked on arrival and on every hash change, since a link to the desk while the desk is open changes only the hash.
  useEffect(() => {
    if (!active) return
    const check = () => {
      const m = window.location.hash.match(/^#\/?ask\?(?:.*&)?q=([^&]+)/)
      if (!m) return
      window.history.replaceState(null, '', '#/ask')
      void ask(decodeURIComponent(m[1].replace(/\+/g, ' ')), getCampus(), engine)
    }
    check()
    window.addEventListener('hashchange', check)
    return () => window.removeEventListener('hashchange', check)
  }, [active, ask, engine])

  useEffect(() => {
    if (active) document.title = `${t('app.nav.desk')} · Cairn`
  }, [active, t])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void ask(question, getCampus(), engine)
  }

  return (
    <Shell page="desk" foot={false}>
      <div className="cn-desk">
        <section className="cn-ask" aria-labelledby="desk-title">
          <h1 id="desk-title" className="cn-h1">{t('desk.title')}</h1>
          <p className="lead">{t('desk.lead')}</p>
          <form className="cn-card cn-askcard" onSubmit={submit}>
            <CampusPicker value={campus} onChange={chooseCampus} name="campus-desk" hint={!campus} />
            <EngineSwitch value={engine} onChange={chooseEngine} name="engine-desk" available={available} hint={!result} />
            <div className="cn-askrow">
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
            </div>
            {pending && !campus && (
              <p className="cn-campus-need" role="status">{t('campus.needed')}</p>
            )}
          </form>
          <div className="cn-examples">
            <span className="small">{t('desk.examplesLabel')}</span>
            <ul>
              {examples.map((q) => (
                <li key={q}>
                  <button type="button" className="cn-chip" onClick={() => void ask(q, getCampus(), engine)} disabled={busy}>
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {/* The one line of fine print on this screen, where mature assistants put it: under the box you type in. */}
          <p className="small cn-caveat">
            {t(IS_STATIC ? 'app.caveatStatic' : 'app.caveat')} <a href="#/about" className="cn-link">{t('app.about')}</a>
          </p>
        </section>

        <section className="cn-answer" aria-label={t('desk.sections.answer')}>
          <p className="visually-hidden" aria-live="polite">
            {busy ? t('desk.asking') : result ? t(`desk.status.${result.status}`) : ''}
          </p>
          {busy && (
            <p className="cn-busy">
              <Loader size="sm" /> {t(engine === 'local' ? 'desk.askingLocal' : 'desk.asking')}
            </p>
          )}
          {error && !busy && (
            <Alert
              color={error === 'static_demo' ? 'gray' : 'red'}
              icon={error === 'static_demo' ? <IconInfoCircle aria-hidden /> : <IconAlertTriangle aria-hidden />}
              title={t(`desk.errors.${error}`, { defaultValue: t('desk.errors.generic') })}
            >
              {error !== 'static_demo' && (
                <Button variant="default" size="sm" mt="sm" onClick={() => void ask(asked, getCampus(), engine)}>
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
                <li key={`${h.engine ?? 'model'}|${h.campus}|${h.q}`}>
                  <button
                    type="button"
                    className="cn-hist"
                    aria-current={h.q === asked && h.campus === campus && (h.engine ?? 'model') === engine ? 'true' : undefined}
                    onClick={() => void ask(h.q, h.campus ?? getCampus(), h.engine ?? engine)}
                  >
                    <span>{h.q}</span>
                    <span className="small">
                      {h.campus ? `${t(`campus.names.${h.campus}`)} · ` : ''}
                      {t(`engine.badge.${h.engine ?? 'model'}`)} · {t(`desk.status.${h.status}`)}
                    </span>
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
