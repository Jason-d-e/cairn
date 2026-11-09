import { useTranslation } from 'react-i18next'
import { ENGINES, type Engine } from '../engine'

/**
 * The second choice on the desk: who writes the answer. "AI answer" needs a key and costs a fraction of a cent;
 * "Local engine" chooses sentences from the pages with a local model, free and offline. A choice that is not
 * available (no key) is shown but disabled, so the reader knows it exists.
 */
export default function EngineSwitch({ value, onChange, name, available, hint = false }: { value: Engine; onChange: (e: Engine) => void; name: string; available: Record<Engine, boolean>; hint?: boolean }) {
  const { t } = useTranslation()
  return (
    <fieldset className="cn-campus cn-engine">
      <legend className="cn-campus-legend">{t('engine.pick')}</legend>
      <div className="cn-campus-opts">
        {ENGINES.map((e) => (
          <label key={e} className="cn-chip cn-campus-opt" data-on={value === e} data-off={!available[e]}>
            <input type="radio" name={name} value={e} className="visually-hidden" checked={value === e} disabled={!available[e]} onChange={() => onChange(e)} />
            {t(`engine.names.${e}`)}
          </label>
        ))}
      </div>
      {hint && <p className="small cn-campus-hint">{available.model ? t(`engine.hints.${value}`) : t('engine.hints.noKey')}</p>}
    </fieldset>
  )
}
