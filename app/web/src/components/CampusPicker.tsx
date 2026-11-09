import { useTranslation } from 'react-i18next'
import { CAMPUS_CODES, type Campus } from '../campus'

/**
 * The first choice on the desk and the cover: which campus's pages apply. Native radios drawn as chips,
 * so the keyboard works as it does for any radio group; the chosen one takes the thin accent ring.
 */
export default function CampusPicker({ value, onChange, name, hint = false }: { value: Campus | null; onChange: (c: Campus) => void; name: string; hint?: boolean }) {
  const { t } = useTranslation()
  return (
    <fieldset className="cn-campus">
      <legend className="cn-campus-legend">{t('campus.pick')}</legend>
      <div className="cn-campus-opts">
        {CAMPUS_CODES.map((c) => (
          <label key={c} className="cn-chip cn-campus-opt" data-on={value === c}>
            <input type="radio" name={name} value={c} className="visually-hidden" checked={value === c} onChange={() => onChange(c)} />
            {t(`campus.names.${c}`)}
          </label>
        ))}
      </div>
      {hint && <p className="small cn-campus-hint">{t('campus.pickHint')}</p>}
    </fieldset>
  )
}
