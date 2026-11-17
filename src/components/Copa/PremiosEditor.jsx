import { useState } from "react";
import { Plus, Trash2, Check, Trophy } from "lucide-react";
import { getPairLabel } from "../../utils/helpers";
import { premioTitulo, MAX_PRIZES, MAX_PRIZE_PLACE, MAX_PRIZE_TEXT, MAX_PRIZE_TITLE } from "../../utils/copa";
import Btn from "../shared/Btn";

const INPUT = "w-full bg-base border border-border-mid text-white px-3 py-2.5 font-sans text-[14px] rounded-sm outline-none";
const SELECT = "h-10 bg-base border border-border-mid text-white px-2 rounded-sm text-[13px] outline-none cursor-pointer";

const filaDe = (p) => ({
  id: p.id ?? null, kind: p.kind, cup: p.cup ?? 'oro', place: p.place ?? null,
  title: p.title ?? '', description: p.description ?? '',
});

// Premios de la copa: por puesto (el campeón es obligatorio) y especiales con ganador.
// Se monta con key sobre los premios guardados: al guardar, vuelve a leerlos.
export default function PremiosEditor({ tournament, onSave, onWinner }) {
  const plata = tournament.copa_config?.plata === true;
  const guardados = tournament.prizes ?? [];
  const [filas, setFilas] = useState(() => guardados.map(filaDe));
  const [base] = useState(() => JSON.stringify(guardados.map(filaDe)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const dirty = JSON.stringify(filas) !== base;
  const set = (i, patch) => setFilas((prev) => prev.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  const libre = (cup) => [1, 2, 3, 4].find((n) => !filas.some((f) => f.kind === 'puesto' && f.cup === cup && f.place === n));
  const agregarPuesto = () => setFilas((prev) => [...prev, { id: null, kind: 'puesto', cup: 'oro', place: libre('oro') ?? 1, title: '', description: '' }]);
  const agregarEspecial = () => setFilas((prev) => [...prev, { id: null, kind: 'especial', cup: 'oro', place: null, title: '', description: '' }]);

  async function guardar() {
    setSaving(true);
    setError(null);
    try {
      await onSave(filas.map((f) => ({
        ...(f.id ? { id: f.id } : {}), kind: f.kind, cup: f.cup,
        ...(f.kind === 'puesto' ? { place: f.place } : { title: f.title.trim() }),
        description: f.description.trim(),
      })));
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  const especiales = guardados.filter((p) => p.kind === 'especial');
  const jugadores = tournament.players.filter((p) => !p.removed);
  const parejas = tournament.pairs;

  return (
    <div className="flex flex-col gap-3">
      {filas.map((f, i) => (
        <div key={f.id ?? `n${i}`} className="bg-base border border-border-mid rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Trophy size={15} className={f.kind === 'puesto' && f.place === 1 ? 'text-brand' : 'text-secondary'} aria-hidden="true" />
            {f.kind === 'puesto' ? (
              <select aria-label="Puesto" value={f.place} onChange={(e) => set(i, { place: Number(e.target.value) })} className={SELECT}>
                {Array.from({ length: MAX_PRIZE_PLACE }, (_, n) => n + 1).map((n) => (
                  <option key={n} value={n}>{premioTitulo({ kind: 'puesto', cup: 'oro', place: n })}</option>
                ))}
              </select>
            ) : (
              <input
                aria-label="Nombre del premio" placeholder="ej: MVP, Fair play" maxLength={MAX_PRIZE_TITLE}
                value={f.title} onChange={(e) => set(i, { title: e.target.value })} className={`${INPUT} flex-1 min-w-[140px] py-2`}
              />
            )}
            {plata && (
              <select aria-label="Copa" value={f.cup} onChange={(e) => set(i, { cup: e.target.value })} className={SELECT}>
                <option value="oro">Copa principal</option>
                <option value="plata">Copa de plata</option>
              </select>
            )}
            <span className="flex-1" />
            <button
              type="button" onClick={() => setFilas((prev) => prev.filter((_, j) => j !== i))}
              aria-label="Quitar premio"
              className="inline-flex items-center justify-center w-10 h-10 rounded-sm border border-border-strong bg-transparent text-muted hover:text-danger cursor-pointer"
            >
              <Trash2 size={15} />
            </button>
          </div>
          <input
            aria-label="Premio" placeholder="ej: 2 paletas y trofeo" maxLength={MAX_PRIZE_TEXT}
            value={f.description} onChange={(e) => set(i, { description: e.target.value })} className={INPUT}
          />
        </div>
      ))}

      {filas.length < MAX_PRIZES && (
        <div className="flex gap-2 flex-wrap">
          <Btn size="sm" icon={Plus} onClick={agregarPuesto}>Premio por puesto</Btn>
          <Btn size="sm" icon={Plus} onClick={agregarEspecial}>Premio especial</Btn>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className={`text-[13px] ${error ? 'text-danger' : dirty ? 'text-white font-semibold' : 'text-secondary'}`}>
          {error ?? (dirty ? 'Tenés cambios sin guardar.' : 'Todo guardado.')}
        </span>
        <Btn variant="primary" size="sm" icon={Check} onClick={guardar} loading={saving} disabled={!dirty}>Guardar premios</Btn>
      </div>

      {especiales.length > 0 && (
        <div className="mt-2 pt-3 border-t border-border flex flex-col gap-2">
          <h5 className="m-0 text-[14px] font-bold text-white">Ganadores de los premios especiales</h5>
          {especiales.map((p) => {
            const valor = p.winner_pair_id ? `pair:${p.winner_pair_id}` : p.winner_player_id ? `player:${p.winner_player_id}` : '';
            return (
              <label key={p.id} className="flex items-center gap-2 flex-wrap">
                <span className="text-[14px] text-white min-w-[90px]">{premioTitulo(p)}</span>
                <select
                  value={valor} className={`${SELECT} flex-1 min-w-[180px]`}
                  onChange={async (e) => {
                    const [tipo, id] = e.target.value.split(':');
                    try {
                      await onWinner(p.id, tipo === 'pair' ? { pair_id: id } : tipo === 'player' ? { player_id: id } : { pair_id: null, player_id: null });
                    } catch (err) { setError(err.message); }
                  }}
                >
                  <option value="">Sin asignar</option>
                  <optgroup label="Parejas">
                    {parejas.map((pr) => <option key={pr.id} value={`pair:${pr.id}`}>{getPairLabel(pr.id, parejas, tournament.players)}</option>)}
                  </optgroup>
                  <optgroup label="Jugadores">
                    {jugadores.map((pl) => <option key={pl.id} value={`player:${pl.id}`}>{pl.name}</option>)}
                  </optgroup>
                </select>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
