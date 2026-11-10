import { Check, Plus } from 'lucide-react';
import { estadoDeFecha } from '../../utils/fechas';

// Fila de fechas de una liga en varios días; el organizador ve "+ Fecha N".
export default function FechaBar({ tournament, selected, onSelect, onArmar }) {
  const fechas = tournament.fechas ?? [];
  const siguiente = (fechas[fechas.length - 1]?.number ?? 0) + 1;

  return (
    <nav aria-label="Fechas de la liga" className="flex gap-1.5 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
      {fechas.map((f) => {
        const on = f.number === selected;
        const estado = estadoDeFecha(tournament, f);
        return (
          <button
            key={f.id} type="button" aria-current={on ? 'true' : undefined}
            onClick={() => onSelect(f.number)}
            className={`shrink-0 inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-full border text-[13px] font-bold cursor-pointer transition-colors ${
              on ? 'border-brand text-brand bg-brand/10' : 'border-border-strong text-content hover:text-white'
            }`}
          >
            F{f.number}
            {estado === 'completa' && <Check size={13} className="text-green" aria-label="completa" />}
            {estado === 'pendiente' && (
              <span role="img" aria-label="con partidos pendientes" className="w-1.5 h-1.5 rounded-full bg-premium" />
            )}
          </button>
        );
      })}
      {onArmar && (
        <button
          type="button" onClick={onArmar}
          className="shrink-0 inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-full border border-dashed border-soft/60 text-content text-[13px] font-semibold cursor-pointer hover:text-white"
        >
          <Plus size={13} /> Fecha {siguiente}
        </button>
      )}
    </nav>
  );
}
