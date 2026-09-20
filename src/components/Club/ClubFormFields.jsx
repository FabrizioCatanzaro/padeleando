import { useState } from 'react'
import { MapPin, Instagram, Facebook, Globe, Phone, MessageCircle, Check } from 'lucide-react'
import MapPicker from '../shared/MapPicker'
import ClubScheduleFields from './ClubScheduleFields'

const labelCls = 'block text-[10px] font-mono tracking-widest text-muted mb-1.5'
const inputCls = 'w-full bg-surface border border-border-mid text-white px-3 py-2 rounded-sm text-sm outline-none font-sans'

// Campos de un club compartidos por solicitud, admin y dueño; patch aplica un cambio parcial
export default function ClubFormFields({ form, patch, realCourtsCount = 0 }) {
  const [showMap, setShowMap] = useState(false)

  function onMapConfirm(lat, lon, displayName) {
    patch({ lat, lon, ...(displayName ? { location_name: displayName } : {}) })
    setShowMap(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className={labelCls}>NOMBRE DEL CLUB (*)</label>
        <input className={inputCls} value={form.name} maxLength={80}
          onChange={(e) => patch({ name: e.target.value })} placeholder="ej: Padel Club Palermo" />
      </div>

      <div>
        <label className={labelCls}>DIRECCIÓN (*)</label>
        <div className="relative">
          <MapPin size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
          <input className={`${inputCls} pl-7 pr-20`} value={form.location_name}
            onChange={(e) => patch({ location_name: e.target.value })} placeholder="Calle, ciudad..." />
          <button type="button" onClick={() => setShowMap(true)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono border transition-colors cursor-pointer bg-transparent ${form.lat ? 'border-brand text-brand' : 'border-danger text-danger hover:brightness-125'}`}>
            <MapPin size={10} />{form.lat ? <>PIN <Check size={10} strokeWidth={3} /></> : 'MARCAR'}
          </button>
        </div>
        <p className={`text-[10px] font-mono mt-1.5 flex items-start gap-1 ${form.lat ? 'text-muted' : 'text-danger'}`}>
          {form.lat
            ? <><Check size={11} strokeWidth={3} className="shrink-0 mt-px" />Ubicación marcada en el mapa</>
            : 'Marcá la ubicación en el mapa (obligatorio para que aparezca en clubes cercanos).'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>TELÉFONO (opcional)</label>
          <div className="relative">
            <Phone size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
            <input className={`${inputCls} pl-7`} value={form.contact_phone}
              onChange={(e) => patch({ contact_phone: e.target.value })} placeholder="+54 11 ..." />
          </div>
        </div>
        <div>
          <label className={labelCls}>WHATSAPP (opcional)</label>
          <div className="relative">
            <MessageCircle size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
            <input className={`${inputCls} pl-7`} value={form.contact_whatsapp}
              onChange={(e) => patch({ contact_whatsapp: e.target.value })} placeholder="+54 9 11 ..." />
          </div>
        </div>
      </div>

      <div>
        <label className={labelCls}>CANTIDAD DE CANCHAS {realCourtsCount === 0 && '(opcional)'}</label>
        {realCourtsCount > 0 ? (
          <>
            <div className={`${inputCls} opacity-70 cursor-not-allowed select-none`}>
              {realCourtsCount} {realCourtsCount === 1 ? 'cancha cargada' : 'canchas cargadas'}
            </div>
            <p className="text-[10px] font-mono text-dim mt-1.5 leading-relaxed">
              Se calcula solo a partir de las canchas que cargaste en "Gestionar canchas" (ficha del club). Para cambiarlo, agregá, sacá o deshabilitá canchas ahí.
            </p>
          </>
        ) : (
          <>
            <input className={inputCls} type="number" min="0" max="50" value={form.courts}
              onChange={(e) => patch({ courts: e.target.value })} placeholder="ej: 4" />
            <p className="text-[10px] font-mono text-dim mt-1.5 leading-relaxed">
              Sólo un número de referencia, hasta que cargues canchas individuales desde "Gestionar canchas" en la ficha del club.
            </p>
          </>
        )}
      </div>

      <div>
        <label className={labelCls}>REDES SOCIALES (opcional)</label>
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Instagram size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
            <input className={`${inputCls} pl-7`} value={form.instagram}
              onChange={(e) => patch({ instagram: e.target.value })} placeholder="Instagram (URL o @usuario)" />
          </div>
          <div className="relative">
            <Facebook size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
            <input className={`${inputCls} pl-7`} value={form.facebook}
              onChange={(e) => patch({ facebook: e.target.value })} placeholder="Facebook (URL)" />
          </div>
          <div className="relative">
            <Globe size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
            <input className={`${inputCls} pl-7`} value={form.website}
              onChange={(e) => patch({ website: e.target.value })} placeholder="Sitio web (URL)" />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelCls}>HORARIOS</label>
          <button
            type="button"
            onClick={() => patch({ scheduleMode: form.scheduleMode === 'text' ? 'grid' : 'text' })}
            className="text-[10px] font-mono text-muted hover:text-brand bg-transparent border-none cursor-pointer p-0"
          >
            {form.scheduleMode === 'text' ? 'Usar grilla de días' : 'Escribirlo a mano'}
          </button>
        </div>
        {form.scheduleMode === 'text' ? (
          <textarea className={`${inputCls} resize-none`} rows={3} value={form.scheduleText}
            onChange={(e) => patch({ scheduleText: e.target.value })}
            placeholder={'Una línea por horario, ej:\nLun a Vie: 9 a 23\nSáb y Dom: 10 a 22'} />
        ) : (
          <ClubScheduleFields grid={form.scheduleGrid} onChange={(scheduleGrid) => patch({ scheduleGrid })} />
        )}
      </div>

      {showMap && (
        <MapPicker initialLat={form.lat} initialLon={form.lon}
          onConfirm={onMapConfirm} onClose={() => setShowMap(false)} />
      )}
    </div>
  )
}
