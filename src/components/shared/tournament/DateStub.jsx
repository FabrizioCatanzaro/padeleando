import { dateParts } from '../../../utils/tournamentCard'

const TONE = {
  upcoming: 'bg-surface-alt border-border-strong',
  soon:     'bg-surface-alt border-brand/50',
  live:     'bg-danger/10 border-danger/60',
  done:     'bg-transparent border-border-mid',
  none:     'bg-transparent border-dashed border-border-strong',
}

export default function DateStub({ day, tone = 'upcoming', className = '' }) {
  const p = dateParts(day)
  return (
    <span className={`w-14 h-[62px] shrink-0 rounded-[10px] border flex flex-col items-center justify-center leading-[1.1] ${TONE[tone]} ${className}`}>
      {p ? (
        <>
          {tone === 'live'
            ? <span className="inline-flex items-center gap-1 font-sans text-[10.5px] font-bold text-danger"><span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse motion-reduce:animate-none" />vivo</span>
            : <span className="font-sans text-[11px] font-semibold text-secondary">{p.dow}</span>}
          <span className={`font-condensed font-bold text-[19px] my-0.5 ${tone === 'done' ? 'text-secondary' : 'text-white'}`}>{p.day}</span>
          <span className="font-sans text-[11px] font-semibold text-secondary">{p.month}</span>
        </>
      ) : (
        <span className="font-sans text-[11px] font-semibold text-secondary text-center leading-tight">sin<br />fecha</span>
      )}
    </span>
  )
}

/** La fecha apoyada sobre la foto. */
export function DateChip({ day, live = false, small = false }) {
  const p = dateParts(day)
  return (
    <span className={`absolute left-1.5 bottom-1.5 rounded-lg bg-photo-shade/80 flex flex-col items-center leading-[1.1] ${small ? 'min-w-9 px-1 py-0.5' : 'min-w-11 px-1.5 py-1'}`}>
      {p ? (
        <>
          {!small && (live
            ? <span className="inline-flex items-center gap-1 font-sans text-[10px] font-bold text-danger"><span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse motion-reduce:animate-none" />vivo</span>
            : <span className="font-sans text-[10px] font-bold text-photo-ink/80">{p.dow}</span>)}
          <span className={`font-condensed font-bold text-photo-ink ${small ? 'text-[13px]' : 'text-[17px]'}`}>{p.day}</span>
          <span className="font-sans text-[10px] font-bold text-photo-ink/80">{p.month}</span>
        </>
      ) : <span className="font-sans text-[10px] font-bold text-photo-ink/80 py-0.5">sin fecha</span>}
    </span>
  )
}
