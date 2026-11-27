import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Zap, Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { api } from '../../utils/api'
import { useAuth } from '../../context/useAuth'
import ClaimPremiumRequest from '../shared/ClaimPremiumRequest'
import { isPaidPlan } from '../../utils/plan'

const PREMIUM_FEATURES = [
  'Categorías ilimitadas',
  'Torneos ilimitados',
  'Estadísticas avanzadas',
  'Álbum de fotos',
  'Ícono premium en el perfil',
  'Soporte prioritario',
]

const MAX_POLLS = 15
const POLL_INTERVAL = 2000

export default function SubscriptionSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { refreshUser } = useAuth()
  const [status, setStatus] = useState('polling') // polling | active | failed
  const [retryKey, setRetryKey] = useState(0)
  const pollCount = useRef(0)

  // MP agrega el preapproval_id al back_url tras el pago. Es lo que nos permite
  // vincular la suscripción al usuario logueado, sin pedir el email de MP.
  const preapprovalId = searchParams.get('preapproval_id')

  useEffect(() => {
    let timer

    async function poll() {
      try {
        // Activar consultando MP con el preapproval_id del redirect.
        await api.subscriptions.sync(preapprovalId)
        const sub = await api.subscriptions.me()
        if (sub?.status === 'active' && isPaidPlan(sub?.plan)) {
          await refreshUser()
          setStatus('active')
          return
        }
      } catch { /* sigue intentando */ }

      pollCount.current += 1
      if (pollCount.current >= MAX_POLLS) {
        setStatus('failed')
        return
      }
      timer = setTimeout(poll, POLL_INTERVAL)
    }

    poll()
    return () => clearTimeout(timer)
  }, [refreshUser, preapprovalId, retryKey])

  function retry() {
    pollCount.current = 0
    setStatus('polling')
    setRetryKey((k) => k + 1)
  }

  if (status === 'polling') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center">
          <Loader2 size={28} className="text-brand animate-spin" />
        </div>
        <div>
          <p className="font-condensed font-bold text-xl text-white">Confirmando tu pago...</p>
          <p className="text-secondary text-sm mt-1">Esto puede tardar unos segundos</p>
        </div>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-danger/10 border border-danger/30 flex items-center justify-center">
          <AlertCircle size={28} className="text-danger" />
        </div>
        <div>
          <p className="font-condensed font-bold text-xl text-white">No se pudo confirmar aún</p>
          <p className="text-secondary text-sm mt-1 max-w-xs mx-auto">
            Mercado Pago puede tardar unos minutos en confirmar el pago. Si ya pagaste, tu cuenta se activará en breve.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            type="button"
            onClick={retry}
            className="w-full flex items-center justify-center gap-2 bg-brand text-black font-condensed font-bold tracking-wide py-3 rounded-xl hover:brightness-110 active:brightness-90 transition"
          >
            <RefreshCw size={16} />
            Reintentar
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full px-6 py-3 bg-surface-alt border border-border-strong text-white font-semibold rounded-xl hover:bg-surface transition text-sm"
          >
            Ir al inicio
          </button>
        </div>
        <div className="w-full max-w-xs">
          <ClaimPremiumRequest onActivated={() => setStatus('active')} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm flex flex-col items-center text-center gap-6">

        {/* Icono animado */}
        <div className="w-20 h-20 rounded-full bg-brand/15 border-2 border-brand flex items-center justify-center">
          <Zap size={36} className="text-brand fill-brand" />
        </div>

        {/* Título */}
        <div>
          <h1 className="font-condensed font-bold text-4xl text-white tracking-wide">
            ¡Bienvenido a Premium!
          </h1>
          <p className="text-secondary text-sm mt-2">
            Tu cuenta está activa. Ya tenés acceso a todas las funciones.
          </p>
        </div>

        {/* Features desbloqueadas */}
        <div className="w-full bg-surface-alt border border-border-strong rounded-2xl p-5 text-left">
          <p className="text-[10px] font-mono tracking-widest text-dim uppercase mb-3">
            Funciones desbloqueadas
          </p>
          <ul className="flex flex-col gap-2.5">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-soft">
                <div className="w-5 h-5 rounded-full bg-brand/15 border border-brand/40 flex items-center justify-center flex-shrink-0">
                  <Check size={11} className="text-brand" />
                </div>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-2 bg-brand text-black font-condensed font-bold text-base tracking-wide py-3.5 rounded-xl hover:brightness-110 active:brightness-90 transition"
        >
          <Zap size={16} />
          Empezar a jugar
        </button>

        <p className="text-[11px] text-dim">
          Podés cancelar en cualquier momento desde tu cuenta de Mercado Pago.
        </p>
      </div>
    </div>
  )
}
