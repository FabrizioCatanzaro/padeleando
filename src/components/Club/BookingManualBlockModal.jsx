import { useState } from 'react'
import { X } from 'lucide-react'
import { api } from '../../utils/api'
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

// Bloqueo manual del dueño: datos opcionales, queda confirmed y avisa cuántas pending rechazará
export default function BookingManualBlockModal({ club, courtId, courtName, date, slots, court, overlappingPendingCount = 0, onClose, onBooked }) {
  const [name, setName]       = useState('')
  const [contact, setContact] = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)
  const [done, setDone]       = useState(false)

  const startTime = slots[0]
  const endTime   = addMinutes(slots[slots.length - 1], club.slot_minutes)
  const totalMin  = slots.length * club.slot_minutes
  const totalPrice = computeTotalPrice(court, slots.length)

  async function handleSubmit() {
    setError(null)
    setSaving(true)
    try {
      const created = await api.clubs.bookings.createManual(club.id, {
        court_id: courtId, date, slots,
        guest_name: name.trim() || undefined,
        guest_contact: contact.trim() || undefined,
      })
      setDone(true)
      onBooked?.(created)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-1000 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-surface border border-border-mid rounded-t-2xl sm:rounded-xl w-full sm:max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-mid sticky top-0 bg-surface z-10">
          <span className="font-mono text-[11px] text-[#555] tracking-widest">{done ? 'TURNO MARCADO' : 'MARCAR COMO RESERVADO'}</span>
          <button onClick={onClose} className="bg-transparent border-none text-[#555] hover:text-white cursor-pointer transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          {!done ? (
            <>
              <p className="text-[13px] text-white font-sans mb-1">{fmtDate(date)}</p>
              {courtName && <p className="text-[12.5px] text-brand font-sans font-semibold mb-1">{courtName}</p>}
              <p className="text-[12px] text-muted font-mono mb-4">
                {startTime} a {endTime} hs · {totalMin} min{totalPrice != null ? ` · ${formatMoney(totalPrice)}` : ''}
              </p>
              <p className="text-[11.5px] text-dim font-sans leading-relaxed mb-4">
                Usá esto si alguien reservó este turno por fuera de la app (te llamó, te escribió o vino en persona). Queda bloqueado al instante para que no lo puedan tomar online.
              </p>
              {overlappingPendingCount > 0 && (
                <p className="text-[11px] font-mono text-premium mb-4 leading-relaxed">
                  ⚠ Hay {overlappingPendingCount} solicitud{overlappingPendingCount === 1 ? '' : 'es'} pendiente{overlappingPendingCount === 1 ? '' : 's'} de otra{overlappingPendingCount === 1 ? '' : 's'} persona{overlappingPendingCount === 1 ? '' : 's'} para este mismo horario. Al marcarlo como reservado, se rechazan automáticamente y se les avisa.
                </p>
              )}
              <div className="flex flex-col gap-3">
                <div>
                  <label className={labelCls}>NOMBRE (OPCIONAL)</label>
                  <input className={inputCls} value={name} maxLength={60}
                    onChange={(e) => setName(e.target.value)} placeholder="Nombre y apellido" />
                </div>
                <div>
                  <label className={labelCls}>CONTACTO (OPCIONAL)</label>
                  <input className={inputCls} value={contact} maxLength={40}
                    onChange={(e) => setContact(e.target.value)} placeholder="Teléfono, WhatsApp..." />
                </div>
              </div>
              {error && <p className="text-danger text-xs font-mono mt-3">{error}</p>}
              <div className="flex gap-2 mt-5">
                <Btn variant="primary" full size="md" onClick={handleSubmit} loading={saving}>MARCAR COMO RESERVADO</Btn>
                <Btn size="md" onClick={onClose}>CANCELAR</Btn>
              </div>
            </>
          ) : (
            <>
              <p className="text-[13px] text-white font-sans leading-relaxed mb-4">
                Turno{courtName ? <> en <span className="font-semibold">{courtName}</span></> : ''} marcado como <span className="text-brand font-semibold">reservado</span> para el {fmtDate(date)} de {startTime} a {endTime} hs.
              </p>
              <Btn size="md" full onClick={onClose}>LISTO</Btn>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
