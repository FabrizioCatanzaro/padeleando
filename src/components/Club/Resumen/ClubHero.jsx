import { Link, useNavigate } from 'react-router-dom'
import { Building2, ChevronLeft, MapPin, Navigation, MessageCircle, Phone, Camera, Pencil } from 'lucide-react'
import { whatsappLink } from '../clubForm'
import { formatMoney } from '../../../utils/money'
import courtBg from '../../../assets/padelcourt.webp'

const ghost = 'inline-flex items-center justify-center gap-2 border border-photo-ink/35 text-photo-ink rounded-[10px] text-sm font-semibold no-underline hover:bg-photo-shade/40 transition-colors'

// Portada del club: foto propia o la predeterminada, con lo que la gente viene a hacer
export default function ClubHero({ club, maps, status, price, canManage, onReservar, bookable, follow = null }) {
  const navigate = useNavigate()
  return (
    <section aria-label="Portada" className="relative overflow-hidden border-b border-border min-h-[300px] sm:min-h-[340px] flex items-end">
      <img src={club.header_url || courtBg} alt="" aria-hidden="true" width="1600" height="600"
        className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'grayscale(20%) brightness(0.75)' }} />
      <div aria-hidden="true" className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, color-mix(in srgb, var(--color-photo-shade) 95%, transparent) 8%, color-mix(in srgb, var(--color-photo-shade) 35%, transparent) 70%, color-mix(in srgb, var(--color-photo-shade) 55%, transparent))' }} />

      <div className="absolute top-4 left-4 right-4 sm:left-6 sm:right-6 flex justify-between gap-2 z-10">
        <button type="button" onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 bg-photo-shade/55 text-photo-ink text-[13px] px-3 py-2 rounded-lg border-0 cursor-pointer hover:bg-photo-shade/75">
          <ChevronLeft size={14} /> Volver
        </button>
        {canManage && (
          <div className="flex gap-2 flex-wrap justify-end">
            <Link to={`/club/${club.id}/editar#portada`} className={`${ghost} bg-photo-shade/55 px-3 py-2 text-[13px]`}>
              <Camera size={14} /> Cambiar portada
            </Link>
            <Link to={`/club/${club.id}/editar`}
              className="inline-flex items-center gap-2 bg-brand text-base rounded-lg px-3 py-2 text-[13px] font-bold no-underline">
              <Pencil size={14} /> Editar club
            </Link>
          </div>
        )}
      </div>

      <div className="relative w-full px-5 sm:px-7 pb-6 pt-20 flex flex-wrap items-end justify-between gap-5">
        <div className="flex items-end gap-4 sm:gap-5 min-w-0">
          <div className="w-[72px] h-[72px] sm:w-24 sm:h-24 rounded-2xl bg-surface border border-border-strong overflow-hidden shrink-0 flex items-center justify-center shadow-lg shadow-photo-shade/40">
            {club.photo_url
              ? <img src={club.photo_url} alt={club.name} width="96" height="96" className="w-full h-full object-contain" />
              : <Building2 size={34} className="text-border-strong" />}
          </div>
          <div className="min-w-0">
            <h1 className="m-0 font-condensed font-black text-[26px] sm:text-[36px] leading-[1.03] text-photo-ink text-balance">{club.name}</h1>
            {club.location_name && (maps ? (
              <a href={maps} target="_blank" rel="noreferrer"
                className="group inline-flex items-center gap-1.5 text-[14px] mt-2.5 text-photo-ink/80 no-underline">
                <MapPin size={14} className="shrink-0" />
                <span className="group-hover:underline underline-offset-2">{club.location_name}</span>
              </a>
            ) : (
              <div className="flex items-center gap-1.5 text-[14px] mt-2.5 text-photo-ink/80"><MapPin size={14} />{club.location_name}</div>
            ))}
            {(status || price != null) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {status && (
                  <span className={`inline-flex items-center gap-2 text-[13px] text-photo-ink rounded-full px-3 py-1 border ${
                    status.open ? 'bg-green/15 border-green/45' : 'bg-photo-shade/50 border-photo-ink/20'
                  }`}>
                    <span aria-hidden="true" className={`w-[7px] h-[7px] rounded-full ${status.open ? 'bg-green' : 'bg-muted'}`} />
                    {status.label}
                  </span>
                )}
                {price != null && (
                  <span className="text-[13px] text-photo-ink bg-photo-shade/50 border border-photo-ink/20 rounded-full px-3 py-1">
                    Turno de 1 h desde {formatMoney(price)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {bookable && (
            <button type="button" onClick={onReservar}
              className="inline-flex items-center gap-2 bg-brand text-base border-0 rounded-[10px] px-5 h-[46px] text-sm font-bold cursor-pointer">
              Reservar cancha
            </button>
          )}
          {follow}
          {club.contact_whatsapp && (
            <a href={whatsappLink(club.contact_whatsapp)} target="_blank" rel="noreferrer" aria-label="WhatsApp del club" className={`${ghost} w-[46px] h-[46px]`}>
              <MessageCircle size={17} />
            </a>
          )}
          {!club.contact_whatsapp && club.contact_phone && (
            <a href={`tel:${club.contact_phone}`} aria-label="Llamar al club" className={`${ghost} w-[46px] h-[46px]`}><Phone size={17} /></a>
          )}
          {maps && (
            <a href={maps} target="_blank" rel="noreferrer" aria-label="Cómo llegar" className={`${ghost} w-[46px] h-[46px]`}>
              <Navigation size={17} />
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
