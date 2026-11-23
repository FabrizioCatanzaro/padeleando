import { MapPin, Loader2 } from 'lucide-react'
import ClubLogo from '../../shared/ClubLogo'

const MAX = 4

export default function ClubesCerca({ clubs = [], status, onFetch, onOpen }) {
  if (status === 'unsupported') return null
  return (
    <section aria-labelledby="clubes-cerca-title">
      <h2 id="clubes-cerca-title" className="m-0 mb-2 font-sans text-[11px] font-bold tracking-[2px] text-muted">CLUBES CERCA</h2>
      {status === 'done' && clubs.length > 0 && clubs.slice(0, MAX).map((c) => (
        <button key={c.id} type="button" onClick={() => onOpen(c.id)}
          className="w-full flex items-center gap-3 py-2.5 bg-transparent border-0 border-b border-border text-left cursor-pointer group">
          <ClubLogo name={c.name} src={c.photo_url} size={36} />
          <span className="flex-1 min-w-0">
            <span className="block font-sans font-bold text-[13px] text-white truncate group-hover:text-brand transition-colors">{c.name}</span>
            {c.distance_km != null && <span className="block font-sans text-[11px] text-dim">a {Number(c.distance_km).toLocaleString('es-AR', { maximumFractionDigits: 1 })} km</span>}
          </span>
        </button>
      ))}
      {status === 'done' && clubs.length === 0 && (
        <p className="m-0 font-sans text-[12px] text-dim">No hay clubes en un radio de 20 km.</p>
      )}
      {status === 'loading' && <div className="flex justify-center py-4 text-muted"><Loader2 size={18} className="animate-spin" /></div>}
      {(status === 'idle' || status === 'denied' || status === 'error') && (
        <button type="button" onClick={onFetch}
          className="w-full h-10 rounded-lg border border-border-strong bg-transparent text-content font-sans font-bold text-[12px] cursor-pointer hover:text-white inline-flex items-center justify-center gap-2">
          <MapPin size={15} />{status === 'denied' ? 'Permitir ubicación' : 'Ver clubes cerca'}
        </button>
      )}
    </section>
  )
}
