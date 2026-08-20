import { Camera, Trash2, BadgeCheck, Badge } from 'lucide-react';
import PlayerAvatar from '../shared/PlayerAvatar';
import ProfileBio from './ProfileBio';
import coverMark from '../../assets/cover-mark.webp';

const TONE = {
  brand: 'text-brand', gold: 'text-premium-hi', off: 'text-border-strong', default: 'text-white',
};

// Riel: grilla de 3 en teléfono y de 6 desde sm. Con seis celdas en una fila
// cada una quedaba en ~55px y etiquetas como CATEGORÍAS se salían.
function Rail({ stats }) {
  if (!stats.length) return null;
  return (
    <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 border border-border-mid rounded-xl overflow-hidden bg-surface/75">
      {stats.map(({ value, label, tone }) => (
        <div
          key={label}
          className="min-w-0 px-3 py-2.5 border-r border-t border-border [&:nth-child(-n+3)]:border-t-0 [&:nth-child(3n)]:border-r-0 sm:border-t-0 sm:[&:nth-child(3n)]:border-r sm:[&:last-child]:border-r-0"
        >
          <div className={`font-condensed font-bold text-[19px] leading-none ${TONE[tone ?? 'default']}`}>{value}</div>
          <div className="font-mono text-[8.5px] sm:text-[9px] tracking-[0.1em] sm:tracking-widest text-muted mt-1.5 uppercase truncate">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

// Cabecera del perfil. El número hero (% de victorias) es lo único que
// distingue un perfil de otra lista: una categoría no tiene un dato que la
// resuma, una persona sí.
export default function ProfileHero({
  owner, isOwnProfile, avatarSrc, avatarSize = 104, nivel,
  onAvatarOpen, onPickAvatar, onDeleteAvatar, avatarBusy, avatarError, fileInputRef, onFileChange,
  isPremium, planChip,
  socials, followersCount, followingCount, onOpenFollowers, onOpenFollowing,
  winPct, wins, played, railStats = [], actions, joinedAt,
}) {
  return (
    <div className="relative">
      {/* Portada: da un fondo sobre el que apoyar el avatar. La marca en
          diagonal va a muy poco contraste — es textura, no un elemento. */}
      <div className="relative overflow-hidden -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 h-20 sm:h-28 bg-surface border-b border-border">
        <div
          className="profile-cover-mark absolute inset-[-50%]"
          style={{ backgroundImage: `url(${coverMark})`, backgroundRepeat: 'repeat', backgroundSize: '200px auto' }}
        />
      </div>

      <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-5">
        {/* Avatar + insignias. El aro del color de la página hace que el recorte
            sobre la portada se lea como intencional. */}
        <div className="shrink-0 flex flex-col items-center -mt-12 sm:-mt-16">
          <div className="relative rounded-full bg-base p-1">
            <button
              type="button"
              onClick={onAvatarOpen}
              aria-label={avatarSrc ? `Ver la foto de ${owner.name}` : undefined}
              disabled={!avatarSrc}
              className="bg-transparent border-0 p-0 rounded-full block enabled:cursor-pointer enabled:hover:brightness-110 transition"
            >
              <PlayerAvatar name={owner.name} src={avatarSrc} size={avatarSize} premium={isPremium} />
            </button>

            {isOwnProfile && (
              <>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                  className="hidden" onChange={onFileChange} />
                {/* Los controles de foto van sobre el avatar y no en la fila de
                    acciones: pertenecen a la foto, no al perfil. */}
                <button type="button" onClick={onPickAvatar} disabled={avatarBusy}
                  title={avatarSrc ? 'Cambiar foto' : 'Subir foto'} aria-label={avatarSrc ? 'Cambiar foto' : 'Subir foto'}
                  className="absolute -bottom-0.5 -right-0.5 bg-brand text-base rounded-full w-8 h-8 flex items-center justify-center border-2 border-base cursor-pointer hover:brightness-110 transition disabled:opacity-50 disabled:cursor-wait">
                  <Camera size={14} />
                </button>
                {avatarSrc && (
                  <button type="button" onClick={onDeleteAvatar} disabled={avatarBusy} title="Quitar foto" aria-label="Quitar foto"
                    className="absolute -top-0.5 -right-0.5 bg-surface text-muted rounded-full w-7 h-7 flex items-center justify-center border border-border-strong cursor-pointer hover:text-danger hover:border-danger transition disabled:opacity-50 disabled:cursor-wait">
                    <Trash2 size={12} />
                  </button>
                )}
              </>
            )}
          </div>

          {/* PREMIUM arriba y el nivel debajo. Sin premium, el nivel ocupa ese
              lugar: nunca queda un hueco ni se pisan. */}
          <div className="flex flex-col items-center gap-1.5 mt-2.5">
            {isPremium && (
              <span
                className="font-condensed font-bold text-[8.5px] tracking-[0.14em] px-2.5 py-1 rounded-full whitespace-nowrap"
                style={{ background: 'linear-gradient(135deg, var(--color-premium), var(--color-premium-hi))', color: '#3a2400' }}
              >
                PREMIUM
              </span>
            )}
            {nivel && (
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full border font-mono text-[9.5px] tracking-widest whitespace-nowrap"
                style={{ color: nivel.color, borderColor: `${nivel.color}44`, background: `${nivel.color}10` }}
              >
                {nivel.label.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div className="w-full min-w-0 mt-3 sm:mt-0 sm:flex-1 sm:pt-3">
          <h1 className="font-condensed font-bold text-[22px] sm:text-[27px] text-white leading-[1.08] m-0 break-words">
            {owner.name}
          </h1>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 mt-1.5 font-mono text-[12px] text-muted">
            <span>@{owner.username}</span>
            {joinedAt && <><span className="opacity-40">·</span><span className="text-dim">desde {joinedAt}</span></>}
          </div>

          <ProfileBio text={owner.bio} className="mt-2.5 mx-auto sm:mx-0 max-w-[46ch]" />

          {socials}

          {/* Seguidores y seguidos son números sociales; partidos y racha son
              deportivos. Separarlos es lo que hace que cada uno signifique algo. */}
          <div className="flex gap-4 mt-3 justify-center sm:justify-start font-sans text-[12.5px]">
            <button onClick={onOpenFollowers}
              className="bg-transparent border-0 p-0 cursor-pointer text-muted hover:text-white transition-colors">
              <b className="font-condensed font-bold text-white mr-1">{followersCount}</b>seguidores
            </button>
            <button onClick={onOpenFollowing}
              className="bg-transparent border-0 p-0 cursor-pointer text-muted hover:text-white transition-colors">
              <b className="font-condensed font-bold text-white mr-1">{followingCount}</b>siguiendo
            </button>
          </div>

          {avatarError && <div className="font-mono text-[11px] text-danger mt-2">{avatarError}</div>}
        </div>

        {/* Número hero + acciones */}
        <div className="w-full sm:w-auto shrink-0 flex flex-col items-center sm:items-end gap-3 mt-4 sm:mt-3">
          {actions}
          {winPct !== null && (
            <div className="text-center sm:text-right">
              <div className="font-condensed font-black text-[42px] sm:text-[50px] leading-[0.9] text-brand">{winPct}%</div>
              <div className="font-mono text-[9.5px] tracking-widest text-muted mt-1.5">DE VICTORIAS</div>
              <div className="font-mono text-[11.5px] text-dim mt-1">{wins} de {played} partidos</div>
            </div>
          )}
        </div>
      </div>

      <Rail stats={railStats} />
      {planChip}
    </div>
  );
}

// Banda del plan. Va fuera de la identidad: es información de cuenta, sólo la
// ve el dueño, y colgada del nombre partía la cabecera en dos.
export function PlanBand({ premium, subscription, onManage, onSeePlans }) {
  return (
    <button
      type="button"
      onClick={premium ? onManage : onSeePlans}
      className={`w-full mt-3 flex items-center gap-2.5 flex-wrap rounded-xl border px-3.5 py-2.5 cursor-pointer transition-colors text-left ${
        premium
          ? 'border-premium/35 bg-premium/8 hover:border-premium/60'
          : 'border-border-mid bg-surface hover:border-border-strong'
      }`}
    >
      {premium
        ? <BadgeCheck size={14} className="text-premium-hi shrink-0" />
        : <Badge size={14} className="text-muted shrink-0" />}
      <span className={`font-condensed font-bold text-[11px] tracking-widest ${premium ? 'text-premium-hi' : 'text-muted'}`}>
        {premium ? 'PLAN PREMIUM' : 'PLAN FREE'}
      </span>
      {premium && subscription?.starts_at && (
        <span className="font-mono text-[11px] text-dim">
          desde {new Date(subscription.starts_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
          {subscription.ends_at && ` al ${new Date(subscription.ends_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}`}
        </span>
      )}
      <span className="ml-auto font-mono text-[11px] text-muted">
        {premium ? 'Gestionar' : 'Ver planes'}
      </span>
    </button>
  );
}
