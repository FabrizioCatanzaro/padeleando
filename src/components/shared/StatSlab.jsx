// La placa que reemplazó a la tarjeta con banda maciza de color. El número va
// siempre en blanco: el color queda en el punto, la marca de agua y la barra.
const TONE = {
  brand:     { dot: 'bg-brand',     bar: 'bg-brand',     mark: 'text-brand opacity-[0.08]' },
  cyan:      { dot: 'bg-cyan',      bar: 'bg-cyan',      mark: 'text-cyan opacity-[0.07]' },
  green:     { dot: 'bg-green',     bar: 'bg-green',     mark: 'text-green opacity-[0.08]' },
  danger:    { dot: 'bg-danger',    bar: 'bg-danger',    mark: 'text-danger opacity-[0.08]' },
  gold:      { dot: 'bg-premium',   bar: 'bg-premium',   mark: 'text-premium opacity-[0.09]' },
  secondary: { dot: 'bg-secondary', bar: 'bg-secondary', mark: 'text-secondary opacity-[0.07]' },
};

export function StatSlabs({ children, className = '' }) {
  return (
    <div className={`grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 ${className}`}>
      {children}
    </div>
  );
}

// `meter` es un porcentaje 0-100 y sólo se pasa cuando hay una proporción real
// detrás; sin él la barra queda en un tramo fijo que sólo identifica el color.
export default function StatSlab({ label, value, sub, tone = 'secondary', icon: Icon, meter = null, kind = 'number', onOpen }) {
  const t = TONE[tone] ?? TONE.secondary;
  const text = String(value ?? '');
  // A 38px un "104 h 32 m" o un empate de tres nombres no entra en 180px de ancho.
  const size = kind === 'name'
    ? (text.length <= 18 ? 'text-[21px]' : 'text-[17px]') + ' leading-tight'
    : text.length <= 4 ? 'text-[38px] leading-none'
      : text.length <= 7 ? 'text-[30px] leading-none'
        : 'text-[24px] leading-none';

  return (
    <div className="stat-slab relative overflow-hidden flex flex-col gap-3.5 border border-border rounded-[10px] px-4 pt-3.5 pb-[18px]">
      {Icon && <Icon size={66} strokeWidth={1.6} className={`absolute -top-2.5 -right-3 pointer-events-none ${t.mark}`} />}
      <div className="flex items-center gap-[7px]">
        <span className={`w-1.5 h-1.5 rounded-[1px] shrink-0 ${t.dot}`} />
        <span className="text-[9.5px] tracking-[0.13em] uppercase font-semibold text-muted">{label}</span>
      </div>
      <div className="relative flex-1 flex flex-col justify-end">
        <div
          className={`font-condensed font-black tabular-nums text-white ${size} ${onOpen ? 'cursor-pointer hover:opacity-75 transition-opacity' : ''}`}
          onClick={onOpen}
        >
          {value}
        </div>
        {sub ? <div className="text-[11.5px] text-dim mt-2.5">{sub}</div> : null}
      </div>
      <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-border">
        <div className={`h-full ${t.bar}`} style={{ width: meter == null ? '30px' : `${Math.max(0, Math.min(100, meter))}%` }} />
      </div>
    </div>
  );
}
