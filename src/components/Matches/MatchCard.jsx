import { Clock, Pencil, Trash2 } from "lucide-react";
import { fmt, getPairLabel, courtLabel, setWinner, visibleSetsCount } from "../../utils/helpers";

// Nombre de un equipo: "Ana & Beto" va en dos líneas, un jugador por línea,
// para que nunca se corte con "…" (auditoría UI, 2026-11-09).
export function TeamName({ label }) {
  if (typeof label !== 'string') return label;
  const idx = label.indexOf(' & ');
  if (idx === -1) return <span>{label}</span>;
  return (
    <span className="flex flex-col">
      <span>{label.slice(0, idx)}</span>
      <span>{label.slice(idx + 3)}</span>
    </span>
  );
}

// Fila del marcador. El ganador se ve siempre igual, sea cual sea el lado:
// blanco, en negrita y con barra amarilla. El perdedor va en gris. Antes el
// color dependía del lado (amarillo o celeste) y el mismo dato tenía dos
// colores. `color` queda por compatibilidad y no cambia nada.
// eslint-disable-next-line no-unused-vars
export function ScoreRow({ label, cells, win, color, prefix = null, compacto = false }) {
  const tam    = compacto ? 'text-[13px]' : 'text-[15px]';
  const tamNum = compacto ? 'text-[15px]' : 'text-[20px] sm:text-[22px]';
  const ancho  = compacto ? 'w-6' : 'w-8 sm:w-9';
  return (
    <div className={`flex items-center ${compacto ? 'gap-2' : 'gap-3'}`}>
      <span className={`w-[3px] self-stretch rounded-sm shrink-0 ${win ? 'bg-brand' : 'bg-transparent'}`} />
      {prefix}
      <div className={`flex-1 min-w-0 font-sans ${tam} leading-snug ${win ? 'text-white font-bold' : 'text-secondary font-medium'}`}>
        <TeamName label={label} />
      </div>
      <div className={`flex shrink-0 font-condensed font-bold ${tamNum} tabular-nums`}>
        {cells.map((cell, i) => (
          <span
            key={i}
            className={`${ancho} text-center ${i > 0 ? 'border-l border-border-mid' : ''} ${cell.win ? 'text-white' : 'text-secondary'}`}
          >
            {cell.v}
          </span>
        ))}
      </div>
    </div>
  );
}

// matchNum ya no se muestra: al jugador no le dice nada (auditoría UI).
export default function MatchCard({ match, tournament, isOwner, onEdit, onDelete, hideDate = false }) {
  const { team1, team2, score1, score2, date, createdAt, sets = [], sets_format } = match;
  const { players, pairs, mode } = tournament;

  // Para 1 set mostramos el score del set, no los sets ganados (que sería 1-0)
  const displayS1 = sets_format === 1 ? (sets[0]?.s1 ?? score1) : score1;
  const displayS2 = sets_format === 1 ? (sets[0]?.s2 ?? score2) : score2;
  const win1 = parseInt(score1) > parseInt(score2);

  const nVisible = sets_format === 3 ? visibleSetsCount(3, sets) : 0;
  const cols = nVisible > 0
    ? sets.slice(0, nVisible).map((s) => {
        const w = setWinner(s);
        return { v1: s.s1, v2: s.s2, w1: w === 1, w2: w === 2 };
      })
    : [{ v1: displayS1, v2: displayS2, w1: win1, w2: !win1 }];

  const cancha = courtLabel(tournament, match.court);
  // La duración no está en todos los partidos. Antes se dibujaba igual y decía
  // "--:-- min": una fila reservada para un dato que no existe.
  const dur = match.duration_seconds != null
    ? `${String(Math.floor(match.duration_seconds / 60)).padStart(2, '0')}:${String(match.duration_seconds % 60).padStart(2, '0')} min`
    : null;

  function getLabel(team) {
    if (mode === "pairs") {
      const pair = pairs?.find(
        (p) => (p.p1 === team[0] && p.p2 === team[1]) || (p.p1 === team[1] && p.p2 === team[0])
      );
      if (pair) return getPairLabel(pair.id, pairs, players);
    }
    return team.map((id) => players.find((p) => p.id === id)?.name ?? "?").join(" & ");
  }

  return (
    <div className="bg-surface border border-border-mid rounded-xl px-4 py-3">
      {/* Sin fecha ni datos que mostrar, la fila de arriba no ocupa lugar. */}
      {(!hideDate || cancha != null || match.walkover || dur || isOwner) && (
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        {/* En una lista agrupada por día la fecha ya está en el título. */}
        {!hideDate && <span className="text-[12px] text-secondary">{fmt(date || createdAt)}</span>}
        {cancha != null && <span className="text-[12px] text-secondary">{hideDate ? '' : '· '}Cancha {cancha}</span>}
        {match.walkover && (
          <span title="La pareja rival se retiró: se le dio por perdido 6-0" className="text-[12px] font-semibold text-muted border border-border-strong px-2 py-0.5 rounded-full">
            W.O.
          </span>
        )}
        {dur && (
          <span className="text-[12px] text-secondary inline-flex items-center gap-1.5">
            <Clock size={12} className="shrink-0" />{dur}
          </span>
        )}
        <span className="flex-1" />
        {/* Botones de verdad: antes eran <div onClick>, así que no se llegaba
            con el teclado ni los anunciaba un lector de pantalla — y Eliminar
            borra un resultado. Además la fila propia costaba ~42 px por
            partido, que en una jornada larga es scroll sin resultados. */}
        {isOwner && (
          <span className="inline-flex gap-1 shrink-0">
            <button
              type="button"
              onClick={onEdit}
              title="Editar el partido"
              aria-label="Editar el partido"
              className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-lg border border-border-strong bg-transparent text-muted hover:text-white hover:border-soft cursor-pointer transition-colors"
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              title="Eliminar el partido"
              aria-label="Eliminar el partido"
              className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-lg border border-border-strong bg-transparent text-danger hover:border-danger/60 cursor-pointer transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </span>
        )}
      </div>
      )}

      <div className="flex flex-col gap-2">
        <ScoreRow
          label={getLabel(team1)}
          cells={cols.map((c) => ({ v: c.v1, win: c.w1 }))}
          win={win1}
          color="brand"
        />
        <ScoreRow
          label={getLabel(team2)}
          cells={cols.map((c) => ({ v: c.v2, win: c.w2 }))}
          win={!win1}
          color="cyan"
        />
      </div>
    </div>
  );
}
