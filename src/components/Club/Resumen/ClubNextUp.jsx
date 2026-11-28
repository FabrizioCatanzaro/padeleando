import { Link } from 'react-router-dom'
import { Radio } from 'lucide-react'
import { eventDate } from '../../../utils/clubPage'
import { FORMAT_META } from '../../../utils/tournamentCard'

// Lo que se está jugando gana sobre lo que viene: es lo único de la página que caduca en horas
export default function ClubNextUp({ events }) {
  const proximo = events.ongoing?.[0] ?? events.upcoming?.[0] ?? null
  if (!proximo) return null
  const enVivo = (events.ongoing?.length ?? 0) > 0
  const pd = eventDate(proximo)
  return (
    <Link to={`/cat/${proximo.group_id}/torneo/${proximo.id}`}
      className={`flex items-center gap-4 flex-wrap rounded-xl px-4 py-3.5 no-underline border ${enVivo ? 'border-green/40 bg-green/7' : 'border-brand/30 bg-brand/6'}`}>
      <div className="shrink-0 text-center min-w-[58px]">
        <div className={`font-condensed font-black text-[28px] leading-none ${enVivo ? 'text-green' : 'text-brand'}`}>{pd ? String(pd.getDate()).padStart(2, '0') : '--'}</div>
        <div className="text-[11px] text-secondary mt-1">{pd ? pd.toLocaleDateString('es-AR', { month: 'long' }) : ''}</div>
      </div>
      <div className="min-w-0 flex-[1_1_220px]">
        <span className={`inline-flex items-center gap-1.5 text-[12px] font-bold rounded-md px-2 py-0.5 ${enVivo ? 'text-green border border-green/45' : 'bg-brand text-base'}`}>
          {enVivo && <Radio size={11} aria-hidden="true" />}{enVivo ? 'Se está jugando' : 'Lo próximo'}
        </span>
        <div className="font-condensed font-bold text-[16px] text-white leading-tight mt-2">{proximo.name}</div>
        <div className="text-[13px] text-secondary mt-1 truncate">
          {[FORMAT_META[proximo.format]?.label, proximo.group_name, proximo.owner_username && `@${proximo.owner_username}`].filter(Boolean).join(' · ')}
        </div>
      </div>
      <span className={`shrink-0 inline-flex items-center px-3.5 py-2 rounded-lg text-[13px] font-bold ${enVivo ? 'bg-brand text-base' : 'border border-border-strong text-content'}`}>
        {enVivo ? 'Ver en vivo' : 'Ver el torneo'}
      </span>
    </Link>
  )
}
