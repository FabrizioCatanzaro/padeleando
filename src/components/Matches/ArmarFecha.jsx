import { useState, useEffect, useRef } from 'react';
import { X, Shuffle, Plus, Trash2 } from 'lucide-react';
import { getPairLabel } from '../../utils/helpers';
import { parejaDeEquipo } from '../../utils/fechas';
import { TEAM_SELECT_CLS } from './MatchForm';

const sumarDias = (iso, n) => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Armar la fecha siguiente (al azar o a mano) o editar una fecha ya armada.
export default function ArmarFecha({ tournament, fecha = null, esUltima = false, onPreview, onSave, onDelete, onCancel }) {
  const editando = !!fecha;
  const anterior = tournament.fechas[tournament.fechas.length - 1] ?? null;
  const number = editando ? fecha.number : (anterior?.number ?? 0) + 1;
  const jugados = editando ? tournament.matches.filter((m) => m.round === fecha.number).length : 0;
  const propios = editando ? (tournament.scheduled_matches ?? []).filter((s) => s.round === fecha.number) : [];

  const [inicio, setInicio] = useState(() => (editando ? fecha.start_date : sumarDias(anterior?.start_date, 7)));
  const [fin, setFin] = useState(() => (editando ? (fecha.end_date ?? '') : sumarDias(anterior?.end_date, 7)));
  const [modo, setModo] = useState(editando ? 'mano' : 'azar');
  const [cruces, setCruces] = useState(() => (editando
    ? propios.map((s) => [parejaDeEquipo(s.team1, tournament.pairs) ?? '', parejaDeEquipo(s.team2, tournament.pairs) ?? ''])
    : []));
  const [libres, setLibres] = useState([]);
  const [avisos, setAvisos] = useState([]);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const crucesOriginales = useRef(JSON.stringify(cruces));

  const activas = tournament.pairs.filter((p) => p.status !== 'withdrawn');
  const nombre = (id) => getPairLabel(id, tournament.pairs, tournament.players);

  async function sortear() {
    setCargando(true);
    setError(null);
    try {
      const res = await onPreview({ mode: 'random' });
      setCruces(res.crosses);
      setLibres(res.libres);
      setAvisos(res.warnings ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!editando) sortear(); }, []);

  // A mano, la fecha nueva se revisa en el servidor a medida que cambia.
  const completos = cruces.filter(([a, b]) => a && b);
  const clave = JSON.stringify(completos);
  useEffect(() => {
    if (editando || modo !== 'mano' || completos.length === 0) return undefined;
    const t = setTimeout(async () => {
      try {
        const res = await onPreview({ mode: 'manual', crosses: completos });
        setLibres(res.libres);
        setAvisos(res.warnings ?? []);
        setError(null);
      } catch (e) {
        setError(e.message);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, modo, editando]);

  // Cruces ya jugados o programados en otras fechas, para no ofrecerlos de nuevo.
  const cruzados = new Set();
  if (!tournament.allow_rematch) {
    const otros = [...tournament.matches, ...(tournament.scheduled_matches ?? []).filter((s) => !propios.includes(s))];
    for (const m of otros) {
      const a = parejaDeEquipo(m.team1, tournament.pairs);
      const b = parejaDeEquipo(m.team2, tournament.pairs);
      if (a && b) { cruzados.add(`${a}|${b}`); cruzados.add(`${b}|${a}`); }
    }
  }

  function cambiar(i, lado, valor) {
    setCruces((prev) => prev.map((c, j) => (j === i ? (lado === 0 ? [valor, c[1]] : [c[0], valor]) : c)));
  }

  function opciones(i, lado) {
    const actual = cruces[i]?.[lado];
    const rival = cruces[i]?.[1 - lado];
    const usadas = new Set(cruces.flatMap((c, j) => (j === i ? [] : c)).filter(Boolean));
    return activas.map((p) => {
      const yaCruzo = rival && cruzados.has(`${p.id}|${rival}`);
      const ocupada = usadas.has(p.id) || p.id === rival;
      return (
        <option key={p.id} value={p.id} disabled={p.id !== actual && (ocupada || yaCruzo)}>
          {nombre(p.id)}{yaCruzo && p.id !== actual ? ' · ya se cruzaron' : ''}
        </option>
      );
    });
  }

  const cambiaronCruces = JSON.stringify(cruces) !== crucesOriginales.current;
  const incompletos = cruces.some(([a, b]) => !a || !b);
  const fechasOk = !!inicio && (!fin || fin >= inicio);
  const puedeGuardar = fechasOk && !guardando && !cargando && !incompletos
    && (editando || completos.length > 0) && (!error || editando);

  async function guardar() {
    if (!puedeGuardar) return;
    setGuardando(true);
    setError(null);
    try {
      const body = { start_date: inicio, end_date: fin || null };
      if (!editando) Object.assign(body, { mode: 'manual', crosses: completos });
      else if (cambiaronCruces && jugados === 0) body.crosses = completos;
      await onSave(editando ? number : null, body);
    } catch (e) {
      setError(e.message);
      setGuardando(false);
    }
  }

  const labelCls = 'block font-condensed font-bold text-[9.5px] tracking-[0.14em] uppercase mb-1.5 text-secondary';
  const segCls = (on) => `flex-1 min-h-[40px] rounded-lg border-0 text-[13px] font-bold cursor-pointer transition-colors ${
    on ? 'bg-brand text-base' : 'bg-transparent text-content hover:text-white'
  }`;

  return (
    <section aria-labelledby="armar-fecha-titulo" className="border border-border-mid rounded-xl bg-surface mb-4 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <h3 id="armar-fecha-titulo" className="m-0 font-condensed font-bold text-[12.5px] tracking-[0.13em] text-white">
          {editando ? `EDITAR FECHA ${number}` : `ARMAR FECHA ${number}`}
        </h3>
        <span className="flex-1" />
        <button
          type="button" onClick={onCancel} title="Cerrar" aria-label="Cerrar"
          className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-lg border border-border-strong bg-transparent text-muted hover:text-white cursor-pointer transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="fecha-inicio">Primer día</label>
            <input id="fecha-inicio" type="date" value={inicio} min="2000-01-01" max="2100-12-31"
              onChange={(e) => setInicio(e.target.value)} className={TEAM_SELECT_CLS} />
          </div>
          <div>
            <label className={labelCls} htmlFor="fecha-fin">Último día (opcional)</label>
            <input id="fecha-fin" type="date" value={fin} min={inicio || '2000-01-01'} max="2100-12-31"
              onChange={(e) => setFin(e.target.value)} className={TEAM_SELECT_CLS} />
          </div>
        </div>
        {!fechasOk && inicio && <p className="m-0 text-[12.5px] text-danger">El último día no puede ser anterior al primero.</p>}

        {editando && jugados > 0 ? (
          <p className="m-0 text-[13px] text-secondary">Esta fecha ya tiene partidos jugados: solo se cambian sus días.</p>
        ) : (
          <>
            {!editando && (
              <div role="group" aria-label="Cómo se arma la fecha" className="flex gap-1.5 p-1 rounded-xl border border-border-mid bg-base">
                <button type="button" aria-pressed={modo === 'azar'} onClick={() => setModo('azar')} className={segCls(modo === 'azar')}>Al azar</button>
                <button type="button" aria-pressed={modo === 'mano'} onClick={() => setModo('mano')} className={segCls(modo === 'mano')}>A mano</button>
              </div>
            )}

            {modo === 'azar' ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-white">Propuesta</span>
                  <button
                    type="button" onClick={sortear} disabled={cargando}
                    className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg border border-border-strong bg-transparent text-content text-[13px] cursor-pointer hover:text-white disabled:opacity-50"
                  >
                    <Shuffle size={14} /> Sortear de nuevo
                  </button>
                </div>
                {cargando && <p className="m-0 text-[13px] text-secondary">Armando la propuesta…</p>}
                {!cargando && cruces.map(([a, b]) => (
                  <div key={`${a}-${b}`} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-lg border border-border-mid bg-base px-3 py-2.5">
                    <span className="text-[13px] font-semibold text-white leading-snug">{nombre(a)}</span>
                    <span className="text-[12px] text-secondary">contra</span>
                    <span className="text-[13px] font-semibold text-white leading-snug text-right">{nombre(b)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold text-white">Cruces</span>
                {cruces.map((c, i) => (
                  <div key={i} className="grid grid-cols-[minmax(0,1fr)_44px] gap-1.5 items-center rounded-lg border border-border-mid bg-base p-2">
                    <div className="flex flex-col gap-1.5 min-w-0">
                      {[0, 1].map((lado) => (
                        <select
                          key={lado} value={c[lado]} aria-label={`Cruce ${i + 1}, pareja ${lado + 1}`}
                          onChange={(e) => cambiar(i, lado, e.target.value)} className={TEAM_SELECT_CLS}
                        >
                          <option value="">{lado === 0 ? 'Elegí pareja…' : 'Elegí rival…'}</option>
                          {opciones(i, lado)}
                        </select>
                      ))}
                    </div>
                    <button
                      type="button" aria-label={`Quitar cruce ${i + 1}`}
                      onClick={() => setCruces((prev) => prev.filter((_, j) => j !== i))}
                      className="inline-flex items-center justify-center w-11 h-11 rounded-lg border border-border-strong bg-transparent text-muted hover:text-danger cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                {cruces.length < Math.floor(activas.length / 2) && (
                  <button
                    type="button" onClick={() => setCruces((prev) => [...prev, ['', '']])}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg border border-dashed border-border-strong bg-transparent text-content text-[13px] font-semibold cursor-pointer hover:text-white"
                  >
                    <Plus size={14} /> Agregar cruce
                  </button>
                )}
                {!tournament.allow_rematch && (
                  <p className="m-0 text-[12px] text-secondary">Las parejas que ya se cruzaron no se ofrecen como rivales.</p>
                )}
              </div>
            )}

            {libres.length > 0 && !editando && (
              <p className="m-0 text-[13px] text-soft">
                {libres.length === 1 ? 'Libre: ' : 'Sin jugar: '}
                <span className="text-white font-semibold">{libres.map(nombre).join(' · ')}</span>
              </p>
            )}
            {avisos.length > 0 && (
              <div role="status" className="flex flex-col gap-1 rounded-lg border border-premium/50 bg-premium/10 px-3 py-2.5">
                {avisos.map((a) => <span key={a} className="text-[13px] font-semibold text-premium">{a}</span>)}
                <span className="text-[12px] text-content">Se puede guardar igual.</span>
              </div>
            )}
          </>
        )}

        {error && <p role="alert" className="m-0 text-[12.5px] text-danger">{error}</p>}

        <div className="flex gap-2 flex-wrap">
          <button
            type="button" onClick={guardar} disabled={!puedeGuardar}
            className="flex-1 bg-brand text-base border-0 min-h-[46px] px-4 font-condensed font-bold text-[13px] tracking-wide rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            {guardando ? 'GUARDANDO…' : editando ? 'GUARDAR CAMBIOS' : `GUARDAR FECHA ${number}`}
          </button>
          {editando && esUltima && jugados === 0 && (
            <button
              type="button" onClick={onDelete}
              className="min-h-[46px] px-4 rounded-lg border border-danger/50 bg-transparent text-danger text-[13px] cursor-pointer hover:border-danger"
            >
              Deshacer fecha
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
