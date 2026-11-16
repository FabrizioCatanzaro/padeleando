import { Minus, Plus } from "lucide-react";

function Opcion({ on, onClick, children }) {
  return (
    <button
      type="button" aria-pressed={on} onClick={onClick}
      className={`flex-1 min-h-[44px] py-2.5 text-[14px] font-semibold rounded-sm border transition cursor-pointer ${on ? 'bg-brand/15 border-brand text-brand' : 'bg-surface-alt border-border-mid text-content hover:border-border-strong'}`}
    >
      {children}
    </button>
  );
}

function Puntos({ label, value, min, max, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-sm border border-border-mid">
      <span className="text-[14px] text-white">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`${label}: menos`} disabled={value <= min} onClick={() => onChange(value - 1)}
          className="inline-flex items-center justify-center w-11 h-11 rounded-sm border border-border-strong bg-transparent text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"><Minus size={16} /></button>
        <span className="min-w-[78px] text-center text-[14px] font-semibold text-white" aria-live="polite">{value} {value === 1 ? 'punto' : 'puntos'}</span>
        <button type="button" aria-label={`${label}: más`} disabled={value >= max} onClick={() => onChange(value + 1)}
          className="inline-flex items-center justify-center w-11 h-11 rounded-sm border border-border-strong bg-transparent text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"><Plus size={16} /></button>
      </div>
    </div>
  );
}

// Opciones de la Liga: cuándo se juega, cruces repetidos, puntos y cómo se define el campeón.
// `heredado` son los puntos de la última liga de la categoría, si los hay.
export default function LigaOpciones({ value, onChange, modoBloqueado = false, heredado = null }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  const win  = value.points_win  ?? heredado?.win  ?? 3;
  const loss = value.points_loss ?? heredado?.loss ?? 0;
  const setPuntos = (w, l) => onChange({ ...value, points_win: w, points_loss: Math.min(l, w) });
  const temporada = value.liga_mode === 'temporada';
  const playoffs = value.winner_format === 'playoffs';
  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-border" onClick={(e) => e.stopPropagation()}>
      <div>
        <span className="block text-[13px] font-semibold text-white mb-1.5">¿Cuándo se juega?</span>
        {!modoBloqueado && (
          <div className="flex gap-2">
            <Opcion on={!temporada} onClick={() => set('liga_mode', 'jornada')}>Un solo día</Opcion>
            <Opcion on={temporada} onClick={() => set('liga_mode', 'temporada')}>Varios días</Opcion>
          </div>
        )}
        <p className="m-0 mt-1.5 text-[12px] text-secondary">
          {modoBloqueado
            ? 'Varios días. Con fechas armadas no se cambia.'
            : temporada ? 'Una temporada dividida en fechas. Las parejas son fijas.' : 'Todos los partidos se juegan el mismo día.'}
        </p>
      </div>
      {temporada && (
        <div>
          <span className="block text-[13px] font-semibold text-white mb-1.5">Cruces repetidos</span>
          <div className="flex gap-2">
            <Opcion on={!value.allow_rematch} onClick={() => set('allow_rematch', false)}>No</Opcion>
            <Opcion on={value.allow_rematch} onClick={() => set('allow_rematch', true)}>Sí</Opcion>
          </div>
          <p className="m-0 mt-1.5 text-[12px] text-secondary">
            {value.allow_rematch ? 'Dos parejas pueden volver a cruzarse. Se priorizan los cruces nuevos.' : 'Cada pareja enfrenta a las demás una sola vez.'}
          </p>
        </div>
      )}
      <div>
        <span className="block text-[13px] font-semibold text-white mb-1.5">Puntos</span>
        <div className="flex flex-col gap-2">
          <Puntos label="Victoria" value={win} min={0} max={10} onChange={(w) => setPuntos(w, loss)} />
          <Puntos label="Derrota" value={loss} min={0} max={win} onChange={(l) => setPuntos(win, l)} />
        </div>
        <p className="m-0 mt-1.5 text-[12px] text-secondary">
          La tabla se ordena por puntos. La derrota por W.O. no suma.
          {heredado && value.points_win == null ? ' Copiados de la última liga de la categoría.' : ''}
        </p>
      </div>
      <div>
        <span className="block text-[13px] font-semibold text-white mb-1.5">Campeón</span>
        <div className="flex gap-2">
          <Opcion on={!playoffs} onClick={() => onChange({ ...value, winner_format: 'tabla', playoff_size: null })}>Primero de la tabla</Opcion>
          <Opcion on={playoffs} onClick={() => onChange({ ...value, winner_format: 'playoffs', playoff_size: value.playoff_size ?? 4 })}>Playoffs</Opcion>
        </div>
        {playoffs && (
          <div className="flex items-center justify-between gap-3 mt-2 px-3 py-1.5 rounded-sm border border-border-mid">
            <span className="text-[14px] text-white">Pasan a playoffs</span>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Menos parejas" onClick={() => set('playoff_size', Math.max(2, value.playoff_size - 1))}
                className="inline-flex items-center justify-center w-11 h-11 rounded-sm border border-border-strong bg-transparent text-white cursor-pointer"><Minus size={16} /></button>
              <span className="min-w-[78px] text-center text-[14px] font-semibold text-white">{value.playoff_size} parejas</span>
              <button type="button" aria-label="Más parejas" onClick={() => set('playoff_size', Math.min(16, value.playoff_size + 1))}
                className="inline-flex items-center justify-center w-11 h-11 rounded-sm border border-border-strong bg-transparent text-white cursor-pointer"><Plus size={16} /></button>
            </div>
          </div>
        )}
        <p className="m-0 mt-1.5 text-[12px] text-secondary">
          {playoffs ? 'Al terminar la tabla, las primeras parejas juegan un cuadro.' : 'Gana la primera pareja de la tabla.'}
        </p>
      </div>
    </div>
  );
}
