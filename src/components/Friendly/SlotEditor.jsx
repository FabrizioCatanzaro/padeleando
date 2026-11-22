import { useEffect, useState } from 'react'
import { Plus, Search, X, Loader2, UserPlus } from 'lucide-react'
import { api } from '../../utils/api'
import PlayerAvatar from '../shared/PlayerAvatar'
import { HAND_OPTIONS, SIDE_OPTIONS, SIDE_LABEL, HAND_LABEL } from '../../utils/friendlies'
import { SegButtons } from './parts'

// value: null (libre) | { user } | { guest_name, side, hand }
export default function SlotEditor({ value, onChange, emptyLabel = 'Lugar libre', emptyHint = 'Cargar a alguien', excludeIds = [] }) {
  const [open, setOpen]       = useState(false)
  const [q, setQ]             = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const term = q.trim().replace(/^@/, '')
    if (!open || term.length < 2) return undefined
    let cancelled = false
    const t = setTimeout(() => {
      setLoading(true)
      api.auth.search(term)
        .then((rows) => { if (!cancelled) setResults(rows) })
        .catch(() => { if (!cancelled) setResults([]) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [q, open])

  function close() { setOpen(false); setQ(''); setResults([]) }

  if (value?.user) {
    return (
      <div className="flex items-center gap-2.5 min-h-[52px] px-3 rounded-lg bg-surface-alt border border-border-mid">
        <PlayerAvatar name={value.user.name} src={value.user.avatar_url} size={30} />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] text-white font-semibold truncate">{value.user.name}</div>
          <div className="text-[11.5px] text-secondary truncate">@{value.user.username}{value.user.category ? ` · ${value.user.category}` : ''}</div>
        </div>
        <RemoveButton onClick={() => onChange(null)} />
      </div>
    )
  }

  if (value?.guest_name) {
    return (
      <div className="flex flex-col gap-3 p-3 rounded-lg bg-surface-alt border border-border-mid">
        <div className="flex items-center gap-2.5">
          <PlayerAvatar name={value.guest_name} size={30} />
          <div className="flex-1 min-w-0">
            <div className="text-[14px] text-white font-semibold truncate">{value.guest_name}</div>
            <div className="text-[11.5px] text-secondary truncate">
              Sin cuenta{value.side ? ` · ${SIDE_LABEL[value.side]}` : ''}{value.hand ? ` · ${HAND_LABEL[value.hand]}` : ''}
            </div>
          </div>
          <RemoveButton onClick={() => onChange(null)} />
        </div>
        <SegButtons label="Lado preferido del invitado" options={SIDE_OPTIONS} value={value.side} allowEmpty
          onChange={(side) => onChange({ ...value, side })} />
        <SegButtons label="Mano hábil del invitado" options={HAND_OPTIONS} value={value.hand} allowEmpty
          onChange={(hand) => onChange({ ...value, hand })} />
      </div>
    )
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="flex items-center gap-2.5 min-h-[52px] px-3 rounded-lg border-[1.5px] border-dashed border-brand/40 bg-transparent text-brand text-[13.5px] font-semibold font-sans cursor-pointer text-left hover:border-brand transition-colors">
        <Plus size={15} strokeWidth={2.5} />
        <span className="flex-1">{emptyLabel}</span>
        <span className="text-[12px] text-secondary font-normal">{emptyHint}</span>
      </button>
    )
  }

  const term = q.trim().replace(/^@/, '')
  const visibles = results.filter((u) => !excludeIds.includes(u.id))
  return (
    <div className="flex flex-col rounded-lg border border-brand bg-surface overflow-hidden">
      <div className="flex items-center gap-2 px-3">
        <Search size={16} className="text-brand shrink-0" aria-hidden="true" />
        <input autoFocus type="text" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar por usuario o nombre"
          placeholder="Usuario o nombre" className="flex-1 h-12 bg-transparent border-0 text-white text-[14px] font-sans outline-none" />
        {loading && <Loader2 size={14} className="animate-spin text-muted" />}
        <button type="button" onClick={close} aria-label="Cancelar"
          className="w-9 h-9 flex items-center justify-center bg-transparent border-0 text-content cursor-pointer"><X size={16} /></button>
      </div>
      {term.length >= 2 && (
        <div className="border-t border-border">
          {visibles.map((u) => (
            <button key={u.id} type="button" onClick={() => { onChange({ user: u }); close() }}
              className="w-full min-h-12 flex items-center gap-2.5 px-3 bg-transparent border-0 border-b border-border text-left cursor-pointer hover:bg-surface-alt">
              <PlayerAvatar name={u.name} src={u.avatar_url} size={26} />
              <span className="text-[13.5px] text-white">{u.name}</span>
              <span className="text-[12px] text-muted truncate">@{u.username}{u.category ? ` · ${u.category}` : ''}</span>
            </button>
          ))}
          <button type="button" onClick={() => { onChange({ guest_name: term, side: null, hand: null }); close() }}
            className="w-full min-h-12 flex items-center gap-2.5 px-3 bg-transparent border-0 text-left text-content text-[13.5px] font-sans cursor-pointer hover:bg-surface-alt">
            <UserPlus size={15} /> Cargar &quot;{term}&quot; como invitado sin cuenta
          </button>
        </div>
      )}
    </div>
  )
}

function RemoveButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label="Quitar"
      className="w-11 h-11 -mr-2 flex items-center justify-center bg-transparent border-0 text-muted hover:text-danger cursor-pointer">
      <X size={16} />
    </button>
  )
}

