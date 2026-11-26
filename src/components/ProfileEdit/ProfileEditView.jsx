import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BadgeCheck, Camera, ChevronLeft, Info, Lock, Plus, Trash2 } from 'lucide-react'
import { api } from '../../utils/api'
import { useAuth } from '../../context/useAuth'
import Btn from '../shared/Btn'
import Modal from '../shared/Modal'
import Loader from '../Loader/Loader'
import CategoryPicker from '../shared/CategoryPicker'
import CountryFlag from '../shared/CountryFlag'
import { SegButtons } from '../Friendly/parts'
import { COUNTRY_OPTIONS } from '../../utils/countries'
import { INPUT, Row, Section, VisTag, PrefixInput, Select, FieldError, Switch } from './fields'
import AddressFields from './AddressFields'
import ClaimPremiumRequest from '../shared/ClaimPremiumRequest'

const AvatarCropper = lazy(() => import('../shared/AvatarCropper'))
const PremiumModal = lazy(() => import('../shared/PremiumModal'))

const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const USERNAME_RE = /^[a-z0-9_]{3,20}$/

const SECTIONS = [
  { id: 'foto', label: 'Foto' },
  { id: 'datos', label: 'Datos personales' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'redes', label: 'Redes sociales' },
  { id: 'juego', label: 'Datos de juego' },
  { id: 'ubicacion', label: 'Ubicación' },
  { id: 'emergencia', label: 'Contactos de emergencia' },
  { id: 'privacidad', label: 'Privacidad' },
  { id: 'seguridad', label: 'Seguridad' },
]

const GENDER_OPTIONS = [
  { id: 'masculino', label: 'Masculino' },
  { id: 'femenino', label: 'Femenino' },
  { id: 'no_decir', label: 'Prefiero no decirlo' },
]
const DOC_OPTIONS = [
  { id: 'dni', label: 'DNI' },
  { id: 'pasaporte', label: 'Pasaporte' },
  { id: 'otro', label: 'Otro' },
]
const HAND_OPTIONS = [
  { id: 'diestro', label: 'Derecha' },
  { id: 'zurdo', label: 'Izquierda' },
  { id: 'ambidiestro', label: 'Ambidiestro' },
]
const SIDE_OPTIONS = [
  { id: 'drive', label: 'Drive' },
  { id: 'reves', label: 'Revés' },
  { id: 'cualquiera', label: 'Cualquiera' },
]
const VISIBILITY_OPTIONS = [
  { id: 'publico', label: 'Público' },
  { id: 'privado', label: 'Privado' },
]

const TEXT_KEYS = [
  'first_name', 'last_name', 'username', 'nationality', 'birth_date', 'gender', 'doc_type', 'doc_number',
  'whatsapp', 'instagram', 'twitter', 'facebook', 'website', 'category', 'hand', 'side',
  'country', 'province', 'locality', 'street', 'street_number', 'postal_code',
]
const SESSION_KEYS = ['name', 'first_name', 'last_name', 'username', 'category', 'whatsapp', 'whatsapp_public', 'instagram', 'hand', 'side']
const EMPTY_CONTACT = { name: '', relation: '', phone: '' }

function fromProfile(p) {
  const f = {}
  for (const k of TEXT_KEYS) f[k] = p[k] ?? ''
  f.birth_date = p.birth_date ? String(p.birth_date).slice(0, 10) : ''
  f.whatsapp_public = p.whatsapp_public === true
  f.advanced_stats_public = p.advanced_stats_public === true
  f.emergency_contacts = Array.isArray(p.emergency_contacts) ? p.emergency_contacts.map((c) => ({ ...EMPTY_CONTACT, ...c })) : []
  return f
}

const filledContacts = (list) => list.filter((c) => c.name.trim() || c.relation.trim() || c.phone.trim())
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const stripHandle = (v) => v.trim().replace(/^https?:\/\/(www\.|m\.|mobile\.|web\.)?[^/]+\//i, '').replace(/^@+/, '').replace(/[/?#].*$/, '')
const fmtDay = (iso) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

function toPatch(k, v) {
  if (k === 'emergency_contacts') return filledContacts(v)
  if (typeof v === 'boolean') return v
  const t = String(v).trim()
  if (k === 'first_name' || k === 'last_name' || k === 'username') return t
  return t === '' ? null : t
}

function useActiveSection(ids, ready) {
  const [active, setActive] = useState(ids[0])
  const nodes = useRef({})
  useEffect(() => {
    if (!ready) return
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (hit) setActive(hit.target.id)
    }, { rootMargin: '-25% 0px -65% 0px' })
    Object.values(nodes.current).forEach((n) => n && io.observe(n))
    return () => io.disconnect()
  }, [ready])
  const refFor = useCallback((id) => (node) => { nodes.current[id] = node }, [])
  return [active, refFor]
}

export default function ProfileEditView() {
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [initial, setInitial] = useState(null)
  const [form, setForm] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [savedAt, setSavedAt] = useState(null)
  const [confirmSave, setConfirmSave] = useState(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [unameStatus, setUnameStatus] = useState(null)

  const fileInputRef = useRef(null)
  const [cropFile, setCropFile] = useState(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState(null)
  const [confirmAvatarDelete, setConfirmAvatarDelete] = useState(false)

  const [resetSent, setResetSent] = useState(null)
  const [resetBusy, setResetBusy] = useState(false)
  const [verifySent, setVerifySent] = useState(false)
  const [showPremium, setShowPremium] = useState(false)
  const [showClaim, setShowClaim] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState(null)


  useEffect(() => {
    let alive = true
    api.auth.profile()
      .then((p) => {
        if (!alive) return
        setProfile(p)
        setInitial(fromProfile(p))
        setForm(fromProfile(p))
      })
      .catch((e) => { if (alive) setLoadError(e.message) })
    return () => { alive = false }
  }, [])

  const dirtyKeys = useMemo(() => {
    if (!form || !initial) return []
    return Object.keys(form).filter((k) => (
      k === 'emergency_contacts'
        ? !same(filledContacts(form[k]), filledContacts(initial[k]))
        : !same(form[k], initial[k])
    ))
  }, [form, initial])
  const dirty = dirtyKeys.length > 0

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const [active, refFor] = useActiveSection(SECTIONS.map((s) => s.id), Boolean(form))

  const usernameLocked = Boolean(profile?.username_next_change_at && new Date(profile.username_next_change_at) > new Date())
  const usernameChanged = Boolean(form && initial && form.username !== initial.username)
  const pendingUsername = form?.username ?? ''

  useEffect(() => {
    if (!usernameChanged) { setUnameStatus(null); return }
    const u = pendingUsername.trim()
    if (!USERNAME_RE.test(u)) { setUnameStatus('invalid'); return }
    setUnameStatus('checking')
    const t = setTimeout(async () => {
      try {
        const { available } = await api.auth.checkUsername(u)
        setUnameStatus(available ? 'available' : 'taken')
      } catch { setUnameStatus(null) }
    }, 450)
    return () => clearTimeout(t)
  }, [usernameChanged, pendingUsername])

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const setFromEvent = (k) => (e) => set(k)(e.target.value)
  const patchForm = (obj) => setForm((f) => ({ ...f, ...obj }))

  function requestSave() {
    setSaveError(null)
    if (unameStatus === 'taken') { setSaveError('Ese nombre de usuario ya está en uso'); return }
    if (unameStatus === 'invalid') { setSaveError('El usuario solo puede tener 3 a 20 letras, números o guiones bajos'); return }
    const warnings = []
    if (usernameChanged) warnings.push(`Vas a cambiar tu usuario a @${form.username.trim()}. Después no vas a poder cambiarlo por 90 días.`)
    if (!initial.gender && form.gender) warnings.push('El género no se puede cambiar después de guardarlo.')
    if (warnings.length) setConfirmSave(warnings)
    else save()
  }

  async function save() {
    setConfirmSave(null)
    setSaving(true)
    setSaveError(null)
    try {
      const body = Object.fromEntries(dirtyKeys.map((k) => [k, toPatch(k, form[k])]))
      const updated = await api.auth.updateMe(body)
      setProfile(updated)
      setInitial(fromProfile(updated))
      setForm(fromProfile(updated))
      login({ ...user, ...Object.fromEntries(SESSION_KEYS.map((k) => [k, updated[k] ?? null])) })
      setSavedAt(Date.now())
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function discard() {
    setForm(initial)
    setSaveError(null)
  }

  function onBack(e) {
    if (!dirty) return
    e.preventDefault()
    setConfirmLeave(true)
  }

  function pickAvatar() {
    if (avatarBusy) return
    setAvatarError(null)
    fileInputRef.current?.click()
  }

  function onAvatarFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!ALLOWED_MIME_TYPES.includes(file.type)) { setAvatarError('Formato no soportado. Usá JPG, PNG o WEBP'); return }
    if (file.size > MAX_AVATAR_BYTES) { setAvatarError('La imagen supera los 5 MB'); return }
    setCropFile(file)
  }

  async function onCropSave(blob) {
    setAvatarBusy(true)
    setAvatarError(null)
    try {
      const updated = await api.auth.uploadAvatar(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
      setProfile((p) => ({ ...p, avatar_url: updated.avatar_url }))
      login({ ...user, avatar_url: updated.avatar_url })
      setCropFile(null)
    } catch (err) {
      setAvatarError(err.message)
      throw err
    } finally {
      setAvatarBusy(false)
    }
  }

  async function onAvatarDelete() {
    setAvatarBusy(true)
    setAvatarError(null)
    try {
      await api.auth.deleteAvatar()
      setProfile((p) => ({ ...p, avatar_url: null }))
      login({ ...user, avatar_url: null })
    } catch (err) {
      setAvatarError(err.message)
    } finally {
      setAvatarBusy(false)
      setConfirmAvatarDelete(false)
    }
  }

  async function sendResetLink() {
    setResetBusy(true)
    try {
      await api.auth.forgotPassword(profile.email)
      setResetSent(profile.email)
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setResetBusy(false)
    }
  }

  async function resendVerification() {
    try { await api.auth.resendVerification(profile.email); setVerifySent(true) } catch (e) { setSaveError(e.message) }
  }

  async function deleteAccount() {
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await api.auth.deleteMe(deletePassword)
      await logout()
      navigate('/', { replace: true })
    } catch (e) {
      setDeleteError(e.message)
      setDeleteBusy(false)
    }
  }

  if (loadError) {
    return <div className="px-4 py-16 text-center text-secondary text-sm">No pudimos cargar tu perfil. {loadError}</div>
  }
  if (!form) return <Loader minHeight="100vh" />

  const isPremium = user?.subscription?.plan === 'premium'
  const genderLocked = Boolean(initial.gender)
  const profileHref = `/u/${initial.username}`
  const contacts = form.emergency_contacts
  const setContact = (i, k) => (e) => set('emergency_contacts')(contacts.map((c, j) => (j === i ? { ...c, [k]: e.target.value } : c)))

  return (
    <div className="bg-base text-content font-sans">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="lg:grid lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-10">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Link to={profileHref} onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] text-secondary hover:text-white no-underline">
              <ChevronLeft size={15} aria-hidden="true" />Volver al perfil
            </Link>
            <h1 className="m-0 mt-3 font-condensed font-bold text-[24px] lg:text-[22px] leading-[1.15] text-white">Editar perfil</h1>
            <nav aria-label="Secciones" className="mt-4 -mx-4 px-4 lg:mx-0 lg:px-0 flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
              {SECTIONS.map((s) => (
                <a key={s.id} href={`#${s.id}`} aria-current={active === s.id ? 'true' : undefined}
                  className={`shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-[13.5px] no-underline transition-colors ${
                    active === s.id ? 'bg-surface-alt text-white' : 'text-secondary hover:text-white'}`}>
                  {s.label}
                </a>
              ))}
            </nav>
          </aside>

          <div className="min-w-0 max-w-[760px] pt-6 lg:pt-1">
            <Section id="foto" title="Foto" sectionRef={refFor('foto')}>
              <div className="flex items-center gap-5 pt-3 pb-4">
                <div className="w-[120px] h-[144px] shrink-0 rounded-xl overflow-hidden border border-border-mid bg-surface-alt flex items-center justify-center">
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="Tu foto" width={120} height={144} className="w-full h-full object-cover" />
                    : <span className="font-condensed font-bold text-[34px] text-secondary">{(initial.first_name[0] ?? '') + (initial.last_name[0] ?? '')}</span>}
                </div>
                <div className="min-w-0">
                  <p className="m-0 text-[13px] text-secondary">JPG, PNG o WEBP de hasta 5 MB.</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onAvatarFile} />
                    <Btn variant="primary" icon={Camera} onClick={pickAvatar} loading={avatarBusy}>
                      {profile.avatar_url ? 'CAMBIAR FOTO' : 'SUBIR FOTO'}
                    </Btn>
                    {profile.avatar_url && <Btn onClick={() => setConfirmAvatarDelete(true)} disabled={avatarBusy}>Quitar</Btn>}
                  </div>
                  <FieldError>{avatarError}</FieldError>
                </div>
              </div>
            </Section>

            <Section id="datos" title="Datos personales" sectionRef={refFor('datos')}>
              <p className="m-0 mt-2 mb-1 flex gap-2 rounded-lg border border-border bg-surface px-3.5 py-3 text-[12.5px] leading-relaxed text-soft">
                <Info size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-secondary" />
                <span>Los datos marcados <VisTag kind="organizadores" className="mx-0.5 align-[1px]" /> les sirven a los organizadores de torneos cuando te inscribas. Nadie más los ve.</span>
              </p>
              <Row htmlFor="pe-first" label="Nombre y apellido" tag="publico">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <input id="pe-first" className={INPUT} value={form.first_name} maxLength={40} autoComplete="given-name"
                    placeholder="Nombre/s" onChange={setFromEvent('first_name')} />
                  <input aria-label="Apellido/s" className={INPUT} value={form.last_name} maxLength={40} autoComplete="family-name"
                    placeholder="Apellido/s" onChange={setFromEvent('last_name')} />
                </div>
                {!initial.last_name && <p className="m-0 mt-1.5 text-xs text-secondary">Completá tu apellido: ahora va aparte del nombre.</p>}
              </Row>
              <Row htmlFor="pe-user" label="Usuario" tag="publico"
                hint={usernameLocked ? `Podés volver a cambiarlo el ${fmtDay(profile.username_next_change_at)}.` : 'Podés cambiarlo una vez cada 90 días.'}>
                <PrefixInput id="pe-user" prefix="@" value={form.username} disabled={usernameLocked} maxLength={20}
                  autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  onChange={(e) => set('username')(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} />
                {unameStatus === 'checking' && <p className="m-0 mt-1.5 text-xs text-muted">Verificando…</p>}
                {unameStatus === 'available' && <p className="m-0 mt-1.5 text-xs text-green">Disponible</p>}
                <FieldError>{unameStatus === 'taken' ? 'Ese usuario ya está en uso' : unameStatus === 'invalid' ? 'Usá 3 a 20 letras, números o guiones bajos' : null}</FieldError>
              </Row>
              <Row htmlFor="pe-nat" label="Nacionalidad" tag="publico">
                <div className="flex items-center gap-2.5">
                  {form.nationality && <CountryFlag code={form.nationality} width={24} />}
                  <Select id="pe-nat" className="flex-1" value={form.nationality} onChange={setFromEvent('nationality')}>
                    <option value="">Elegí tu nacionalidad</option>
                    {COUNTRY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </Select>
                </div>
              </Row>
              <Row htmlFor="pe-birth" label="Fecha de nacimiento" tag="organizadores" hint="En tu perfil se ve solo la edad.">
                <input id="pe-birth" type="date" className={`${INPUT} [color-scheme:dark] [.light_&]:[color-scheme:light]`} value={form.birth_date}
                  max={new Date().toISOString().slice(0, 10)} onChange={setFromEvent('birth_date')} />
              </Row>
              <Row htmlFor="pe-gender" label="Género" tag="organizadores"
                hint={genderLocked ? null : 'Una vez guardado no se puede cambiar.'}>
                <div className="flex items-center gap-2">
                  <Select id="pe-gender" className="flex-1" value={form.gender} disabled={genderLocked} onChange={setFromEvent('gender')}>
                    <option value="">Elegí una opción</option>
                    {GENDER_OPTIONS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                  </Select>
                  {genderLocked && (
                    <span className="group relative">
                      <button type="button" aria-describedby="pe-gender-tip" className="w-11 h-11 rounded-lg border border-border-mid bg-transparent text-secondary flex items-center justify-center cursor-help focus:outline-none focus:border-brand">
                        <Lock size={15} aria-hidden="true" /><span className="sr-only">Por qué no se puede cambiar</span>
                      </button>
                      <span role="tooltip" id="pe-gender-tip"
                        className="pointer-events-none absolute right-0 bottom-full mb-2 w-56 rounded-lg border border-border-strong bg-surface-alt px-3 py-2 text-xs leading-snug text-content shadow-2xl opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        El género no se puede cambiar. Para corregirlo, escribí a soporte@padeleando.ar.
                      </span>
                    </span>
                  )}
                </div>
              </Row>
              <Row htmlFor="pe-doc" label="Documento" tag="organizadores">
                <div className="grid gap-2.5 grid-cols-[120px_minmax(0,1fr)]">
                  <Select id="pe-doc" value={form.doc_type} onChange={setFromEvent('doc_type')}>
                    <option value="">Tipo</option>
                    {DOC_OPTIONS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </Select>
                  <input aria-label="Número de documento" className={INPUT} value={form.doc_number} maxLength={20}
                    inputMode={form.doc_type === 'dni' ? 'numeric' : 'text'} placeholder="Número" onChange={setFromEvent('doc_number')} />
                </div>
              </Row>
              <Row label="Email" tag="vos" last>
                <div className={`${INPUT} flex items-center gap-2 bg-surface text-secondary`}>
                  <span className="truncate">{profile.email}</span>
                  {profile.email_verified_at
                    ? <span className="ml-auto flex items-center gap-1 text-xs text-green shrink-0"><BadgeCheck size={14} aria-hidden="true" />Verificado</span>
                    : <span className="ml-auto text-xs text-danger shrink-0">Sin verificar</span>}
                </div>
                {!profile.email_verified_at && (
                  verifySent
                    ? <p className="m-0 mt-1.5 text-xs text-green">Te mandamos el mail de verificación.</p>
                    : <button type="button" onClick={resendVerification} className="mt-1.5 bg-transparent border-0 p-0 text-xs text-content underline underline-offset-2 cursor-pointer">Reenviar verificación</button>
                )}
              </Row>
            </Section>

            <Section id="whatsapp" title="WhatsApp" sectionRef={refFor('whatsapp')}>
              <Row htmlFor="pe-wa" label="Número" hint="Con código de país y de área.">
                <input id="pe-wa" type="tel" className={INPUT} value={form.whatsapp} maxLength={24} autoComplete="tel"
                  placeholder="+54 9 11 5555-0192" onChange={setFromEvent('whatsapp')} />
              </Row>
              <Row label="Quién lo ve" last>
                <SegButtons label="Quién ve tu WhatsApp" options={VISIBILITY_OPTIONS}
                  value={form.whatsapp_public ? 'publico' : 'privado'} onChange={(v) => set('whatsapp_public')(v === 'publico')} />
                <p className="m-0 mt-2 text-xs leading-relaxed text-secondary">
                  {form.whatsapp_public
                    ? 'Público: lo ve en tu perfil cualquier usuario con sesión iniciada.'
                    : 'Privado: solo lo ven los organizadores de los torneos en los que jugás y los jugadores de tus amistosos.'}
                </p>
              </Row>
            </Section>

            <Section id="redes" title="Redes sociales" tag="publico" sectionRef={refFor('redes')}>
              <Row htmlFor="pe-ig" label="Instagram">
                <PrefixInput id="pe-ig" prefix="@" value={form.instagram} maxLength={60} placeholder="usuario" autoCapitalize="none"
                  onChange={(e) => set('instagram')(stripHandle(e.target.value))} />
              </Row>
              <Row htmlFor="pe-x" label="X">
                <PrefixInput id="pe-x" prefix="@" value={form.twitter} maxLength={60} placeholder="usuario" autoCapitalize="none"
                  onChange={(e) => set('twitter')(stripHandle(e.target.value))} />
              </Row>
              <Row htmlFor="pe-fb" label="Facebook">
                <PrefixInput id="pe-fb" prefix="@" value={form.facebook} maxLength={60} placeholder="usuario" autoCapitalize="none"
                  onChange={(e) => set('facebook')(stripHandle(e.target.value))} />
              </Row>
              <Row htmlFor="pe-web" label="Sitio web" last>
                <input id="pe-web" type="url" inputMode="url" className={INPUT} value={form.website} maxLength={200}
                  placeholder="tusitio.com" autoCapitalize="none" onChange={setFromEvent('website')} />
              </Row>
            </Section>

            <Section id="juego" title="Datos de juego" tag="publico" sectionRef={refFor('juego')}>
              <Row label="Categoría" hint="La ven los organizadores cuando te inscribís. El 1 es el nivel más alto.">
                <CategoryPicker value={form.category || null} onChange={(v) => set('category')(v ?? '')} emptyLabel="Elegí tu categoría" />
              </Row>
              <Row label="Nivel">
                <Link to="/nivel" className="inline-flex items-center h-11 px-4 rounded-sm border border-border-strong text-sm text-content no-underline hover:bg-border-mid hover:text-white transition-colors">
                  Hacer el test de nivel
                </Link>
              </Row>
              <Row label="Mano hábil">
                <SegButtons label="Mano hábil" options={HAND_OPTIONS} value={form.hand || null} allowEmpty onChange={(v) => set('hand')(v ?? '')} />
              </Row>
              <Row label="Lado preferido" last>
                <SegButtons label="Lado preferido" options={SIDE_OPTIONS} value={form.side || null} allowEmpty onChange={(v) => set('side')(v ?? '')} />
              </Row>
            </Section>

            <Section id="ubicacion" title="Ubicación" tag="organizadores" sectionRef={refFor('ubicacion')}>
              <AddressFields value={form} onChange={patchForm} />
            </Section>

            <Section id="emergencia" title="Contactos de emergencia" tag="organizadores" sectionRef={refFor('emergencia')}>
              <p className="m-0 mt-1 text-xs text-secondary">Hasta 2 contactos. Los usa el organizador si te pasa algo en un torneo.</p>
              {contacts.map((c, i) => (
                <Row key={i} label={`Contacto ${i + 1}`} last={i === contacts.length - 1 && contacts.length >= 2}>
                  <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)_44px] grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px]">
                    <input aria-label={`Nombre del contacto ${i + 1}`} className={`${INPUT} col-span-2 sm:col-span-1`} value={c.name} maxLength={60} placeholder="Nombre" onChange={setContact(i, 'name')} />
                    <input aria-label={`Vínculo del contacto ${i + 1}`} className={`${INPUT} row-start-2 col-start-1 sm:row-start-auto sm:col-start-auto`} value={c.relation} maxLength={30} placeholder="Vínculo" onChange={setContact(i, 'relation')} />
                    <input aria-label={`Teléfono del contacto ${i + 1}`} type="tel" className={`${INPUT} row-start-2 col-start-2 sm:row-start-auto sm:col-start-auto`} value={c.phone} maxLength={24} placeholder="Teléfono" onChange={setContact(i, 'phone')} />
                    <button type="button" aria-label={`Quitar contacto ${i + 1}`}
                      onClick={() => set('emergency_contacts')(contacts.filter((_, j) => j !== i))}
                      className="row-start-1 col-start-3 sm:row-start-auto sm:col-start-auto h-11 rounded-lg border border-border-mid bg-transparent text-muted hover:text-danger hover:border-danger/50 flex items-center justify-center cursor-pointer transition-colors">
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </Row>
              ))}
              {contacts.length < 2 && (
                <div className="py-4">
                  <button type="button" onClick={() => set('emergency_contacts')([...contacts, { ...EMPTY_CONTACT }])}
                    className="inline-flex items-center gap-2 h-11 px-4 rounded-lg border border-dashed border-border-strong bg-transparent text-sm text-content hover:text-white hover:border-soft cursor-pointer transition-colors">
                    <Plus size={15} aria-hidden="true" />Agregar contacto
                  </button>
                </div>
              )}
            </Section>

            <Section id="privacidad" title="Privacidad" sectionRef={refFor('privacidad')}>
              <Row label="Estadísticas avanzadas públicas" last
                hint={isPremium ? 'Apagado: solo vos las ves.' : 'Publicarlas es una función Premium.'}>
                {isPremium
                  ? <Switch label="Estadísticas avanzadas públicas" checked={form.advanced_stats_public} onChange={set('advanced_stats_public')} />
                  : <Btn size="sm" onClick={() => setShowPremium(true)}>Ver planes</Btn>}
                {!isPremium && (
                  <div className="mt-3">
                    <button type="button" aria-expanded={showClaim} onClick={() => setShowClaim((v) => !v)}
                      className="bg-transparent border-0 p-0 text-xs text-secondary hover:text-white underline underline-offset-2 cursor-pointer">
                      ¿Pagaste y no se activó tu Premium?
                    </button>
                    {showClaim && (
                      <div className="mt-3 flex flex-col gap-3 text-[13px] leading-relaxed text-secondary">
                        <p className="m-0">Al terminar el pago en Mercado Pago tenés que tocar <span className="text-soft font-semibold">Volver al sitio del vendedor</span>: eso activa tu cuenta al instante.</p>
                        <p className="m-0">Si ya pagaste y no volviste, dejanos el email de tu cuenta de Mercado Pago y lo activamos.</p>
                        <ClaimPremiumRequest compact />
                      </div>
                    )}
                  </div>
                )}
              </Row>
            </Section>

            <Section id="seguridad" title="Seguridad" sectionRef={refFor('seguridad')}>
              <Row label="Contraseña" hint={profile.has_password
                ? 'Te mandamos un link a tu email para cambiarla.'
                : 'Entrás con Google. Creá una contraseña para entrar también con tu email.'}>
                {resetSent
                  ? <p className="m-0 sm:pt-2.5 text-sm text-green">Te mandamos el link a {resetSent}.</p>
                  : <Btn onClick={sendResetLink} loading={resetBusy}>{profile.has_password ? 'Enviar link para cambiarla' : 'Crear contraseña'}</Btn>}
              </Row>
              <Row label="Google">
                <p className="m-0 sm:pt-2.5 text-sm text-content">{profile.has_google ? 'Cuenta de Google conectada.' : 'Sin cuenta de Google conectada.'}</p>
              </Row>
              <Row label="Eliminar cuenta" hint="Es permanente y no se puede deshacer." last>
                <Btn variant="danger" icon={Trash2} onClick={() => { setDeletePassword(''); setDeleteError(null); setShowDelete(true) }}>Eliminar mi cuenta</Btn>
              </Row>
            </Section>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-30 mt-10 border-t border-border-strong bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="min-w-0 flex-1 text-[13px]" aria-live="polite">
            {saveError
              ? <span role="alert" className="text-danger">{saveError}</span>
              : dirty
                ? <span className="flex items-center gap-2 text-content"><span aria-hidden="true" className="w-2 h-2 rounded-full bg-brand shrink-0" />
                    {dirtyKeys.length === 1 ? '1 cambio sin guardar' : `${dirtyKeys.length} cambios sin guardar`}</span>
                : <span className="text-secondary">{savedAt ? 'Cambios guardados' : 'Sin cambios'}</span>}
          </div>
          {dirty && <Btn onClick={discard} disabled={saving}>Descartar</Btn>}
          <Btn variant="primary" onClick={requestSave} disabled={!dirty} loading={saving}>GUARDAR</Btn>
        </div>
      </div>

      {confirmSave && (
        <Modal title="Antes de guardar" confirmText="Guardar" onConfirm={save} onCancel={() => setConfirmSave(null)}>
          <ul className="m-0 pl-4 flex flex-col gap-2">
            {confirmSave.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </Modal>
      )}
      {confirmLeave && (
        <Modal title="Tenés cambios sin guardar" confirmText="Salir sin guardar" confirmDanger
          onConfirm={() => navigate(profileHref)} onCancel={() => setConfirmLeave(false)}>
          Si salís ahora, se pierden.
        </Modal>
      )}
      {confirmAvatarDelete && (
        <Modal title="Quitar foto" confirmText="Quitar" confirmDanger confirmDisabled={avatarBusy}
          onConfirm={onAvatarDelete} onCancel={() => setConfirmAvatarDelete(false)}>
          Tu perfil va a mostrar tus iniciales.
        </Modal>
      )}
      {showDelete && (
        <Modal title="Eliminar cuenta" confirmText={deleteBusy ? 'Eliminando…' : 'Eliminar cuenta'} confirmDanger
          confirmDisabled={deleteBusy || !deletePassword.trim()} onConfirm={deleteAccount}
          onCancel={() => { if (!deleteBusy) setShowDelete(false) }}>
          <p className="m-0 mb-3">
            Tus categorías y torneos se conservan bajo una cuenta anónima; tus partidos en categorías de otros quedan sin vincular.
          </p>
          <label htmlFor="pe-del" className="block text-[11px] tracking-widest text-muted mb-1.5">
            {profile.has_password ? 'CONTRASEÑA' : 'ESCRIBÍ BORRAR PARA CONFIRMAR'}
          </label>
          <input id="pe-del" type={profile.has_password ? 'password' : 'text'} className={INPUT} value={deletePassword}
            autoComplete={profile.has_password ? 'current-password' : 'off'} onChange={(e) => setDeletePassword(e.target.value)} />
          <FieldError>{deleteError}</FieldError>
        </Modal>
      )}
      <Suspense fallback={null}>
        {cropFile && <AvatarCropper file={cropFile} onCancel={() => { if (!avatarBusy) setCropFile(null) }} onSave={onCropSave} />}
        {showPremium && <PremiumModal onClose={() => setShowPremium(false)} />}
      </Suspense>
    </div>
  )
}
