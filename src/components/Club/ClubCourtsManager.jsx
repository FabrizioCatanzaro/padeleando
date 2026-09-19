import { useEffect, useState } from 'react'
import { LayoutGrid, Plus, Pencil, Trash2, ChevronUp, ChevronDown, X, Check, EyeOff } from 'lucide-react'
import { api } from '../../utils/api'
import { useToast } from '../../context/useToast'
import { formatMoney } from '../../utils/money'

const FLOORS = [
  { value: '',                 label: 'Sin especificar' },
  { value: 'cesped_sintetico', label: 'Césped sintético' },
  { value: 'cesped_natural',   label: 'Césped natural' },
  { value: 'cemento',          label: 'Cemento' },
]
const FLOOR_LABEL = Object.fromEntries(FLOORS.map((f) => [f.value, f.label]))

const WALLS = [
  { value: '',        label: 'Sin especificar' },
  { value: 'cemento',  label: 'Cemento' },
  { value: 'cristal',  label: 'Cristal' },
]
const WALL_LABEL = Object.fromEntries(WALLS.map((w) => [w.value, w.label]))

const inputCls = 'w-full bg-surface border border-border-mid text-white px-2.5 py-1.5 rounded-sm text-[13px] outline-none font-sans'
const labelCls = 'block text-[10px] font-mono tracking-widest text-muted mb-1'

function emptyDraft() {
  return { name: '', floor_type: '', wall_type: '', covered: false, lit: false, external_play: false, price_30: '', price_60: '' }
}

// Resumen corto de los atributos de una cancha, reutilizado en la lista de acá
// y (con sus propias etiquetas) en la ficha pública -- ver ClubInfo.jsx.
function courtSummary(c) {
  return [
    c.floor_type ? FLOOR_LABEL[c.floor_type] : null,
    c.wall_type ? WALL_LABEL[c.wall_type] : null,
    c.covered ? 'Techada' : null,
    c.lit ? 'Con iluminación' : null,
    c.external_play ? 'Juego exterior' : null,
  ].filter(Boolean)
}

// Formulario chico para crear o editar una cancha (mismos campos, distinto submit).
function CourtForm({ draft, onChange, onSubmit, onCancel, submitLabel, busy }) {
  return (
    <div className="border border-border-mid rounded-lg p-3 bg-base">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="col-span-2">
          <label className={labelCls}>NOMBRE (*)</label>
          <input className={inputCls} value={draft.name} maxLength={40}
            onChange={(e) => onChange({ ...draft, name: e.target.value })} placeholder="ej: Cancha 1" />
        </div>
        <div>
          <label className={labelCls}>PISO</label>
          <select className={inputCls} value={draft.floor_type}
            onChange={(e) => onChange({ ...draft, floor_type: e.target.value })}>
            {FLOORS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>PAREDES</label>
          <select className={inputCls} value={draft.wall_type}
            onChange={(e) => onChange({ ...draft, wall_type: e.target.value })}>
            {WALLS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>PRECIO TURNO 30 MIN</label>
          <input className={inputCls} type="number" min="0" value={draft.price_30}
            onChange={(e) => onChange({ ...draft, price_30: e.target.value })} placeholder="a consultar" />
        </div>
        <div>
          <label className={labelCls}>PRECIO TURNO 60 MIN</label>
          <input className={inputCls} type="number" min="0" value={draft.price_60}
            onChange={(e) => onChange({ ...draft, price_60: e.target.value })} placeholder="a consultar" />
          <p className="text-[10px] font-mono text-dim mt-1.5 leading-relaxed">
            No hace falta que sea el doble del de 30 min -- se puede cargar un combo.
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none mt-0.5">
          <input type="checkbox" checked={!!draft.covered}
            onChange={(e) => onChange({ ...draft, covered: e.target.checked })} />
          <span className="text-xs font-sans text-muted">Techada</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none mt-0.5">
          <input type="checkbox" checked={!!draft.lit}
            onChange={(e) => onChange({ ...draft, lit: e.target.checked })} />
          <span className="text-xs font-sans text-muted">Con iluminación</span>
        </label>
        <label className="col-span-2 flex items-center gap-2 cursor-pointer select-none mt-0.5">
          <input type="checkbox" checked={!!draft.external_play}
            onChange={(e) => onChange({ ...draft, external_play: e.target.checked })} />
          <span className="text-xs font-sans text-muted">Juego exterior (hay lugar para seguir la jugada saliendo por la puerta)</span>
        </label>
      </div>
      <div className="flex gap-2 mt-3">
        <button type="button" disabled={busy || !draft.name.trim()} onClick={onSubmit}
          className="inline-flex items-center gap-1 text-[11px] font-condensed font-bold tracking-widest bg-brand text-base px-2.5 py-1.5 rounded cursor-pointer disabled:opacity-40 border-0">
          <Check size={12} /> {submitLabel}
        </button>
        <button type="button" disabled={busy} onClick={onCancel}
          className="inline-flex items-center gap-1 text-[11px] font-condensed font-bold tracking-widest bg-transparent border border-border-strong text-muted hover:text-white px-2.5 py-1.5 rounded cursor-pointer disabled:opacity-40">
          <X size={12} /> CANCELAR
        </button>
      </div>
    </div>
  )
}

// ABM de las canchas de un club (Fase 2 de "reservas de cancha"). Vive en su
// propio modal (ClubCourtsModal), separado de "Editar club": gestionar canchas
// no es editar información del club. Cada acción pega directo a la API y
// actualiza la lista con la respuesta del propio endpoint (la fila creada/
// editada, o -- en el caso de mover -- la lista entera ya reordenada) en vez
// de volver a pedir GET /:id/courts: esa ruta tiene caché pública de 10s
// (igual que el resto de /api/clubs, ver index.js), así que un refetch
// inmediato después de escribir podría traer una respuesta vieja sin la
// cancha recién creada/editada.
export default function ClubCourtsManager({ clubId, onCourtsChange }) {
  const { showToast } = useToast()
  const [courts, setCourts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [adding, setAdding]   = useState(false)
  const [draft, setDraft]     = useState(emptyDraft())
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState(emptyDraft())
  const [busyId, setBusyId]   = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.clubs.courts.list(clubId)
      .then((rows) => { if (!cancelled) { setCourts(rows); onCourtsChange?.(rows); setError(null) } })
      .catch((e) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [clubId, onCourtsChange])

  function startAdd() { setDraft(emptyDraft()); setAdding(true); setEditingId(null) }

  async function submitAdd() {
    setBusyId('new')
    try {
      const created = await api.clubs.courts.create(clubId, draft)
      const next = [...courts, created]
      setCourts(next)
      onCourtsChange?.(next)
      setAdding(false)
      showToast('Cancha agregada')
    } catch (e) { showToast(e.message, 'error') }
    finally { setBusyId(null) }
  }

  function startEdit(court) {
    setEditingId(court.id)
    setEditDraft({
      name: court.name,
      floor_type: court.floor_type ?? '',
      wall_type: court.wall_type ?? '',
      covered: !!court.covered,
      lit: !!court.lit,
      external_play: !!court.external_play,
      price_30: court.price_30 ?? '',
      price_60: court.price_60 ?? '',
    })
    setAdding(false)
  }

  async function submitEdit(courtId) {
    setBusyId(courtId)
    try {
      const updated = await api.clubs.courts.update(clubId, courtId, { ...editDraft, active: true })
      const next = courts.map((c) => (c.id === courtId ? updated : c))
      setCourts(next)
      onCourtsChange?.(next)
      setEditingId(null)
      showToast('Cancha actualizada')
    } catch (e) { showToast(e.message, 'error') }
    finally { setBusyId(null) }
  }

  async function toggleActive(court) {
    setBusyId(court.id)
    try {
      const updated = await api.clubs.courts.update(clubId, court.id, {
        name: court.name, floor_type: court.floor_type, wall_type: court.wall_type,
        covered: court.covered, lit: court.lit, external_play: court.external_play,
        price_30: court.price_30, price_60: court.price_60,
        active: !court.active,
      })
      const next = courts.map((c) => (c.id === court.id ? updated : c))
      setCourts(next)
      onCourtsChange?.(next)
    } catch (e) { showToast(e.message, 'error') }
    finally { setBusyId(null) }
  }

  async function remove(courtId) {
    setBusyId(courtId)
    try {
      await api.clubs.courts.remove(clubId, courtId)
      const next = courts.filter((c) => c.id !== courtId)
      setCourts(next)
      onCourtsChange?.(next)
      showToast('Cancha eliminada')
    } catch (e) { showToast(e.message, 'error') }
    finally { setBusyId(null) }
  }

  async function move(courtId, direction) {
    setBusyId(courtId)
    try {
      const reordered = await api.clubs.courts.move(clubId, courtId, direction)
      setCourts(reordered)
      onCourtsChange?.(reordered)
    } catch (e) { showToast(e.message, 'error') }
    finally { setBusyId(null) }
  }

  return (
    <div className="mb-1">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-mono text-dim">Administrá las canchas físicas del club, una por una.</p>
        {!adding && (
          <button type="button" onClick={startAdd}
            className="shrink-0 inline-flex items-center gap-1 text-[10px] font-mono text-brand hover:underline bg-transparent border-none cursor-pointer p-0">
            <Plus size={11} /> AGREGAR
          </button>
        )}
      </div>

      {loading && <p className="text-xs font-mono text-dim">Cargando canchas...</p>}
      {error && <p className="text-xs font-mono text-danger">{error}</p>}

      {!loading && courts.length === 0 && !adding && (
        <p className="text-[11px] font-mono text-dim leading-relaxed">
          Todavía no cargaste ninguna cancha individual. El número en "Cantidad de canchas" del club se sigue mostrando hasta que cargues al menos una acá.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {courts.map((court, i) => (
          editingId === court.id ? (
            <CourtForm key={court.id} draft={editDraft} onChange={setEditDraft}
              onSubmit={() => submitEdit(court.id)} onCancel={() => setEditingId(null)}
              submitLabel="GUARDAR" busy={busyId === court.id} />
          ) : (
            <div key={court.id}
              className={`flex items-center gap-2.5 border border-border-mid rounded-lg px-3 py-2 ${court.active ? '' : 'opacity-50'}`}>
              <LayoutGrid size={15} className="text-muted shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-white font-sans truncate">
                  {court.name}
                  {!court.active && <span className="text-[10px] font-mono text-muted ml-1.5">(deshabilitada)</span>}
                </div>
                <div className="text-[11px] font-mono text-dim truncate">
                  {[
                    ...courtSummary(court),
                    court.price_30 != null ? `${formatMoney(court.price_30)} (30 min)` : null,
                    court.price_60 != null ? `${formatMoney(court.price_60)} (60 min)` : null,
                    court.price_30 == null && court.price_60 == null ? 'Precio a consultar' : null,
                  ].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" disabled={busyId === court.id || i === 0} onClick={() => move(court.id, 'up')}
                  className="p-1 bg-transparent border-none text-muted hover:text-white cursor-pointer disabled:opacity-30" aria-label="Mover arriba">
                  <ChevronUp size={14} />
                </button>
                <button type="button" disabled={busyId === court.id || i === courts.length - 1} onClick={() => move(court.id, 'down')}
                  className="p-1 bg-transparent border-none text-muted hover:text-white cursor-pointer disabled:opacity-30" aria-label="Mover abajo">
                  <ChevronDown size={14} />
                </button>
                <button type="button" disabled={busyId === court.id} onClick={() => startEdit(court)}
                  className="p-1 bg-transparent border-none text-muted hover:text-white cursor-pointer disabled:opacity-30" aria-label="Editar cancha">
                  <Pencil size={13} />
                </button>
                <button type="button" disabled={busyId === court.id} onClick={() => toggleActive(court)}
                  className="p-1 bg-transparent border-none text-muted hover:text-white cursor-pointer disabled:opacity-30"
                  aria-label={court.active ? 'Deshabilitar cancha' : 'Habilitar cancha'} title={court.active ? 'Deshabilitar' : 'Habilitar'}>
                  <EyeOff size={13} />
                </button>
                <button type="button" disabled={busyId === court.id} onClick={() => remove(court.id)}
                  className="p-1 bg-transparent border-none text-danger hover:opacity-80 cursor-pointer disabled:opacity-30" aria-label="Eliminar cancha">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )
        ))}

        {adding && (
          <CourtForm draft={draft} onChange={setDraft} onSubmit={submitAdd} onCancel={() => setAdding(false)}
            submitLabel="AGREGAR" busy={busyId === 'new'} />
        )}
      </div>
    </div>
  )
}
