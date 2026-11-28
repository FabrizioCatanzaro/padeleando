import { FORMAT_META } from '../../../utils/tournamentCard'

export function LevelTag({ level }) {
  if (!level) return null
  return <span className="shrink-0 font-sans text-[12px] font-extrabold text-(color:--color-base) bg-white rounded-md px-[7px] py-[3px] leading-none">{level}</span>
}

export function FormatPill({ format }) {
  const m = FORMAT_META[format]
  if (!m) return null
  return <span className={`shrink-0 font-sans text-[11.5px] font-bold rounded-full px-2 py-[3px] leading-none ${m.cls}`}>{m.label}</span>
}

export function StatusText({ status, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-sans text-[12.5px] font-semibold ${status.cls} ${className}`}>
      {status.dot && <span className={`w-[7px] h-[7px] rounded-full bg-current ${status.pulse ? 'animate-pulse motion-reduce:animate-none' : ''}`} />}
      {status.label}
    </span>
  )
}

export function CardTags({ m, children }) {
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      <LevelTag level={m.level} />
      <FormatPill format={m.format} />
      {children}
    </span>
  )
}
