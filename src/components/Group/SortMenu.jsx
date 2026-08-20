import { useEffect, useRef, useState } from 'react';
import { ArrowDownUp, Check } from 'lucide-react';
import { SORT_OPTIONS } from '../../utils/tournamentFilters';

// Un solo botón con menú en vez de dos controles (campo + dirección): en mobile
// dos controles se comen el ancho de la barra de filtros.
export default function SortMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = SORT_OPTIONS.find((o) => o.id === value) ?? SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey  = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Ordenar torneos"
        className="inline-flex items-center gap-2 bg-transparent border border-border-strong text-content px-3 py-2 rounded-sm text-xs font-sans cursor-pointer hover:bg-border-mid hover:text-white transition-colors whitespace-nowrap"
      >
        <ArrowDownUp size={13} className="shrink-0" />
        {current.short}
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full right-0 z-40 mt-1.5 min-w-[228px] bg-surface border border-border-strong rounded-lg overflow-hidden shadow-xl"
        >
          <div className="px-3 pt-2.5 pb-1 font-condensed font-bold text-[9px] tracking-widest text-dim">
            ORDENAR POR
          </div>
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="option"
              aria-selected={o.id === value}
              onClick={() => { onChange(o.id); setOpen(false); }}
              className={`flex items-center gap-2.5 w-full bg-transparent border-0 px-3 py-2 text-[12.5px] font-sans text-left cursor-pointer hover:bg-surface-alt transition-colors ${
                o.id === value ? 'text-brand' : 'text-content'
              }`}
            >
              <Check size={13} className={`shrink-0 ${o.id === value ? 'opacity-100' : 'opacity-0'}`} />
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
