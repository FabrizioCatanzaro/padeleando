import { Link } from 'react-router-dom'
import { MessageCircle, Phone, Mail, Instagram, Facebook, Globe, ShieldCheck, ChevronRight, Link2, Link2Off, Gem, Pencil, Navigation } from 'lucide-react'
import { whatsappLink, socialUrl, socialLabel, scheduleLines, normalizeWhatsappDisplay } from '../clubForm'
import { DAYS, dayHoursLabel, dayGridIndex, businessToday } from '../scheduleGrid'
import { clubAmenities } from '../../../utils/clubProfile'
import { missingFields } from '../../../utils/clubPage'
import { AMENITY_ICON } from '../amenityIcons'
import PlayerAvatar from '../../shared/PlayerAvatar'
import AdBanner from '../../shared/AdBanner'

const SOCIAL_ICON = { instagram: Instagram, facebook: Facebook, website: Globe }

function Box({ id, title, action, children }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-border-mid bg-surface p-4 sm:p-5">
      <div className="flex justify-between items-baseline gap-2 mb-2.5">
        <h2 id={id} className="m-0 font-condensed font-bold text-[13px] text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Line({ icon, href, children }) {
  const Icon = icon
  const inner = <><Icon size={16} className="text-secondary shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">{children}</span></>
  const cls = 'flex items-center gap-2.5 py-2 text-sm text-white no-underline'
  return href
    ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className={`${cls} hover:text-brand`}>{inner}</a>
    : <div className={cls}>{inner}</div>
}

// Días seguidos con el mismo horario en una fila: "Lun a Vie · 09:00 a 02:00 (del día siguiente)"
function scheduleRows(grid) {
  const today = dayGridIndex(businessToday(grid))
  const rows = []
  grid.forEach((d, i) => {
    const label = dayHoursLabel(d)
    const last = rows[rows.length - 1]
    if (last && last.label === label) { last.to = i; last.today ||= i === today }
    else rows.push({ from: i, to: i, label, today: i === today })
  })
  return rows.map((r) => ({
    ...r,
    days: r.from === r.to ? DAYS[r.from].label : r.to === r.from + 1 ? `${DAYS[r.from].abbr} y ${DAYS[r.to].abbr}` : `${DAYS[r.from].abbr} a ${DAYS[r.to].abbr}`,
  }))
}

export default function ClubAside({ club, grid, maps, admin, canManage, onPedir, onReclamar, onConectarMp, onDesconectarMp, onPedirPremiumMp }) {
  const social = (club.social_links ?? []).filter((s) => s.url)
  const amenities = clubAmenities(club)
  const lines = grid ? null : scheduleLines(club.schedule)
  const faltan = missingFields(club)
  const hasContact = club.contact_whatsapp || club.contact_phone || club.contact_email || social.length > 0

  return (
    <aside aria-label="Datos del club" className="flex-[1_1_300px] min-w-0 lg:max-w-[320px] flex flex-col gap-3.5">
      {!admin && !club.has_owner && (
        <div className="rounded-xl px-4 py-3.5 border border-brand/30 bg-brand/5">
          <div className="font-condensed font-bold text-[13px] text-white">¿Este club es tuyo?</div>
          <p className="m-0 mt-1 text-[13px] text-secondary leading-relaxed">Reclamalo y, una vez verificado, lo editás vos mismo y recibís reservas.</p>
          <button type="button" onClick={onReclamar}
            className="mt-3 inline-flex items-center gap-2 bg-brand text-base border-0 px-3.5 py-2 rounded-lg text-[13px] font-bold cursor-pointer">
            <ShieldCheck size={14} /> Reclamar club
          </button>
        </div>
      )}

      {(grid || lines?.length > 0) && (
        <Box id="club-hours" title="Horarios">
          {grid ? scheduleRows(grid).map((r) => (
            <div key={r.from} className={`flex justify-between gap-3 py-1.5 text-sm ${r.today ? 'text-white font-semibold' : 'text-soft'}`}>
              <span>{r.days}</span><span className="text-right">{r.label}</span>
            </div>
          )) : lines.map((l) => <div key={l} className="py-1.5 text-sm text-soft">{l}</div>)}
        </Box>
      )}

      {hasContact && (
        <Box id="club-contact" title="Contacto">
          {club.contact_whatsapp && <Line icon={MessageCircle} href={whatsappLink(club.contact_whatsapp)}>{normalizeWhatsappDisplay(club.contact_whatsapp)}</Line>}
          {club.contact_phone && <Line icon={Phone} href={`tel:${club.contact_phone}`}>{club.contact_phone}</Line>}
          {club.contact_email && <Line icon={Mail} href={`mailto:${club.contact_email}`}>{club.contact_email}</Line>}
          {social.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2.5 pt-3 border-t border-border">
              {social.map((s) => {
                const Icon = SOCIAL_ICON[s.platform] ?? Globe
                return (
                  <a key={s.platform} href={socialUrl(s)} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 min-h-9 rounded-full border border-border-strong px-3 text-[13px] text-white no-underline hover:border-soft">
                    <Icon size={14} aria-hidden="true" />{s.platform === 'website' ? socialLabel(s) : s.platform === 'instagram' ? socialLabel(s) : 'Facebook'}
                  </a>
                )
              })}
            </div>
          )}
        </Box>
      )}

      {(amenities.length > 0 || club.amenities_other || canManage) && (
        <Box id="club-amen" title="Servicios e instalaciones"
          action={canManage ? <Link to={`/club/${club.id}/editar#servicios`} className="text-[12px] font-bold text-brand no-underline hover:underline">Editar</Link> : null}>
          {amenities.length > 0 && (
            <ul className="m-0 p-0 list-none grid grid-cols-2 gap-x-3 gap-y-2.5">
              {amenities.map((a) => {
                const Icon = AMENITY_ICON[a.key]
                return <li key={a.key} className="flex items-center gap-2 text-[13px] text-content"><Icon size={16} className="text-brand shrink-0" aria-hidden="true" />{a.label}</li>
              })}
            </ul>
          )}
          {club.amenities_other && <p className="m-0 mt-3 text-[13px] text-secondary leading-relaxed">Además: {club.amenities_other}</p>}
          {!amenities.length && !club.amenities_other && <p className="m-0 text-[13px] text-secondary">Contá qué tiene tu club: estacionamiento, duchas, buffet y más.</p>}
        </Box>
      )}

      {club.location_name && (
        <Box id="club-where" title="Cómo llegar">
          <p className="m-0 text-[13px] text-soft leading-relaxed">{club.location_name}</p>
          {maps && (
            <a href={maps} target="_blank" rel="noreferrer" className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-bold text-brand no-underline hover:underline">
              <Navigation size={14} aria-hidden="true" /> Abrir en el mapa
            </a>
          )}
        </Box>
      )}

      {club.is_owner && (
        <Box id="club-mp" title="Cobros">
          {club.mp_connected ? (
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm text-white"><Link2 size={15} className="text-brand" /> Mercado Pago vinculado</span>
              <button type="button" onClick={onDesconectarMp}
                className="inline-flex items-center gap-1.5 text-[12px] text-secondary hover:text-danger bg-transparent border-0 p-0 cursor-pointer">
                <Link2Off size={13} /> Desvincular
              </button>
            </div>
          ) : club.can_collect_online ? (
            <>
              <p className="m-0 mb-2.5 text-[13px] text-secondary leading-relaxed">Vinculá tu Mercado Pago para cobrar las reservas online: se confirman solas cuando el jugador paga.</p>
              <button type="button" onClick={onConectarMp}
                className="inline-flex items-center gap-2 bg-brand text-base border-0 px-3.5 py-2 rounded-lg text-[13px] font-bold cursor-pointer">
                <Link2 size={14} /> Vincular Mercado Pago
              </button>
            </>
          ) : (
            <>
              <p className="m-0 mb-2.5 text-[13px] text-secondary leading-relaxed">Con el plan Club vinculás Mercado Pago y cobrás las reservas online.</p>
              <button type="button" onClick={onPedirPremiumMp}
                className="inline-flex items-center gap-2 bg-transparent border border-border-strong text-content px-3 py-1.5 rounded-lg text-[13px] font-bold cursor-pointer hover:text-white">
                <Gem size={13} /> Ver plan Club
              </button>
            </>
          )}
        </Box>
      )}

      {club.owner_visible && club.owner_display_name && (
        <Link to={`/u/${club.owner_username}`} className="flex items-center gap-3 rounded-xl border border-border-mid bg-surface p-4 no-underline group">
          <PlayerAvatar name={club.owner_display_name} src={club.owner_avatar_url} size={40} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-white truncate">{club.owner_display_name}<ShieldCheck size={13} className="text-brand shrink-0" /></span>
            <span className="block text-[12px] text-secondary group-hover:text-brand">Dueño verificado · Ver perfil</span>
          </span>
          <ChevronRight size={16} className="text-dim" aria-hidden="true" />
        </Link>
      )}

      {!canManage && (
        <div className="rounded-xl border border-dashed border-border-strong px-4 py-3.5">
          <div className="font-condensed font-bold text-[13px] text-white">{faltan >= 3 ? 'A este club le faltan datos' : '¿Algún dato desactualizado?'}</div>
          <p className="m-0 mt-1 text-[13px] text-secondary leading-relaxed">
            {faltan ? `Faltan ${faltan} ${faltan === 1 ? 'dato' : 'datos'} por cargar.` : 'Mandanos la corrección y la revisamos.'}
          </p>
          <button type="button" onClick={onPedir}
            className="mt-2.5 inline-flex items-center gap-1.5 bg-transparent border border-border-strong text-content px-3 py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer hover:text-white">
            <Pencil size={13} /> {faltan ? 'Completar datos' : 'Solicitar cambios'}
          </button>
        </div>
      )}

      <div className="hidden xl:block"><AdBanner /></div>
    </aside>
  )
}
