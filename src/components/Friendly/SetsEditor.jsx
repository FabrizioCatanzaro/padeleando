import { Minus, Plus } from 'lucide-react'
import { normalizeSets, resultSummary } from '../../utils/friendlies'

const MAX_GAMES = 7

export default function SetsEditor({ setsFormat, sets, onChange, team1, team2 }) {
  const visible = normalizeSets(setsFormat, sets)
  const summary = resultSummary(setsFormat, visible)

  function bump(i, key, delta) {
    const nextSets = [...visible]
    const cur = nextSets[i] ?? { s1: 0, s2: 0 }
    const value = Math.min(MAX_GAMES, Math.max(0, Number(cur[key]) + delta))
    nextSets[i] = { ...cur, [key]: value }
    onChange(normalizeSets(setsFormat, nextSets))
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-[56px_minmax(0,1fr)_minmax(0,1fr)] gap-2 items-center">
        <span />
        <span className="text-[11.5px] text-secondary text-center font-semibold truncate">{team1}</span>
        <span className="text-[11.5px] text-secondary text-center font-semibold truncate">{team2}</span>
        {visible.map((s, i) => (
          <SetRow key={i} index={i} s={s} onBump={bump} team1={team1} team2={team2} />
        ))}
      </div>
      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface-alt text-[13px]">
        <span className="text-secondary">Así queda</span>
        <span className="text-white font-semibold">
          {summary.ready
            ? <>Ganan {summary.winner === 1 ? team1 : team2} <span className="text-brand">{summary.score.join('-')}</span></>
            : summary.error ?? 'Falta definir'}
        </span>
      </div>
    </div>
  )
}

function SetRow({ index, s, onBump, team1, team2 }) {
  return (
    <>
      <span className="text-[10px] tracking-[0.14em] text-secondary font-bold">SET {index + 1}</span>
      <Stepper value={s.s1} strong={s.s1 > s.s2} label={`${team1}, set ${index + 1}`}
        onMinus={() => onBump(index, 's1', -1)} onPlus={() => onBump(index, 's1', 1)} />
      <Stepper value={s.s2} strong={s.s2 > s.s1} label={`${team2}, set ${index + 1}`}
        onMinus={() => onBump(index, 's2', -1)} onPlus={() => onBump(index, 's2', 1)} />
    </>
  )
}

function Stepper({ value, strong, label, onMinus, onPlus }) {
  return (
    <div className="h-12 rounded-sm border border-border-mid bg-surface flex items-center justify-between">
      <button type="button" onClick={onMinus} aria-label={`Restar un game: ${label}`}
        className="w-11 h-full flex items-center justify-center bg-transparent border-0 text-soft cursor-pointer hover:text-white"><Minus size={16} /></button>
      <span aria-live="polite" className={`font-condensed text-[18px] tabular-nums ${strong ? 'text-white font-extrabold' : 'text-muted font-semibold'}`}>{value}</span>
      <button type="button" onClick={onPlus} aria-label={`Sumar un game: ${label}`}
        className="w-11 h-full flex items-center justify-center bg-transparent border-0 text-soft cursor-pointer hover:text-white"><Plus size={16} /></button>
    </div>
  )
}
