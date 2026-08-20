import { Building2, MapPin, Globe, Lock } from 'lucide-react';
import ClubTile from '../shared/ClubTile';
import SignupPricePill from '../shared/SignupPricePill';

// La portada es ancha y baja: pedirla al doble del alto real alcanza y evita
// bajar el original de cientos de KB.
function coverUrl(src) {
  if (!src?.includes('/upload/')) return src;
  return src.replace('/upload/', '/upload/f_auto,q_auto,w_1200,c_fill,ar_16:5/');
}

// Cabecera de la categoría. La foto del club pasa a ser la portada: el backend
// ya la mandaba en club_photo_url y no se pintaba en ninguna parte.
export default function GroupHero({ group, stats = [], isOwner, actions, back }) {
  const cover = group.club_photo_url ? coverUrl(group.club_photo_url) : null;

  return (
    <div className="relative overflow-hidden border-b border-border">
      {cover ? (
        <div className="absolute inset-0" aria-hidden="true">
          <img src={cover} alt="" className="w-full h-full object-cover" loading="eager" decoding="async" />
          {/* Dos capas: la vertical apoya el riel de números, la diagonal
              protege el texto de la izquierda sin tapar la foto entera. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--color-base) 20%, transparent) 0%, color-mix(in srgb, var(--color-base) 62%, transparent) 52%, var(--color-base) 100%),' +
                'linear-gradient(100deg, color-mix(in srgb, var(--color-base) 74%, transparent) 0%, color-mix(in srgb, var(--color-base) 32%, transparent) 55%, transparent 100%)',
            }}
          />
        </div>
      ) : (
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(80% 60% at 15% 0%, color-mix(in srgb, var(--color-brand) 8%, transparent) 0%, transparent 70%),' +
              'linear-gradient(180deg, var(--color-surface) 0%, var(--color-base) 100%)',
          }}
        />
      )}

      <div className="relative px-4 sm:px-6 pt-5 pb-5">
        <div className="flex items-center justify-between gap-2 mb-5">
          {back}
          {actions}
        </div>

        <div className="flex items-end gap-3.5">
          <ClubTile
            photo={group.club_photo_url}
            emojis={group.emojis}
            name={group.club_name ?? group.name}
            size={64}
            eager
          />
          <div className="min-w-0">
            <h1 className="font-condensed font-bold text-[23px] sm:text-[29px] text-white leading-[1.05] m-0 wrap-break-word">
              {group.name}
            </h1>
            {group.description && (
              <p className="font-sans text-[13px] text-secondary mt-1.5 m-0 wrap-break-word whitespace-normal">
                {group.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              {group.club_id ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border text-brand border-brand/40 bg-brand/8 max-w-full">
                  <Building2 size={12} className="shrink-0" />
                  <span className="truncate">{group.club_name}</span>
                  {group.club_location_name && (
                    <span className="text-secondary truncate">· {group.club_location_name}</span>
                  )}
                  {group.club_courts != null && (
                    <span className="text-secondary shrink-0">· {group.club_courts} {group.club_courts === 1 ? 'cancha' : 'canchas'}</span>
                  )}
                </span>
              ) : isOwner && group.pending_club_request_id && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border text-yellow-400 border-yellow-400/40 max-w-full">
                  <MapPin size={12} className="shrink-0" />
                  <span className="truncate">{group.pending_club_name} · pendiente</span>
                </span>
              )}
              <SignupPricePill signup={{
                open:  group.signup_open ?? false,
                price: group.signup_price,
                unit:  group.signup_price_unit ?? 'player',
              }} />
              {isOwner && (
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border ${
                  group.is_public ? 'text-cyan border-cyan/40' : 'text-yellow-400 border-yellow-400/40'
                }`}>
                  {group.is_public ? <Globe size={12} /> : <Lock size={12} />}
                  {group.is_public ? 'Pública' : 'Privada'}
                </span>
              )}
            </div>
          </div>
        </div>

        {stats.length > 0 && (
          <div className="mt-5 flex border border-border-mid rounded-xl overflow-hidden bg-surface/75 backdrop-blur-sm">
            {stats.map(({ value, label, brand }) => (
              <div key={label} className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 border-r border-border last:border-r-0">
                <div className={`font-condensed font-bold text-[17px] sm:text-[20px] leading-none truncate ${brand ? 'text-brand' : 'text-white'}`}>
                  {value}
                </div>
                <div className="font-mono text-[9px] tracking-widest text-muted mt-1.5 uppercase truncate">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
