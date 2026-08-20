import SectionRule from '../shared/SectionRule';
import { heatLevel } from '../../utils/clubPage';

// Doce meses de un vistazo. El dato ya viajaba en `event_date` y se tiraba: sin
// esto no hay forma de saber si el club está activo o lleva medio año parado.
// Cada barra filtra: es el gesto más corto para "mostrame lo de julio".
export default function ClubActivity({ months, value, onChange }) {
  const max   = Math.max(...months.map((m) => m.n), 1);
  const total = months.reduce((n, m) => n + m.n, 0);

  return (
    <>
      <SectionRule
        action={
          <span className="shrink-0 text-[11px] text-dim">
            {total} {total === 1 ? 'torneo' : 'torneos'} en 12 meses
          </span>
        }
      >
        ACTIVIDAD
      </SectionRule>

      <div className="flex gap-1 items-end h-[52px]">
        {months.map((m) => {
          const on = value === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onChange(on ? null : m.key)}
              aria-pressed={on}
              title={`${m.full}: ${m.n} ${m.n === 1 ? 'torneo' : 'torneos'}`}
              className={`flex-1 min-w-0 rounded-t-[3px] cursor-pointer transition-all p-0 border-0 ${
                on ? 'outline outline-2 outline-white outline-offset-1' : 'hover:outline hover:outline-1 hover:outline-soft hover:outline-offset-1'
              }`}
              style={{
                height: m.n === 0 ? 3 : `${Math.round((m.n / max) * 100)}%`,
                background: `var(--color-heat-${heatLevel(m.n, max)})`,
              }}
            />
          );
        })}
      </div>
      <div className="flex gap-1 mt-[7px]">
        {months.map((m) => (
          <span
            key={m.key}
            className={`flex-1 min-w-0 text-center text-[8.5px] truncate ${
              value === m.key ? 'text-white font-bold' : 'text-dim'
            }`}
          >
            {m.label}
          </span>
        ))}
      </div>
    </>
  );
}
