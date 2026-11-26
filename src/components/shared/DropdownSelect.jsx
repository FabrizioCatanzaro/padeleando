import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

const BUTTON = 'w-full bg-surface border border-border-mid text-white px-3.5 py-2.5 font-sans text-[14px] rounded-sm outline-none focus:border-border-strong'
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Desplegable propio: el select nativo no deja limitar su alto y en el teléfono tapa la pantalla.
export default function DropdownSelect({
  id, value, onChange, options, placeholder = 'Elegí una opción', label,
  searchable = false, disabled = false, buttonClass = BUTTON, renderIcon,
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const searchRef = useRef(null)

  const shown = useMemo(() => {
    const q = norm(query.trim())
    return q ? options.filter((o) => norm(o.label).includes(q)) : options
  }, [options, query])
  const selected = options.find((o) => o.value === value)

  function openList() {
    if (disabled) return
    setQuery('')
    const i = options.findIndex((o) => o.value === value)
    setActive(i >= 0 ? i : 0)
    setOpen(true)
  }

  function pick(o) {
    onChange(o.value)
    setOpen(false)
    rootRef.current?.querySelector('button')?.focus()
  }

  useEffect(() => {
    if (!open) return
    ;(searchable ? searchRef.current : listRef.current)?.focus()
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, searchable])

  useEffect(() => {
    if (!open) return
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(shown.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter' || (e.key === ' ' && !searchable)) { e.preventDefault(); if (shown[active]) pick(shown[active]) }
    else if (e.key === 'Escape' || e.key === 'Tab') setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button id={id} type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label} disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); openList() } }}
        className={`${buttonClass} flex items-center justify-between gap-2 cursor-pointer text-left disabled:cursor-not-allowed`}>
        <span className={`flex items-center gap-2 min-w-0 ${selected ? '' : 'text-muted'}`}>
          {selected && renderIcon?.(selected)}
          <span className="truncate">{selected ? selected.label : (value || placeholder)}</span>
        </span>
        <ChevronDown size={16} aria-hidden="true" className={`text-secondary shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 rounded-sm border border-border-strong bg-surface-alt shadow-2xl">
          {searchable && (
            <div className="relative p-1 border-b border-border-mid">
              <Search size={14} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input ref={searchRef} value={query} placeholder="Buscar" aria-label="Buscar"
                onChange={(e) => { setQuery(e.target.value); setActive(0) }} onKeyDown={onKey}
                className="w-full bg-base border-0 rounded-sm pl-8 pr-2.5 py-2 font-sans text-[14px] text-white outline-none placeholder:text-dim" />
            </div>
          )}
          <ul ref={listRef} role="listbox" tabIndex={-1} aria-label={label} aria-activedescendant={shown[active] ? `${id}-opt-${active}` : undefined}
            onKeyDown={searchable ? undefined : onKey}
            className="max-h-56 overflow-y-auto overscroll-contain m-0 p-1 list-none outline-none">
            {shown.length === 0 && <li className="px-3 py-2 text-[13px] text-muted">Sin resultados</li>}
            {shown.map((o, i) => (
              <li key={o.value} id={`${id}-opt-${i}`} role="option" aria-selected={o.value === value}
                onClick={() => pick(o)} onMouseEnter={() => setActive(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-sm font-sans text-[14px] cursor-pointer ${o.value === value ? 'text-brand font-bold' : 'text-content'} ${i === active ? 'bg-border-mid' : ''}`}>
                <span className="truncate">{o.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
