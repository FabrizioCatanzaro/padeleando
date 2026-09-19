import { Link } from 'react-router-dom';
import { MapPin, Phone, MessageCircle, Globe, Instagram, Facebook, Clock, LayoutGrid, Calendar, Pencil, ShieldCheck, ChevronRight } from 'lucide-react';
import { scheduleLines, whatsappLink, socialUrl, socialLabel } from './clubForm';
import { missingFields } from '../../utils/clubPage';
import { formatMoney } from '../../utils/money';
import PlayerAvatar from '../shared/PlayerAvatar';

const SOCIAL_ICON = { instagram: Instagram, facebook: Facebook, website: Globe };
const FLOOR_LABEL = { cesped_sintetico: 'Césped sintético', cesped_natural: 'Césped natural', cemento: 'Cemento' };
const WALL_LABEL  = { cemento: 'Paredes de cemento', cristal: 'Paredes de cristal' };
// Mismo criterio de resumen que ClubCourtsManager.jsx (duplicado a propósito:
// son etiquetas de UI, no lógica de negocio).
function courtSummary(c) {
  return [
    c.floor_type ? FLOOR_LABEL[c.floor_type] : null,
    c.wall_type ? WALL_LABEL[c.wall_type] : null,
    c.covered ? 'techada' : null,
    c.lit ? 'con iluminación' : null,
    c.external_play ? 'juego exterior' : null,
  ].filter(Boolean);
}

function Bloque({ titulo, children }) {
  return (
    <div className="border border-border-mid rounded-xl bg-surface overflow-hidden mb-3 last:mb-0">
      <div className="font-condensed font-bold text-[10.5px] tracking-[0.16em] text-muted px-4 pt-3">{titulo}</div>
      <div className="pb-3">{children}</div>
    </div>
  );
}

function Linea({ icon, children, href }) {
  const Icon = icon;
  const inner = (
    <>
      <Icon size={15} className="text-muted shrink-0 mt-px" />
      <span className="min-w-0 break-words">{children}</span>
    </>
  );
  const cls = 'flex items-start gap-2.5 px-4 pt-2 text-[13px] text-white';
  return href
    ? <a href={href} target="_blank" rel="noreferrer" className={`${cls} hover:text-brand transition-colors`}>{inner}</a>
    : <div className={cls}>{inner}</div>;
}

// Los datos fijos y, al pie, el pedido de correcciones. Antes ese pedido partía
// la página al medio; acá cae justo debajo del teléfono que alguien acaba de
// leer, que es el momento en que se da cuenta de que está viejo.
export default function ClubInfo({ club, mapsUrl, desde, admin = false, canManage = admin, onPedir, onReclamar, onGestionarCanchas }) {
  const horarios = scheduleLines(club.schedule);
  const social   = (club.social_links ?? []).filter((s) => s.url);
  const faltan   = missingFields(club);
  // Canchas reales (Fase 2): si el dueño ya cargó al menos una, reemplazan el
  // número suelto de "cuántas canchas" que se muestra en DÓNDE.
  const canchas  = club.courts_list ?? [];

  return (
    <>
      {/* Sólo se ofrece mientras el club no tenga dueño verificado -- una vez
          reclamado y aprobado, esto deja de tener sentido para cualquiera. */}
      {!admin && !club.has_owner && (
        <div
          className="flex items-center justify-between gap-3.5 flex-wrap rounded-xl px-4 py-3.5 mb-3.5"
          style={{
            borderWidth: 1, borderStyle: 'solid',
            borderColor: 'color-mix(in srgb, var(--color-brand) 32%, transparent)',
            background:  'color-mix(in srgb, var(--color-brand) 6%, transparent)',
          }}
        >
          <div className="min-w-0">
            <div className="font-condensed font-bold text-[13px] text-white">¿Este club es tuyo?</div>
            <div className="text-[11.5px] text-dim mt-1 leading-relaxed">
              Reclamalo y, una vez verificado, vas a poder editarlo vos mismo, sin pasar por una solicitud.
            </div>
          </div>
          <button
            type="button"
            onClick={onReclamar}
            className="shrink-0 inline-flex items-center gap-2 bg-brand text-base border-0 px-3.5 py-2 rounded-lg font-condensed font-bold text-[11.5px] tracking-widest cursor-pointer"
          >
            <ShieldCheck size={12} /> RECLAMAR CLUB
          </button>
        </div>
      )}

      <Bloque titulo="DÓNDE">
        {club.location_name && (
          <Linea icon={MapPin} href={mapsUrl ?? undefined}>{club.location_name}</Linea>
        )}
        {canchas.length === 0 && club.courts != null && (
          <Linea icon={LayoutGrid}>{club.courts} {club.courts === 1 ? 'cancha' : 'canchas'}</Linea>
        )}
        {desde && <Linea icon={Calendar}>En Padeleando desde {desde}</Linea>}
      </Bloque>

      {(canchas.length > 0 || canManage) && (
        <Bloque titulo="CANCHAS">
          {canchas.length === 0 && (
            <p className="text-[11.5px] text-dim px-4 pt-2 leading-relaxed">
              Todavía no hay canchas individuales cargadas.
            </p>
          )}
          {canchas.map((c) => {
            const detalle = courtSummary(c);
            return (
              <Linea key={c.id} icon={LayoutGrid}>
                {c.name}
                {detalle.length > 0 && <span className="text-muted">{' · '}{detalle.join(' · ')}</span>}
                {c.price != null && (
                  <span className="text-muted">{' · '}{formatMoney(c.price)}/turno{club.slot_minutes ? ` (${club.slot_minutes} min)` : ''}</span>
                )}
              </Linea>
            );
          })}
          {canManage && (
            <div className="px-4 pt-2.5">
              <button
                type="button"
                onClick={onGestionarCanchas}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-brand hover:underline bg-transparent border-none cursor-pointer p-0"
              >
                <Pencil size={11} /> GESTIONAR CANCHAS
              </button>
            </div>
          )}
        </Bloque>
      )}

      {horarios.length > 0 && (
        <Bloque titulo="HORARIOS">
          {horarios.map((h, i) => <Linea key={i} icon={Clock}>{h}</Linea>)}
        </Bloque>
      )}

      {(club.contact_phone || club.contact_whatsapp) && (
        <Bloque titulo="CONTACTO">
          {club.contact_phone && (
            <Linea icon={Phone} href={`tel:${club.contact_phone}`}>{club.contact_phone}</Linea>
          )}
          {club.contact_whatsapp && (
            <Linea icon={MessageCircle} href={whatsappLink(club.contact_whatsapp)}>{club.contact_whatsapp}</Linea>
          )}
        </Bloque>
      )}

      {social.length > 0 && (
        <Bloque titulo="REDES">
          {social.map((s) => (
            <Linea key={s.platform} icon={SOCIAL_ICON[s.platform] ?? Globe} href={socialUrl(s)}>
              {socialLabel(s)}
            </Linea>
          ))}
        </Bloque>
      )}

      {/* Solapa aparte, no una línea más adentro de DÓNDE: es la única que
          lleva a otro perfil, no a un dato del club. Sólo sale si el dueño
          eligió mostrarse (owner_visible) -- ver checkbox en ClubEditModal. */}
      {club.owner_visible && club.owner_display_name && (
        <Bloque titulo="DUEÑO">
          <Link
            to={`/u/${club.owner_username}`}
            className="flex items-center gap-3 px-4 pt-2 group"
          >
            <PlayerAvatar name={club.owner_display_name} src={club.owner_avatar_url} size={40} />
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] text-white font-sans font-semibold truncate flex items-center gap-1.5">
                {club.owner_display_name}
                <ShieldCheck size={13} className="text-brand shrink-0" />
              </div>
              <div className="text-[11px] font-mono text-muted group-hover:text-brand transition-colors truncate">
                Dueño verificado · Ver perfil
              </div>
            </div>
            <ChevronRight size={16} className="text-muted shrink-0" />
          </Link>
        </Bloque>
      )}

      {/* Con el club casi vacío el pedido deja de ser una nota al pie: es lo
          único útil que puede hacer quien entró. */}
      {faltan >= 3 ? (
        <div
          className="flex items-center justify-between gap-3.5 flex-wrap rounded-xl px-4 py-3.5 mt-3.5"
          style={{
            borderWidth: 1, borderStyle: 'solid',
            borderColor: 'color-mix(in srgb, var(--color-premium) 32%, transparent)',
            background:  'color-mix(in srgb, var(--color-premium) 6%, transparent)',
          }}
        >
          <div className="min-w-0">
            <div className="font-condensed font-bold text-[13px] text-white">A este club le falta casi todo</div>
            <div className="text-[11.5px] text-dim mt-1 leading-relaxed">
              No tiene horarios, teléfono ni redes cargadas. Si lo conocés, mandanos los datos y los revisamos.
            </div>
          </div>
          <button
            type="button"
            onClick={onPedir}
            className="shrink-0 inline-flex items-center gap-2 bg-brand text-base border-0 px-3.5 py-2 rounded-lg font-condensed font-bold text-[11.5px] tracking-widest cursor-pointer"
          >
            <Pencil size={12} /> {canManage ? 'EDITAR CLUB' : 'COMPLETAR DATOS'}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3.5 flex-wrap border border-dashed border-border-strong rounded-xl px-4 py-3.5 mt-3.5">
          <div className="min-w-0">
            <div className="font-condensed font-bold text-[13px] text-white">
              {admin ? 'Sos admin' : canManage ? 'Sos el dueño de este club' : '¿Algún dato desactualizado?'}
            </div>
            <div className="text-[11.5px] text-dim mt-1 leading-relaxed">
              {canManage
                ? 'Podés editar este club directamente, sin pasar por una solicitud.'
                : faltan
                  ? `Faltan ${faltan} ${faltan === 1 ? 'dato' : 'datos'} por cargar.`
                  : 'Mandanos la corrección y la revisamos.'}
            </div>
          </div>
          <button
            type="button"
            onClick={onPedir}
            className="shrink-0 inline-flex items-center gap-2 bg-transparent border border-border-strong text-muted hover:text-white hover:border-soft px-3 py-1.5 rounded-lg font-condensed font-bold text-[11px] tracking-widest cursor-pointer transition-colors"
          >
            <Pencil size={12} /> {canManage ? 'EDITAR CLUB' : 'SOLICITAR CAMBIOS'}
          </button>
        </div>
      )}
    </>
  );
}
