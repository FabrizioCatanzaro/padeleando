import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import DateStub, { DateChip } from './DateStub'
import { CardTags, StatusText } from './CardBits'

/** Fila de lista. `slot` es el dato que importa según el estado; `trailing`, una columna extra (el rol). */
export default function TournamentRow({ m, to, slot = null, trailing = null, meta = null, first = false }) {
  const cols = trailing
    ? 'sm:grid-cols-[56px_minmax(0,1fr)_180px_auto_16px]'
    : 'sm:grid-cols-[56px_minmax(0,1fr)_200px_16px]'
  return (
    <Link to={to}
      className={`grid grid-cols-[56px_minmax(0,1fr)_16px] ${cols} gap-3 sm:gap-4 items-center px-3.5 sm:px-4 py-3.5 no-underline hover:bg-surface-alt transition-colors focus-visible:outline-2 focus-visible:outline-brand focus-visible:-outline-offset-2 ${first ? '' : 'border-t border-border'}`}>
      {m.image ? (
        <span className="relative w-14 h-[75px] rounded-[10px] overflow-hidden bg-surface-alt">
          <img src={m.image} alt="" width="56" height="75" loading="lazy" className={`w-full h-full object-cover ${m.status === 'finished' ? 'grayscale-[.7] brightness-90' : ''}`} />
          <DateChip day={m.day} small />
        </span>
      ) : <DateStub day={m.day} tone={m.tone} />}

      <span className="min-w-0">
        <span className="flex items-center gap-2.5 min-w-0">
          <CardTags m={m} />
          <StatusText status={m.statusText} className="truncate" />
        </span>
        <span className="block font-sans font-bold text-[16px] text-white truncate mt-1.5 mb-1">{m.name}</span>
        <span className="flex items-center gap-2 font-sans text-[12.5px] text-secondary min-w-0 whitespace-nowrap">
          {meta}
        </span>
        {(slot || trailing) && (
          <span className="sm:hidden flex items-center justify-between gap-2 mt-2 pt-2 border-t border-dashed border-border-mid font-sans text-[12.5px]">
            <span className="min-w-0">{slot}</span>
            {trailing}
          </span>
        )}
      </span>

      <span className="hidden sm:block min-w-0 font-sans text-[12.5px]">{slot}</span>
      {trailing && <span className="hidden sm:block justify-self-end">{trailing}</span>}
      <ChevronRight size={16} className="text-dim shrink-0" aria-hidden="true" />
    </Link>
  )
}
