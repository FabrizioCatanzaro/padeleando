import { useNavigate } from 'react-router-dom';
import { CalendarDays, Ticket } from 'lucide-react';
import Carousel from './Carousel';
import EventCard, { LiveBadge } from './EventCard';
import GroupCard from '../shared/GroupCard';
import { CardSkeleton } from '../shared/Skeleton';
import SignupFooter from './SignupFooter';

// El alto mínimo es el del esqueleto, para que la vitrina no encoja al cargar.
const SLOT = 'snap-start shrink-0 w-[270px] min-h-[136px] flex';

function Slot({ children }) {
  return <div className={SLOT}>{children}</div>;
}

function SkeletonRow() {
  return [0, 1, 2].map((i) => (
    <Slot key={i}><div className="w-full"><CardSkeleton lines={3} /></div></Slot>
  ));
}

export default function VisitorShowcase({ data, loading }) {
  const navigate = useNavigate();
  const live     = data?.live ?? [];
  const signup   = data?.signup ?? [];
  const featured = data?.featured ?? [];
  // Una jornada con inscripción abierta ya aparece arriba: repetirla en "próximas" no agrega nada.
  const signupIds = new Set(signup.map((t) => t.id));
  const upcoming  = (data?.upcoming ?? []).filter((t) => !signupIds.has(t.id));

  const goTournament = (t) => navigate(`/view/${t.id}`);

  // Mientras carga se reserva una sola vitrina: es lo que ya hacía la portada y
  // mantiene el CLS que costó la auditoría de julio.
  if (loading) {
    return (
      <Carousel title="ACTIVIDAD" count={3}>
        <SkeletonRow />
      </Carousel>
    );
  }

  return (
    <>
      {live.length > 0 && (
        <Carousel
          title="SE ESTÁ JUGANDO AHORA"
          count={live.length}
          icon={
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green" />
            </span>
          }
        >
          {live.map((t, i) => (
            <Slot key={t.id}>
              <EventCard
                t={t}
                delay={i * 60}
                badge={<LiveBadge />}
                className="h-full w-full"
                onClick={() => goTournament(t)}
                footer={t.live_matches?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border-mid space-y-1">
                    {t.live_matches.slice(0, 2).map((m, j) => (
                      <div key={j} className="font-mono text-[11px] text-soft truncate">
                        {m.court != null && <span className="text-dim">C{m.court} · </span>}
                        {m.team1Label} vs {m.team2Label}
                      </div>
                    ))}
                  </div>
                )}
              />
            </Slot>
          ))}
        </Carousel>
      )}

      {signup.length > 0 && (
        <Carousel title="ANOTATE A JUGAR" count={signup.length} icon={<Ticket size={13} className="text-brand" />}>
          {signup.map((t, i) => (
            <Slot key={t.id}>
              <EventCard
                t={t}
                delay={i * 60}
                className="h-full w-full"
                onClick={() => goTournament(t)}
                footer={<SignupFooter t={t} />}
              />
            </Slot>
          ))}
        </Carousel>
      )}

      {upcoming.length > 0 && (
        <Carousel title="PRÓXIMOS TORNEOS" count={upcoming.length} icon={<CalendarDays size={13} className="text-muted" />}>
          {upcoming.map((t, i) => (
            <Slot key={t.id}>
              <EventCard t={t} delay={i * 60} className="h-full w-full" onClick={() => goTournament(t)} />
            </Slot>
          ))}
        </Carousel>
      )}

      {featured.length > 0 && (
        <Carousel title="CATEGORÍAS ACTIVAS" count={featured.length}>
          {featured.map((g, i) => (
            <Slot key={g.id}>
              <GroupCard g={g} delay={i * 60} className="h-full w-full" onClick={() => navigate(`/cat/${g.id}`)} />
            </Slot>
          ))}
        </Carousel>
      )}
    </>
  );
}
