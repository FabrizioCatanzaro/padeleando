import { MapPin, Phone, MessageCircle, Globe, Instagram, Facebook, Clock, LayoutGrid, Calendar, Pencil } from 'lucide-react';
import { scheduleLines, whatsappLink, socialUrl, socialLabel } from './clubForm';
import { missingFields } from '../../utils/clubPage';

const SOCIAL_ICON = { instagram: Instagram, facebook: Facebook, website: Globe };

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
export default function ClubInfo({ club, mapsUrl, desde, admin = false, onPedir }) {
  const horarios = scheduleLines(club.schedule);
  const social   = (club.social_links ?? []).filter((s) => s.url);
  const faltan   = missingFields(club);

  return (
    <>
      <Bloque titulo="DÓNDE">
        {club.location_name && (
          <Linea icon={MapPin} href={mapsUrl ?? undefined}>{club.location_name}</Linea>
        )}
        {club.courts != null && (
          <Linea icon={LayoutGrid}>{club.courts} {club.courts === 1 ? 'cancha' : 'canchas'}</Linea>
        )}
        {desde && <Linea icon={Calendar}>En Padeleando desde {desde}</Linea>}
      </Bloque>

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
            <Pencil size={12} /> {admin ? 'EDITAR CLUB' : 'COMPLETAR DATOS'}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3.5 flex-wrap border border-dashed border-border-strong rounded-xl px-4 py-3.5 mt-3.5">
          <div className="min-w-0">
            <div className="font-condensed font-bold text-[13px] text-white">
              {admin ? 'Sos admin' : '¿Algún dato desactualizado?'}
            </div>
            <div className="text-[11.5px] text-dim mt-1 leading-relaxed">
              {admin
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
            <Pencil size={12} /> {admin ? 'EDITAR CLUB' : 'SOLICITAR CAMBIOS'}
          </button>
        </div>
      )}
    </>
  );
}
