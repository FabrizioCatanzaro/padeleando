import { Clock } from 'lucide-react';
import { getPairLabel } from '../../utils/helpers';
import { resumenDisponibilidad, coincidencias, rangoTexto } from '../../utils/disponibilidad';

// Horarios de las dos parejas y los días de la fecha en que coinciden.
export default function DisponibilidadParejas({ tournament, pairIds, dias, onElegir }) {
  const pares = pairIds.map((id) => tournament.pairs.find((p) => p.id === id)).filter(Boolean);
  if (pares.length < 2) return null;
  const todas = pares.flatMap((p) => p.availability ?? []);
  const faltan = pares.some((p) => !(p.availability ?? []).some((a) => a?.slots?.length));
  const comunes = faltan ? [] : coincidencias(todas, dias);

  return (
    <section aria-label="Horarios de las parejas" className="mt-4 rounded-lg border border-border-mid px-3 py-2.5 flex flex-col gap-2">
      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-soft">
        <Clock size={13} aria-hidden="true" /> Horarios de las parejas
      </span>
      {pares.map((p) => {
        const avs = (p.availability ?? []).filter(Boolean);
        return (
          <div key={p.id} className="text-[13px] leading-snug">
            <span className="text-white font-semibold">{getPairLabel(p.id, tournament.pairs, tournament.players)}</span>
            <span className="block text-secondary">
              {avs.length === 0 ? 'Sin horarios cargados' : avs.map((a) => [resumenDisponibilidad(a), a.note].filter(Boolean).join(' · ') || 'Sin horarios cargados').join(' / ')}
            </span>
          </div>
        );
      })}
      {!faltan && (comunes.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] text-green font-semibold">Coinciden</span>
          <div className="flex gap-1.5 flex-wrap">
            {comunes.flatMap((c) => c.ranges.map((r) => (
              <button
                key={`${c.date}-${r.from}`} type="button" onClick={() => onElegir?.(c.date, r.from)}
                className="min-h-[36px] px-3 rounded-full border border-green/40 bg-green/10 text-[13px] text-green font-semibold cursor-pointer hover:border-green"
              >
                {c.label} · {rangoTexto(r)}
              </button>
            )))}
          </div>
        </div>
      ) : (
        <span className="text-[12px] text-secondary">No coinciden en los días de esta fecha.</span>
      ))}
    </section>
  );
}
