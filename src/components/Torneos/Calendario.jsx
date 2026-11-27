import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { api } from '../../utils/api'
import { dayKey } from '../../utils/agenda'
import { FORMAT_META, cardModel, countLabel, parseDay } from '../../utils/tournamentCard'
import { formatPrice } from '../../utils/signup'
import TournamentTile from '../shared/tournament/TournamentTile'
import { TextFooter } from '../shared/tournament/TileFooters'
import AdInline from '../shared/AdInline'
import AdRail from '../shared/AdRail'

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const HEADS = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do']
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const monthKey = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`

function monthDays(y, m) {
  const total = new Date(y, m + 1, 0).getDate()
  return Array.from({ length: total }, (_, i) => dayKey(new Date(y, m, i + 1)))
}

function footerFor(t) {
  if (t.live) return <TextFooter strong="Hay un partido en juego" strongCls="text-danger" />
  if (t.signup?.open) return <TextFooter strong="Inscripción abierta" strongCls="text-green">{formatPrice(t.signup.price, t.signup.unit)}</TextFooter>
  return t.player_count > 0 ? <TextFooter>{countLabel(t.player_count, 'jugador', 'jugadores')}</TextFooter> : null
}

function Dots({ list, on }) {
  return (
    <span className="flex gap-[3px] h-1.5" aria-hidden="true">
      {list.slice(0, 3).map((t) => <span key={t.id} className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-(--color-base)' : FORMAT_META[t.format]?.dot ?? 'bg-muted'}`} />)}
    </span>
  )
}

function DayButton({ k, list, selected, today, onPick, strip = false }) {
  const d = parseDay(k)
  const past = k < today
  const label = `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}, ${list.length ? countLabel(list.length, 'torneo', 'torneos') : 'sin torneos'}`
  const tone = selected
    ? 'bg-brand border-brand text-(color:--color-base)'
    : `${strip ? 'bg-surface border-border' : 'bg-transparent border-transparent'} ${k === today ? 'border-brand!' : ''} ${past ? 'text-muted' : 'text-white'} hover:bg-surface-alt`
  return (
    <button type="button" onClick={() => onPick(k)} aria-pressed={selected} aria-label={label}
      className={`rounded-[10px] border flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${strip ? 'shrink-0 w-12 h-[66px]' : 'h-12'} ${tone}`}>
      {strip && <span className="font-sans text-[11px] font-semibold opacity-80">{k === today ? 'hoy' : HEADS[(d.getDay() + 6) % 7]}</span>}
      <span className={`font-sans ${strip ? 'text-[17px]' : 'text-[14px]'} ${selected || list.length ? 'font-extrabold' : 'font-medium'}`}>{d.getDate()}</span>
      <Dots list={list} on={selected} />
    </button>
  )
}

export default function Calendario() {
  const today = dayKey()
  const now = parseDay(today)
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [sel, setSel] = useState(today)
  const [cache, setCache] = useState({})
  const [showMonth, setShowMonth] = useState(false)
  const stripRef = useRef(null)
  const mk = monthKey(view.y, view.m)
  const days = useMemo(() => monthDays(view.y, view.m), [view.y, view.m])

  useEffect(() => {
    if (cache[mk]) return
    let cancelled = false
    api.home.calendar(days[0], days[days.length - 1])
      .then((d) => { if (!cancelled) setCache((c) => ({ ...c, [mk]: d.tournaments ?? [] })) })
      .catch(() => { if (!cancelled) setCache((c) => ({ ...c, [mk]: [] })) })
    return () => { cancelled = true }
  }, [mk, days, cache])

  const rows = cache[mk]
  const byDay = useMemo(() => {
    const map = {}
    for (const t of rows ?? []) (map[t.event_date] ??= []).push(t)
    return map
  }, [rows])

  useEffect(() => {
    const strip = stripRef.current
    const btn = strip?.querySelector('[aria-pressed="true"]')
    if (btn) strip.scrollLeft = btn.offsetLeft - strip.offsetLeft - (strip.clientWidth - btn.clientWidth) / 2
  }, [sel, rows])

  const move = (delta) => {
    const d = new Date(view.y, view.m + delta, 1)
    setView({ y: d.getFullYear(), m: d.getMonth() })
    setSel(dayKey(d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() ? now : d))
  }
  const goToday = () => { setView({ y: now.getFullYear(), m: now.getMonth() }); setSel(today) }

  const lead = (new Date(view.y, view.m, 1).getDay() + 6) % 7
  const selDate = parseDay(sel)
  const list = byDay[sel] ?? []
  const next = days.find((k) => k > sel && k >= today && byDay[k]?.length)
  const monthLabel = `${cap(MONTHS[view.m])} ${view.y}`

  return (
    <AdRail>
      <div className="@container flex flex-col gap-6">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 @3xl:grid-cols-[320px_minmax(0,1fr)] items-start">
          <div className="min-w-0 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => move(-1)} aria-label="Mes anterior" className="w-11 h-11 rounded-[10px] border border-border-mid bg-transparent text-content flex items-center justify-center cursor-pointer hover:text-white"><ChevronLeft size={16} /></button>
              <h2 className="m-0 font-sans text-[16px] font-bold text-white" aria-live="polite">{monthLabel}</h2>
              <button type="button" onClick={() => move(1)} aria-label="Mes siguiente" className="w-11 h-11 rounded-[10px] border border-border-mid bg-transparent text-content flex items-center justify-center cursor-pointer hover:text-white"><ChevronRight size={16} /></button>
            </div>

            <div ref={stripRef} className={`${showMonth ? 'hidden' : 'flex'} lg:hidden gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]`}>
              {days.map((k) => <DayButton key={k} k={k} list={byDay[k] ?? []} selected={k === sel} today={today} onPick={setSel} strip />)}
            </div>

            <div className={`${showMonth ? 'block' : 'hidden'} lg:block rounded-2xl bg-surface border border-border p-4`}>
              <div className="grid grid-cols-7 gap-1">
                {HEADS.map((h) => <span key={h} className="text-center font-sans text-[11.5px] font-semibold text-muted pb-1.5">{h}</span>)}
                {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
                {days.map((k) => <DayButton key={k} k={k} list={byDay[k] ?? []} selected={k === sel} today={today} onPick={(v) => { setSel(v); setShowMonth(false) }} />)}
              </div>
              <div className="flex flex-wrap gap-3.5 mt-4 pt-3.5 border-t border-border font-sans text-[12px] text-secondary">
                {Object.entries(FORMAT_META).map(([f, m]) => (
                  <span key={f} className="inline-flex items-center gap-1.5"><span className={`w-[7px] h-[7px] rounded-full ${m.dot}`} />{m.label}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-0 flex flex-col gap-3.5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="m-0 font-sans text-[19px] font-extrabold text-white">{cap(DAYS[selDate.getDay()])} {selDate.getDate()} de {MONTHS[selDate.getMonth()]}</h2>
                <p className="m-0 mt-0.5 font-sans text-[13px] text-secondary">{rows ? (list.length ? countLabel(list.length, 'torneo', 'torneos') : 'Sin torneos') : 'Buscando torneos'}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowMonth((v) => !v)} className="lg:hidden h-9 px-3.5 rounded-full border border-border-strong bg-transparent font-sans text-[12.5px] font-semibold text-content inline-flex items-center gap-1.5 cursor-pointer">
                  <CalendarDays size={14} />{showMonth ? 'Ver días' : 'Ver mes'}
                </button>
                {sel !== today && <button type="button" onClick={goToday} className="h-9 px-3.5 rounded-full border border-border-strong bg-transparent font-sans text-[12.5px] font-semibold text-content cursor-pointer hover:text-white">Hoy</button>}
              </div>
            </div>

            {!rows && <div className="flex justify-center py-10 text-muted"><Loader2 size={18} className="animate-spin" /></div>}
            {rows && list.map((t) => <TournamentTile key={t.id} m={cardModel(t, { today })} to={`/view/${t.id}`} footer={footerFor(t)} />)}
            {rows && list.length === 0 && (
              <div className="p-5 rounded-[14px] border border-dashed border-border-strong flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="m-0 font-sans text-[14px] font-bold text-white">No hay torneos este día</p>
                  <p className="m-0 mt-1 font-sans text-[13px] text-secondary">
                    {next ? `El próximo es el ${DAYS[parseDay(next).getDay()]} ${parseDay(next).getDate()}.` : `No hay más torneos en ${MONTHS[view.m]}.`}
                  </p>
                </div>
                {next
                  ? <button type="button" onClick={() => setSel(next)} className="h-10 px-4 rounded-full border border-brand/50 bg-transparent font-sans text-[13px] font-bold text-brand cursor-pointer">Ver ese día</button>
                  : <button type="button" onClick={() => move(1)} className="h-10 px-4 rounded-full border border-border-strong bg-transparent font-sans text-[13px] font-bold text-content cursor-pointer">Ver {MONTHS[(view.m + 1) % 12]}</button>}
              </div>
            )}
          </div>
        </div>
        <AdInline className="mt-2" />
      </div>
    </AdRail>
  )
}
