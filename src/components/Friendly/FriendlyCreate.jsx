import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, UserPlus, Check } from 'lucide-react'
import { api } from '../../utils/api'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/useToast'
import { formatMoney } from '../../utils/money'
import {
  SIDE_OPTIONS, HAND_OPTIONS, STYLE_OPTIONS, STYLE_LABEL, longDate, endTime,
  perPersonFromTotal, totalFromPerPerson, resultSummary, emptySets, normalizeSets,
} from '../../utils/friendlies'
import Btn from '../shared/Btn'
import StepBar from '../shared/StepBar'
import ClubSelector from '../shared/ClubSelector'
import PlayerAvatar from '../shared/PlayerAvatar'
import SlotEditor from './SlotEditor'
import SetsEditor from './SetsEditor'
import { INPUT, LABEL, SegButtons, MoneyInput, VisibilityPicker, DurationPicker } from './parts'
import { whatsappDePerfil } from '../../utils/copa'

const STEPS = [
  { id: 'tipo', label: 'TIPO' },
  { id: 'cancha', label: 'CANCHA' },
  { id: 'jugadores', label: 'JUGADORES' },
  { id: 'detalles', label: 'DETALLES' },
]
const OTHER_SLOTS = [[1, 2], [2, 1], [2, 2]]
const FORMAT_OPTIONS = [{ id: 1, label: 'Set único' }, { id: 3, label: 'Mejor de 3' }]

const slotKey = (t, p) => `${t}-${p}`
const pad = (n) => String(n).padStart(2, '0')
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function slotBody(team, position, v) {
  if (v?.user) return { team, position, username: v.user.username }
  if (v?.guest_name) return { team, position, guest_name: v.guest_name, side: v.side, hand: v.hand }
  return null
}

export default function FriendlyCreate() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()

  const [step, setStep]         = useState(0)
  const [mode, setMode]         = useState('abierto')
  const [club, setClub]         = useState(null)
  const [court, setCourt]       = useState('')
  const [date, setDate]         = useState('')
  const [time, setTime]         = useState('')
  const [duration, setDuration] = useState(90)
  const [total, setTotal]       = useState('')
  const [each, setEach]         = useState('')
  const [me, setMe]             = useState(() => ({ side: null, hand: null, whatsapp: whatsappDePerfil(user?.social_links) }))
  const [slots, setSlots]       = useState({})
  const [setsFormat, setSetsFormat] = useState(1)
  const [sets, setSets]         = useState(emptySets(1))
  const [style, setStyle]       = useState(null)
  const [level, setLevel]       = useState('')
  const [visibility, setVisibility] = useState('publico')
  const [error, setError]       = useState(null)
  const [saving, setSaving]     = useState(false)

  const played = mode === 'jugado'
  const filledCount = OTHER_SLOTS.filter(([t, p]) => slots[slotKey(t, p)]).length
  const takenIds = OTHER_SLOTS.map(([t, p]) => slots[slotKey(t, p)]?.user?.id).filter(Boolean).concat(user?.id ?? [])
  const result = useMemo(() => resultSummary(setsFormat, sets), [setsFormat, sets])

  function stepError(i) {
    if (STEPS[i].id === 'cancha') {
      if (!club || club.pending) return 'Elegí un club de la lista.'
      if (!date || !time) return 'Completá la fecha y la hora.'
      const start = new Date(`${date}T${time}`)
      if (!played && start <= new Date()) return 'Un partido abierto tiene que ser en una fecha y hora futuras.'
      if (played && start > new Date()) return 'Un partido ya jugado no puede tener fecha futura.'
    }
    if (STEPS[i].id === 'jugadores') {
      if (played && filledCount < 3) return 'Cargá los 4 jugadores del partido.'
      if (!played && filledCount === 3) return 'Dejá al menos un lugar libre para que se sumen.'
    }
    if (STEPS[i].id === 'detalles' && played && !result.ready) return result.error ?? 'Cargá un resultado completo.'
    return null
  }

  function next() {
    const e = stepError(step)
    if (e) { setError(e); return }
    setError(null)
    if (step < STEPS.length - 1) { setStep(step + 1); window.scrollTo(0, 0) } else submit()
  }

  function back() {
    setError(null)
    if (step === 0) navigate('/amistosos')
    else setStep(step - 1)
  }

  function changeFormat(f) {
    setSetsFormat(f)
    setSets(emptySets(f))
  }

  async function submit() {
    setSaving(true)
    try {
      const body = {
        mode,
        club_id: club.id,
        court_label: court.trim() || null,
        date,
        start_time: time,
        duration_minutes: duration,
        court_price: total === '' ? null : Number(total),
        style,
        level: level.trim() || null,
        sets_format: setsFormat,
        visibility,
        me: { side: me.side, hand: me.hand, whatsapp: me.whatsapp.trim() || null },
        players: OTHER_SLOTS.map(([t, p]) => slotBody(t, p, slots[slotKey(t, p)])).filter(Boolean),
        ...(played ? { sets: normalizeSets(setsFormat, sets) } : {}),
      }
      const created = await api.friendlies.create(body)
      showToast(played ? 'Resultado enviado al equipo rival' : 'Partido publicado')
      if (created.warning) showToast(created.warning, 'error')
      navigate(`/amistoso/${created.id}`, { replace: true })
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const current = STEPS[step].id
  const titles = { tipo: '¿Qué querés cargar?', cancha: 'Cancha y horario', jugadores: 'Jugadores', detalles: played ? 'Resultado y detalles' : 'Detalles' }

  return (
    <div className="bg-base text-content font-sans">
      <div className="mx-auto px-4 sm:px-7 pt-8 sm:pt-10 max-w-2xl lg:max-w-5xl">
        <div className="mb-6">
          <p className="m-0 text-[11px] font-mono tracking-[2px] text-dim">NUEVO AMISTOSO</p>
          <h1 className="m-0 mt-1 font-condensed font-bold text-[22px] sm:text-[26px] text-white">{titles[current]}</h1>
        </div>

        <StepBar steps={STEPS} currentIdx={step} />

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10 lg:items-start">
          <div className="min-w-0">
            <div className="min-h-[300px] flex flex-col gap-6">
              {current === 'tipo' && <TipoStep mode={mode} onMode={setMode} />}

              {current === 'cancha' && (
                <>
                  <section className="flex flex-col gap-3">
                    <div>
                      <span className={LABEL}>CLUB</span>
                      <ClubSelector value={club} onChange={setClub} />
                    </div>
                    <div>
                      <label htmlFor="am-cancha" className={LABEL}>CANCHA (OPCIONAL)</label>
                      <input id="am-cancha" className={INPUT} value={court} maxLength={40} placeholder="Ej: Cancha 3" onChange={(e) => setCourt(e.target.value)} />
                    </div>
                  </section>
                  <section className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="am-fecha" className={LABEL}>FECHA</label>
                        <input id="am-fecha" type="date" className={INPUT} value={date} onChange={(e) => setDate(e.target.value)}
                          min={played ? undefined : todayIso()} max={played ? todayIso() : undefined} />
                      </div>
                      <div>
                        <label htmlFor="am-hora" className={LABEL}>HORA</label>
                        <input id="am-hora" type="time" step={1800} className={INPUT} value={time} onChange={(e) => setTime(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <span className={LABEL}>DURACIÓN</span>
                      <DurationPicker value={duration} onChange={setDuration} />
                    </div>
                  </section>
                  <section className="flex flex-col gap-2">
                    <span className={LABEL}>ALQUILER DE LA CANCHA (OPCIONAL)</span>
                    <div className="grid grid-cols-2 gap-3">
                      <MoneyInput id="am-total" label="Total" value={total}
                        onChange={(v) => { setTotal(v); setEach(perPersonFromTotal(v)) }} />
                      <MoneyInput id="am-cada" label="Por persona" value={each}
                        onChange={(v) => { setEach(v); setTotal(totalFromPerPerson(v)) }} />
                    </div>
                    <p className="m-0 text-[12px] text-secondary">Cargás uno y el otro se calcula entre 4.</p>
                  </section>
                </>
              )}

              {current === 'jugadores' && (
                <>
                  <section className="flex flex-col gap-2.5">
                    <span className={LABEL}>EQUIPO 1</span>
                    <div className="flex flex-col gap-3 p-3 rounded-lg bg-surface border border-border-mid">
                      <div className="flex items-center gap-2.5">
                        <PlayerAvatar name={user?.name} src={user?.avatar_url} size={30} />
                        <div className="min-w-0">
                          <div className="text-[14px] text-white font-semibold">Vos</div>
                          <div className="text-[11.5px] text-secondary">Creador{user?.category ? ` · ${user.category}` : ''}</div>
                        </div>
                      </div>
                      <div>
                        <span className={LABEL}>LADO PREFERIDO</span>
                        <SegButtons label="Tu lado preferido" options={SIDE_OPTIONS} value={me.side} allowEmpty onChange={(side) => setMe({ ...me, side })} />
                      </div>
                      <div>
                        <span className={LABEL}>MANO HÁBIL</span>
                        <SegButtons label="Tu mano hábil" options={HAND_OPTIONS} value={me.hand} allowEmpty onChange={(hand) => setMe({ ...me, hand })} />
                      </div>
                      <div>
                        <label htmlFor="am-wa" className={LABEL}>WHATSAPP (LO VEN SOLO LOS JUGADORES)</label>
                        <input id="am-wa" type="tel" inputMode="tel" className={INPUT} value={me.whatsapp} placeholder="Ej: 11 5555 1234"
                          onChange={(e) => setMe({ ...me, whatsapp: e.target.value })} />
                      </div>
                    </div>
                    <SlotEditor value={slots[slotKey(1, 2)] ?? null} excludeIds={takenIds}
                      emptyLabel="Compañero" emptyHint={played ? 'Usuario o nombre' : 'Opcional'}
                      onChange={(v) => setSlots({ ...slots, [slotKey(1, 2)]: v })} />
                  </section>
                  <section className="flex flex-col gap-2.5">
                    <span className={LABEL}>EQUIPO 2</span>
                    {[[2, 1], [2, 2]].map(([t, p]) => (
                      <SlotEditor key={slotKey(t, p)} value={slots[slotKey(t, p)] ?? null} excludeIds={takenIds}
                        emptyLabel={played ? 'Rival' : 'Lugar libre'} emptyHint={played ? 'Usuario o nombre' : 'Cargar a alguien'}
                        onChange={(v) => setSlots({ ...slots, [slotKey(t, p)]: v })} />
                    ))}
                    {!played && <p className="m-0 text-[12px] text-secondary">Los lugares libres los ocupa quien se sume desde Amistosos o con el link.</p>}
                    {played && <p className="m-0 text-[12px] text-secondary">El resultado suma cuando un rival con cuenta lo aprueba.</p>}
                  </section>
                </>
              )}

              {current === 'detalles' && (
                <>
                  <section>
                    <span className={LABEL}>FORMATO</span>
                    <SegButtons label="Formato" options={FORMAT_OPTIONS} value={setsFormat} onChange={changeFormat} />
                  </section>
                  {played && (
                    <section>
                      <span className={LABEL}>RESULTADO</span>
                      <SetsEditor setsFormat={setsFormat} sets={sets} onChange={setSets}
                        team1="Tu equipo" team2="Rivales" />
                    </section>
                  )}
                  <section>
                    <span className={LABEL}>ESTILO (OPCIONAL)</span>
                    <SegButtons label="Estilo" options={STYLE_OPTIONS} value={style} allowEmpty onChange={setStyle} />
                  </section>
                  {!played && (
                    <>
                      <section>
                        <label htmlFor="am-nivel" className={LABEL}>CATEGORÍA SUGERIDA (OPCIONAL)</label>
                        <input id="am-nivel" className={INPUT} value={level} maxLength={7} placeholder="Ej: C6 o C5-C7"
                          onChange={(e) => setLevel(e.target.value.toUpperCase())} />
                        <p className="m-0 mt-1.5 text-[12px] text-secondary">Estilo y categoría son referencias: no bloquean a nadie.</p>
                      </section>
                      <section>
                        <span className={LABEL}>QUIÉN LO VE</span>
                        <VisibilityPicker value={visibility} onChange={setVisibility} />
                      </section>
                    </>
                  )}
                </>
              )}

              {error && <p role="alert" className="m-0 text-danger text-[13px]">{error}</p>}
            </div>

            <div className="sticky bottom-0 z-30 -mx-4 sm:-mx-7 lg:mx-0 mt-8 px-4 sm:px-7 lg:px-0 py-3 bg-base/95 backdrop-blur border-t border-border flex gap-3">
              <Btn size="lg" icon={ChevronLeft} onClick={back}>{step === 0 ? 'VOLVER' : 'ATRÁS'}</Btn>
              <Btn variant="primary" size="lg" full onClick={next} loading={saving}>
                {step < STEPS.length - 1 ? <>SIGUIENTE<ChevronRight size={17} /></> : played ? 'ENVIAR RESULTADO' : 'PUBLICAR'}
              </Btn>
            </div>
          </div>

          <aside className="hidden lg:block sticky top-6 bg-surface border border-border-mid rounded-xl p-5" aria-label="Resumen del amistoso">
            <p className="m-0 mb-4 font-condensed font-bold text-[13px] tracking-widest text-white">RESUMEN</p>
            <Resumen titulo="TIPO">{played ? 'Partido ya jugado' : 'Partido abierto'}</Resumen>
            <Resumen titulo="CUÁNDO Y DÓNDE">
              {date && time ? `${longDate(date)} · ${time} a ${endTime(time, duration)}` : 'Sin fecha'}
              {club && <span className="block text-secondary">{club.name}{court ? ` · ${court}` : ''}</span>}
            </Resumen>
            {total !== '' && <Resumen titulo="ALQUILER">{formatMoney(Number(each))} por persona</Resumen>}
            <Resumen titulo="JUGADORES">
              {step >= 2 ? `${filledCount + 1} de 4${played ? '' : ` · ${3 - filledCount} libres`}` : 'Siguiente paso'}
            </Resumen>
            {style && <Resumen titulo="ESTILO">{STYLE_LABEL[style]}</Resumen>}
          </aside>
        </div>
      </div>
    </div>
  )
}

function TipoStep({ mode, onMode }) {
  const opts = [
    { id: 'abierto', title: 'PARTIDO ABIERTO', text: 'Tenés cancha reservada y te faltan jugadores. Lo publicás para todos o lo compartís solo por link.', icon: UserPlus },
    { id: 'jugado', title: 'YA LO JUGUÉ', text: 'Cargás jugadores y resultado. Suma al perfil cuando un rival lo aprueba.', icon: Check },
  ]
  return (
    <div role="radiogroup" aria-label="Tipo de amistoso" className="grid gap-3 sm:grid-cols-2">
      {opts.map((o) => {
        const Icon = o.icon
        const on = mode === o.id
        return (
          <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => onMode(o.id)}
            className={`text-left p-4 rounded-xl flex gap-3.5 items-start cursor-pointer font-sans transition-colors ${on ? 'border-2 border-brand bg-brand/10' : 'border border-border-mid bg-surface hover:border-border-strong'}`}>
            <span className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${on ? 'bg-brand text-base' : 'bg-border text-content'}`}><Icon size={20} /></span>
            <span className="flex flex-col gap-1">
              <span className="font-condensed font-bold text-[13px] tracking-wide text-white">{o.title}</span>
              <span className="text-[13px] text-soft leading-snug">{o.text}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function Resumen({ titulo, children }) {
  return (
    <div className="py-3.5 border-t border-border first:border-t-0 first:pt-0">
      <span className="block text-[10px] font-mono tracking-[2px] text-dim mb-1.5">{titulo}</span>
      <div className="text-[13px] text-white">{children}</div>
    </div>
  )
}
