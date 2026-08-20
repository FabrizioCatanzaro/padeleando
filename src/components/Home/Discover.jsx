import { useState } from 'react';
import { Ticket, CalendarDays, MapPin, Loader2, Navigation, ChevronRight } from 'lucide-react';
import Carousel from './Carousel';
import EventCard from './EventCard';
import SignupFooter from './SignupFooter';
import ClubTile from '../shared/ClubTile';
import Btn from '../shared/Btn';
import { CardSkeleton } from '../shared/Skeleton';

const SLOT = 'snap-start shrink-0 w-[270px] min-h-[136px] flex';
const NEARBY_INITIAL   = 6;
const NEARBY_PAGE_SIZE = 6;

function Slot({ children }) { return <div className={SLOT}>{children}</div>; }

function Tab({ on, onClick, icon, children, n }) {
  const Icon = icon;
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[11.5px] font-sans cursor-pointer transition-colors border ${
        on ? 'bg-surface-alt border-border-strong text-white' : 'bg-surface border-border-mid text-muted hover:text-soft hover:border-border-strong'
      }`}
    >
      <Icon size={13} />
      {children}
      {n != null && (
        <span className={`text-[10px] rounded px-1.5 py-0.5 ${on ? 'bg-brand text-base font-bold' : 'bg-border-mid text-secondary'}`}>
          {n}
        </span>
      )}
    </button>
  );
}

function ClubRow({ c, onClick }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      className="flex items-center gap-3.5 px-4 py-3 border-b border-border last:border-0 bg-surface hover:bg-surface-alt transition-colors cursor-pointer outline-none focus-visible:bg-surface-alt"
    >
      <ClubTile photo={c.photo_url} name={c.name} round />
      <div className="min-w-0 flex-1">
        <div className="font-condensed font-bold text-[15.5px] text-white leading-tight truncate">{c.name}</div>
        <div className="flex items-center gap-2 flex-wrap font-mono text-[11.5px] text-muted mt-1">
          {c.location_name && (
            <span className="inline-flex items-center gap-1 min-w-0">
              <MapPin size={10} className="shrink-0" /><span className="truncate">{c.location_name}</span>
            </span>
          )}
          {c.courts != null && <><span className="opacity-40">·</span><span>{c.courts} {c.courts === 1 ? 'cancha' : 'canchas'}</span></>}
        </div>
      </div>
      {c.distance_km != null && (
        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-brand shrink-0">
          <Navigation size={10} />{c.distance_km} km
        </span>
      )}
      <ChevronRight size={15} className="text-dim shrink-0 hidden sm:block" />
    </div>
  );
}

// Todo lo que no es tuyo: jornadas abiertas para anotarse, las que vienen, y
// los clubes que tenés cerca. Va al pie porque es exploración, no gestión.
export default function Discover({
  tab, onTab, signup = [], upcoming = [], loading = false,
  nearbyClubs = [], nearbyStatus = 'idle', onFetchNearby, onHideNearby,
  onOpenTournament, onOpenClub,
}) {
  const [page, setPage] = useState(NEARBY_INITIAL);

  if (loading) {
    return (
      <div id="descubrir" className="mt-9 scroll-mt-20">
        <Carousel title="DESCUBRIR" count={3}>
          {[0, 1, 2].map((i) => <Slot key={i}><div className="w-full"><CardSkeleton lines={3} /></div></Slot>)}
        </Carousel>
      </div>
    );
  }

  const showClubs = nearbyStatus !== 'unsupported';
  if (signup.length === 0 && upcoming.length === 0 && !showClubs) return null;

  const tabs = [
    signup.length   > 0 && { key: 'signup', icon: Ticket,       label: 'Anotate a jugar', n: signup.length },
    upcoming.length > 0 && { key: 'up',     icon: CalendarDays, label: 'Próximos',        n: upcoming.length },
    showClubs       &&     { key: 'clubs',  icon: MapPin,       label: 'Clubes cerca',    n: nearbyStatus === 'done' ? nearbyClubs.length : null },
  ].filter(Boolean);

  const active = tabs.some((t) => t.key === tab) ? tab : tabs[0].key;
  const visibleClubs = nearbyClubs.slice(0, page);

  return (
    <div id="descubrir" className="mt-9 scroll-mt-20">
      <div className="flex items-center gap-3.5 mb-3.5">
        <h2 className="font-condensed font-bold text-[13px] tracking-widest text-content">DESCUBRIR</h2>
        <span className="flex-1 h-px bg-border-mid" />
        {active === 'clubs' && nearbyStatus === 'done' && (
          <button
            onClick={onHideNearby}
            className="font-mono text-[11px] text-dim hover:text-soft transition-colors bg-transparent border-none cursor-pointer"
          >
            ocultar
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3.5">
        {tabs.map((t) => (
          <Tab key={t.key} on={active === t.key} onClick={() => onTab(t.key)} icon={t.icon} n={t.n}>
            {t.label}
          </Tab>
        ))}
      </div>

      {active === 'signup' && (
        <Carousel title="ABIERTAS PARA ANOTARSE" count={signup.length} icon={<Ticket size={13} className="text-brand" />}>
          {signup.map((t, i) => (
            <Slot key={t.id}>
              <EventCard
                t={t}
                delay={Math.min(i, 5) * 50}
                className="h-full w-full"
                onClick={() => onOpenTournament(t.id)}
                footer={<SignupFooter t={t} />}
              />
            </Slot>
          ))}
        </Carousel>
      )}

      {active === 'up' && (
        <Carousel title="PRÓXIMAS JORNADAS" count={upcoming.length} icon={<CalendarDays size={13} className="text-muted" />}>
          {upcoming.map((t, i) => (
            <Slot key={t.id}>
              <EventCard t={t} delay={Math.min(i, 5) * 50} className="h-full w-full" onClick={() => onOpenTournament(t.id)} />
            </Slot>
          ))}
        </Carousel>
      )}

      {active === 'clubs' && (
        nearbyStatus === 'done' ? (
          nearbyClubs.length === 0 ? (
            <div className="border border-dashed border-border-strong rounded-xl p-8 text-center font-mono text-xs text-dim">
              No hay clubes en un radio de 20 km. Probá buscarlos por nombre.
            </div>
          ) : (
            <>
              <div className="border border-border-mid rounded-xl overflow-hidden">
                {visibleClubs.map((c) => <ClubRow key={c.id} c={c} onClick={() => onOpenClub(c.id)} />)}
              </div>
              {nearbyClubs.length > page && (
                <button
                  onClick={() => setPage((p) => p + NEARBY_PAGE_SIZE)}
                  className="mt-3 flex items-center gap-2 bg-transparent border border-border-mid text-muted px-3.5 py-2 rounded-lg text-xs font-mono cursor-pointer hover:border-border-strong hover:text-soft transition-colors"
                >
                  VER MÁS · {nearbyClubs.length - page} restantes
                </button>
              )}
            </>
          )
        ) : (
          <div className="border border-border-mid rounded-xl p-5 bg-surface flex items-center gap-4 flex-wrap">
            <span className="w-10 h-10 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
              {nearbyStatus === 'loading' ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
            </span>
            <p className="text-secondary text-[13px] font-sans leading-relaxed flex-1 min-w-[180px] m-0">
              {nearbyStatus === 'loading'
                ? 'Buscando clubes cercanos...'
                : nearbyStatus === 'denied'
                  ? 'La ubicación está bloqueada. Habilitala desde el ícono de candado en la barra del navegador.'
                  : nearbyStatus === 'error'
                    ? 'No pudimos obtener tu ubicación. Probá de nuevo.'
                    : 'Activá tu ubicación y te muestro los clubes de pádel en un radio de 20 km.'}
            </p>
            {nearbyStatus !== 'loading' && (
              <Btn variant="primary" size="md" icon={MapPin} onClick={onFetchNearby}>
                {nearbyStatus === 'idle' ? 'ACTIVAR UBICACIÓN' : 'REINTENTAR'}
              </Btn>
            )}
          </div>
        )
      )}
    </div>
  );
}
