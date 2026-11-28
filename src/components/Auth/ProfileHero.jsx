import { Camera, Trash2, BadgeCheck, Badge, Globe } from 'lucide-react'
import { siInstagram, siX, siFacebook, siWhatsapp } from 'simple-icons'
import { categoryLabel } from '../../utils/category'
import { countryName } from '../../utils/countries'
import CountryFlag from '../shared/CountryFlag'
import { planName } from '../../utils/plan'

const TONE = {
  brand: 'text-brand', gold: 'text-premium-hi', off: 'text-border-strong', default: 'text-white',
}
const HAND = { diestro: 'Derecha', zurdo: 'Izquierda', ambidiestro: 'Ambidiestro' }
const SIDE = { drive: 'Drive', reves: 'Revés', cualquiera: 'Cualquiera' }

function BrandSvg({ icon, size = 15 }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true"><path d={icon.path} /></svg>
}

function socialLinks(owner) {
  const so = owner.socials ?? {}
  return [
    so.instagram && { key: 'ig', label: `Instagram: @${so.instagram}`, href: `https://www.instagram.com/${so.instagram}`, icon: <BrandSvg icon={siInstagram} /> },
    so.twitter && { key: 'x', label: `X: @${so.twitter}`, href: `https://x.com/${so.twitter}`, icon: <BrandSvg icon={siX} /> },
    so.facebook && { key: 'fb', label: `Facebook: ${so.facebook}`, href: `https://www.facebook.com/${so.facebook}`, icon: <BrandSvg icon={siFacebook} /> },
    so.website && { key: 'web', label: `Sitio web: ${so.website.replace(/^https?:\/\//, '')}`, href: so.website, icon: <Globe size={15} aria-hidden="true" /> },
  ].filter(Boolean)
}

// Riel: grilla de 3 en teléfono y de 6 desde sm. Con seis celdas en una fila
// cada una quedaba en ~55px y etiquetas como CATEGORÍAS se salían.
function Rail({ stats }) {
  if (!stats.length) return null
  return (
    <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 border border-border-mid rounded-xl overflow-hidden bg-surface/75">
      {stats.map(({ value, label, tone }) => (
        <div
          key={label}
          className="min-w-0 px-3 py-2.5 border-r border-t border-border [&:nth-child(-n+3)]:border-t-0 [&:nth-child(3n)]:border-r-0 sm:border-t-0 sm:[&:nth-child(3n)]:border-r sm:[&:last-child]:border-r-0"
        >
          <div className={`font-condensed font-bold text-[19px] leading-none ${TONE[tone ?? 'default']}`}>{value}</div>
          <div className="font-mono text-[10px] sm:text-[10px] tracking-[0.1em] sm:tracking-widest text-muted mt-1.5 uppercase truncate">
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}

function Attr({ label, children, sub }) {
  return (
    <div className="min-w-0 px-3 py-3 sm:px-4 sm:py-0 border-border-mid max-sm:border-t max-sm:[&:nth-child(-n+3)]:border-t-0 max-sm:[&:not(:nth-child(3n+1))]:border-l sm:border-l sm:first:border-l-0 sm:first:pl-0 text-center sm:text-left">
      <div className="font-sans text-[10px] tracking-[0.16em] uppercase text-secondary">{label}</div>
      <div className="mt-1.5 flex items-center justify-center sm:justify-start gap-1.5 font-condensed font-bold text-[15px] sm:text-[16px] text-white whitespace-nowrap">{children}</div>
      {sub && <div className="mt-1 text-[11.5px] text-dim whitespace-nowrap">{sub}</div>}
    </div>
  )
}

// Cabecera del perfil: foto vertical grande, nombre en dos líneas y la tira de atributos del jugador.
export default function ProfileHero({
  owner, isOwnProfile, avatarSrc, nivel,
  onAvatarOpen, onPickAvatar, onDeleteAvatar, avatarBusy, avatarError, fileInputRef, onFileChange,
  isPremium, planChip,
  followersCount, followingCount, onOpenFollowers, onOpenFollowing,
  winPct, wins, played, railStats = [], actions,
}) {
  const first = owner.first_name || owner.name
  const last = owner.first_name ? owner.last_name : ''
  const initials = `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
  const socials = socialLinks(owner)
  const waDigits = owner.whatsapp ? owner.whatsapp.replace(/\D/g, '') : ''
  const since = owner.created_at
    ? new Date(owner.created_at).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })
    : null
  const category = owner.category ? categoryLabel(owner.category) : null

  return (
    <div className="relative">
      <section className="-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 pt-6 pb-5 sm:py-7 bg-surface border-b border-border">
        <div className="flex flex-col items-center sm:flex-row sm:items-stretch gap-5 sm:gap-8">
          <div className="relative shrink-0 sm:self-start">
            <button
              type="button"
              onClick={onAvatarOpen}
              aria-label={avatarSrc ? `Ver la foto de ${owner.name}` : undefined}
              disabled={!avatarSrc}
              className={`block w-[150px] h-[180px] sm:w-[190px] sm:h-[228px] rounded-xl overflow-hidden border p-0 bg-surface-alt enabled:cursor-pointer enabled:hover:brightness-110 transition ${
                isPremium ? 'border-premium/70' : 'border-border-mid'}`}
            >
              {avatarSrc
                ? <img src={avatarSrc} alt="" width={190} height={228} className="w-full h-full object-cover object-[50%_30%]" />
                : <span className="w-full h-full flex items-center justify-center font-condensed font-bold text-[38px] text-secondary">{initials}</span>}
            </button>

            {isOwnProfile && (
              <>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFileChange} />
                <button type="button" onClick={onPickAvatar} disabled={avatarBusy}
                  title={avatarSrc ? 'Cambiar foto' : 'Subir foto'} aria-label={avatarSrc ? 'Cambiar foto' : 'Subir foto'}
                  className="absolute right-2 bottom-2 w-11 h-11 rounded-lg bg-brand text-base border-0 flex items-center justify-center cursor-pointer hover:brightness-110 transition disabled:opacity-50 disabled:cursor-wait">
                  <Camera size={17} />
                </button>
                {avatarSrc && (
                  <button type="button" onClick={onDeleteAvatar} disabled={avatarBusy} title="Quitar foto" aria-label="Quitar foto"
                    className="absolute right-2 top-2 w-8 h-8 rounded-lg bg-base/80 text-muted border border-border-strong flex items-center justify-center cursor-pointer hover:text-danger hover:border-danger transition disabled:opacity-50 disabled:cursor-wait">
                    <Trash2 size={13} />
                  </button>
                )}
              </>
            )}
          </div>

          <div className="w-full min-w-0 flex-1 flex flex-col items-center sm:items-stretch text-center sm:text-left">
            <div className="w-full flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <h1 className="m-0 font-condensed font-bold text-[28px] sm:text-[42px] leading-[1.02] text-white break-words">
                  {first}
                  {last && <span className="block text-soft">{last}</span>}
                </h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2.5 gap-y-1.5 mt-3 text-[13px] text-secondary">
                  <span>@{owner.username}</span>
                  {category && <span className="font-semibold text-brand" title="Categoría declarada por el jugador">{category}</span>}
                  {nivel && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] tracking-widest"
                      style={{ color: nivel.color, borderColor: `${nivel.color}55`, background: `${nivel.color}12` }}>
                      {nivel.label.toUpperCase()}
                    </span>
                  )}
                  {isPremium && (
                    <span className="font-condensed font-bold text-[10px] tracking-[0.14em] px-2.5 py-1 rounded-full text-premium-ink"
                      style={{ background: 'linear-gradient(135deg, var(--color-premium), var(--color-premium-hi))' }}>
                      PREMIUM
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-center sm:justify-end shrink-0">{actions}</div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-3 mt-4 sm:pb-6">
              <button type="button" onClick={onOpenFollowers}
                className="bg-transparent border-0 p-0 cursor-pointer text-[13px] text-secondary hover:text-white transition-colors">
                <b className="font-condensed font-bold text-white mr-1">{followersCount}</b>seguidores
              </button>
              <button type="button" onClick={onOpenFollowing}
                className="bg-transparent border-0 p-0 cursor-pointer text-[13px] text-secondary hover:text-white transition-colors">
                <b className="font-condensed font-bold text-white mr-1">{followingCount}</b>siguiendo
              </button>
              {(socials.length > 0 || waDigits) && (
                <span className="flex items-center gap-1.5">
                  {socials.map((s) => (
                    <a key={s.key} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}
                      className="w-9 h-9 rounded-lg border border-border-strong text-secondary hover:text-white hover:border-soft flex items-center justify-center transition-colors">
                      {s.icon}
                    </a>
                  ))}
                  {waDigits && (
                    <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noopener noreferrer"
                      className="h-9 px-3 rounded-lg border border-green/40 text-green hover:bg-green/10 flex items-center gap-1.5 text-[13px] no-underline transition-colors">
                      <BrandSvg icon={siWhatsapp} size={14} />WhatsApp
                    </a>
                  )}
                </span>
              )}
            </div>

            <div className="w-full grid grid-cols-3 sm:flex sm:flex-wrap mt-5 sm:mt-auto sm:pt-6 border-t border-border-mid pt-0 sm:border-t-border">
              {owner.nationality && (
                <Attr label="Nacionalidad">
                  <CountryFlag code={owner.nationality} width={20} />
                  <span className="sm:hidden">{owner.nationality}</span>
                  <span className="hidden sm:inline">{countryName(owner.nationality)}</span>
                </Attr>
              )}
              {owner.age != null && <Attr label="Edad">{owner.age}</Attr>}
              {owner.hand && <Attr label="Mano">{HAND[owner.hand]}</Attr>}
              {owner.side && <Attr label="Lado">{SIDE[owner.side]}</Attr>}
              {winPct !== null && (
                <Attr label="Victorias" sub={`${wins} de ${played}`}>
                  <span className="text-brand">{winPct}%</span>
                </Attr>
              )}
              {since && <Attr label="Desde"><span className="font-sans font-semibold text-[14px] text-content">{since}</span></Attr>}
            </div>
            {avatarError && <div className="font-mono text-[11px] text-danger mt-2">{avatarError}</div>}
          </div>
        </div>
      </section>

      <Rail stats={railStats} />
      {planChip}
    </div>
  )
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
        {premium ? `PLAN ${planName(subscription?.plan).toUpperCase()}` : 'PLAN GRATIS'}
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
  )
}
