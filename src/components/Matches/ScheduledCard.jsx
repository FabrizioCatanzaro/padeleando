import { Clock, Pencil, Trash2, Play, Radio } from 'lucide-react';
import { getPairLabel, courtLabel, fmtHora } from '../../utils/helpers';
import { diaCorto } from '../../utils/fechas';
import { TeamName } from './MatchCard';

/**
 * Un partido del fixture: equipos, cancha y hora, todavía sin resultado.
 * Es la misma anatomía que la tarjeta de un partido jugado —azulejo de datos
 * arriba, equipos abajo— para que la lista no cambie de idioma a mitad de
 * camino. Lo que cambia es qué se puede hacer con él.
 */
export default function ScheduledCard({
  match, tournament, isOwner, esMio = false, enVivo = false,
  onEmpezar, onCargar, onEdit, onDelete,
}) {
  const { players, pairs, mode } = tournament;

  function getLabel(team) {
    if (mode === 'pairs') {
      const pair = pairs?.find(
        (p) => (p.p1 === team[0] && p.p2 === team[1]) || (p.p1 === team[1] && p.p2 === team[0]),
      );
      if (pair) return getPairLabel(pair.id, pairs, players);
    }
    return team.map((id) => players.find((p) => p.id === id)?.name ?? '?').join(' & ');
  }

  const cancha = courtLabel(tournament, match.court);
  const hora = match.scheduled_at ? fmtHora(match.scheduled_at) : null;
  const dia = match.scheduled_date ? diaCorto(match.scheduled_date) : null;

  return (
    <div
      className={`border rounded-xl px-4 py-3 border-l-[3px] ${
        enVivo
          ? 'border-green/40 border-l-green'
          : match.postponed
            ? 'border-premium/40 border-l-premium'
            : esMio
            ? 'border-border-mid border-l-brand'
            : 'border-border-mid border-l-border-strong'
      }`}
      style={enVivo
        ? { background: 'color-mix(in srgb, var(--color-green) 7%, var(--color-surface))' }
        : esMio
          ? { background: 'color-mix(in srgb, var(--color-brand) 5%, var(--color-surface))' }
          : { background: 'var(--color-surface)' }}
    >
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        {enVivo && (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-green">
            <Radio size={12} /> En juego
          </span>
        )}
        {match.postponed && (
          <span className="text-[12px] font-semibold text-premium">Postergado</span>
        )}
        {(dia || hora) && (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-cyan">
            <Clock size={12} /> {[dia, hora].filter(Boolean).join(' · ')}
          </span>
        )}
        {cancha != null && (
          <span className="text-[12px] text-secondary">
            Cancha {cancha}
          </span>
        )}
        {/* Lo que el fixture le resuelve al que viene a jugar: cuál es el suyo. */}
        {esMio && !isOwner && (
          <span className="inline-flex items-center text-[12px] font-bold px-2 py-0.5 rounded-full bg-brand text-base">
            Jugás vos
          </span>
        )}
        <span className="flex-1" />
        {isOwner && (
          <span className="inline-flex gap-1 shrink-0">
            <button
              type="button" onClick={onEdit}
              title="Editar la programación" aria-label="Editar la programación"
              className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-lg border border-border-strong bg-transparent text-muted hover:text-white hover:border-soft cursor-pointer transition-colors"
            >
              <Pencil size={13} />
            </button>
            <button
              type="button" onClick={onDelete}
              title="Sacar del fixture" aria-label="Sacar del fixture"
              className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-lg border border-border-strong bg-transparent text-danger hover:border-danger/60 cursor-pointer transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="min-w-0 basis-[190px] grow flex flex-col gap-1.5 font-sans font-semibold text-[15px] text-white leading-snug">
          <TeamName label={getLabel(match.team1)} />
          <span className="text-secondary font-normal text-[12px]">contra</span>
          <TeamName label={getLabel(match.team2)} />
        </div>
        {isOwner && (
          <span className="flex gap-1.5 shrink-0">
            {/* Programar es para el fixture; empezar es para jugar. Acá arranca
                el cronómetro que ve todo el mundo, no adentro del formulario. */}
            {!enVivo && (
              <button
                type="button"
                onClick={onEmpezar}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green/45 text-green bg-transparent text-[12px] cursor-pointer hover:border-green transition-colors min-h-[34px]"
              >
                <Play size={12} /> Empezar
              </button>
            )}
            <button
              type="button"
              onClick={onCargar}
              className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[12px] cursor-pointer min-h-[34px] transition-colors ${
                enVivo
                  ? 'bg-brand border border-brand text-base font-semibold'
                  : 'border border-border-strong text-content hover:border-soft hover:text-white bg-transparent'
              }`}
            >
              Cargar resultado
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
