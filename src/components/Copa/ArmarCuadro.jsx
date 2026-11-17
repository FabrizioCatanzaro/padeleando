import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronUp, ChevronDown, RefreshCw, TriangleAlert } from "lucide-react";
import Btn from "../shared/Btn";
import { grupoNombre, crucesPrimeraRonda } from "../../utils/copa";

const origen = (s) => (s.zona == null ? null : s.via === 'extra' ? `Mejor ${s.pos}° · ${grupoNombre(s.zona)}` : `${s.pos}° ${grupoNombre(s.zona)}`);

function Siembra({ titulo, lista, onMover }) {
  const porSeed = (n) => lista[n - 1];
  return (
    <section className="mb-6">
      <h3 className="m-0 mb-2 text-[13px] font-semibold text-white">{titulo} <span className="text-secondary font-normal">· {lista.length} parejas</span></h3>
      <ol className="m-0 p-0 list-none flex flex-col gap-1.5">
        {lista.map((s, i) => (
          <li key={s.pair_id} className="flex items-center gap-2 pl-3 pr-1 min-h-11 bg-surface border border-border-mid rounded-md">
            <span className="w-6 shrink-0 text-[12px] font-mono text-brand">{i + 1}</span>
            <span className="flex-1 min-w-0">
              <span className="block truncate text-[14px] text-white">{s.pair_name}</span>
              {origen(s) && <span className="block text-[12px] text-secondary">{origen(s)}</span>}
            </span>
            <button type="button" aria-label={`Subir a ${s.pair_name}`} disabled={i === 0} onClick={() => onMover(i, -1)}
              className="inline-flex items-center justify-center w-9 h-9 bg-transparent border-0 text-muted hover:text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"><ChevronUp size={17} /></button>
            <button type="button" aria-label={`Bajar a ${s.pair_name}`} disabled={i === lista.length - 1} onClick={() => onMover(i, 1)}
              className="inline-flex items-center justify-center w-9 h-9 bg-transparent border-0 text-muted hover:text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"><ChevronDown size={17} /></button>
          </li>
        ))}
      </ol>
      <h4 className="m-0 mt-4 mb-2 text-[12px] font-semibold text-brand">Primera ronda</h4>
      <ul className="m-0 p-0 list-none grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {crucesPrimeraRonda(lista.length).map(([a, b]) => {
          const mismo = b != null && porSeed(a).zona != null && porSeed(a).zona === porSeed(b).zona;
          return (
            <li key={a} className="px-3 py-2 rounded-md bg-surface-alt text-[13px] text-content">
              <span className="font-mono text-dim">{a}</span> {porSeed(a).pair_name}
              {b == null
                ? <span className="block text-[12px] text-secondary">Pasa directo a la ronda siguiente</span>
                : <span className="block"><span className="text-secondary">vs </span><span className="font-mono text-dim">{b}</span> {porSeed(b).pair_name}</span>}
              {mismo && <span className="flex items-center gap-1 mt-0.5 text-[12px] text-premium"><TriangleAlert size={12} aria-hidden="true" /> Mismo grupo</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Arma los playoffs (copa con grupos) o el cuadro (copa de cuadro): propuesta, orden y confirmación.
export default function ArmarCuadro({ tournament, isOwner, onPropuesta, onArmar }) {
  const zonas = tournament.copa_config?.mode === 'zonas';
  const activas = tournament.pairs.filter((p) => p.status !== 'withdrawn').length;
  const sinParejas = !zonas && activas < 2;
  const [prop, setProp] = useState(null);
  const [cargando, setCargando] = useState(isOwner);
  const [armando, setArmando] = useState(false);

  // Las acciones llegan nuevas en cada render: se leen de una ref para no repetir el pedido.
  const propuestaRef = useRef(onPropuesta);
  useEffect(() => { propuestaRef.current = onPropuesta; });
  const cargar = useCallback(async () => {
    setCargando(true);
    const data = await propuestaRef.current();
    setProp(data);
    setCargando(false);
  }, []);

  useEffect(() => {
    if (!isOwner || sinParejas) return;
    let vivo = true;
    propuestaRef.current().then((data) => { if (vivo) { setProp(data); setCargando(false); } });
    return () => { vivo = false; };
  }, [isOwner, sinParejas]);

  if (isOwner && sinParejas) {
    return (
      <div className="bg-surface border border-border-mid rounded-xl p-4 text-[14px] text-content">
        {activas === 0 ? 'Todavía no hay parejas confirmadas.' : 'Hay 1 pareja confirmada.'} El cuadro se arma con 2 o más.
        <span className="block text-secondary text-[13px] mt-1">Sumalas por inscripción o desde Gestión.</span>
      </div>
    );
  }
  if (!isOwner) {
    return (
      <div className="bg-surface border border-border-mid rounded-xl p-4 text-[14px] text-content">
        {zonas ? 'Los playoffs se arman cuando termine la fase de grupos.' : 'El cuadro se arma con las parejas confirmadas.'}
      </div>
    );
  }
  if (cargando) return <div className="min-h-[300px] text-[13px] text-secondary">Calculando los cruces...</div>;
  if (!prop || prop.error) {
    return (
      <div className="bg-surface border border-border-mid rounded-xl p-4 text-[14px] text-content">
        {prop?.error ?? (zonas ? 'Todavía no se pueden armar los playoffs.' : 'Todavía no se puede armar el cuadro.')}
        <Btn size="sm" icon={RefreshCw} onClick={cargar} className="ml-3">Reintentar</Btn>
      </div>
    );
  }

  const mover = (clave) => (i, d) => setProp((p) => {
    const lista = [...p[clave]];
    [lista[i], lista[i + d]] = [lista[i + d], lista[i]];
    return { ...p, [clave]: lista };
  });
  const bloqueo = prop.sin_grupo > 0
    ? `Hay ${prop.sin_grupo} ${prop.sin_grupo === 1 ? 'pareja' : 'parejas'} sin grupo. Ubicalas en la solapa Grupos.`
    : prop.pendientes > 0
      ? `Faltan ${prop.pendientes} ${prop.pendientes === 1 ? 'partido' : 'partidos'} de la fase de grupos. Los cruces todavía pueden cambiar.`
      : null;

  async function armar() {
    setArmando(true);
    await onArmar(prop.oro.map((s) => s.pair_id), prop.plata?.map((s) => s.pair_id));
    setArmando(false);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="m-0 font-condensed font-semibold text-[15px] text-white">{zonas ? 'Armar playoffs' : 'Armar cuadro'}</h2>
          <p className="m-0 mt-1 text-[13px] text-secondary">
            {zonas ? 'Siembra por posición en el grupo. Ordená con las flechas antes de confirmar.' : 'Orden sorteado. Subí a los cabezas de serie con las flechas: el 1 y el 2 solo se cruzan en la final.'}
          </p>
        </div>
        <Btn size="sm" icon={RefreshCw} onClick={cargar}>{zonas ? 'Recalcular' : 'Sortear de nuevo'}</Btn>
      </div>
      {bloqueo && <p role="note" className="m-0 mb-4 px-3 py-2.5 rounded-md border border-premium/40 text-[13px] text-premium">{bloqueo}</p>}
      <Siembra titulo={zonas ? 'Copa de oro' : 'Cuadro'} lista={prop.oro} onMover={mover('oro')} />
      {prop.plata && <Siembra titulo="Copa de plata" lista={prop.plata} onMover={mover('plata')} />}
      <Btn variant="primary" size="lg" full onClick={armar} disabled={!!bloqueo} loading={armando}>
        {zonas ? 'ARMAR PLAYOFFS' : 'ARMAR CUADRO'}
      </Btn>
      <p className="m-0 mt-2 text-[12px] text-secondary">
        {zonas ? 'Con los playoffs armados la fase de grupos queda fija.' : 'Después del primer resultado los cruces quedan fijos.'}
      </p>
    </div>
  );
}
