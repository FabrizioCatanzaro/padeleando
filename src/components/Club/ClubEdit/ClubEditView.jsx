import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ChevronLeft, Upload, Image as ImageIcon, Check } from 'lucide-react'
import { api } from '../../../utils/api'
import { useAuth } from '../../../context/useAuth'
import { useToast } from '../../../context/useToast'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { AMENITIES } from '../../../utils/clubProfile'
import { INPUT } from '../../ProfileEdit/fields'
import { clubToForm, formToClub } from '../clubForm'
import { AMENITY_ICON } from '../amenityIcons'
import ClubFormFields from '../ClubFormFields'
import ClubCourtsManager from '../ClubCourtsManager'
import ClubPhotosEditor from './ClubPhotosEditor'
import courtBg from '../../../assets/padelcourt.webp'
import Loader from '../../Loader/Loader'
import LazyNotFound from '../../NotFound/LazyNotFound'
import Btn from '../../shared/Btn'

const ACCEPT = 'image/jpeg,image/png,image/webp'

function Card({ id, title, hint, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-24 border border-border-mid rounded-xl bg-surface p-5">
      <h2 id={`${id}-t`} className="m-0 font-condensed font-bold text-[15px] text-white">{title}</h2>
      {hint && <p className="m-0 mt-1.5 text-[13px] text-secondary leading-relaxed">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function useImageField(initialUrl) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(initialUrl)
  const [removed, setRemoved] = useState(false)
  const pick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f); setPreview(URL.createObjectURL(f)); setRemoved(false)
  }
  const clear = () => { setFile(null); setPreview(null); setRemoved(true) }
  const reset = useCallback((url) => { setFile(null); setPreview(url); setRemoved(false) }, [])
  return { file, preview, removed, pick, clear, reset }
}

function CoverOption({ selected, onSelect, img, label, children }) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected}
      className={`text-left bg-base rounded-xl p-2 cursor-pointer border-2 transition-colors ${selected ? 'border-brand' : 'border-border-mid hover:border-border-strong'}`}>
      {img
        ? <img src={img} alt="" className="w-full h-28 object-cover rounded-lg block" />
        : children}
      <span className="flex justify-between items-center px-1 pt-2.5 pb-0.5">
        <span className="text-white font-semibold text-sm">{label}</span>
        {selected && <span className="inline-flex items-center gap-1 text-[12px] text-brand"><Check size={12} />En uso</span>}
      </span>
    </button>
  )
}

export default function ClubEditView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const isAdmin = user?.role === 'admin'
  const [club, setClub] = useState(null)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(null)
  const [amenities, setAmenities] = useState([])
  const [amenitiesOther, setAmenitiesOther] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const header = useImageField(null)
  const photo = useImageField(null)
  const { reset: resetHeader } = header
  const { reset: resetPhoto } = photo

  useEffect(() => {
    let cancelled = false
    api.clubs.get(id)
      .then((c) => {
        if (cancelled) return
        if (!c.is_owner && !isAdmin) { navigate(`/club/${id}`, { replace: true }); return }
        setClub(c)
        setForm(clubToForm(c))
        setAmenities(c.amenities ?? [])
        setAmenitiesOther(c.amenities_other ?? '')
        setEmail(c.contact_email ?? '')
        resetHeader(c.header_url ?? null)
        resetPhoto(c.photo_url ?? null)
      })
      .catch((e) => { if (!cancelled) setError(e.status === 404 ? 'notfound' : e.message) })
    return () => { cancelled = true }
  }, [id, isAdmin, navigate, resetHeader, resetPhoto])

  useDocumentTitle(club ? `Editar ${club.name}` : 'Editar club')

  const loaded = !!club
  useEffect(() => {
    if (loaded && window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
  }, [loaded])

  const patch = useCallback((p) => setForm((f) => ({ ...f, ...p })), [])
  const handleCourtsChange = useCallback((courts_list) => setClub((c) => (c ? { ...c, courts_list } : c)), [])

  function toggleAmenity(key) {
    setAmenities((a) => (a.includes(key) ? a.filter((k) => k !== key) : [...a, key]))
  }

  async function save() {
    if (!form.name.trim() || form.name.trim().length < 2) { setSaveError('El nombre del club debe tener más de 2 caracteres'); return }
    if (form.lat == null || form.lon == null) { setSaveError('Marcá la ubicación del club en el mapa'); return }
    setSaveError(null)
    setSaving(true)
    try {
      const saved = await api.clubs.update(club.id, {
        ...formToClub(form),
        amenities,
        amenities_other: amenitiesOther.trim() || null,
        contact_email: email.trim() || null,
      })
      if (photo.file) await api.clubs.uploadPhoto(club.id, photo.file)
      else if (photo.removed && club.photo_url) await api.clubs.deletePhoto(club.id)
      if (header.file) await api.clubs.uploadHeader(club.id, header.file)
      else if (header.removed && club.header_url) await api.clubs.deleteHeader(club.id)
      showToast(saved.pending_identity_request
        ? 'Guardado. El cambio de nombre o ubicación quedó pendiente de aprobación del admin.'
        : 'Club actualizado', saved.pending_identity_request ? 'info' : undefined, saved.pending_identity_request ? 5000 : undefined)
      navigate(`/club/${club.id}`)
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (error === 'notfound') return <LazyNotFound subject="club" />
  if (error) return <p className="text-danger text-sm p-6">{error}</p>
  if (!club || !form) return <Loader minHeight="100vh" />

  const usingDefault = !header.preview

  return (
    <div className="min-h-screen bg-base text-content font-sans">
      <header className="flex items-center gap-3 flex-wrap px-5 sm:px-7 py-4 border-b border-border">
        <Link to={`/club/${club.id}`} className="inline-flex items-center gap-1.5 text-sm text-content hover:text-white">
          <ChevronLeft size={16} /> Volver al club
        </Link>
        <h1 className="m-0 font-condensed font-black text-[19px] text-white min-w-0">Editar {club.name}</h1>
      </header>

      <div className="max-w-[880px] mx-auto px-4 sm:px-6 pt-7 pb-10 flex flex-col gap-4">
        <Card id="portada" title="Portada" hint="Se ve arriba de todo en el perfil. Usá una foto horizontal de al menos 1600 × 600 px.">
          <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
            <CoverOption selected={usingDefault} onSelect={header.clear} img={courtBg} label="Predeterminada" />
            {(header.preview || club.header_url) && (
              <CoverOption selected={!usingDefault} onSelect={() => { if (!header.file) header.reset(club.header_url) }}
                img={header.preview ?? club.header_url} label="Foto del club" />
            )}
            <label className="text-left bg-base rounded-xl p-2 cursor-pointer border-2 border-border-mid hover:border-border-strong">
              <span className="h-28 rounded-lg border border-dashed border-border-strong flex flex-col items-center justify-center gap-2 text-soft text-sm">
                <Upload size={20} /> {header.preview ? 'Cambiar foto' : 'Subir foto propia'}
              </span>
              <span className="block px-1 pt-2.5 pb-0.5 text-white font-semibold text-sm">JPG, PNG o WEBP, hasta 4 MB</span>
              <input type="file" accept={ACCEPT} className="sr-only" onChange={header.pick} />
            </label>
          </div>
        </Card>

        <Card id="logo" title="Logo">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-base border border-border-mid overflow-hidden flex items-center justify-center shrink-0">
              {photo.preview ? <img src={photo.preview} alt="" className="w-full h-full object-contain" /> : <ImageIcon size={24} className="text-border-strong" />}
            </div>
            <div className="flex flex-col items-start gap-2">
              <label className="text-sm text-brand cursor-pointer hover:underline">
                {photo.preview ? 'Cambiar logo' : 'Subir logo'}
                <input type="file" accept={ACCEPT} className="sr-only" onChange={photo.pick} />
              </label>
              {photo.preview && (
                <button type="button" onClick={photo.clear} className="text-sm text-danger hover:underline bg-transparent border-0 p-0 cursor-pointer">Quitar logo</button>
              )}
            </div>
          </div>
        </Card>

        <Card id="datos" title="Datos, contacto y horarios"
          hint={isAdmin ? null : 'Si cambiás el nombre o la ubicación, el cambio pasa por revisión antes de publicarse.'}>
          <ClubFormFields form={form} patch={patch} realCourtsCount={club.courts_list?.length ?? 0} />
          <label className="block mt-4">
            <span className="block text-[10px] font-mono tracking-widest text-muted mb-1.5">EMAIL (opcional)</span>
            <input type="email" className={INPUT} value={email} maxLength={120} autoComplete="off"
              onChange={(e) => setEmail(e.target.value)} placeholder="reservas@tuclub.com" />
          </label>
        </Card>

        <Card id="servicios" title="Servicios e instalaciones" hint="Marcá lo que tiene el club. Solo se muestra lo que marques.">
          <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
            {AMENITIES.map((a) => {
              const Icon = AMENITY_ICON[a.key]
              const on = amenities.includes(a.key)
              return (
                <button key={a.key} type="button" role="checkbox" aria-checked={on} onClick={() => toggleAmenity(a.key)}
                  className={`flex items-center gap-2.5 min-h-11 px-3 py-2.5 rounded-lg text-left text-sm cursor-pointer border transition-colors ${
                    on ? 'bg-brand/10 border-brand text-white' : 'bg-transparent border-border-strong text-secondary hover:text-white'
                  }`}>
                  <Icon size={16} aria-hidden="true" className="shrink-0" />{a.label}
                </button>
              )
            })}
          </div>
          <label className="block mt-4">
            <span className="block text-[10px] font-mono tracking-widest text-muted mb-1.5">OTROS SERVICIOS</span>
            <input className={INPUT} value={amenitiesOther} maxLength={160}
              onChange={(e) => setAmenitiesOther(e.target.value)} placeholder="ej: venta de pelotitas y encordado de paletas" />
          </label>
        </Card>

        <Card id="canchas" title="Canchas" hint="Cada cancha se guarda apenas la confirmás. El material, el color y la descripción se ven en el perfil y al reservar.">
          <ClubCourtsManager clubId={club.id} onCourtsChange={handleCourtsChange} />
        </Card>

        <Card id="fotos" title="Fotos del club" hint="Mostrá el lugar: las canchas, el buffet, los vestuarios. Se suben y se borran en el momento.">
          <ClubPhotosEditor club={club} onChange={(photos) => setClub((c) => ({ ...c, photos }))} />
        </Card>

        {club.has_owner && (
          <Card id="visibilidad" title="Visibilidad">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input type="checkbox" className="mt-0.5" checked={!!form.owner_visible} onChange={(e) => patch({ owner_visible: e.target.checked })} />
              <span className="text-sm text-content leading-relaxed">Mostrar mi nombre como dueño verificado en el perfil del club.</span>
            </label>
          </Card>
        )}
      </div>

      <div className="sticky bottom-0 z-30 border-t border-border-strong bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-[880px] px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="min-w-0 flex-1 text-[13px]" aria-live="polite">
            {saveError && <span role="alert" className="text-danger">{saveError}</span>}
          </div>
          <Btn onClick={() => navigate(`/club/${club.id}`)} disabled={saving}>Cancelar</Btn>
          <Btn variant="primary" onClick={save} loading={saving}>GUARDAR CAMBIOS</Btn>
        </div>
      </div>
    </div>
  )
}
