import { Trophy } from 'lucide-react'
import { CONTACT_META, contactHref, formatPrice } from '../../../utils/signup'
import { DISPONIBILIDAD } from '../../Registration/format'

const CUPO = { open: 'Hay cupos', few: 'Últimos cupos', full: 'Cupo completo' }

/** Precio, cupo y contactos. Los contactos van sobre el enlace de la card. */
export function SignupFooter({ t }) {
  const price = formatPrice(t.signup?.price, t.signup?.unit)
  const cupo = t.signup?.availability
  const contacts = (t.signup?.contacts ?? []).slice(0, 3)
  return (
    <span className="flex flex-col gap-2">
      <span className="flex items-center justify-between gap-2">
        {price
          ? <span className="font-sans text-[14px] font-extrabold text-white">{price}</span>
          : <span className="font-sans font-bold text-green">Inscripción abierta</span>}
        {cupo && <span className={`shrink-0 font-sans text-[11.5px] font-bold rounded-full border px-2 py-[3px] ${DISPONIBILIDAD[cupo]?.color ?? ''}`}>{CUPO[cupo]}</span>}
      </span>
      {contacts.length > 0 && (
        <span className="flex flex-wrap gap-1.5">
          {contacts.map((c) => {
            const meta = CONTACT_META[c.type]
            const href = contactHref(c, t.name)
            if (!meta || !href) return null
            const Icon = meta.icon
            return (
              <a key={c.type} href={href} target="_blank" rel="noopener noreferrer"
                className="relative z-10 inline-flex items-center gap-1.5 min-h-8 border border-border-strong rounded-full px-2.5 font-sans text-[12px] font-semibold text-content hover:border-brand hover:text-brand transition-colors no-underline">
                <Icon size={12} aria-hidden="true" />{meta.label}
              </a>
            )
          })}
        </span>
      )}
    </span>
  )
}

export function WinnerFooter({ label }) {
  return (
    <span className="flex items-start gap-2 font-sans font-bold text-brand">
      <Trophy size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
      <span className="line-clamp-2">{label}</span>
    </span>
  )
}

export function TextFooter({ strong = null, strongCls = 'text-white', children }) {
  return (
    <span className="block">
      {strong && <span className={`block font-bold ${strongCls}`}>{strong}</span>}
      {children && <span className="block text-secondary mt-0.5">{children}</span>}
    </span>
  )
}
