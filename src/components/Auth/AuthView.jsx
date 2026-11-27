/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Eye, EyeOff, Check, Circle, Users, Trophy, Mail, Plus } from 'lucide-react'
import { api } from '../../utils/api'
import { useAuth } from '../../context/useAuth'
import { renderGoogleButton } from '../../utils/googleIdentity'
import { redirectContext } from '../../utils/redirectContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const PASSWORD_RULES = [
  { label: '8 caracteres',  test: (p) => p.length >= 8,    error: 'La contraseña necesita 8 caracteres o más' },
  { label: 'Una mayúscula', test: (p) => /[A-Z]/.test(p),  error: 'La contraseña necesita una mayúscula' },
  { label: 'Una minúscula', test: (p) => /[a-z]/.test(p),  error: 'La contraseña necesita una minúscula' },
  { label: 'Un número',     test: (p) => /[0-9]/.test(p),  error: 'La contraseña necesita un número' },
]

const LABEL = 'block text-[13px] font-semibold text-soft mb-1.5'
const INPUT = 'w-full h-12 bg-surface border border-border-strong text-white px-3.5 rounded-[10px] text-[16px] outline-none placeholder:text-muted focus:border-brand focus:ring-3 focus:ring-brand/20 transition-colors'
const PRIMARY = 'w-full h-[52px] rounded-[10px] bg-brand text-base font-condensed font-bold text-[15px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-95 transition-[filter,opacity] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
const LINK = 'text-brand text-[13px] font-semibold hover:underline cursor-pointer'
const CONTEXT_ICONS = { users: Users, trophy: Trophy, mail: Mail, plus: Plus }

function PasswordChecks({ password }) {
  return (
    <ul className="flex flex-wrap gap-x-3.5 gap-y-1 mt-2.5 p-0 list-none" aria-label="Requisitos de la contraseña">
      {PASSWORD_RULES.map(({ label, test }) => {
        const ok = test(password)
        return (
          <li key={label} className={`inline-flex items-center gap-1 text-[13px] transition-colors ${ok ? 'text-green' : 'text-muted'}`}>
            {ok ? <Check size={13} strokeWidth={3} /> : <Circle size={9} strokeWidth={3} className="mx-0.5" />}
            {label}
          </li>
        )
      })}
    </ul>
  )
}

function PasswordInput({ id, value, onChange, autoComplete, placeholder = 'Tu contraseña' }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`${INPUT} pr-12`}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute right-0.5 top-0.5 w-11 h-11 flex items-center justify-center rounded-lg text-secondary hover:text-content cursor-pointer transition-colors"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

function Cover() {
  return (
    <div className="relative overflow-hidden bg-photo-shade h-[200px] sm:h-[280px] lg:h-[calc(100dvh-61px)] lg:min-h-[560px] lg:self-start">
      <picture>
        <source
          media="(min-width: 1280px)"
          srcSet="/login/cancha-960.webp 960w, /login/cancha-1440.webp 1440w, /login/cancha-1920.webp 1920w"
          sizes="calc(100vw - 520px)"
          width="1920"
          height="1194"
        />
        <img
          src="/login/cancha-vertical-768.webp"
          srcSet="/login/cancha-vertical-480.webp 480w, /login/cancha-vertical-768.webp 768w, /login/cancha-vertical-1080.webp 1080w"
          sizes="(min-width: 1024px) 680px, 100vw"
          width="1080"
          height="1341"
          alt=""
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-[50%_62%] lg:object-center xl:object-[35%_50%]"
        />
      </picture>
      <div className="absolute inset-0 bg-linear-to-b from-photo-shade/45 via-photo-shade/0 via-35% to-photo-shade/90" />
      <div className="absolute left-6 right-6 bottom-4 sm:bottom-6 lg:left-12 lg:right-12 lg:bottom-12 xl:left-14 xl:bottom-14 max-w-[680px]">
        <p className="m-0 font-condensed font-bold text-photo-ink text-[20px] leading-[1.15] tracking-[-0.02em] sm:text-[28px] lg:text-[40px] lg:leading-[1.05] xl:text-[52px]">
          Torneos, amistosos y tus números, en un solo lugar.
        </p>
        <p className="hidden lg:block m-0 mt-5 max-w-[520px] text-[18px] leading-normal text-photo-ink/80">
          Inscribite a torneos, armá partidos con otros padeleros y seguí tus estadísticas.
        </p>
      </div>
    </div>
  )
}

function RedirectContext({ context, loaded, pending }) {
  const Icon = CONTEXT_ICONS[context.icon] ?? Users
  const title = loaded?.title ?? context.title
  const detail = loaded?.detail ?? context.detail

  return (
    <div className="flex items-center gap-3.5 h-[76px] px-4 mb-6 rounded-xl bg-surface-alt border border-border-strong">
      <div className="w-10 h-10 shrink-0 rounded-[10px] bg-brand text-base flex items-center justify-center">
        <Icon size={20} />
      </div>
      {pending ? (
        <div className="flex-1 min-w-0 flex flex-col gap-2" aria-hidden>
          <span className="h-3.5 w-3/4 rounded bg-border-strong animate-pulse" />
          <span className="h-3 w-1/2 rounded bg-border-mid animate-pulse" />
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <p className="m-0 text-[15px] font-bold text-white truncate">{title}</p>
          <p className="m-0 mt-0.5 text-[14px] text-soft truncate">{detail}</p>
        </div>
      )}
    </div>
  )
}

function SuccessIcon() {
  return (
    <div className="mb-5 w-14 h-14 rounded-full bg-green/10 border border-green/30 flex items-center justify-center text-green">
      <Check size={28} strokeWidth={2.5} />
    </div>
  )
}

function Heading({ title, subtitle }) {
  return (
    <>
      <h1 className="m-0 font-condensed font-bold text-[23px] sm:text-[28px] leading-tight tracking-[-0.02em] text-white">{title}</h1>
      {subtitle && <p className="m-0 mt-2 text-[15px] text-secondary">{subtitle}</p>}
    </>
  )
}

export default function AuthView({ mode: initialMode }) {
  const [mode,      setMode]      = useState(initialMode)
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [username,  setUsername]  = useState('')
  const [usernameStatus, setUsernameStatus] = useState(null) // null | 'checking' | 'available' | 'taken' | 'invalid'
  const [editingUsername, setEditingUsername] = useState(false)
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [error,     setError]     = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [verificationSent, setVerificationSent] = useState(null)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resendStatus, setResendStatus] = useState(null) // 'sending' | 'sent'
  const [attemptsLeft, setAttemptsLeft] = useState(null)
  const [lockedUntil, setLockedUntil] = useState(null)
  const [lockRemaining, setLockRemaining] = useState(0)
  const [googleFailed, setGoogleFailed] = useState(false)

  const { login } = useAuth()
  const navigate  = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionExpired = searchParams.get('expired') === '1'
  const redirectParam = searchParams.get('redirect')
  const afterAuth = redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : '/'
  const [context] = useState(() => redirectContext(afterAuth))
  const [contextData, setContextData] = useState(null)
  const [contextPending, setContextPending] = useState(Boolean(context?.load))
  const isRegister = mode === 'register'
  const view = verificationSent ? 'verify' : showForgot ? 'forgot' : 'form'
  const googleDivRef = useRef(null)
  const usernameInputRef = useRef(null)
  const usernameEdited = useRef(false)

  useEffect(() => {
    if (!context?.load) return
    let cancelled = false
    context.load()
      .then((d) => { if (!cancelled) setContextData(d) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setContextPending(false) })
    return () => { cancelled = true }
  }, [context])

  // Sugiere un usuario libre a partir del nombre mientras no lo haya editado a mano.
  useEffect(() => {
    if (!isRegister || usernameEdited.current) return
    const n = `${firstName.trim()} ${lastName.trim()}`.trim()
    if (n.length < 3) { setUsername(''); setUsernameStatus(null); return }
    const t = setTimeout(async () => {
      try {
        const { username: sug } = await api.auth.suggestUsername(n)
        if (!usernameEdited.current) { setUsername(sug); setUsernameStatus('available') }
      } catch { setEditingUsername(true) }
    }, 500)
    return () => clearTimeout(t)
  }, [firstName, lastName, isRegister])

  useEffect(() => {
    if (!isRegister || !usernameEdited.current) return
    const u = username.trim().toLowerCase()
    if (!u) { setUsernameStatus(null); return }
    if (u.length < 3 || u.length > 20 || !/^[a-z0-9_]+$/.test(u)) {
      setUsernameStatus('invalid'); return
    }
    setUsernameStatus('checking')
    const t = setTimeout(async () => {
      try {
        const { available } = await api.auth.checkUsername(u)
        setUsernameStatus(available ? 'available' : 'taken')
      } catch { setUsernameStatus(null) }
    }, 500)
    return () => clearTimeout(t)
  }, [username, isRegister])

  useEffect(() => {
    if (editingUsername) usernameInputRef.current?.focus()
  }, [editingUsername])

  // El contenedor de Google se desmonta en "olvidé mi contraseña", así que se redibuja al volver.
  useEffect(() => {
    if (view !== 'form') return
    let cancelled = false
    renderGoogleButton(googleDivRef.current, async (credential) => {
      if (cancelled) return
      try {
        const { user } = await api.auth.google(credential)
        login(user)
        navigate(afterAuth)
      } catch (e) {
        setError(e.message)
      }
    }).catch(() => { if (!cancelled) setGoogleFailed(true) })
    return () => { cancelled = true }
  }, [view])

  useEffect(() => {
    if (!lockedUntil) { setLockRemaining(0); return }
    function tick() {
      const s = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000))
      setLockRemaining(s)
      if (s === 0) { setLockedUntil(null); setError(null); setAttemptsLeft(null) }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lockedUntil])

  const isLocked = lockedUntil !== null && lockRemaining > 0
  const suggestReset = !isRegister && (isLocked || (attemptsLeft !== null && attemptsLeft <= 3))

  function openForgot() {
    setForgotEmail(prev => prev || email)
    setError(null)
    setForgotSent(false)
    setShowForgot(true)
  }

  function getFormError() {
    if (!EMAIL_RE.test(email.trim())) return 'Ingresá un email válido'
    if (!isRegister) return password ? null : 'Ingresá tu contraseña'
    if (!firstName.trim() || !lastName.trim()) return 'Completá tu nombre y tu apellido'
    const u = username.trim().toLowerCase()
    if (!u) { setEditingUsername(true); return 'Elegí un nombre de usuario' }
    if (u.length < 3 || u.length > 20 || !/^[a-z0-9_]+$/.test(u)) {
      setEditingUsername(true)
      return 'El nombre de usuario solo puede tener 3-20 letras, números o guiones bajos'
    }
    if (usernameStatus === 'taken') { setEditingUsername(true); return 'Ese nombre de usuario ya está en uso' }
    return PASSWORD_RULES.find(r => !r.test(password))?.error ?? null
  }

  async function handleSubmit(e) {
    e?.preventDefault()
    if (isLocked || loading) return
    setError(null)
    setNeedsVerification(false)
    const formErr = getFormError()
    if (formErr) { setError(formErr); return }
    setLoading(true)
    try {
      if (isRegister) {
        const res = await api.auth.register({ first_name: firstName.trim(), last_name: lastName.trim(), email: email.trim(), password, username: username.trim().toLowerCase() })
        if (res.pending_verification) {
          setVerificationSent(res.email ?? email.trim())
        } else if (res.user) {
          login(res.user)
          navigate(`/nivel?next=${encodeURIComponent(afterAuth)}`)
        }
      } else {
        const { user } = await api.auth.login({ email: email.trim(), password })
        setAttemptsLeft(null)
        login(user)
        navigate(afterAuth)
      }
    } catch (err) {
      if (err.data?.needs_verification) setNeedsVerification(true)
      if (err.data?.retry_after_seconds) {
        setLockedUntil(Date.now() + err.data.retry_after_seconds * 1000)
        setAttemptsLeft(0)
      } else if (typeof err.data?.attempts_left === 'number') {
        setAttemptsLeft(err.data.attempts_left)
      }
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResendVerification(target) {
    if (!target) return
    setResendStatus('sending')
    try {
      await api.auth.resendVerification(target)
      setResendStatus('sent')
    } catch {
      setResendStatus(null)
    }
  }

  async function handleForgot(e) {
    e.preventDefault()
    setError(null)
    const value = forgotEmail.trim()
    if (!value) { setError('Ingresá tu email'); return }
    if (!EMAIL_RE.test(value)) { setError('Ingresá un email válido'); return }
    setLoading(true)
    try {
      await api.auth.forgotPassword(value)
      setForgotSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function switchMode(m) {
    if (loading || m === mode) return
    setMode(m); setError(null); setPassword(''); setShowForgot(false)
    setVerificationSent(null); setNeedsVerification(false); setResendStatus(null)
    setUsername(''); setUsernameStatus(null); setEditingUsername(false); usernameEdited.current = false
    setAttemptsLeft(null); setLockedUntil(null)
  }

  function formatWait(seconds) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const contextAction = contextData && 'action' in contextData ? contextData.action : context?.action
  const actionLabel = contextAction ? ` ${contextAction}` : ''
  const submitLabel = loading
    ? (isRegister ? 'Creando cuenta…' : 'Ingresando…')
    : isLocked ? `Esperá ${formatWait(lockRemaining)}`
    : isRegister ? `Crear cuenta${actionLabel}` : `Ingresar${actionLabel}`

  let panel
  if (view === 'verify') {
    panel = (
      <div>
        <SuccessIcon />
        <Heading title="Revisá tu email" />
        <p className="m-0 mt-3 text-[15px] leading-relaxed text-secondary">
          Te enviamos un enlace de confirmación a <span className="text-white font-semibold break-all">{verificationSent}</span>.
          Vence en 24 horas. Si no lo encontrás, mirá en spam.
        </p>
        <button
          type="button"
          onClick={() => handleResendVerification(verificationSent)}
          disabled={resendStatus === 'sending' || resendStatus === 'sent'}
          className={`${LINK} mt-6 disabled:opacity-50`}
        >
          {resendStatus === 'sent' ? 'Enlace reenviado' : resendStatus === 'sending' ? 'Reenviando…' : 'Reenviar enlace'}
        </button>
        <button type="button" onClick={() => switchMode('login')} className="block mt-4 text-[14px] text-secondary hover:text-content cursor-pointer">
          Volver a ingresar
        </button>
      </div>
    )
  } else if (view === 'forgot') {
    panel = forgotSent ? (
      <div>
        <SuccessIcon />
        <Heading title="Te enviamos un enlace" />
        <p className="m-0 mt-3 text-[15px] text-secondary">Revisá tu casilla. El enlace vence en 1 hora.</p>
        <button type="button" onClick={() => setShowForgot(false)} className={`${LINK} mt-6`}>Volver a ingresar</button>
      </div>
    ) : (
      <form onSubmit={handleForgot} noValidate>
        <Heading title="Recuperá tu contraseña" subtitle="Te enviamos un enlace para crear una nueva." />
        <label htmlFor="forgot-email" className={`${LABEL} mt-7`}>Email</label>
        <input
          id="forgot-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="tu@email.com"
          value={forgotEmail}
          onChange={(e) => setForgotEmail(e.target.value)}
          className={INPUT}
        />
        {error && <p role="alert" className="m-0 mt-2.5 text-danger text-[13px]">{error}</p>}
        <button type="submit" disabled={loading} className={`${PRIMARY} mt-6`}>
          {loading ? 'Enviando…' : 'Enviar enlace'}
        </button>
        <button type="button" onClick={() => setShowForgot(false)} className="block w-full mt-4 text-[14px] text-secondary hover:text-content cursor-pointer">
          Volver
        </button>
      </form>
    )
  } else {
    panel = (
      <>
        {context && <RedirectContext context={context} loaded={contextData} pending={contextPending} />}

        <div role="tablist" aria-label="Ingresar o crear cuenta" className="relative grid grid-cols-2 p-1 rounded-xl bg-surface border border-border font-condensed text-[14px]">
          <span
            aria-hidden
            className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-[9px] bg-brand transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{ transform: isRegister ? 'translateX(100%)' : 'translateX(0)' }}
          />
          <button type="button" role="tab" aria-selected={!isRegister} onClick={() => switchMode('login')}
            className={`relative z-10 h-[42px] rounded-[9px] font-bold cursor-pointer transition-colors ${isRegister ? 'text-secondary hover:text-content' : 'text-base'}`}>
            Ingresar
          </button>
          <button type="button" role="tab" aria-selected={isRegister} onClick={() => switchMode('register')}
            className={`relative z-10 h-[42px] rounded-[9px] font-bold cursor-pointer transition-colors ${isRegister ? 'text-base' : 'text-secondary hover:text-content'}`}>
            Crear cuenta
          </button>
        </div>

        <div className="mt-7 mb-6">
          <Heading
            title={isRegister ? 'Creá tu cuenta' : 'Ingresá a tu cuenta'}
            subtitle={isRegister ? 'Crear tu cuenta es gratis.' : 'Con Google es un toque.'}
          />
        </div>

        {sessionExpired && (
          <p className="m-0 mb-5 px-3.5 py-2.5 rounded-lg border border-brand/30 bg-brand/10 text-brand text-[13px]">
            Tu sesión expiró. Ingresá de nuevo.
          </p>
        )}

        {!googleFailed && (
          <>
            <div ref={googleDivRef} className="w-full flex justify-center min-h-[44px]" />
            <div className="flex items-center gap-3.5 my-6 text-muted text-[13px]">
              <span className="h-px flex-1 bg-border-mid" />
              o con tu email
              <span className="h-px flex-1 bg-border-mid" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {isRegister && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="min-w-0">
                <label htmlFor="auth-first" className={LABEL}>Nombre</label>
                <input id="auth-first" placeholder="Tu nombre" value={firstName} onChange={e => setFirstName(e.target.value)} maxLength={40}
                  autoComplete="given-name" autoCapitalize="words" className={INPUT} />
              </div>
              <div className="min-w-0">
                <label htmlFor="auth-last" className={LABEL}>Apellido</label>
                <input id="auth-last" placeholder="Tu apellido" value={lastName} onChange={e => setLastName(e.target.value)} maxLength={40}
                  autoComplete="family-name" autoCapitalize="words" className={INPUT} />
              </div>
            </div>
          )}

          <label htmlFor="auth-email" className={LABEL}>Email</label>
          <input id="auth-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
            placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} className={INPUT} />

          <div className="flex justify-between items-baseline mt-4 mb-1.5">
            <label htmlFor="auth-pass" className="text-[13px] font-semibold text-soft">Contraseña</label>
            {!isRegister && (
              <button type="button" onClick={openForgot} className={LINK}>¿La olvidaste?</button>
            )}
          </div>
          <PasswordInput
            id="auth-pass"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            placeholder={isRegister ? 'Creá una contraseña' : 'Tu contraseña'}
          />
          {isRegister && <PasswordChecks password={password} />}

          {isRegister && (editingUsername ? (
            <div className="mt-4">
              <label htmlFor="auth-username" className={LABEL}>Nombre de usuario</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-[16px] pointer-events-none">@</span>
                <input
                  id="auth-username"
                  ref={usernameInputRef}
                  placeholder="tu_usuario"
                  value={username}
                  onChange={e => { usernameEdited.current = true; setUsername(e.target.value.toLowerCase()) }}
                  minLength={3}
                  maxLength={20}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className={`${INPUT} pl-8`}
                />
              </div>
              <p aria-live="polite" className="m-0 mt-1.5 text-[13px] min-h-[18px]">
                {usernameStatus === 'checking' && <span className="text-muted">Verificando…</span>}
                {usernameStatus === 'available' && username.trim() && <span className="text-green inline-flex items-center gap-1"><Check size={13} strokeWidth={3} /> Disponible</span>}
                {usernameStatus === 'taken' && <span className="text-danger">Ese nombre de usuario ya está en uso</span>}
                {usernameStatus === 'invalid' && <span className="text-danger">Usá de 3 a 20 letras, números o guiones bajos</span>}
              </p>
            </div>
          ) : (
            <div className="mt-4 min-h-12 px-3.5 py-2 rounded-[10px] bg-surface border border-border flex items-center justify-between gap-3">
              <span className="text-[14px] text-secondary min-w-0 truncate">
                {username
                  ? <>Tu usuario: <span className="text-white font-semibold">@{username}</span></>
                  : 'Tu usuario se arma con tu nombre.'}
              </span>
              <button type="button" onClick={() => setEditingUsername(true)} className={`${LINK} shrink-0 py-2`}>
                {username ? 'Cambiar' : 'Elegir'}
              </button>
            </div>
          ))}

          {isLocked ? (
            <p role="alert" className="m-0 mt-4 px-3.5 py-2.5 rounded-lg border border-danger/30 bg-danger/10 text-danger text-[13px]">
              Demasiados intentos fallidos. Vas a poder probar de nuevo en{' '}
              <span className="font-semibold tabular-nums">{formatWait(lockRemaining)}</span>.
            </p>
          ) : error && (
            <p role="alert" className="m-0 mt-4 text-danger text-[13px]">{error}</p>
          )}

          {suggestReset && (
            <button type="button" onClick={openForgot} className={`${LINK} block mt-2`}>
              ¿No te acordás la contraseña? Restablecela
            </button>
          )}

          {needsVerification && !isRegister && (
            <button
              type="button"
              onClick={() => handleResendVerification(email.trim())}
              disabled={resendStatus === 'sending' || resendStatus === 'sent'}
              className={`${LINK} block mt-2 disabled:opacity-50`}
            >
              {resendStatus === 'sent' ? 'Enlace reenviado' : resendStatus === 'sending' ? 'Reenviando…' : 'Reenviar el enlace de confirmación'}
            </button>
          )}

          <button type="submit" disabled={loading || isLocked} className={`${PRIMARY} mt-6`}>
            {submitLabel}
          </button>

          {isRegister && (
            <p className="m-0 mt-4 text-[13px] leading-relaxed text-muted">
              Al crear tu cuenta aceptás los <Link to="/terminos" className="text-brand hover:underline">Términos</Link> y
              la <Link to="/privacidad" className="text-brand hover:underline">Política de privacidad</Link>.
            </p>
          )}
        </form>
      </>
    )
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_480px] xl:grid-cols-[minmax(0,1fr)_520px] lg:min-h-[calc(100dvh-61px)]">
      <Cover />
      <div className="flex justify-center px-6 pt-6 pb-10 sm:pt-10 lg:px-10 lg:pt-[max(3.5rem,calc((100dvh-61px-600px)/2))] lg:pb-14 lg:border-l lg:border-border">
        <div className="w-full max-w-[384px]">{panel}</div>
      </div>
    </div>
  )
}
