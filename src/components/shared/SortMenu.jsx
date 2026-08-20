import { useEffect, useRef, useState } from 'react';
import { ArrowDownUp, Check } from 'lucide-react';

// Un solo botón con menú en vez de dos controles (campo + dirección): en mobile
// dos controles se comen el ancho de la barra de filtros. Sirve igual para
// ordenar y para elegir de una lista corta (la categoría de un partido), que es
// el mismo gesto: un valor de varios, con el actual escrito en el botón.
export default function SortMenu({
  value,
  onChange,
  options,
  icon,
  heading = 'ORDENAR POR',
  title,
  variant = 'button',
  align = 'right',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const Icon = icon ?? ArrowDownUp;
  const current = options.find((o) => o.id === value) ?? options[0];

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

  const trigger = variant === 'chip'
    ? `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11.5px] font-sans cursor-pointer transition-colors ${
        open ? 'border-soft text-soft' : 'border-border-strong text-muted hover:text-soft hover:border-soft'
      }`
    : 'inline-flex items-center gap-2 bg-transparent border border-border-strong text-content px-3 py-2 rounded-sm text-xs font-sans cursor-pointer hover:bg-border-mid hover:text-white transition-colors whitespace-nowrap';

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={title}
        className={trigger}
      >
        <Icon size={variant === 'chip' ? 12 : 13} className="shrink-0" />
        {current?.short ?? current?.label}
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute top-full z-40 mt-1.5 min-w-[228px] max-w-[min(80vw,320px)] bg-surface border border-border-strong rounded-lg overflow-hidden shadow-xl ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          <div className="px-3 pt-2.5 pb-1 font-condensed font-bold text-[9px] tracking-widest text-dim">
            {heading}
          </div>
          <div className="max-h-[52vh] overflow-y-auto">
            {options.map((o) => (
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
                <span className="truncate">{o.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
