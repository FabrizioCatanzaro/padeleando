import { Globe } from 'lucide-react'
import { siInstagram, siX, siFacebook } from 'simple-icons'
import DropdownSelect from '../shared/DropdownSelect'

function BrandSvg({ path, className = '' }) {
  return <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" aria-hidden="true" className={className}><path d={path} /></svg>
}
export function InstagramIcon({ className }) { return <BrandSvg path={siInstagram.path} className={className} /> }
export function XIcon({ className }) { return <BrandSvg path={siX.path} className={className} /> }
export function FacebookIcon({ className }) { return <BrandSvg path={siFacebook.path} className={className} /> }
export function WebIcon({ className = '' }) { return <Globe size={16} aria-hidden="true" className={className} /> }

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

// Campo con ícono y prefijo fijos (@, https://) que el usuario no puede borrar.
export function AffixInput({ icon: Icon, leading, prefix, prefixGap = false, className = '', ...props }) {
  return (
    <div className={`flex items-center h-11 bg-base border border-border-mid rounded-lg px-3.5 transition-colors focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/30 ${props.disabled ? 'bg-surface' : ''} ${className}`}>
      {Icon && <Icon aria-hidden="true" className="shrink-0 mr-2.5 text-secondary" />}
      {leading}
      {prefix && <span aria-hidden="true" className={`shrink-0 text-sm text-muted select-none ${prefixGap ? 'mr-1.5' : ''}`}>{prefix}</span>}
      <input {...props} className="flex-1 min-w-0 h-full bg-transparent border-0 p-0 text-sm text-content font-sans outline-none placeholder:text-dim disabled:text-secondary disabled:cursor-not-allowed" />
    </div>
  )
}

export function Select({ value, onChange, options, ...props }) {
  return (
    <DropdownSelect value={value} onChange={onChange} options={options} buttonClass={`${INPUT} pr-3`} {...props} />
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
