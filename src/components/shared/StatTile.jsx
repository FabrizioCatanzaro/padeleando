// El azulejo de número grande que se repite en perfil (tu juego, filtro de
// partidos, avanzadas). Antes cada bloque lo redibujaba con su propio tamaño.
const TONE = {
  default: 'text-white',
  brand:   'text-brand',
  green:   'text-green',
  danger:  'text-danger',
  gold:    'text-premium-hi',
  // Un cero no merece el mismo peso visual que un dato: se apaga.
  off:     'text-border-strong',
};

export function StatTiles({ children, className = '' }) {
  return (
    <div className={`grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(146px,1fr))] ${className}`}>
      {children}
    </div>
  );
}

export default function StatTile({ value, label, sub, tone = 'default' }) {
  return (
    <div className="border border-border-mid rounded-xl bg-surface px-3.5 py-3">
      <div className={`font-condensed font-black text-[26px] leading-none tabular-nums ${TONE[tone] ?? TONE.default}`}>
        {value}
      </div>
      <div className="text-[9.5px] tracking-[0.13em] text-muted mt-[7px] uppercase">{label}</div>
      {sub ? <div className="text-[11px] text-dim mt-1">{sub}</div> : null}
    </div>
  );
}
