import { useEffect, useId } from 'react'
import { X, Plus, Globe, Link2 } from 'lucide-react'
import PlayerAvatar from '../shared/PlayerAvatar'
import { STATUS_LABEL, dayBlock, playerName, playerDetail, isFilled } from '../../utils/friendlies'

export const LABEL = 'block text-[10px] tracking-[2px] text-muted font-mono mb-2'
export const INPUT = 'w-full bg-surface border border-border-mid text-white px-3.5 py-2.5 font-sans text-[14px] rounded-sm outline-none focus:border-border-strong'

export function SegButtons({ options, value, onChange, label, allowEmpty = false }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid border border-border-mid rounded-sm overflow-hidden"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const on = value === o.id
        return (
          <button key={o.id} type="button" role="radio" aria-checked={on}
            onClick={() => onChange(on && allowEmpty ? null : o.id)}
            className={`min-h-11 px-2 text-[13px] font-sans cursor-pointer border-0 transition-colors ${on ? 'bg-brand text-base font-bold' : 'bg-surface text-content hover:text-white'}`}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

const STATUS_STYLE = {
  abierto: 'bg-brand/10 border-brand/40 text-brand',
  completo: 'bg-cyan/10 border-cyan/40 text-cyan',
  falta_resultado: 'bg-surface-alt border-border-strong text-content',
  por_confirmar: 'bg-surface-alt border-border-strong text-content',
  confirmado: 'bg-green/10 border-green/40 text-green',
  cancelado: 'bg-surface-alt border-border-mid text-muted',
  vencido: 'bg-surface-alt border-border-mid text-muted',
}

export function StatusChip({ status, extra, highlight = false }) {
  const cls = highlight ? 'bg-brand border-brand text-base' : STATUS_STYLE[status] ?? STATUS_STYLE.cancelado
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border text-[10.5px] font-bold tracking-[0.12em] ${cls}`}>
      {STATUS_LABEL[status] ?? status}{extra ? ` · ${extra}` : ''}
    </span>
  )
}

export function DayBlock({ date, time }) {
  const b = dayBlock(date)
  return (
    <div className="w-14 shrink-0 rounded-md bg-surface-alt flex flex-col items-center justify-center py-2">
      <span className="text-[10px] tracking-[0.12em] text-secondary font-bold">{b.dow}</span>
      <span className="font-condensed text-[20px] font-extrabold text-white leading-tight">{b.day}</span>
      <span className="text-[12px] text-brand font-bold">{time}</span>
    </div>
  )
}

export function LevelChip({ level }) {
  if (!level) return null
  return <span className="shrink-0 text-[11px] font-bold text-cyan border border-cyan/30 rounded px-1.5 py-0.5">{level}</span>
}

function FreeDot() {
  return (
    <span className="w-7 h-7 rounded-full border-[1.5px] border-dashed border-brand text-brand flex items-center justify-center" aria-hidden="true">
      <Plus size={12} strokeWidth={3} />
    </span>
  )
}

export function MiniLineup({ players }) {
  const team = (t) => players.filter((p) => p.team === t)
  const render = (p) => (isFilled(p)
    ? <PlayerAvatar key={`${p.team}${p.position}`} name={playerName(p)} src={p.user?.avatar_url} size={28} />
    : <FreeDot key={`${p.team}${p.position}`} />)
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      <div className="flex gap-1">{team(1).map(render)}</div>
      <span className="text-[10px] text-muted font-bold tracking-widest">VS</span>
      <div className="flex gap-1">{team(2).map(render)}</div>
    </div>
  )
}

export function PlayerRow({ p, me, onOpenProfile, action, detailAction }) {
  const name = playerName(p)
  return (
    <div className="flex items-center gap-2.5 min-h-11">
      <button type="button" disabled={!p.user} onClick={() => p.user && onOpenProfile?.(p.user.username)}
        className="bg-transparent border-0 p-0 cursor-pointer disabled:cursor-default shrink-0" aria-label={p.user ? `Ver perfil de ${name}` : undefined}>
        <PlayerAvatar name={name} src={p.user?.avatar_url} size={38} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[14px] text-white font-semibold">
          <span className="truncate">{me ? `${name} (vos)` : name}</span>
          {p.is_creator && <span className="shrink-0 text-[9.5px] font-bold tracking-wide bg-brand text-base rounded-sm px-1.5 py-px">CREADOR</span>}
        </div>
        {detailAction ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 text-[12px] leading-[18px] text-secondary">
            {playerDetail(p, { accountLabel: false }) && <span className="whitespace-nowrap">{playerDetail(p, { accountLabel: false })}</span>}
            {detailAction}
          </div>
        ) : (
          <div className="text-[12px] text-secondary truncate">{playerDetail(p) || ' '}</div>
        )}
      </div>
      {action}
    </div>
  )
}

export function Sheet({ title, subtitle, onClose, children }) {
  const titleId = useId()
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-1000 bg-black/70 flex items-end sm:items-center justify-center sm:p-5"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-surface border-t sm:border border-border-strong rounded-t-2xl sm:rounded-xl px-4 pt-3 pb-6 sm:p-6 flex flex-col gap-4">
        <div aria-hidden="true" className="sm:hidden self-center w-10 h-1 rounded-full bg-border-strong" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="m-0 font-condensed font-extrabold text-[15px] text-white tracking-wide">{title}</h2>
            {subtitle && <p className="m-0 mt-1 text-[12.5px] text-secondary leading-snug">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            className="w-11 h-11 -mt-2 -mr-2 shrink-0 flex items-center justify-center bg-transparent border-0 text-content hover:text-white cursor-pointer">
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

const DURATIONS = [60, 90, 120]
const OTHER_DURATIONS = [30, 150, 180, 210, 240]
const VIS_OPTIONS = [
  { id: 'publico', label: 'Público', hint: 'Aparece en Amistosos para todos', icon: Globe },
  { id: 'link', label: 'Solo con link', hint: 'Entra quien reciba el link', icon: Link2 },
]

export function ChoiceChip({ on, onClick, children }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`h-11 px-4 rounded-sm border text-[13px] font-sans cursor-pointer ${on ? 'bg-brand border-brand text-base font-bold' : 'bg-surface border-border-mid text-content hover:text-white'}`}>
      {children}
    </button>
  )
}

export function MoneyInput({ id, label, value, onChange }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[12px] text-soft mb-1.5">{label}</label>
      <div className="flex items-center bg-surface border border-border-mid rounded-sm focus-within:border-border-strong">
        <span className="pl-3 text-muted text-[14px]" aria-hidden="true">$</span>
        <input id={id} type="text" inputMode="numeric" value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 8))}
          className="w-full bg-transparent border-0 text-white px-2 py-2.5 font-sans text-[14px] outline-none" />
      </div>
    </div>
  )
}

export function DurationPicker({ value, onChange }) {
  const preset = DURATIONS.includes(value)
  return (
    <div className="flex flex-wrap gap-2">
      {DURATIONS.map((d) => <ChoiceChip key={d} on={value === d} onClick={() => onChange(d)}>{d} min</ChoiceChip>)}
      <select aria-label="Otra duración" value={preset ? '' : value}
        onChange={(e) => e.target.value && onChange(Number(e.target.value))}
        className={`h-11 px-3 rounded-sm border text-[13px] font-sans cursor-pointer ${preset ? 'bg-surface border-border-mid text-content' : 'bg-brand border-brand text-base font-bold'}`}>
        <option value="">Otra</option>
        {[...new Set([...OTHER_DURATIONS, ...(preset ? [] : [value])])].sort((a, b) => a - b)
          .map((d) => <option key={d} value={d}>{d} min</option>)}
      </select>
    </div>
  )
}

export function VisibilityPicker({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Visibilidad" className="flex flex-col gap-2">
      {VIS_OPTIONS.map((o) => {
        const Icon = o.icon
        const on = value === o.id
        return (
          <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.id)}
            className={`min-h-14 px-3 rounded-lg border bg-surface flex items-center gap-3 text-left cursor-pointer font-sans ${on ? 'border-brand' : 'border-border-mid'}`}>
            <Icon size={18} className={on ? 'text-brand' : 'text-secondary'} />
            <span className="flex-1">
              <span className="block text-[14px] text-white font-semibold">{o.label}</span>
              <span className="block text-[12px] text-secondary">{o.hint}</span>
            </span>
            <span className={`w-[18px] h-[18px] rounded-full ${on ? 'border-[5px] border-brand' : 'border-[1.5px] border-border-strong'}`} />
          </button>
        )
      })}
    </div>
  )
}
