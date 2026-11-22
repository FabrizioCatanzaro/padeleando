import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { api } from '../../utils/api'
import { useToast } from '../../context/useToast'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { STYLE_OPTIONS, perPersonFromTotal, totalFromPerPerson } from '../../utils/friendlies'
import Btn from '../shared/Btn'
import ClubSelector from '../shared/ClubSelector'
import { INPUT, LABEL, SegButtons, MoneyInput, VisibilityPicker, DurationPicker } from './parts'

const FORMAT_OPTIONS = [{ id: 1, label: 'Set único' }, { id: 3, label: 'Mejor de 3' }]
const OPEN = ['abierto', 'completo']
const pad = (n) => String(n).padStart(2, '0')
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function formFrom(m) {
  const total = m.court_price == null ? '' : String(Math.round(m.court_price))
  return {
    club: { id: m.club.id, name: m.club.name, location_name: m.club.location_name },
    court: m.court_label ?? '',
    date: m.date,
    time: m.start_time,
    duration: m.duration_minutes,
    total,
    each: perPersonFromTotal(total),
    setsFormat: m.sets_format,
    style: m.style ?? null,
    level: m.level ?? '',
    visibility: m.visibility,
  }
}

function patchFrom(m, f, open) {
  const next = {
    club_id: f.club.id,
    court_label: f.court.trim() || null,
    date: f.date,
    start_time: f.time,
    duration_minutes: f.duration,
    court_price: f.total === '' ? null : Number(f.total),
    style: f.style,
    visibility: f.visibility,
    ...(open ? { sets_format: f.setsFormat, level: f.level.trim() || null } : {}),
  }
  const prev = {
    club_id: m.club.id, court_label: m.court_label ?? null, date: m.date, start_time: m.start_time,
    duration_minutes: m.duration_minutes, court_price: m.court_price ?? null, style: m.style ?? null,
    visibility: m.visibility, sets_format: m.sets_format, level: m.level ?? null,
  }
  return Object.fromEntries(Object.entries(next).filter(([k, v]) => v !== prev[k]))
}

export default function FriendlyEdit() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const token = params.get('t')
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [m, setM] = useState(null)
  const [f, setF] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useDocumentTitle('Editar amistoso')

  useEffect(() => {
    api.friendlies.get(id, token)
      .then((data) => { setM(data); setF(formFrom(data)) })
      .catch((e) => setLoadError(e.status === 404 ? 'Este amistoso no existe o es privado.' : e.message))
  }, [id, token])

  const back = `/amistoso/${id}${token ? `?t=${encodeURIComponent(token)}` : ''}`

  if (loadError) return <p className="max-w-xl mx-auto px-4 py-10 text-[14px] text-secondary">{loadError}</p>
  if (!m) return <div className="min-h-screen flex justify-center pt-16"><Loader2 size={20} className="animate-spin text-muted" /></div>
  if (!m.viewer.can_edit) {
    return <p className="max-w-xl mx-auto px-4 py-10 text-[14px] text-secondary">Solo el creador edita el partido, y solo hasta que se confirme el resultado.</p>
  }

  const open = OPEN.includes(m.status)
  const set = (k) => (v) => setF((prev) => ({ ...prev, [k]: v }))

  function validate() {
    if (!f.club || f.club.pending) return 'Elegí un club de la lista.'
    if (!f.date || !f.time) return 'Completá la fecha y la hora.'
    const start = new Date(`${f.date}T${f.time}`)
    if (open && start <= new Date()) return 'Un partido abierto tiene que ser en una fecha y hora futuras.'
    if (!open && start > new Date()) return 'Un partido ya jugado no puede tener fecha futura.'
    return null
  }

  async function save() {
    const e = validate()
    if (e) { setError(e); return }
    const patch = patchFrom(m, f, open)
    if (Object.keys(patch).length === 0) { navigate(back); return }
    setSaving(true)
    setError(null)
    try {
      await api.friendlies.update(m.id, patch)
      showToast('Cambios guardados')
      navigate(back, { replace: true })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="bg-base text-content font-sans">
      <div className="mx-auto px-4 sm:px-7 pt-8 sm:pt-10 max-w-2xl">
        <div className="mb-6">
          <p className="m-0 text-[11px] font-mono tracking-[2px] text-dim">EDITAR AMISTOSO</p>
          <h1 className="m-0 mt-1 font-condensed font-bold text-[22px] sm:text-[26px] text-white">
            {open ? 'Partido abierto' : 'Partido ya jugado'}
          </h1>
          <p className="m-0 mt-2 text-[13px] text-secondary">
            Si cambiás club, cancha, fecha, hora o duración, se avisa a los jugadores con cuenta.
            {!open && ' El resultado cargado no cambia.'}
          </p>
        </div>

        <div className="flex flex-col gap-7">
          <section className="flex flex-col gap-3">
            <div>
              <span className={LABEL}>CLUB</span>
              <ClubSelector value={f.club} onChange={set('club')} />
            </div>
            <div>
              <label htmlFor="ed-cancha" className={LABEL}>CANCHA (OPCIONAL)</label>
              <input id="ed-cancha" className={INPUT} value={f.court} maxLength={40} placeholder="Ej: Cancha 3" onChange={(e) => set('court')(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="ed-fecha" className={LABEL}>FECHA</label>
                <input id="ed-fecha" type="date" className={INPUT} value={f.date} onChange={(e) => set('date')(e.target.value)}
                  min={open ? todayIso() : undefined} max={open ? undefined : todayIso()} />
              </div>
              <div>
                <label htmlFor="ed-hora" className={LABEL}>HORA</label>
                <input id="ed-hora" type="time" step={1800} className={INPUT} value={f.time} onChange={(e) => set('time')(e.target.value)} />
              </div>
            </div>
            <div>
              <span className={LABEL}>DURACIÓN</span>
              <DurationPicker value={f.duration} onChange={set('duration')} />
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <span className={LABEL}>ALQUILER DE LA CANCHA (OPCIONAL)</span>
            <div className="grid grid-cols-2 gap-3">
              <MoneyInput id="ed-total" label="Total" value={f.total}
                onChange={(v) => setF((p) => ({ ...p, total: v, each: perPersonFromTotal(v) }))} />
              <MoneyInput id="ed-cada" label="Por persona" value={f.each}
                onChange={(v) => setF((p) => ({ ...p, each: v, total: totalFromPerPerson(v) }))} />
            </div>
          </section>

          {open && (
            <section>
              <span className={LABEL}>FORMATO</span>
              <SegButtons label="Formato" options={FORMAT_OPTIONS} value={f.setsFormat} onChange={set('setsFormat')} />
            </section>
          )}
          <section>
            <span className={LABEL}>ESTILO (OPCIONAL)</span>
            <SegButtons label="Estilo" options={STYLE_OPTIONS} value={f.style} allowEmpty onChange={set('style')} />
          </section>
          {open && (
            <section>
              <label htmlFor="ed-nivel" className={LABEL}>CATEGORÍA SUGERIDA (OPCIONAL)</label>
              <input id="ed-nivel" className={INPUT} value={f.level} maxLength={7} placeholder="Ej: C6 o C5-C7"
                onChange={(e) => set('level')(e.target.value.toUpperCase())} />
            </section>
          )}
          <section>
            <span className={LABEL}>QUIÉN LO VE</span>
            <VisibilityPicker value={f.visibility} onChange={set('visibility')} />
          </section>

          {error && <p role="alert" className="m-0 text-danger text-[13px]">{error}</p>}
        </div>

        <div className="sticky bottom-0 z-30 -mx-4 sm:-mx-7 mt-8 px-4 sm:px-7 py-3 bg-base/95 backdrop-blur border-t border-border flex gap-3">
          <Btn size="lg" icon={ChevronLeft} onClick={() => navigate(back)}>VOLVER</Btn>
          <Btn variant="primary" size="lg" full onClick={save} loading={saving}>GUARDAR CAMBIOS</Btn>
        </div>
      </div>
    </div>
  )
}
