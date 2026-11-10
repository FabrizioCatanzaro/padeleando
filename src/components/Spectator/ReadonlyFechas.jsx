import { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { myPlayerIds, isMyMatch, getPairLabel } from '../../utils/helpers';
import { fechaEnCurso, rangoDeFecha, libresDeFecha } from '../../utils/fechas';
import FechaBar from '../Matches/FechaBar';
import MatchCard from '../Matches/MatchCard';
import ScheduledCard from '../Matches/ScheduledCard';

const porDia = (a, b) => `${a.scheduled_date ?? '9999'} ${a.scheduled_at ?? '99'}`
  .localeCompare(`${b.scheduled_date ?? '9999'} ${b.scheduled_at ?? '99'}`) || (a.position ?? 0) - (b.position ?? 0);

// Partidos de una fecha: los que faltan jugar, los jugados y la pareja libre.
function PartidosDeFecha({ tournament, number, mios, soloMios = false }) {
  const programados = (tournament.scheduled_matches ?? [])
    .filter((s) => s.round === number && (!soloMios || isMyMatch(s, mios)))
    .sort(porDia);
  const jugados = (tournament.matches ?? [])
    .filter((m) => m.round === number && (!soloMios || isMyMatch(m, mios)))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const libres = soloMios ? [] : libresDeFecha(tournament, number);
  const nombre = (id) => getPairLabel(id, tournament.pairs, tournament.players);

  return (
    <div className="flex flex-col gap-2.5">
      {programados.map((s) => (
        <ScheduledCard key={s.id} match={s} tournament={tournament} isOwner={false} esMio={isMyMatch(s, mios)} />
      ))}
      {jugados.map((m) => (
        <MatchCard key={m.id} match={m} tournament={tournament} isOwner={false} hideDate />
      ))}
      {programados.length === 0 && jugados.length === 0 && (
        <p className="m-0 text-[14px] text-secondary">{soloMios ? 'Libre esta fecha.' : 'Esta fecha no tiene partidos.'}</p>
      )}
      {libres.length > 0 && (
        <p className="m-0 mt-1 text-[13px] text-soft">
          {libres.length === 1 ? 'Libre esta fecha: ' : 'Sin jugar esta fecha: '}
          <span className="text-white font-semibold">{libres.map((p) => nombre(p.id)).join(' · ')}</span>
        </p>
      )}
    </div>
  );
}

// PARTIDOS del jugador en una liga en varios días.
export default function ReadonlyFechas({ tournament }) {
  const { user } = useAuth() ?? {};
  const fechas = tournament.fechas ?? [];
  const [sel, setSel] = useState(() => fechaEnCurso(fechas));
  const [soloMios, setSoloMios] = useState(false);
  const mios = myPlayerIds(tournament, user?.username);
  const fecha = fechas.find((f) => f.number === sel) ?? null;

  if (fechas.length === 0) {
    return <div className="text-center text-secondary py-10 font-sans text-[14px]">Todavía no hay fechas armadas.</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <h2 className="m-0 font-condensed font-semibold text-[15px] text-white">Partidos</h2>
        {mios.size > 0 && (
          <div role="group" aria-label="Filtro de partidos" className="flex gap-2">
            {[[false, 'Por fecha'], [true, 'Mis partidos']].map(([v, label]) => (
              <button
                key={label} type="button" aria-pressed={soloMios === v} onClick={() => setSoloMios(v)}
                className={`h-9 px-3.5 rounded-full font-sans text-[13px] cursor-pointer ${soloMios === v ? 'bg-brand text-black font-bold border-0' : 'bg-transparent text-content border border-border-strong'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {soloMios ? (
        <div className="flex flex-col gap-5">
          {fechas.map((f) => (
            <section key={f.id} className="flex flex-col gap-2.5">
              <h3 className="m-0 text-[13px] font-bold text-white">
                Fecha {f.number} <span className="font-normal text-soft">· {rangoDeFecha(f)}</span>
              </h3>
              <PartidosDeFecha tournament={tournament} number={f.number} mios={mios} soloMios />
            </section>
          ))}
        </div>
      ) : (
        <>
          <FechaBar tournament={tournament} selected={sel} onSelect={setSel} onArmar={null} />
          {fecha && (
            <>
              <div className="flex flex-col mb-3">
                <h3 className="m-0 text-[15px] font-bold text-white">Fecha {fecha.number}</h3>
                <span className="text-[13px] text-soft">{rangoDeFecha(fecha)}</span>
              </div>
              <PartidosDeFecha tournament={tournament} number={fecha.number} mios={mios} />
            </>
          )}
        </>
      )}
    </div>
  );
}
