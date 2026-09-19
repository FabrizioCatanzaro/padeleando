import { useState } from 'react'
import { X, Check, Phone } from 'lucide-react'
import { api } from '../../utils/api'
import { useAuth } from '../../context/useAuth'
import { whatsappLink } from './clubForm'
import { addMinutes } from './scheduleGrid'
import { computeTotalPrice } from './pricing'
import { formatMoney } from '../../utils/money'
import Btn from '../shared/Btn'

const inputCls = 'w-full bg-surface border border-border-mid text-white px-3 py-2 rounded-sm text-sm outline-none font-sans'
const labelCls = 'block text-[10px] font-mono tracking-widest text-muted mb-1.5'

function fmtDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const label = new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

// Formulario de reserva (Fase 3): invitado o logueado piden lo mismo --
// nombre + contacto -- porque el perfil de usuario no guarda teléfono, sólo
// se precarga el nombre si hay sesión iniciada. `slots` es uno o más
// horarios de inicio CONSECUTIVOS (ver ClubBooking.jsx, que arma el rango) --
// se manda tal cual al back, que guarda una fila por turno pero las inserta
// todas juntas o ninguna. Al confirmar, la reserva queda "pending" -- eso NO
// bloquea el turno para otras personas (decisión revertida el 2026-09-06:
// bloquear al instante le hacía perder clientes al dueño si alguien
// spameaba pedidos sin confirmar nunca), pero sí lo marca "muy solicitado"
// si ya había otro pedido -- `contested` avisa de eso acá. Acá se ofrece
// además avisar directo por WhatsApp al club, con el mensaje ya prellenado.
export default function BookingFormModal({ club, courtId, courtName, date, slots, court, contested = false, onClose, onBooked }) {
  const { user } = useAuth()
  const [name, setName]       = useState(user?.name ?? '')
  const [contact, setContact] = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)
  const [done, setDone]       = useState(false)

  const startTime = slots[0]
  const endTime   = addMinutes(slots[slots.length - 1], club.slot_minutes)
  const totalMin  = slots.length * club.slot_minutes
  const totalPrice = computeTotalPrice(court, slots.length)

  async function handleSubmit() {
    if (!name.trim())    { setError('Ingresá tu nombre'); return }
    if (!contact.trim()) { setError('Ingresá un teléfono o WhatsApp de contacto'); return }
    setError(null)
    setSaving(true)
    try {
      const created = await api.clubs.bookings.create(club.id, {
        court_id: courtId, date, slots,
        guest_name: name.trim(), guest_contact: contact.trim(),
      })
      setDone(true)
      onBooked?.(created)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const waMsg = encodeURIComponent(
    `Hola! Reservé${courtName ? ` la ${courtName}` : ' un turno'} en ${club.name} para el ${fmtDate(date)} de ${startTime} a ${endTime} hs. Quería confirmarlo con ustedes.`
  )
  const waBase = whatsappLink(club.contact_whatsapp)
  const waHref = waBase ? `${waBase}?text=${waMsg}` : null
  const telHref = !waHref && club.contact_phone ? `tel:${club.contact_phone}` : null

  return (
    <div className="fixed inset-0 z-1000 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-surface border border-border-mid rounded-t-2xl sm:rounded-xl w-full sm:max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-mid sticky top-0 bg-surface z-10">
          <span className="font-mono text-[11px] text-[#555] tracking-widest">{done ? 'RESERVA ENVIADA' : 'RESERVAR TURNO'}</span>
          <button onClick={onClose} className="bg-transparent border-none text-[#555] hover:text-white cursor-pointer transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          {!done ? (
            <>
              <p className="text-[13px] text-white font-sans mb-1">{fmtDate(date)}</p>
              {courtName && <p className="text-[12.5px] text-brand font-sans font-semibold mb-1">{courtName}</p>}
              <p className="text-[12px] text-muted font-mono mb-2">
                {startTime} a {endTime} hs · {totalMin} min{totalPrice != null ? ` · ${formatMoney(totalPrice)}` : ''}
              </p>
              {contested && (
                <p className="text-[11px] font-mono text-premium mb-3 leading-relaxed">
                  ⚠ Ya hay otra persona esperando este mismo horario. Tu reserva también queda pendiente -- el club decide a quién confirmar.
                </p>
              )}
              <div className="flex flex-col gap-3">
                <div>
                  <label className={labelCls}>TU NOMBRE (*)</label>
                  <input className={inputCls} value={name} maxLength={60}
                    onChange={(e) => setName(e.target.value)} placeholder="Nombre y apellido" />
                </div>
                <div>
                  <label className={labelCls}>TELÉFONO O WHATSAPP (*)</label>
                  <input className={inputCls} value={contact} maxLength={40}
                    onChange={(e) => setContact(e.target.value)} placeholder="+54 9 11 ..." />
                  <p className="text-[10px] font-mono text-dim mt-1.5 leading-relaxed">
                    El club te va a contactar acá para confirmar el turno.
                  </p>
                </div>
              </div>
              {error && <p className="text-danger text-xs font-mono mt-3">{error}</p>}
              <div className="flex gap-2 mt-5">
                <Btn variant="primary" full size="md" onClick={handleSubmit} loading={saving}>RESERVAR</Btn>
                <Btn size="md" onClick={onClose}>CANCELAR</Btn>
              </div>
            </>
          ) : (
            <>
              <p className="text-[13px] text-white font-sans leading-relaxed mb-4">
                Tu turno{courtName ? <> en <span className="font-semibold">{courtName}</span></> : ''} quedó <span className="text-brand font-semibold">pendiente de confirmación</span> del club para el {fmtDate(date)} de {startTime} a {endTime} hs.
              </p>
              {waHref && (
                <a href={waHref} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 bg-brand text-base border-0 px-3.5 py-2.5 rounded-lg font-condensed font-bold text-[12px] tracking-widest cursor-pointer no-underline mb-2">
                  <Check size={13} /> AVISAR POR WHATSAPP
                </a>
              )}
              {telHref && (
                <a href={telHref}
                  className="flex items-center justify-center gap-2 bg-brand text-base border-0 px-3.5 py-2.5 rounded-lg font-condensed font-bold text-[12px] tracking-widest cursor-pointer no-underline mb-2">
                  <Phone size={13} /> LLAMAR AL CLUB
                </a>
              )}
              <Btn size="md" full onClick={onClose}>LISTO</Btn>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
