import { useState } from 'react';
import { X } from 'lucide-react';
import { expandPair, getPairLabel, tournamentCourts, countPairMatches, pairKeyOf, fmtHora } from '../../utils/helpers';
import { TEAM_SELECT_CLS } from './MatchForm';

const MAX_PREVIA_MATCHES = 2;

/**
 * Programar un partido: equipos, cancha y hora. Sin marcador — eso es lo que lo
 * distingue de cargar un partido.
 *
 * En la fase previa de un americano se aplica el tope de dos partidos por
 * pareja, y cuenta lo programado además de lo jugado: si no contara, se podrían
 * programar tres y la fase quedaría rota antes de empezar.
 */
export default function ScheduleForm({ tournament, scheduled, onSave, onCancel }) {
  const isPairs = tournament.mode === 'pairs';
  const esAmericano = tournament.format === 'americano';
  const canchas = tournamentCourts(tournament) ?? 0;

  const pairDe = (team) => tournament.pairs.find(
    (p) => (p.p1 === team?.[0] && p.p2 === team?.[1]) || (p.p1 === team?.[1] && p.p2 === team?.[0]),
  )?.id ?? '';

  const [t1, setT1] = useState(() => (isPairs ? pairDe(scheduled?.team1) : (scheduled?.team1 ?? ['', ''])));
  const [t2, setT2] = useState(() => (isPairs ? pairDe(scheduled?.team2) : (scheduled?.team2 ?? ['', ''])));
  const [court, setCourt] = useState(scheduled?.court ?? null);
  const [hora, setHora]   = useState(scheduled?.scheduled_at ? fmtHora(scheduled.scheduled_at) : '');
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Cuántos partidos lleva cada pareja: jugados + programados, sin contar el que
  // se está editando (si no, se bloquearía a sí mismo).
  const cuenta = countPairMatches([
    ...tournament.matches,
    ...(tournament.scheduled_matches ?? []).filter((s) => s.id !== scheduled?.id),
  ]);
  const pjDePareja = (pairId) => {
    const jugadores = expandPair(pairId, tournament.pairs);
    return cuenta.get(pairKeyOf(jugadores)) ?? 0;
  };

  const activos = tournament.players.filter((p) => !p.removed);
  const equipos = isPairs ? [t1, t2] : [t1?.[0], t1?.[1], t2?.[0], t2?.[1]];
  const completo = isPairs
    ? !!t1 && !!t2 && t1 !== t2
    : equipos.every(Boolean) && new Set(equipos).size === 4;

  const sinCupo = esAmericano && isPairs
    && [t1, t2].filter(Boolean).some((id) => pjDePareja(id) >= MAX_PREVIA_MATCHES);
  const parejasConCupo = tournament.pairs.filter((p) => pjDePareja(p.id) < MAX_PREVIA_MATCHES);
  const sinCruces = esAmericano && isPairs && parejasConCupo.length < 2;

  async function guardar() {
    if (!completo || sinCupo) return;
    setGuardando(true);
    setError(null);
    try {
      await onSave({
        team1: isPairs ? expandPair(t1, tournament.pairs) : t1,
        team2: isPairs ? expandPair(t2, tournament.pairs) : t2,
        court: court ?? null,
        scheduled_at: hora || null,
      });
    } catch (e) {
      setError(e?.message ?? 'No se pudo programar el partido');
      setGuardando(false);
    }
  }

  const selectCls = TEAM_SELECT_CLS;
  const labelCls  = 'block font-condensed font-bold text-[9.5px] tracking-[0.14em] uppercase mb-1.5';

  function opcionesPareja(actual, otro) {
    return tournament.pairs.map((p) => {
      const n = pjDePareja(p.id);
      const lleno = esAmericano && n >= MAX_PREVIA_MATCHES && p.id !== actual;
      return (
        <option key={p.id} value={p.id} disabled={p.id === otro || lleno}>
          {getPairLabel(p.id, tournament.pairs, tournament.players)}
          {esAmericano ? ` · ${n}/${MAX_PREVIA_MATCHES} PJ` : ''}
        </option>
      );
    });
  }

  return (
    <div className="border border-border-mid rounded-xl bg-surface mb-4 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <span className="font-condensed font-bold text-[12.5px] tracking-[0.13em] text-white">
          {scheduled ? 'EDITAR LA PROGRAMACIÓN' : 'PROGRAMAR UN PARTIDO'}
        </span>
        <span className="flex-1" />
        <button
          type="button" onClick={onCancel} title="Cerrar" aria-label="Cerrar"
          className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-lg border border-border-strong bg-transparent text-muted hover:text-white cursor-pointer transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="p-4">
        {sinCruces && (
          <p className="text-[12.5px] text-brand m-0 mb-3 leading-relaxed">
            Todas las parejas ya tienen sus {MAX_PREVIA_MATCHES} partidos de la fase previa: no quedan cruces por armar.
          </p>
        )}

        {isPairs ? (
          <div className="flex flex-col gap-3">
            <div>
              <label className={`${labelCls} text-brand`} htmlFor="sch-t1">Pareja 1</label>
              <select id="sch-t1" className={selectCls} value={t1} onChange={(e) => setT1(e.target.value)}>
                <option value="">Elegí una pareja…</option>
                {opcionesPareja(t1, t2)}
              </select>
            </div>
            <div>
              <label className={`${labelCls} text-cyan`} htmlFor="sch-t2">Pareja 2</label>
              <select id="sch-t2" className={selectCls} value={t2} onChange={(e) => setT2(e.target.value)}>
                <option value="">Elegí una pareja…</option>
                {opcionesPareja(t2, t1)}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {[[0, t1, setT1, 'Equipo 1', 'text-brand'], [1, t2, setT2, 'Equipo 2', 'text-cyan']].map(
              ([, equipo, set, titulo, color]) => (
                <div key={titulo}>
                  <span className={`${labelCls} ${color}`}>{titulo}</span>
                  <div className="flex flex-col gap-2">
                    {[0, 1].map((i) => (
                      <select
                        key={i} className={selectCls} value={equipo[i] ?? ''}
                        aria-label={`${titulo} · jugador ${i + 1}`}
                        onChange={(e) => set(equipo.map((v, j) => (j === i ? e.target.value : v)))}
                      >
                        <option value="">Jugador {i + 1}…</option>
                        {activos.map((p) => (
                          <option key={p.id} value={p.id} disabled={equipos.includes(p.id) && equipo[i] !== p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <div>
            <span className={labelCls}>Cancha</span>
            <div className="flex gap-1.5 flex-wrap">
              <button
                type="button" onClick={() => setCourt(null)}
                className={`min-h-[36px] px-3 rounded-lg border font-condensed font-bold text-[11px] tracking-[0.1em] cursor-pointer transition-colors ${
                  court == null ? 'bg-white border-white text-base' : 'border-border-strong text-muted hover:text-white'
                }`}
              >
                SIN ASIGNAR
              </button>
              {Array.from({ length: canchas }, (_, i) => i + 1).map((n) => (
                <button
                  key={n} type="button" onClick={() => setCourt(n)}
                  className={`min-h-[36px] min-w-[44px] rounded-lg border font-condensed font-bold text-[12px] cursor-pointer transition-colors ${
                    court === n ? 'bg-white border-white text-base' : 'border-border-strong text-muted hover:text-white'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="sch-hora">Hora</label>
            <input
              id="sch-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)}
              className={selectCls}
            />
            <p className="text-[11px] text-dim mt-1.5 mb-0">Opcional. La fecha es la de la jornada.</p>
          </div>
        </div>

        {sinCupo && (
          <p className="text-[12.5px] text-danger m-0 mt-3">
            Esa pareja ya tiene sus {MAX_PREVIA_MATCHES} partidos de la fase previa.
          </p>
        )}
        {error && <p className="text-[12.5px] text-danger m-0 mt-3">{error}</p>}

        <div className="flex gap-2 mt-4">
          <button
            type="button" onClick={guardar} disabled={!completo || sinCupo || guardando}
            className="flex-1 bg-brand text-base border-0 min-h-[44px] px-4 font-condensed font-bold text-[13px] tracking-wide rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            {scheduled ? 'GUARDAR' : 'PROGRAMAR'}
          </button>
          <button
            type="button" onClick={onCancel}
            className="border border-border-strong bg-transparent text-content min-h-[44px] px-4 rounded-lg text-[12.5px] cursor-pointer hover:text-white hover:border-soft transition-colors"
          >
            Cancelar
          </button>
        </div>
        {!completo && (
          <p className="text-[11.5px] text-dim text-center mt-2.5 mb-0">
            {isPairs ? 'Elegí las dos parejas para programarlo' : 'Completá los cuatro jugadores'}
          </p>
        )}
      </div>
    </div>
  );
}
