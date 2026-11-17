import { Minus, Plus } from "lucide-react";
import { Opcion, Puntos } from "../shared/LigaOpciones";
import { ZONAS_MIN, ZONAS_MAX, ZONA_MAX_PAIRS, MAX_PRIZE_TEXT, totalClasificados, copaConfigError } from "../../utils/copa";

function Cantidad({ label, value, min, max, unidad, onChange }) {
  const btn = "inline-flex items-center justify-center w-11 h-11 rounded-sm border border-border-strong bg-transparent text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-sm border border-border-mid">
      <span className="text-[14px] text-white">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`${label}: menos`} disabled={value <= min} onClick={() => onChange(value - 1)} className={btn}><Minus size={16} /></button>
        <span className="min-w-[78px] text-center text-[14px] font-semibold text-white" aria-live="polite">{value} {unidad(value)}</span>
        <button type="button" aria-label={`${label}: más`} disabled={value >= max} onClick={() => onChange(value + 1)} className={btn}><Plus size={16} /></button>
      </div>
    </div>
  );
}

function Bloque({ titulo, ayuda, children }) {
  return (
    <div>
      <span className="block text-[13px] font-semibold text-white mb-1.5">{titulo}</span>
      {children}
      {ayuda && <p className="m-0 mt-1.5 text-[12px] text-secondary">{ayuda}</p>}
    </div>
  );
}

const PREMIOS = [
  { key: 'premio1', label: 'Campeón', placeholder: 'ej: 2 paletas y trofeo' },
  { key: 'premio2', label: 'Subcampeón (opcional)', placeholder: 'ej: 2 bolsos' },
  { key: 'premio3', label: 'Tercer puesto (opcional)', placeholder: 'ej: tubos de pelotas' },
];

// Opciones de la Copa. `bloqueo` apaga lo que no se cambia; `conPremios` suma los premios; `seccion` muestra uno de copaSecciones.
export default function CopaOpciones({ value, onChange, bloqueo = {}, conPremios = true, seccion = null }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  const zonas = value.mode === 'zonas';
  const ver = (...ids) => !seccion || ids.includes(seccion);
  const win = value.points_win ?? 3;
  const loss = value.points_loss ?? 0;
  const error = copaConfigError(value);
  const setZonas = (n) => onChange({ ...value, zonas: n, mejores_extra: Math.min(value.mejores_extra, n - 1) });
  return (
    <div className={seccion ? 'flex flex-col gap-6' : 'flex flex-col gap-4 mt-4 pt-4 border-t border-border'} onClick={(e) => e.stopPropagation()}>
      {ver('tipo') && <Bloque
        titulo="Tipo de copa"
        ayuda={bloqueo.mode
          ? (zonas ? 'Con grupos. El tipo de copa no se cambia.' : 'De cuadro. El tipo de copa no se cambia.')
          : zonas ? 'Fase de grupos por fechas y después playoffs.' : 'Eliminación directa desde el primer partido.'}
      >
        {!bloqueo.mode && (
          <div className="flex gap-2">
            <Opcion on={zonas} onClick={() => set('mode', 'zonas')}>Con grupos</Opcion>
            <Opcion on={!zonas} onClick={() => set('mode', 'cuadro')}>De cuadro</Opcion>
          </div>
        )}
      </Bloque>}

      {zonas && (
        <>
          {ver('grupos') && <Bloque titulo="Grupos" ayuda={bloqueo.zonas ? 'Con los grupos armados, la cantidad no se cambia.' : `Cada grupo tiene de 3 a ${ZONA_MAX_PAIRS} parejas. Se sortean con las parejas confirmadas.`}>
            {!bloqueo.zonas && (
              <Cantidad label="Cantidad de grupos" value={value.zonas} min={ZONAS_MIN} max={ZONAS_MAX} unidad={() => 'grupos'} onChange={setZonas} />
            )}
          </Bloque>}
          {ver('grupos') && <Bloque titulo="Ruedas" ayuda={bloqueo.ruedas ? 'Con fechas armadas, las ruedas no se cambian.' : value.ruedas === 2 ? 'Cada pareja enfrenta dos veces a las demás de su grupo.' : 'Cada pareja enfrenta una vez a las demás de su grupo.'}>
            {!bloqueo.ruedas && (
              <div className="flex gap-2">
                <Opcion on={value.ruedas !== 2} onClick={() => set('ruedas', 1)}>Una rueda</Opcion>
                <Opcion on={value.ruedas === 2} onClick={() => set('ruedas', 2)}>Dos ruedas</Opcion>
              </div>
            )}
          </Bloque>}
          {ver('playoffs') && <Bloque titulo="Playoffs" ayuda={error ?? `A playoffs pasan ${totalClasificados(value)} parejas.`}>
            <div className="flex flex-col gap-2">
              <Cantidad label="Pasan por grupo" value={value.clasifican} min={1} max={ZONA_MAX_PAIRS - 1} unidad={(n) => (n === 1 ? 'pareja' : 'parejas')} onChange={(n) => set('clasifican', n)} />
              <Cantidad label="Mejores siguientes" value={value.mejores_extra} min={0} max={value.zonas - 1} unidad={(n) => (n === 1 ? 'pareja' : 'parejas')} onChange={(n) => set('mejores_extra', n)} />
            </div>
          </Bloque>}
          {ver('playoffs') && <Bloque titulo="Copa de plata" ayuda={value.plata ? 'Las parejas que no clasifican juegan su propio cuadro.' : 'Las parejas que no clasifican terminan en la fase de grupos.'}>
            <div className="flex gap-2">
              <Opcion on={!value.plata} onClick={() => set('plata', false)}>No</Opcion>
              <Opcion on={value.plata} onClick={() => set('plata', true)}>Sí</Opcion>
            </div>
          </Bloque>}
        </>
      )}

      {ver('playoffs', 'tercer') && <Bloque titulo="Tercer puesto" ayuda={value.tercer_puesto ? 'Los perdedores de las semifinales juegan un partido.' : 'Los dos perdedores de las semifinales comparten el tercer puesto.'}>
        <div className="flex gap-2">
          <Opcion on={!value.tercer_puesto} onClick={() => set('tercer_puesto', false)}>Se comparte</Opcion>
          <Opcion on={value.tercer_puesto} onClick={() => set('tercer_puesto', true)}>Se juega</Opcion>
        </div>
      </Bloque>}

      {zonas && ver('puntos') && (
        <Bloque titulo="Puntos" ayuda="La tabla de cada grupo se ordena por puntos. La derrota por W.O. no suma.">
          <div className="flex flex-col gap-2">
            <Puntos label="Victoria" value={win} min={0} max={10} onChange={(w) => onChange({ ...value, points_win: w, points_loss: Math.min(loss, w) })} />
            <Puntos label="Derrota" value={loss} min={0} max={win} onChange={(l) => onChange({ ...value, points_win: win, points_loss: l })} />
          </div>
        </Bloque>
      )}

      {conPremios && ver('premios') && (
        <Bloque titulo="Premios" ayuda="El premio del campeón es obligatorio. Después podés sumar premios especiales desde Gestión.">
          <div className="flex flex-col gap-2">
            {PREMIOS.map((p) => (
              <label key={p.key} className="block">
                <span className="block text-[12px] text-secondary mb-1">{p.label}</span>
                <input
                  className="w-full bg-surface-alt border border-border-mid text-white px-3 py-2.5 font-sans text-[14px] rounded-sm outline-none"
                  value={value[p.key] ?? ''} maxLength={MAX_PRIZE_TEXT} placeholder={p.placeholder}
                  onChange={(e) => set(p.key, e.target.value)}
                />
              </label>
            ))}
          </div>
        </Bloque>
      )}
    </div>
  );
}
