import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Check, Circle } from 'lucide-react'
import { api } from '../../utils/api'
import logoUrl from '../../assets/padeleando.svg'

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

export default function ResetPassword() {
  const { token }           = useParams()
  const navigate            = useNavigate()
  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState(null)

  async function handleSubmit() {
    setError(null)
    const pwErr = validatePassword(password)
    if (pwErr) { setError(pwErr); return }
    if (password !== password2) { setError('Las contraseñas no coinciden'); return }
    setLoading(true)
    try {
      await api.auth.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err.message ?? 'No pudimos restablecer tu contraseña. El enlace puede haber expirado.')
    } finally {
      setLoading(false)
    }
  }

  const label = 'block text-[11px] uppercase tracking-wide font-semibold text-secondary mb-1.5 mt-4'

  return (
    <div className="bg-base flex items-start justify-center pt-12 px-4">
      <div className="w-full max-w-md">
        <div className={CARD}>
          <div
            role="img"
            aria-label="Padeleando"
            onClick={() => navigate('/')}
            className="w-14 h-14 mx-auto mb-6 bg-brand cursor-pointer"
            style={logoMask}
          />

          {done ? (
            <div className="text-center">
              <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green/10 border border-green/30 flex items-center justify-center text-green">
                <Check size={30} strokeWidth={2.5} />
              </div>
              <p className="text-content font-semibold mb-2">Contraseña actualizada</p>
              <p className="text-secondary text-sm mb-6">Ya podés ingresar con tu nueva contraseña.</p>
              <button onClick={() => navigate('/login')}
                className="w-full bg-brand text-base font-condensed font-black tracking-widest py-3 rounded-lg text-sm hover:brightness-95 transition-[filter] cursor-pointer">
                IR AL LOGIN
              </button>
            </div>
          ) : (
            <>
              <p className="text-content font-semibold text-center mb-1">Restablecé tu contraseña</p>
              <p className="text-secondary text-sm text-center mb-4">Ingresá tu nueva contraseña</p>

              <label className={label}>Nueva contraseña</label>
              <PasswordInput value={password} onChange={e => setPassword(e.target.value)} />
              <PasswordStrength password={password} />

              <label className={label}>Repetir contraseña</label>
              <PasswordInput value={password2} onChange={e => setPassword2(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()}/>
              {password2 && password !== password2 && (
                <p className="text-danger text-xs mt-1">Las contraseñas no coinciden</p>
              )}

              {error && <p className="text-danger text-xs mt-3">{error}</p>}

              <button onClick={handleSubmit} disabled={loading}
                className="w-full mt-5 bg-brand text-base font-condensed font-black tracking-widest py-3 rounded-lg text-sm disabled:opacity-50 hover:brightness-95 transition-[filter,opacity] cursor-pointer">
                {loading ? 'GUARDANDO...' : 'RESTABLECER CONTRASEÑA'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
