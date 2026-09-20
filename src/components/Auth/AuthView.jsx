/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Check, Circle } from 'lucide-react'
import { api } from '../../utils/api'
import { useAuth } from '../../context/useAuth'
import logoUrl from '../../assets/padeleando.svg'

let googleInitialized = false

// El script de Google Identity pesa 98,6 KB y Lighthouse midió que el 83 % no
// se ejecuta. Estaba en index.html, así que lo descargaba toda visita aunque
// sólo se use en esta pantalla. Ahora se pide al montar el formulario.
const GSI_SRC = 'https://accounts.google.com/gsi/client'
let gsiPromise = null

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve()
  // Una sola descarga aunque se entre y salga de /login varias veces.
  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${GSI_SRC}"]`)
      const script = existing ?? document.createElement('script')
      script.addEventListener('load', () => resolve())
      script.addEventListener('error', () => { gsiPromise = null; reject(new Error('No se pudo cargar Google')) })
      if (!existing) {
        script.src = GSI_SRC
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }
    })
  }
  return gsiPromise
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validatePassword(p) {
  if (p.length < 8)       return 'Mínimo 8 caracteres'
  if (!/[A-Z]/.test(p))   return 'Al menos una mayúscula'
  if (!/[a-z]/.test(p))   return 'Al menos una minúscula'
  if (!/[0-9]/.test(p))   return 'Al menos un número'
  return null
}

function PasswordStrength({ password }) {
  if (!password) return null
  const checks = [
    { ok: password.length >= 8,    label: '8+ chars' },
    { ok: /[A-Z]/.test(password),  label: 'Mayúscula' },
    { ok: /[a-z]/.test(password),  label: 'Minúscula' },
    { ok: /[0-9]/.test(password),  label: 'Número' },
  ]
  return (
    <div className="flex gap-1.5 flex-wrap mt-2">
      {checks.map(({ ok, label }) => (
        <span key={label} className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border transition-colors
          ${ok
            ? 'text-green bg-green/10 border-green/30'
            : 'text-muted bg-surface-alt border-border-strong'
          }`}>
          {ok ? <Check size={11} strokeWidth={3} className="shrink-0" />
              : <Circle size={11} strokeWidth={2.5} className="shrink-0" />}
          {label}
        </span>
      ))}
    </div>
  )
}

function PasswordInput({ value, onChange, placeholder = '········', onKeyDown }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full bg-base border border-border-mid text-content px-3.5 py-2.5 rounded-lg text-sm outline-none pr-10 font-condensed focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors"
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-soft hover:cursor-pointer transition-colors"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

const CARD = 'bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-2xl'

const logoMask = {
  WebkitMaskImage: `url(${logoUrl})`,
  maskImage: `url(${logoUrl})`,
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
  WebkitMaskSize: 'contain',
  maskSize: 'contain',
}

function Brand({ title, subtitle }) {
  return (
    <div className="text-center mb-6">
      <div role="img" aria-label="Padeleando" className="w-14 h-14 mx-auto mb-3 bg-brand" style={logoMask} />
      <h1 className="font-condensed font-bold text-lg text-content leading-tight">{title}</h1>
      {subtitle && <p className="text-secondary text-sm mt-1">{subtitle}</p>}
    </div>
  )
}

export default function AuthView({ mode: initialMode }) {
  const [mode,      setMode]      = useState(initialMode)
  const [name,      setName]      = useState('')
  const [username,  setUsername]  = useState('')
  const [usernameStatus, setUsernameStatus] = useState(null) // null | 'checking' | 'available' | 'taken' | 'invalid'
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [error,     setError]     = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [verificationSent, setVerificationSent] = useState(null) // email pendiente tras registro
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resendStatus, setResendStatus] = useState(null) // 'sending' | 'sent'
  const [attemptsLeft, setAttemptsLeft] = useState(null) // intentos que quedan antes del bloqueo
  const [lockedUntil, setLockedUntil] = useState(null)   // timestamp en ms, null si no está bloqueada
  const [lockRemaining, setLockRemaining] = useState(0)  // segundos, refrescado cada segundo

  const { login } = useAuth()
  const navigate  = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionExpired = searchParams.get('expired') === '1'
  // Destino tras autenticarse: sólo rutas internas (evita open-redirect).
  const redirectParam = searchParams.get('redirect')
  const afterAuth = redirectParam && redirectParam.startsWith('/') ? redirectParam : '/'
  const isRegister = mode === 'register'
  const googleDivRef = useRef(null)
  const usernameEdited = useRef(false) // true cuando el usuario editó el username manualmente

  // Sugerir un username libre a partir del nombre (mientras no lo haya editado a mano)
  useEffect(() => {
    if (!isRegister || usernameEdited.current) return
    const n = name.trim()
    if (n.length < 3) { setUsername(''); setUsernameStatus(null); return }
    const t = setTimeout(async () => {
      try {
        const { username: sug } = await api.auth.suggestUsername(n)
        if (!usernameEdited.current) { setUsername(sug); setUsernameStatus('available') }
      } catch { /* ignorar — el usuario puede escribirlo a mano */ }
    }, 500)
    return () => clearTimeout(t)
  }, [name, isRegister])

  // Verificar disponibilidad cuando el usuario edita el username a mano
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
    function initGoogle() {
      if (!googleDivRef.current) return
      if (!googleInitialized) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: async ({ credential }) => {
            try {
              const { user } = await api.auth.google(credential)
              login(user)
              navigate(afterAuth)
            } catch (e) {
              setError(e.message)
            }
          },
        })
        googleInitialized = true
      }
      window.google.accounts.id.renderButton(googleDivRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        width: googleDivRef.current.offsetWidth,
        text: 'continue_with',
        locale: 'es',
      })
    }

    let cancelled = false
    loadGoogleIdentity()
      .then(() => { if (!cancelled) initGoogle() })
      .catch(() => {
        // Si el script de Google no carga, el formulario de email y contraseña
        // sigue funcionando: sólo no aparece el botón de Google.
      })
    return () => { cancelled = true }
  }, [])

  // Cuenta regresiva del bloqueo. La API manda los segundos exactos que faltan
  // (la ventana desliza, así que casi nunca son los 15 min completos); mostrarlos
  // corriendo evita que la persona se quede sin saber cuánto esperar.
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
  // Desde el segundo fallo conviene ofrecer el reset: la mayoría de los bloqueos
  // son gente que no se acuerda la contraseña, y esperar no se la va a recordar.
  const suggestReset = !isRegister && (isLocked || (attemptsLeft !== null && attemptsLeft <= 3))

  function openForgot() {
    setForgotEmail(prev => prev || email)
    setError(null)
    setShowForgot(true)
  }

  function getFormError() {
    if (!isRegister) return null
    const u = username.trim().toLowerCase()
    if (!u) return 'Elegí un nombre de usuario'
    if (u.length < 3 || u.length > 20 || !/^[a-z0-9_]+$/.test(u))
      return 'El nombre de usuario solo puede tener 3-20 letras, números o guiones bajos'
    if (usernameStatus === 'taken') return 'Ese nombre de usuario ya está en uso'
    const pwErr = validatePassword(password)
    if (pwErr) return pwErr
    if (password !== password2) return 'Las contraseñas no coinciden'
    return null
  }

  async function handleSubmit() {
    if (isLocked) return
    setError(null)
    setNeedsVerification(false)
    const formErr = getFormError()
    if (formErr) { setError(formErr); return }
    setLoading(true)
    try {
      if (isRegister) {
        const res = await api.auth.register({ name, email, password, username: username.trim().toLowerCase() })
        if (res.pending_verification) {
          setVerificationSent(res.email ?? email)
        } else if (res.user) {
          login(res.user)
          navigate(afterAuth)
        }
      } else {
        const { user } = await api.auth.login({ email, password })
        setAttemptsLeft(null)
        login(user)
        navigate(afterAuth)
      }
    } catch (e) {
      if (e.data?.needs_verification) setNeedsVerification(true)
      if (e.data?.retry_after_seconds) {
        setLockedUntil(Date.now() + e.data.retry_after_seconds * 1000)
        setAttemptsLeft(0)
      } else if (typeof e.data?.attempts_left === 'number') {
        setAttemptsLeft(e.data.attempts_left)
      }
      setError(e.message)
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

  async function handleForgot() {
    setError(null)
    const value = forgotEmail.trim()
    if (!value) { setError('Ingresá tu correo electrónico'); return }
    if (!EMAIL_RE.test(value)) { setError('Ingresá un correo electrónico válido'); return }
    setLoading(true)
    try {
      await api.auth.forgotPassword(value)
      setForgotSent(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function switchMode(m) {
    setMode(m); setError(null); setPassword(''); setPassword2(''); setShowForgot(false)
    setVerificationSent(null); setNeedsVerification(false); setResendStatus(null)
    setUsername(''); setUsernameStatus(null); usernameEdited.current = false
    // El bloqueo vive en el servidor: cambiar de pestaña no lo levanta, pero el
    // contador tampoco tiene sentido fuera del formulario de ingreso.
    setAttemptsLeft(null); setLockedUntil(null)
  }

  function formatWait(seconds) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const labelBase = 'block text-[11px] uppercase tracking-wide font-semibold text-secondary mb-1.5'
  const label = `${labelBase} mt-4` // variante para campos apilados (login / recuperar)
  const inputCls = 'w-full bg-base border border-border-mid text-content px-3.5 py-2.5 rounded-lg text-sm outline-none font-condensed focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors'

  // Vista de "confirmá tu email" (tras registrarse)
  if (verificationSent) {
    return (
      <div className="bg-base flex items-start justify-center pt-12 px-4">
        <div className="w-full max-w-md">
          <div className={`${CARD} text-center`}>
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green/10 border border-green/30 flex items-center justify-center text-green"><Check size={30} strokeWidth={2.5} /></div>
            <p className="text-content font-semibold mb-2">Revisá tu email</p>
            <p className="text-secondary text-sm">
              Te enviamos un enlace de confirmación a <span className="text-content">{verificationSent}</span>.
              El enlace expira en 24 horas. Si no lo encontrás, mirá tu casilla de Spam.
            </p>
            <button
              onClick={() => handleResendVerification(verificationSent)}
              disabled={resendStatus === 'sending' || resendStatus === 'sent'}
              className="mt-6 text-brand text-sm hover:underline disabled:opacity-50 cursor-pointer"
            >
              {resendStatus === 'sent' ? 'Enlace reenviado'
                : resendStatus === 'sending' ? 'Enviando...'
                : 'Reenviar enlace'}
            </button>
            <div>
              <button onClick={() => switchMode('login')}
                className="mt-3 text-muted text-sm hover:text-soft transition-colors cursor-pointer">
                Volver al login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Vista de "olvidé mi contraseña"
  if (showForgot) {
    return (
      <div className="bg-base flex items-start justify-center pt-12 px-4">
        <div className="w-full max-w-md">
          <div className={CARD}>
            {forgotSent ? (
              <div className="text-center">
                <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green/10 border border-green/30 flex items-center justify-center text-green"><Check size={30} strokeWidth={2.5} /></div>
                <p className="text-content font-semibold mb-2">Mail enviado</p>
                <p className="text-secondary text-sm">Revisá tu casilla. El enlace expira en 1 hora.</p>
                <button onClick={() => switchMode('login')}
                  className="mt-6 text-brand text-sm hover:underline cursor-pointer">
                  Volver al login
                </button>
              </div>
            ) : (
              <>
                <Brand title="Recuperá tu contraseña" subtitle="Te enviamos un enlace para restablecerla" />
                <label className={label}>Email</label>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className={inputCls}
                />
                {error && <p className="text-danger text-xs mt-2">{error}</p>}
                <button onClick={handleForgot} disabled={loading}
                  className="w-full mt-6 bg-brand text-base font-condensed cursor-pointer font-black tracking-widest py-3 rounded-lg text-sm disabled:opacity-50 hover:brightness-95 transition-[filter,opacity]">
                  {loading ? 'ENVIANDO...' : 'ENVIAR ENLACE'}
                </button>
                <button onClick={() => setShowForgot(false)}
                  className="w-full mt-3 text-muted text-sm hover:text-soft transition-colors cursor-pointer">
                  Volver
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-base flex items-start justify-center pt-12 px-4">
      <div className="w-full max-w-md">
        <div className={CARD}>
          <Brand
            title={isRegister ? 'Creá tu cuenta' : 'Bienvenido de nuevo'}
            subtitle={isRegister ? 'Empezá a organizar tus torneos de pádel' : 'Ingresá a tu cuenta'}
          />

          {/* Toggle login / register con barrita deslizante */}
          <div className="relative grid grid-cols-2 mb-6 p-1 rounded-xl bg-base border border-border text-sm font-condensed">
            <span
              aria-hidden
              className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-brand shadow-sm transition-transform duration-300 ease-out"
              style={{ transform: isRegister ? 'translateX(100%)' : 'translateX(0)' }}
            />
            <button
              type="button"
              onClick={() => !loading && switchMode('login')}
              className={`relative z-10 py-2 rounded-lg font-bold transition-colors cursor-pointer ${isRegister ? 'text-secondary hover:text-content' : 'text-base'}`}
            >
              Ingresar
            </button>
            <button
              type="button"
              onClick={() => !loading && switchMode('register')}
              className={`relative z-10 py-2 rounded-lg font-bold transition-colors cursor-pointer ${isRegister ? 'text-base' : 'text-secondary hover:text-content'}`}
            >
              Registrarse
            </button>
          </div>

          {sessionExpired && (
            <div className="mb-5 px-3.5 py-2.5 rounded-lg border border-brand/30 bg-brand/10 text-brand text-xs">
              Tu sesión expiró. Por favor ingresá nuevamente.
            </div>
          )}

          <div className={`grid gap-x-3 gap-y-4 ${isRegister ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
            {isRegister && (
              <>
                <div>
                  <label className={labelBase}>Nombre</label>
                  <input placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} minLength={3} maxLength={50}
                    className={inputCls} />
                </div>

                <div>
                  <label className={labelBase}>Nombre de usuario</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm font-condensed pointer-events-none">@</span>
                    <input
                      placeholder="tu_usuario"
                      value={username}
                      onChange={e => { usernameEdited.current = true; setUsername(e.target.value.toLowerCase()) }}
                      minLength={3}
                      maxLength={20}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className={`${inputCls} pl-7`} />
                  </div>
                  {usernameStatus === 'checking' && (
                    <p className="text-muted text-xs mt-1">Verificando disponibilidad...</p>
                  )}
                  {usernameStatus === 'available' && username.trim() && (
                    <p className="text-green text-xs mt-1 flex items-center gap-1"><Check size={12} strokeWidth={3} /> Disponible</p>
                  )}
                  {usernameStatus === 'taken' && (
                    <p className="text-danger text-xs mt-1">Ese nombre de usuario ya está en uso</p>
                  )}
                  {usernameStatus === 'invalid' && (
                    <p className="text-danger text-xs mt-1">Usá 3-20 letras, números o guiones bajos</p>
                  )}
                </div>
              </>
            )}

            <div className={isRegister ? 'sm:col-span-2' : ''}>
              <label className={labelBase}>Email</label>
              <input type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)}
                className={inputCls} />
            </div>

            <div>
              <label className={labelBase}>Contraseña</label>
              <PasswordInput value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()}/>
              {isRegister && <PasswordStrength password={password} />}
            </div>

            {isRegister && (
              <div>
                <label className={labelBase}>Repetir contraseña</label>
                <PasswordInput
                  value={password2}
                  onChange={e => setPassword2(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
                {password2 && password !== password2 && (
                  <p className="text-danger text-xs mt-1">Las contraseñas no coinciden</p>
                )}
              </div>
            )}
          </div>

          {!isRegister && (
            <div className="text-right mt-2">
              <button onClick={openForgot}
                className="text-secondary text-xs hover:text-soft transition-colors cursor-pointer">
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          {isLocked ? (
            <div className="mt-3 px-3.5 py-2.5 rounded-lg border border-danger/30 bg-danger/10 text-danger text-xs">
              Demasiados intentos fallidos. Vas a poder probar de nuevo en{' '}
              <span className="font-mono font-semibold tabular-nums">{formatWait(lockRemaining)}</span>.
            </div>
          ) : error && (
            <p className="text-danger text-xs mt-3">{error}</p>
          )}

          {suggestReset && (
            <button onClick={openForgot}
              className="mt-2 text-brand text-xs hover:underline cursor-pointer">
              ¿No te acordás la contraseña? Restablecela ahora →
            </button>
          )}

          {needsVerification && !isRegister && (
            <button
              onClick={() => handleResendVerification(email)}
              disabled={resendStatus === 'sending' || resendStatus === 'sent'}
              className="mt-2 text-brand text-xs hover:underline disabled:opacity-50 cursor-pointer"
            >
              {resendStatus === 'sent' ? 'Enlace reenviado'
                : resendStatus === 'sending' ? 'Enviando...'
                : 'Reenviar enlace de confirmación'}
            </button>
          )}

          <button onClick={handleSubmit} disabled={loading || isLocked}
            className="w-full mt-5 bg-brand text-base font-condensed font-black tracking-widest py-3 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-95 transition-[filter,opacity] cursor-pointer">
            {loading ? 'CARGANDO...'
              : isLocked ? `ESPERÁ ${formatWait(lockRemaining)}`
              : isRegister ? 'REGISTRARSE' : 'INGRESAR'}
          </button>

          <div className="flex items-center gap-3 my-5 text-muted text-xs">
            <span className="h-px flex-1 bg-border" />
            o
            <span className="h-px flex-1 bg-border" />
          </div>

          <div ref={googleDivRef} className="w-full flex justify-center min-h-[44px]" />
        </div>
      </div>
    </div>
  )
}