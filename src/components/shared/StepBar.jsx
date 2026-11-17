// Barra de progreso por pasos. `steps` es [{ id, label, subs? }]; `subIdx` y `subLabel` marcan el mini paso activo.
export default function StepBar({ steps, currentIdx, subIdx = 0, subLabel = null, className = 'mb-7' }) {
  const actual = steps[currentIdx];
  const subsActual = actual?.subs ?? 1;
  return (
    <div className={className} role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={currentIdx + 1} aria-valuetext={`Paso ${currentIdx + 1} de ${steps.length}: ${actual?.label ?? ''}`}>
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <p className="m-0 text-[11px] font-mono tracking-[2px] text-muted whitespace-nowrap">
          PASO {currentIdx + 1} DE {steps.length} · <span className="text-brand">{actual?.label}</span>
        </p>
        {subsActual > 1 && (
          <p className="m-0 text-[12px] text-secondary truncate">
            {subLabel} <span className="font-mono text-dim">{subIdx + 1}/{subsActual}</span>
          </p>
        )}
      </div>
      <div className="flex gap-1.5">
        {steps.map((s, i) => {
          const subs = s.subs ?? 1;
          return (
            <div key={s.id} className="flex-1 min-w-0">
              <div className="flex gap-0.5">
                {Array.from({ length: subs }, (_, j) => {
                  const lleno = i < currentIdx || (i === currentIdx && j <= subIdx);
                  return (
                    <div key={j} className={`h-1.5 flex-1 first:rounded-l-full last:rounded-r-full transition-colors duration-300 ${lleno ? 'bg-brand' : 'bg-border-strong'}`} />
                  );
                })}
              </div>
              <span className={`hidden sm:block mt-1.5 text-[10px] font-mono tracking-widest truncate transition-colors ${i === currentIdx ? 'text-brand' : i < currentIdx ? 'text-muted' : 'text-dim'}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
