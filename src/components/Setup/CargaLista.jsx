import { useRef, useState } from "react";
import { Plus, Pencil, X } from "lucide-react";
import PlayerInput from "./PlayerInput";
import { uid } from "../../utils/helpers";

const clave = (n) => n.trim().toLowerCase();

function Nombre({ children }) {
  const at = children.startsWith('@');
  return <span className={`truncate ${at ? 'text-brand' : 'text-white'}`}>{children}</span>;
}

function Fila({ numero, children, onEditar, onQuitar, editable }) {
  const btn = "inline-flex items-center justify-center w-9 h-9 shrink-0 rounded-sm bg-transparent border-0 text-muted cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed";
  return (
    <li className="flex items-center gap-2 pl-3 pr-1 py-1 min-h-11 bg-surface border border-border-mid rounded-md">
      <span className="w-5 shrink-0 text-right text-[11px] font-mono text-dim">{numero}</span>
      <span className="flex-1 min-w-0 flex items-center gap-1.5 text-[14px]">{children}</span>
      <button type="button" onClick={onEditar} disabled={!editable} aria-label={`Editar ${numero}`} title={editable ? 'Editar' : 'Terminá la carga en curso'} className={`${btn} hover:text-white`}><Pencil size={15} /></button>
      <button type="button" onClick={onQuitar} aria-label={`Quitar ${numero}`} className={`${btn} hover:text-danger`}><X size={16} /></button>
    </li>
  );
}

function Lista({ children, compacta = false }) {
  return <ul className={`m-0 p-0 list-none grid gap-2 mt-4 ${compacta ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>{children}</ul>;
}

function alEnter(e, agregar) {
  if (e.key !== 'Enter' || e.defaultPrevented) return;
  e.preventDefault();
  const inputs = Array.from(e.currentTarget.querySelectorAll('input'));
  const idx = inputs.indexOf(e.target);
  const vacio = inputs.findIndex((i, n) => n > idx && !i.value.trim());
  if (vacio >= 0) inputs[vacio].focus();
  else agregar();
}

// Carga de parejas de a una. El aviso de jugador repetido lo muestra el padre.
export function CargaParejas({ value, onChange, pendiente, onPendiente, max }) {
  const ref = useRef();
  const [error, setError] = useState(null);
  const lleno = value.length >= max;
  const tieneAlgo = !!(pendiente.p1Name.trim() || pendiente.p2Name.trim());

  function agregar() {
    const a = pendiente.p1Name.trim(), b = pendiente.p2Name.trim();
    if (!a || !b) return setError('Cargá los dos jugadores de la pareja.');
    const usados = new Set(value.flatMap((p) => [clave(p.p1Name), clave(p.p2Name)]));
    if (clave(a) === clave(b) || usados.has(clave(a)) || usados.has(clave(b))) return;
    onChange([...value, { id: pendiente.id ?? uid(), p1Name: a, p2Name: b }]);
    onPendiente({ p1Name: '', p2Name: '' });
    setError(null);
    ref.current?.querySelector('input')?.focus();
  }

  function editar(p) {
    onChange(value.filter((x) => x.id !== p.id));
    onPendiente({ id: p.id, p1Name: p.p1Name, p2Name: p.p2Name });
    ref.current?.querySelector('input')?.focus();
  }

  const set = (k) => (v) => { setError(null); onPendiente({ ...pendiente, [k]: v }); };

  return (
    <div>
      {!lleno && (
        <div ref={ref} onKeyDown={(e) => alEnter(e, agregar)} className="bg-surface-alt border border-border-strong rounded-lg p-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <PlayerInput value={pendiente.p1Name} onChange={set('p1Name')} placeholder="Jugador 1" searchMine />
            <span className="hidden sm:block text-muted font-condensed font-bold text-[12px]">&amp;</span>
            <PlayerInput value={pendiente.p2Name} onChange={set('p2Name')} placeholder="Jugador 2" searchMine />
            <button type="button" onClick={agregar} className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 shrink-0 rounded-sm border border-brand bg-brand/15 text-brand font-condensed font-bold text-[12px] tracking-wide cursor-pointer hover:bg-brand/25 transition-colors">
              <Plus size={15} strokeWidth={2.5} /> AGREGAR
            </button>
          </div>
          <p className="m-0 mt-2 text-[11px] text-dim">
            {error ? <span className="text-danger">{error}</span> : <>Enter pasa al siguiente campo y agrega la pareja. Con <span className="text-brand">@usuario</span> invitás a alguien registrado.</>}
          </p>
        </div>
      )}
      {lleno && <p className="m-0 text-[12px] text-secondary">Llegaste al máximo de {max} parejas.</p>}
      {value.length > 0 && (
        <Lista>
          {value.map((p, i) => (
            <Fila key={p.id} numero={i + 1} editable={!tieneAlgo} onEditar={() => editar(p)} onQuitar={() => onChange(value.filter((x) => x.id !== p.id))}>
              <Nombre>{p.p1Name}</Nombre><span className="text-muted font-condensed font-bold text-[11px] shrink-0">&amp;</span><Nombre>{p.p2Name}</Nombre>
            </Fila>
          ))}
        </Lista>
      )}
    </div>
  );
}

// Carga de jugadores de a uno, para la liga de un día. El aviso de repetido lo muestra el padre.
export function CargaJugadores({ value, onChange, pendiente, onPendiente }) {
  const ref = useRef();
  const [error, setError] = useState(null);

  function agregar() {
    const n = pendiente.trim();
    if (!n) return;
    if (value.some((x) => clave(x) === clave(n))) return;
    onChange([...value, n]);
    onPendiente('');
    setError(null);
    ref.current?.querySelector('input')?.focus();
  }

  return (
    <div>
      <div ref={ref} onKeyDown={(e) => alEnter(e, agregar)} className="bg-surface-alt border border-border-strong rounded-lg p-3">
        <div className="flex items-center gap-2">
          <PlayerInput value={pendiente} onChange={(v) => { setError(null); onPendiente(v); }} placeholder={`Jugador ${value.length + 1}`} searchMine />
          <button type="button" onClick={agregar} aria-label="Agregar jugador" className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 shrink-0 rounded-sm border border-brand bg-brand/15 text-brand font-condensed font-bold text-[12px] tracking-wide cursor-pointer hover:bg-brand/25 transition-colors">
            <Plus size={15} strokeWidth={2.5} /> <span className="hidden sm:inline">AGREGAR</span>
          </button>
        </div>
        <p className="m-0 mt-2 text-[11px] text-dim">
          {error ? <span className="text-danger">{error}</span> : <>Enter agrega el jugador. Con <span className="text-brand">@usuario</span> invitás a alguien registrado.</>}
        </p>
      </div>
      {value.length > 0 && (
        <Lista compacta>
          {value.map((n, i) => (
            <Fila key={n} numero={i + 1} editable={!pendiente.trim()} onEditar={() => { onChange(value.filter((x) => x !== n)); onPendiente(n); }} onQuitar={() => onChange(value.filter((x) => x !== n))}>
              <Nombre>{n}</Nombre>
            </Fila>
          ))}
        </Lista>
      )}
    </div>
  );
}
