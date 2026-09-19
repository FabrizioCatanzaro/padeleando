import { useState, useEffect, useMemo } from 'react'
import { X, Camera, Check, ShieldCheck } from 'lucide-react'
import { api } from '../../utils/api'
import { useToast } from '../../context/useToast'
import Btn from '../shared/Btn'

const labelCls = 'block text-[10px] font-mono tracking-widest text-muted mb-1.5'
const inputCls = 'w-full bg-surface border border-border-mid text-white px-3 py-2 rounded-sm text-sm outline-none font-sans'

const RELATIONSHIP_OPTIONS = [
  { value: 'dueno',     label: 'Soy el dueño' },
  { value: 'encargado', label: 'Soy encargado / lo administro' },
  { value: 'otro',      label: 'Otra relación' },
]

// Cada foto pide algo distinto a propósito: tres fotos genéricas no le dan al
// admin ninguna pista de qué está mirando.
const PHOTO_SLOTS = [
  { key: 'photo_front',  title: 'Frente del club', hint: 'El cartel o la entrada, que se vea el nombre' },
  { key: 'photo_proof',  title: 'Algo que te vincule al club', hint: 'Una factura, un cartel interno, vos en el mostrador...' },
  { key: 'photo_social', title: 'Una red social del club', hint: 'Captura de Instagram, Facebook, WhatsApp, Twitter/X o Google Maps donde se vea que la administrás vos' },
]

function PhotoPicker({ slot, file, onChange }) {
  const inputId = `claim-${slot.key}`
  // useMemo (no useEffect+setState) para no disparar un render en cascada:
  // el preview se deriva del file en el mismo render, y sólo se limpia aparte.
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  return (
    <div>
      <label className={labelCls}>{slot.title.toUpperCase()} (*)</label>
      <label
        htmlFor={inputId}
        className={`flex items-center gap-3 border rounded-sm px-3 py-2.5 cursor-pointer transition-colors ${file ? 'border-brand' : 'border-border-mid hover:border-soft'}`}
      >
        <div className="w-11 h-11 rounded bg-base border border-border-mid overflow-hidden shrink-0 flex items-center justify-center">
          {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : <Camera size={16} className="text-muted" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] text-white truncate">{file ? file.name : 'Elegir foto'}</div>
          <div className="text-[10.5px] text-dim truncate">{slot.hint}</div>
        </div>
        {file && <Check size={14} className="text-brand shrink-0" strokeWidth={3} />}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}

// Modal para reclamar ser dueño de un club sin dueño verificado. A diferencia
// de ClubRequestModal (que propone un cambio de dato), esto es un reclamo de
// identidad: un admin lo revisa a mano y, si lo aprueba, este usuario pasa a
// poder editar el club directamente.
export default function ClubClaimModal({ club, onClose, onSubmitted }) {
  const { showToast } = useToast()
  const [fullName, setFullName]         = useState('')
  const [phone, setPhone]               = useState('')
  const [relationship, setRelationship] = useState('dueno')
  const [note, setNote]                 = useState('')
  const [photos, setPhotos]             = useState({})
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState(null)

  const setPhoto = (key, file) => setPhotos((p) => ({ ...p, [key]: file }))

  async function handleSubmit() {
    if (!fullName.trim())     return setError('Tu nombre completo es requerido')
    if (!phone.trim())        return setError('Un teléfono de contacto es requerido')
    if (!relationship)        return setError('Contanos tu relación con el club')
    if (!photos.photo_front || !photos.photo_proof || !photos.photo_social)
      return setError('Las 3 fotos son obligatorias')

    setError(null)
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('full_name', fullName.trim())
      fd.append('phone', phone.trim())
      fd.append('relationship', relationship)
      if (note.trim()) fd.append('note', note.trim())
      fd.append('photo_front', photos.photo_front)
      fd.append('photo_proof', photos.photo_proof)
      fd.append('photo_social', photos.photo_social)
      const claim = await api.clubs.claim(club.id, fd)
      showToast('Reclamo enviado. Un admin lo va a revisar pronto.')
      onSubmitted?.(claim)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-1000 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface border border-border-mid rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-mid sticky top-0 bg-surface z-10">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#555] tracking-widest">
            <ShieldCheck size={13} /> RECLAMAR CLUB
          </span>
          <button onClick={onClose} className="bg-transparent border-none text-[#555] hover:text-white cursor-pointer transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          <p className="text-muted text-xs font-sans mb-4 leading-relaxed">
            Un administrador revisa cada reclamo a mano. Si lo aprueba, vas a poder editar{' '}
            <strong className="text-white">{club.name}</strong> vos mismo, sin pasar por una solicitud.
          </p>

          <div className="flex flex-col gap-4">
            <div>
              <label className={labelCls}>TU NOMBRE COMPLETO (*)</label>
              <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nombre y apellido" />
            </div>
            <div>
              <label className={labelCls}>TELÉFONO DE CONTACTO (*)</label>
              <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54 9 11 ..." />
            </div>
            <div>
              <label className={labelCls}>TU RELACIÓN CON EL CLUB (*)</label>
              <select className={inputCls} value={relationship} onChange={(e) => setRelationship(e.target.value)}>
                {RELATIONSHIP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {PHOTO_SLOTS.map((slot) => (
              <PhotoPicker key={slot.key} slot={slot} file={photos[slot.key]} onChange={(f) => setPhoto(slot.key, f)} />
            ))}

            <div>
              <label className={labelCls}>ALGO MÁS QUE QUIERAS CONTAR (opcional)</label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Cualquier dato que ayude a confirmar que sos vos"
              />
            </div>
          </div>

          {error && <p className="text-danger text-xs font-mono mt-3">{error}</p>}
          <div className="flex gap-2 mt-5">
            <Btn variant="primary" full size="md" onClick={handleSubmit} loading={saving}>ENVIAR RECLAMO</Btn>
            <Btn size="md" onClick={onClose}>CANCELAR</Btn>
          </div>
        </div>
      </div>
    </div>
  )
}
