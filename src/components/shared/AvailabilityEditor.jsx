import { Plus, X } from 'lucide-react';
import { DIAS, ORDEN_DIAS, HORAS, MAX_RANGOS, MAX_NOTA, aMin } from '../../utils/disponibilidad';

const SELECT = 'h-10 bg-surface border border-border-strong text-white px-2 rounded-lg font-sans text-[14px] outline-none focus:border-brand cursor-pointer';

// Disponibilidad por día de la semana: hasta dos rangos por día y una nota.
export default function AvailabilityEditor({ value, onChange }) {
  const slots = value?.slots ?? [];
  const note = value?.note ?? '';
  const set = (nuevos, nota = note) => onChange({ slots: nuevos, note: nota });
  const delDia = (d) => slots.filter((s) => s.day === d);
  const otros = (d) => slots.filter((s) => s.day !== d);

  const activar = (d, on) => set(on ? [...slots, { day: d, from: '19:00', to: '23:00' }] : otros(d));
  const cambiar = (d, i, patch) => {
    const lista = delDia(d).map((s, j) => (j === i ? { ...s, ...patch } : s));
    set([...otros(d), ...lista]);
  };
  const quitar = (d, i) => set([...otros(d), ...delDia(d).filter((_, j) => j !== i)]);
  const sumar = (d) => {
    const ult = delDia(d).at(-1);
    const desde = HORAS.find((h) => aMin(h) >= aMin(ult?.to ?? '18:00')) ?? '22:00';
    const hasta = HORAS.find((h) => aMin(h) >= aMin(desde) + 120) ?? '24:00';
    set([...slots, { day: d, from: desde, to: hasta }]);
  };

  return (
    <div className="flex flex-col gap-2">
      {ORDEN_DIAS.map((d) => {
        const rangos = delDia(d);
        const on = rangos.length > 0;
        return (
          <div key={d} className={`rounded-xl border px-3 py-2.5 ${on ? 'border-brand/40 bg-brand/5' : 'border-border-strong bg-surface'}`}>
            <label className="flex items-center justify-between gap-3 cursor-pointer min-h-[32px]">
              <span className={`text-[15px] font-semibold ${on ? 'text-white' : 'text-soft'}`}>{DIAS[d]}</span>
              <input
                type="checkbox" checked={on} onChange={(e) => activar(d, e.target.checked)}
                aria-label={`Puedo jugar el ${DIAS[d].toLowerCase()}`}
                className="w-5 h-5 accent-brand cursor-pointer"
              />
            </label>
            {on && (
              <div className="flex flex-col gap-2 mt-2">
                {rangos.map((s, i) => {
                  const invalido = aMin(s.from) >= aMin(s.to);
                  return (
                    <div key={i} className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] text-secondary w-10">Desde</span>
                      <select aria-label={`${DIAS[d]}: desde`} value={s.from} onChange={(e) => cambiar(d, i, { from: e.target.value })} className={SELECT}>
                        {HORAS.slice(0, -1).map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span className="text-[13px] text-secondary">hasta</span>
                      <select aria-label={`${DIAS[d]}: hasta`} value={s.to} onChange={(e) => cambiar(d, i, { to: e.target.value })} className={SELECT}>
                        {HORAS.slice(1).map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                      {rangos.length > 1 && (
                        <button type="button" onClick={() => quitar(d, i)} aria-label="Quitar rango"
                          className="w-10 h-10 flex items-center justify-center bg-transparent border-0 text-muted hover:text-danger cursor-pointer"><X size={16} /></button>
                      )}
                      {invalido && <span className="w-full text-[12px] text-danger">La hora de inicio tiene que ser anterior a la de fin.</span>}
                    </div>
                  );
                })}
                {rangos.length < MAX_RANGOS && (
                  <button type="button" onClick={() => sumar(d)}
                    className="self-start inline-flex items-center gap-1.5 min-h-[36px] bg-transparent border-0 p-0 text-[13px] text-brand font-semibold cursor-pointer">
                    <Plus size={14} /> Otro rango
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      <label className="flex flex-col gap-1.5 mt-2">
        <span className="text-[11px] tracking-wide text-dim font-semibold">NOTA (OPCIONAL)</span>
        <input
          value={note} maxLength={MAX_NOTA} onChange={(e) => set(slots, e.target.value)}
          placeholder="Ej.: el 22 no puedo"
          className="h-12 w-full box-border bg-surface border border-border-strong rounded-lg px-3.5 text-white font-sans text-[15px] outline-none focus:border-brand"
        />
      </label>
    </div>
  );
}
