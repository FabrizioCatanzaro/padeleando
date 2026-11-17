import { useState } from "react";
import { Shuffle, Star, Undo2, Check, Users } from "lucide-react";
import { getPairLabel } from "../../utils/helpers";
import {
  grupoNombre, tablasPorGrupo, gruposArmados, copaMinPairs, ZONA_MIN_PAIRS, ZONA_MAX_PAIRS,
} from "../../utils/copa";
import { PairAvatar } from "../shared/PlayerAvatar";
import Btn from "../shared/Btn";
import Modal from "../shared/Modal";

const activa = (p) => p.status !== 'withdrawn';

function Pareja({ tournament, pairId, size = 22 }) {
  const pair = tournament.pairs.find((p) => p.id === pairId);
  const p1 = tournament.players.find((p) => p.id === pair?.p1);
  const p2 = tournament.players.find((p) => p.id === pair?.p2);
  return (
    <span className="flex items-center gap-2 min-w-0">
      <PairAvatar name1={p1?.name ?? '?'} name2={p2?.name ?? '?'} src1={p1?.linked_avatar_url ?? null} src2={p2?.linked_avatar_url ?? null} size={size} />
      <span className="min-w-0 truncate">{getPairLabel(pairId, tournament.pairs, tournament.players)}</span>
    </span>
  );
}

// Tabla de un grupo: posición, partidos, sets, games y puntos. La línea marca a los clasificados.
function TablaGrupo({ tournament, zona, rows, clasifican, mias }) {
  const signo = (n) => (n > 0 ? `+${n}` : String(n));
  return (
    <section aria-labelledby={`grupo-${zona}`} className="bg-surface border border-border-mid rounded-xl overflow-hidden">
      <h3 id={`grupo-${zona}`} className="m-0 px-4 py-2.5 border-b border-border font-condensed font-bold text-[13px] tracking-[0.12em] text-white">
        {grupoNombre(zona).toUpperCase()}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="text-secondary text-[11px]">
              <th scope="col" className="text-left font-semibold px-3 py-2 w-8">#</th>
              <th scope="col" className="text-left font-semibold px-1 py-2">Pareja</th>
              <th scope="col" className="font-semibold px-1.5 py-2" title="Partidos jugados">PJ</th>
              <th scope="col" className="font-semibold px-1.5 py-2" title="Partidos ganados">PG</th>
              <th scope="col" className="font-semibold px-1.5 py-2" title="Diferencia de sets">DS</th>
              <th scope="col" className="font-semibold px-1.5 py-2" title="Diferencia de games">DG</th>
              <th scope="col" className="font-semibold px-3 py-2 text-brand" title="Puntos">PTS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pasa = !r.withdrawn && r.pos <= clasifican;
              const corte = r.pos === clasifican && rows.length > clasifican;
              return (
                <tr
                  key={r.id}
                  className={`${corte ? 'border-b-2 border-brand/50' : 'border-b border-border'} ${mias.has(r.id) ? 'bg-brand/10' : ''}`}
                >
                  <td className={`px-3 py-2 font-mono tabular-nums ${pasa ? 'text-brand font-bold' : 'text-secondary'}`}>{r.pos}</td>
                  <td className={`px-1 py-2 max-w-0 w-full ${r.withdrawn ? 'text-dim line-through' : 'text-white'}`}>
                    <Pareja tournament={tournament} pairId={r.id} />
                  </td>
                  <td className="text-center px-1.5 tabular-nums text-content">{r.pj}</td>
                  <td className="text-center px-1.5 tabular-nums text-content">{r.pg}</td>
                  <td className="text-center px-1.5 tabular-nums text-content">{signo(r.sd)}</td>
                  <td className="text-center px-1.5 tabular-nums text-content">{signo(r.gd)}</td>
                  <td className="text-center px-3 tabular-nums font-bold text-white">{r.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Armado de grupos: cabezas de serie, sorteo y ajuste a mano antes de confirmar.
function ArmarGrupos({ tournament, onSorteo, onSave }) {
  const config = tournament.copa_config;
  const zonas = config.zonas;
  const activas = tournament.pairs.filter(activa);
  const [cabezas, setCabezas] = useState(() => activas.filter((p) => p.cabeza_serie != null)
    .sort((a, b) => a.cabeza_serie - b.cabeza_serie).map((p) => p.id));
  const [asignacion, setAsignacion] = useState(() => Object.fromEntries(activas.filter((p) => p.zona != null).map((p) => [p.id, p.zona])));
  const [avisos, setAvisos] = useState([]);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const minimo = copaMinPairs(config);
  const maximo = zonas * ZONA_MAX_PAIRS;
  const sorteado = activas.length > 0 && activas.every((p) => asignacion[p.id] != null);
  const tamanios = Array.from({ length: zonas }, (_, z) => activas.filter((p) => asignacion[p.id] === z + 1).length);

  const toggleCabeza = (id) => setCabezas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  async function sortear() {
    setCargando(true);
    setError(null);
    try {
      const res = await onSorteo(cabezas);
      setAsignacion(Object.fromEntries(res.assignment.map((a) => [a.pair_id, a.zona])));
      setAvisos(res.warnings ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  async function confirmar() {
    setGuardando(true);
    setError(null);
    try {
      await onSave(activas.map((p) => ({ pair_id: p.id, zona: asignacion[p.id] })), cabezas);
    } catch (e) {
      setError(e.data?.errors?.join(' · ') ?? e.message);
      setGuardando(false);
    }
  }

  if (activas.length < minimo) {
    return (
      <div className="bg-surface border border-border-mid rounded-xl p-4 flex gap-3 items-start">
        <Users size={18} className="text-brand shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-[14px] text-content">
          Hay {activas.length} {activas.length === 1 ? 'pareja confirmada' : 'parejas confirmadas'}. Para {zonas} grupos hacen falta al menos {minimo}.
          <span className="block text-secondary text-[13px] mt-1">Sumalas por inscripción o desde Gestión. Si son menos, bajá la cantidad de grupos en Gestión.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-surface border border-border-mid rounded-xl p-4">
        <h3 className="m-0 text-[15px] font-bold text-white">Armar los grupos</h3>
        <p className="m-0 mt-1 text-[13px] text-secondary">
          {activas.length} parejas en {zonas} grupos de {ZONA_MIN_PAIRS} a {ZONA_MAX_PAIRS}{activas.length > maximo ? `. Sobran ${activas.length - maximo}: subí la cantidad de grupos en Gestión` : ''}.
          Marcá las cabezas de serie en orden: van una por grupo.
        </p>
        <ul className="m-0 mt-3 p-0 list-none flex flex-col gap-1.5">
          {activas.map((p) => {
            const orden = cabezas.indexOf(p.id);
            return (
              <li key={p.id} className="flex items-center gap-2 bg-base border border-border-mid rounded-md px-3 py-2">
                <button
                  type="button" onClick={() => toggleCabeza(p.id)} aria-pressed={orden >= 0}
                  aria-label={orden >= 0 ? `Quitar cabeza de serie ${orden + 1}` : 'Marcar como cabeza de serie'}
                  className={`inline-flex items-center justify-center gap-1 min-w-[44px] h-9 rounded-md border text-[12px] font-bold cursor-pointer ${orden >= 0 ? 'bg-brand/15 border-brand text-brand' : 'bg-transparent border-border-strong text-muted hover:text-white'}`}
                >
                  <Star size={13} aria-hidden="true" />{orden >= 0 ? orden + 1 : ''}
                </button>
                <span className="flex-1 min-w-0 text-[14px] text-white"><Pareja tournament={tournament} pairId={p.id} /></span>
                {sorteado && (
                  <select
                    aria-label="Grupo" value={asignacion[p.id] ?? ''}
                    onChange={(e) => setAsignacion((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
                    className="h-9 bg-surface border border-border-strong text-white px-2 rounded-md text-[13px] outline-none cursor-pointer"
                  >
                    {Array.from({ length: zonas }, (_, z) => <option key={z} value={z + 1}>{grupoNombre(z + 1)}</option>)}
                  </select>
                )}
              </li>
            );
          })}
        </ul>
        <div className="flex gap-2 flex-wrap mt-3">
          <Btn icon={Shuffle} onClick={sortear} loading={cargando} variant={sorteado ? 'secondary' : 'primary'}>
            {sorteado ? 'Sortear de nuevo' : 'Sortear grupos'}
          </Btn>
        </div>
      </div>

      {sorteado && (
        <div className="bg-surface border border-border-mid rounded-xl p-4">
          <h3 className="m-0 text-[15px] font-bold text-white">Así quedan</h3>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            {tamanios.map((n, z) => (
              <div key={z} className="border border-border-mid rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-condensed font-bold text-[13px] tracking-[0.12em] text-white">{grupoNombre(z + 1).toUpperCase()}</span>
                  <span className={`text-[12px] ${n < ZONA_MIN_PAIRS || n > ZONA_MAX_PAIRS ? 'text-danger font-semibold' : 'text-secondary'}`}>{n} parejas</span>
                </div>
                <ul className="m-0 p-0 list-none flex flex-col gap-1 text-[13px] text-content">
                  {activas.filter((p) => asignacion[p.id] === z + 1).map((p) => (
                    <li key={p.id} className="flex items-center gap-1.5 min-w-0">
                      {cabezas.includes(p.id) && <Star size={12} className="text-brand shrink-0" aria-label="Cabeza de serie" />}
                      <span className="truncate">{getPairLabel(p.id, tournament.pairs, tournament.players)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {avisos.length > 0 && (
            <div role="status" className="mt-3 rounded-lg border border-premium/50 bg-premium/10 px-3 py-2.5 text-[13px] text-premium font-semibold">
              {avisos.join(' · ')}
            </div>
          )}
          <Btn variant="primary" full icon={Check} className="mt-4" onClick={confirmar} loading={guardando}>
            Confirmar grupos
          </Btn>
          <p className="m-0 mt-2 text-[12px] text-secondary">Con la primera fecha armada, las parejas ya no cambian de grupo.</p>
        </div>
      )}
      {error && <p role="alert" className="m-0 text-[13px] text-danger">{error}</p>}
    </div>
  );
}

// Parejas confirmadas después del sorteo: el organizador las ubica en un grupo.
function UbicarNuevas({ tournament, nuevas, onSave }) {
  const zonas = tournament.copa_config.zonas;
  const [destino, setDestino] = useState(() => Object.fromEntries(nuevas.map((p) => [p.id, 1])));
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      const activas = tournament.pairs.filter(activa);
      await onSave(activas.map((p) => ({ pair_id: p.id, zona: p.zona ?? destino[p.id] })));
    } catch (e) {
      setError(e.data?.errors?.join(' · ') ?? e.message);
      setGuardando(false);
    }
  }
  return (
    <div className="bg-surface border border-premium/50 rounded-xl p-4">
      <h3 className="m-0 text-[15px] font-bold text-white">Parejas sin grupo</h3>
      <p className="m-0 mt-1 text-[13px] text-secondary">Se confirmaron después del sorteo. Elegí su grupo.</p>
      <ul className="m-0 mt-3 p-0 list-none flex flex-col gap-1.5">
        {nuevas.map((p) => (
          <li key={p.id} className="flex items-center gap-2">
            <span className="flex-1 min-w-0 text-[14px] text-white"><Pareja tournament={tournament} pairId={p.id} /></span>
            <select
              aria-label="Grupo" value={destino[p.id]}
              onChange={(e) => setDestino((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
              className="h-9 bg-base border border-border-strong text-white px-2 rounded-md text-[13px] outline-none cursor-pointer"
            >
              {Array.from({ length: zonas }, (_, z) => <option key={z} value={z + 1}>{grupoNombre(z + 1)}</option>)}
            </select>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="m-0 mt-2 text-[13px] text-danger">{error}</p>}
      <Btn variant="primary" size="sm" icon={Check} className="mt-3" onClick={guardar} loading={guardando}>Ubicar parejas</Btn>
    </div>
  );
}

// Solapa Grupos de una copa: el armado para el organizador y las tablas para todos.
export default function CopaGrupos({ tournament, puedeGestionar, acciones, myPairIds = [] }) {
  const [deshacer, setDeshacer] = useState(false);
  const config = tournament.copa_config;
  const armados = gruposArmados(tournament);
  const editable = puedeGestionar && tournament.status !== 'finished' && !tournament.bracket;

  if (!armados) {
    if (editable) return <ArmarGrupos tournament={tournament} onSorteo={acciones.onSorteoGrupos} onSave={acciones.onSaveGrupos} />;
    return (
      <div className="bg-surface border border-border-mid rounded-xl p-4 text-[14px] text-content">
        Los grupos se sortean cuando estén confirmadas las parejas.
      </div>
    );
  }

  const tablas = tablasPorGrupo(tournament.pairs, tournament.matches ?? [], {
    win: tournament.points_win ?? 3, loss: tournament.points_loss ?? 0,
  });
  const nuevas = tournament.pairs.filter((p) => activa(p) && p.zona == null);
  const conFixture = (tournament.fechas?.length ?? 0) > 0 || (tournament.matches?.length ?? 0) > 0;
  const mias = new Set(myPairIds);

  return (
    <div className="flex flex-col gap-4">
      {editable && nuevas.length > 0 && <UbicarNuevas tournament={tournament} nuevas={nuevas} onSave={acciones.onSaveGrupos} />}
      <p className="m-0 text-[13px] text-secondary">
        Pasan {config.clasifican} por grupo{config.mejores_extra > 0 ? ` y los ${config.mejores_extra} mejores ${config.clasifican + 1}°` : ''}.
        Orden: puntos, partidos ganados, diferencia de sets y diferencia de games.
      </p>
      <div className="grid lg:grid-cols-2 gap-4">
        {tablas.map((t) => (
          <TablaGrupo key={t.zona} tournament={tournament} zona={t.zona} rows={t.rows} clasifican={config.clasifican} mias={mias} />
        ))}
      </div>
      {editable && !conFixture && (
        <div>
          <Btn icon={Undo2} onClick={() => setDeshacer(true)}>Deshacer grupos</Btn>
        </div>
      )}
      {deshacer && (
        <Modal
          title="¿Deshacer los grupos?"
          message="Las parejas quedan sin grupo y se vuelve al sorteo. Las cabezas de serie se conservan."
          confirmText="Deshacer"
          onConfirm={() => { setDeshacer(false); acciones.onUndoGrupos(); }}
          onCancel={() => setDeshacer(false)}
        />
      )}
    </div>
  );
}

