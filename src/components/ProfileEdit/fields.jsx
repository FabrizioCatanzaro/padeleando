import { ChevronDown } from 'lucide-react'

export const INPUT = 'w-full h-11 bg-base border border-border-mid text-content px-3.5 rounded-lg text-sm font-sans outline-none transition-colors placeholder:text-dim focus:border-brand focus:ring-1 focus:ring-brand/30 disabled:bg-surface disabled:text-secondary disabled:cursor-not-allowed'

const TAGS = {
  publico:       { label: 'PÚBLICO',       cls: 'border-cyan/30 text-cyan' },
  organizadores: { label: 'ORGANIZADORES', cls: 'border-soft/35 text-soft' },
  vos:           { label: 'SOLO VOS',      cls: 'border-border-strong text-secondary' },
}

export function VisTag({ kind, className = '' }) {
  const t = TAGS[kind]
  if (!t) return null
  return (
    <span className={`inline-block font-sans font-semibold text-[10px] tracking-[0.1em] leading-none border rounded-sm px-1.5 py-1 ${t.cls} ${className}`}>
      {t.label}
    </span>
  )
}

export function Section({ id, title, tag, children, sectionRef }) {
  return (
    <section id={id} ref={sectionRef} className="scroll-mt-24 border-t border-border pt-7 pb-2 first:border-t-0 first:pt-0">
      <h2 className="m-0 mb-2 flex items-center gap-2 font-condensed font-bold text-[13px] tracking-[0.16em] text-white">
        {title}
        {tag && <VisTag kind={tag} />}
      </h2>
      {children}
    </section>
  )
}

// Fila de ajustes: etiqueta y ayuda a la izquierda, el control a la derecha.
export function Row({ htmlFor, label, hint, tag, children, last = false }) {
  return (
    <div className={`grid gap-2 sm:gap-6 sm:grid-cols-[200px_minmax(0,1fr)] py-4 items-start ${last ? '' : 'border-b border-surface-alt'}`}>
      <div className="min-w-0 sm:pt-2.5">
        {htmlFor
          ? <label htmlFor={htmlFor} className="block text-sm text-white">{label}</label>
          : <span className="block text-sm text-white">{label}</span>}
        {hint && <p className="m-0 mt-1 text-xs leading-snug text-secondary">{hint}</p>}
        {tag && <VisTag kind={tag} className="mt-2" />}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function PrefixInput({ prefix, className = '', ...props }) {
  return (
    <div className="relative">
      <span aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none select-none">{prefix}</span>
      <input {...props} className={`${INPUT} ${className}`} style={{ paddingLeft: `${0.875 + prefix.length * 0.55 + 0.25}rem` }} />
    </div>
  )
}

export function Select({ children, className = '', ...props }) {
  return (
    <div className={`relative ${className}`}>
      <select {...props} className={`${INPUT} appearance-none pr-9 cursor-pointer`}>{children}</select>
      <ChevronDown size={15} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
    </div>
  )
}

export function FieldError({ children }) {
  if (!children) return null
  return <p role="alert" className="m-0 mt-1.5 text-xs text-danger">{children}</p>
}

export function Switch({ checked, onChange, disabled, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6.5 shrink-0 rounded-full border-0 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${checked ? 'bg-brand' : 'bg-border-strong'}`}>
      <span className={`absolute top-[3px] left-[3px] w-5 h-5 rounded-full transition-transform ${checked ? 'translate-x-[18px] bg-base' : 'bg-muted'}`} />
    </button>
  )
}
