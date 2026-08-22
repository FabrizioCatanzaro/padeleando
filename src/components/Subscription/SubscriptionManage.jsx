import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, CreditCard, AlertTriangle, Loader2, Check, X, ArrowLeft,
  Layers, Trophy, ChevronDown, ShieldCheck,
} from 'lucide-react'
import { api } from '../../utils/api'
import { useAuth } from '../../context/useAuth'
import PremiumModal from '../shared/PremiumModal'
import ClaimPremiumRequest from '../shared/ClaimPremiumRequest'
import SectionRule from '../shared/SectionRule'
import StatSlab from '../shared/StatSlab'
import {
  FREE_MAX_GROUPS, FREE_TOURNAMENTS_PER_MONTH, PRICE_BY_BILLING,
  PRO_FEATURES, PLAN_COMPARISON,
} from '../../utils/plan'

const BILLING_LABEL = {
  monthly: 'Mensual',
  annual:  'Anual',
  trial:   'Prueba',
}

const STATUS_LABEL = {
  active:    { text: 'Activa',    className: 'text-green bg-green/10 border-green/30' },
  cancelled: { text: 'Cancelada', className: 'text-danger bg-danger/10 border-danger/30' },
  paused:    { text: 'Pausada',   className: 'text-premium bg-premium/10 border-premium/30' },
}

const DAY_MS = 24 * 60 * 60 * 1000

function fmtLong(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDayMonth(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
}

// Las celdas del riel son angostas y Unbounded es ancha: "12 mar 2026" se corta
// en todos los anchos. Numérica entra entera, y es la misma forma que usa la
// banda del plan en el perfil.
function fmtNum(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function daysUntil(iso) {
  if (!iso) return null
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS))
}

// Antigüedad en palabras: por debajo del mes los meses dan siempre "0 meses".
function seniority(iso) {
  if (!iso) return null
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS)
  if (days < 31) return `${Math.max(1, days)} día${days === 1 ? '' : 's'}`
  const months = Math.floor(days / 30.44)
  if (months < 12) return `${months} mes${months === 1 ? '' : 'es'}`
  const years = Math.floor(months / 12)
  return `${years} año${years === 1 ? '' : 's'}`
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

const thisMonth = () => capitalize(new Date().toLocaleDateString('es-AR', { month: 'long' }))

function firstOfNextMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 1)
    .toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
}

// Riel de datos del plan. Mismo patrón que el del perfil: en teléfono entra de a
// dos, en escritorio en una fila.
function Rail({ cells }) {
  const four = cells.length === 4
  return (
    <div className={`grid ${four ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-3'} border border-border-mid rounded-xl overflow-hidden bg-surface/75`}>
      {cells.map(({ value, label, tone }) => (
        <div
          key={label}
          className={`min-w-0 px-3 py-2.5 border-border ${
            four
              ? 'border-r border-t [&:nth-child(-n+2)]:border-t-0 [&:nth-child(2n)]:border-r-0 lg:border-t-0 lg:[&:nth-child(2n)]:border-r lg:[&:last-child]:border-r-0'
              : 'border-r last:border-r-0'
          }`}
        >
          <div className={`font-condensed font-bold text-[15px] leading-none tabular-nums truncate ${
            tone === 'gold' ? 'text-premium-hi' : tone === 'danger' ? 'text-danger' : 'text-white'
          }`}>
            {value}
          </div>
          <div className="font-mono text-[8.5px] tracking-[0.1em] text-muted mt-1.5 uppercase truncate">{label}</div>
        </div>
      ))}
    </div>
  )
}

function Faq({ q, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-border-strong rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left bg-transparent hover:bg-surface-alt transition cursor-pointer"
      >
        <span className="text-sm text-soft">{q}</span>
        <ChevronDown size={16} className={`text-muted shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3 text-xs text-secondary leading-relaxed border-t border-border-strong/40">
          {children}
        </div>
      )}
    </div>
  )
}

function ComparisonTable() {
  return (
    <div className="border border-border-strong rounded-xl overflow-hidden">
      <div className="grid grid-cols-[1.3fr_1fr_1fr] bg-surface-alt px-4 py-2.5 border-b border-border-strong">
        <span className="text-xs text-secondary font-semibold">Característica</span>
        <span className="text-xs text-secondary font-semibold text-center">Básico</span>
        <span className="text-xs text-brand font-semibold text-center">Premium</span>
      </div>
      {PLAN_COMPARISON.map((row, i) => (
        <div
          key={row.feature}
          className={`grid grid-cols-[1.3fr_1fr_1fr] px-4 py-3 items-center ${
            i < PLAN_COMPARISON.length - 1 ? 'border-b border-border-strong/40' : ''
          }`}
        >
          <span className="text-xs text-secondary">{row.feature}</span>
          <div className="flex justify-center">
            {row.free === false
              ? <X size={14} className="text-muted" />
              : <span className="text-xs text-soft text-center">{row.free}</span>}
          </div>
          <div className="flex justify-center">
            {row.pro === true
              ? <Check size={14} className="text-brand" />
              : <span className="text-xs text-brand font-semibold text-center">{row.pro}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

// Qué cambia el día que vence una suscripción cancelada. Lo que ya existe no se
// toca nunca: eso es lo que promete el FAQ y lo que hace el backend.
const DOWNGRADE_ROWS = [
  { label: 'Tus categorías',          value: 'Siguen funcionando',  good: true },
  { label: 'Partidos y estadísticas', value: 'Se mantienen enteros', good: true },
  { label: 'Crear categorías nuevas', value: `Hasta ${FREE_MAX_GROUPS}` },
  { label: 'Torneos nuevos',          value: `${FREE_TOURNAMENTS_PER_MONTH} por mes en cada una` },
  { label: 'Subir fotos al álbum',    value: 'Se cierra' },
  { label: 'Estadísticas avanzadas',  value: 'Se ocultan' },
]

export default function SubscriptionManage() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()

  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancelStep, setCancelStep] = useState('idle') // idle | confirm | cancelling | done
  const [cancelError, setCancelError] = useState(null)
  const [cancelledEndsAt, setCancelledEndsAt] = useState(null)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [showClaim, setShowClaim] = useState(false)

  useEffect(() => {
    api.subscriptions.me()
      .then(setSub)
      .catch(() => setError('No se pudo cargar la información de tu suscripción.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleCancel() {
    setCancelledEndsAt(sub?.plan_ends_at)
    setCancelStep('cancelling')
    setCancelError(null)
    try {
      await api.subscriptions.cancel()
      await refreshUser()
      const updated = await api.subscriptions.me()
      setSub(updated)
      setCancelStep('done')
    } catch (e) {
      setCancelError(e.message || 'No se pudo cancelar. Intentá de nuevo.')
      setCancelStep('confirm')
    }
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 size={24} className="text-brand animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 gap-4 text-center">
        <p className="text-danger text-sm">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm text-secondary hover:text-white transition cursor-pointer"
        >
          Volver al inicio
        </button>
      </div>
    )
  }

  const isPremium   = sub?.plan === 'premium' && sub?.status === 'active'
  const isCancelled = isPremium && sub?.cancel_at_period_end
  // El plan Básico también viaja como status 'active': la chapa de estado es
  // sólo para una suscripción de verdad.
  const statusInfo  = !isPremium ? null
    : isCancelled ? STATUS_LABEL.cancelled
      : STATUS_LABEL[sub?.status] ?? null

  const usage      = sub?.usage ?? {}
  const groups     = usage.groups ?? 0
  const monthTotal = usage.tournaments_month ?? 0
  const monthPeak  = usage.tournaments_peak ?? 0
  const groupsLeft = Math.max(0, FREE_MAX_GROUPS - groups)

  const price     = PRICE_BY_BILLING[sub?.billing_period] ?? null
  const priceText = price ? price.toLocaleString('es-AR') : null
  const left      = daysUntil(sub?.plan_ends_at)
  const senior    = seniority(sub?.starts_at)

  const railCells = isPremium
    ? [
        { value: fmtNum(sub?.starts_at), label: 'Socio desde' },
        { value: senior ?? '—',            label: 'Antigüedad' },
        { value: BILLING_LABEL[sub?.billing_period] ?? '—', label: 'Facturación' },
        {
          value: fmtNum(sub?.plan_ends_at),
          label: isCancelled ? 'Acceso hasta' : 'Próximo cobro',
          tone:  isCancelled ? 'danger' : 'gold',
        },
      ]
    : [
        { value: 'Gratis', label: 'Costo' },
        { value: `${FREE_MAX_GROUPS} máx.`, label: 'Categorías' },
        { value: `${FREE_TOURNAMENTS_PER_MONTH}/mes`, label: 'Torneos' },
      ]

  return (
    <div className="max-w-sm lg:max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg border border-border-mid bg-surface hover:bg-surface-alt transition text-muted hover:text-white cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-condensed font-bold text-2xl text-white tracking-wide">Mi suscripción</h1>
          <p className="text-secondary text-xs">Gestioná tu plan de Padeleando</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">

        {/* ── Columna principal ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 min-w-0">

          {/* Carnet del plan */}
          <div className={`relative overflow-hidden bg-surface-alt border rounded-2xl ${
            isCancelled ? 'border-danger/30' : isPremium ? 'border-premium/35' : 'border-border-strong'
          }`}>
            <div
              className="h-[3px]"
              style={{
                background: isPremium
                  ? 'linear-gradient(90deg, var(--color-premium), var(--color-premium-hi))'
                  : 'var(--color-border-strong)',
                opacity: isCancelled ? 0.4 : 1,
              }}
            />
            {isPremium && (
              <Zap
                size={132}
                strokeWidth={1.4}
                className={`absolute -top-3.5 -right-5 pointer-events-none text-premium ${isCancelled ? 'opacity-[0.05]' : 'opacity-[0.09]'}`}
              />
            )}

            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {isPremium
                    ? <Zap size={18} className={`text-premium fill-premium ${isCancelled ? 'opacity-50' : ''}`} />
                    : <div className="w-[18px] h-[18px] rounded-full border border-border-strong" />}
                  <span className="font-condensed font-bold text-lg text-white">
                    {isPremium ? 'Cuenta Premium' : 'Plan Básico'}
                  </span>
                </div>
                {statusInfo && (
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide whitespace-nowrap ${statusInfo.className}`}>
                    {statusInfo.text}
                  </span>
                )}
                {!isPremium && (
                  <span className="bg-border-strong text-soft text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                    Actual
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1.5">
                {isPremium && priceText ? (
                  <>
                    <span className="text-secondary text-xs">AR$</span>
                    <span className="font-condensed font-black text-[30px] text-white leading-none">{priceText}</span>
                    <span className="text-secondary text-sm">
                      /mes · facturación {(BILLING_LABEL[sub?.billing_period] ?? '').toLowerCase()}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-condensed font-black text-[30px] text-white leading-none">
                      {isPremium ? 'Prueba' : 'Gratis'}
                    </span>
                    <span className="text-secondary text-sm">{isPremium ? 'gratuita' : 'para siempre'}</span>
                  </>
                )}
              </div>

              <Rail cells={railCells} />

              {isPremium && !isCancelled && sub?.plan_ends_at && (
                <div className="flex items-center gap-2.5 text-sm text-secondary">
                  <CreditCard size={14} className="text-muted flex-shrink-0" />
                  <span>
                    Se renueva sola el <span className="text-soft">{fmtDayMonth(sub.plan_ends_at)}</span>
                    {priceText ? ` por AR$ ${priceText}` : ''}.
                  </span>
                </div>
              )}

              {isCancelled && sub?.plan_ends_at && (
                <div>
                  <div className="h-[3px] bg-border rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-premium"
                      style={{ width: `${Math.min(100, Math.max(4, (left / 30) * 100))}%` }}
                    />
                  </div>
                  <p className="text-sm text-secondary leading-relaxed mt-2.5">
                    No se te vuelve a cobrar. Tenés acceso premium por <span className="text-soft">{left} día{left === 1 ? '' : 's'}</span> más,
                    hasta el <span className="text-soft">{fmtLong(sub.plan_ends_at)}</span>.
                  </p>
                </div>
              )}

              {!isPremium && (
                <p className="text-sm text-secondary leading-relaxed">
                  Con el plan Básico tenés hasta {FREE_MAX_GROUPS} categorías y {FREE_TOURNAMENTS_PER_MONTH} torneos
                  por mes en cada una. Todo lo demás —partidos, resultados, tabla, perfil— es igual que en Premium.
                </p>
              )}
            </div>
          </div>

          {isCancelled && (
            <button
              type="button"
              onClick={() => setShowPremiumModal(true)}
              className="w-full flex items-center justify-center gap-2 bg-brand text-black font-condensed font-bold tracking-wide py-3.5 rounded-xl hover:brightness-110 active:brightness-90 transition cursor-pointer"
            >
              <Zap size={16} />
              Reactivar Premium
            </button>
          )}

          {/* Uso del plan */}
          <div>
            <SectionRule>USO DE TU PLAN</SectionRule>
            <div className="grid grid-cols-2 gap-3">
              <StatSlab
                label="Categorías"
                value={isPremium ? String(groups) : `${groups} / ${FREE_MAX_GROUPS}`}
                sub={isPremium
                  ? `En Básico serían ${FREE_MAX_GROUPS}`
                  : groupsLeft === 0 ? 'Llegaste al límite' : `Podés crear ${groupsLeft} más`}
                tone={isPremium ? 'gold' : groupsLeft === 0 ? 'danger' : 'brand'}
                icon={Layers}
                meter={isPremium ? null : (groups / FREE_MAX_GROUPS) * 100}
              />
              <StatSlab
                label={`Torneos · ${thisMonth()}`}
                value={isPremium ? String(monthTotal) : `${monthPeak} / ${FREE_TOURNAMENTS_PER_MONTH}`}
                sub={isPremium ? `En Básico, ${FREE_TOURNAMENTS_PER_MONTH} por mes` : 'Máx. por categoría'}
                tone={isPremium ? 'gold' : monthPeak >= FREE_TOURNAMENTS_PER_MONTH ? 'danger' : 'brand'}
                icon={Trophy}
                meter={isPremium ? null : (monthPeak / FREE_TOURNAMENTS_PER_MONTH) * 100}
              />
            </div>
            {!isPremium && (
              <p className="text-[11.5px] text-dim leading-relaxed mt-3">
                El cupo de torneos se cuenta por categoría y por mes calendario: se reinicia el {firstOfNextMonth()}.
                Lo que ya creaste no se toca nunca.
              </p>
            )}
          </div>

          {/* Incluido en tu plan */}
          {isPremium && (
            <div className="bg-surface-alt border border-border-strong rounded-2xl p-5">
              <p className="text-[10px] font-mono tracking-widest text-dim uppercase mb-4">
                Incluido en tu plan
              </p>
              <ul className="grid grid-cols-1 lg:grid-cols-2 gap-y-2.5 gap-x-6">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-soft">
                    <div className="w-5 h-5 rounded-full bg-brand/15 border border-brand/40 flex items-center justify-center flex-shrink-0">
                      <Check size={11} className="text-brand" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Qué cambia al vencer */}
          {isCancelled && (
            <div>
              <SectionRule>QUÉ CAMBIA EL {fmtDayMonth(sub?.plan_ends_at).toUpperCase()}</SectionRule>
              <div className="bg-surface-alt border border-border-strong rounded-2xl px-5">
                {DOWNGRADE_ROWS.map((row, i) => (
                  <div
                    key={row.label}
                    className={`flex items-center justify-between gap-4 py-3.5 ${
                      i < DOWNGRADE_ROWS.length - 1 ? 'border-b border-border-strong/40' : ''
                    }`}
                  >
                    <span className="text-sm text-soft">{row.label}</span>
                    <span className={`text-xs text-right ${row.good ? 'text-green' : 'text-muted'}`}>{row.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11.5px] text-dim leading-relaxed mt-3">
                Bajar de plan nunca archiva ni esconde nada de lo que ya existe.
              </p>
            </div>
          )}

          {/* Pasate a Premium */}
          {!isPremium && (
            <div className="border border-brand/45 bg-brand/5 rounded-2xl p-5">
              <div className="flex items-center gap-2">
                <Zap size={17} className="text-brand fill-brand" />
                <span className="font-condensed font-bold text-lg text-white">Cuenta Premium</span>
              </div>
              <p className="text-secondary text-xs mt-1 mb-4">Sin cupos, con el historial completo a mano.</p>

              <ul className="flex flex-col gap-2 mb-5">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-soft">
                    <Check size={14} className="text-brand shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => setShowPremiumModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-brand text-black font-condensed font-bold tracking-wide py-3.5 rounded-xl hover:brightness-110 active:brightness-90 transition cursor-pointer"
              >
                <Zap size={16} />
                Activar Premium
              </button>
              <p className="text-center text-[11px] text-muted mt-2.5">
                ¿Primera vez? Escribinos a{' '}
                <a href="mailto:soporte@hola.padeleando.ar" className="text-brand hover:underline">soporte@hola.padeleando.ar</a>
                {' '}y te regalamos 7 días.
              </p>
            </div>
          )}
        </div>

        {/* ── Columna lateral ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 min-w-0">

          {/* Próximo cobro: en teléfono ya lo dice el carnet */}
          {isPremium && !isCancelled && sub?.plan_ends_at && priceText && (
            <div className="hidden lg:block bg-surface-alt border border-border-strong rounded-2xl p-5">
              <p className="text-[10px] font-mono tracking-widest text-dim uppercase mb-3.5">Próximo cobro</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-secondary text-xs">AR$</span>
                <span className="font-condensed font-black text-[32px] text-white leading-none">{priceText}</span>
              </div>
              <p className="text-sm text-secondary leading-relaxed mt-3">
                El {fmtLong(sub.plan_ends_at)}, en tu cuenta de Mercado Pago.
              </p>
              <div className="flex items-center gap-2.5 mt-3.5 pt-3.5 border-t border-border">
                <CreditCard size={14} className="text-muted flex-shrink-0" />
                <span className="text-xs text-dim">Renovación automática activada</span>
              </div>
            </div>
          )}

          {/* Comparación de planes */}
          {!isPremium && (
            <div>
              <SectionRule>BÁSICO CONTRA PREMIUM</SectionRule>
              <ComparisonTable />
            </div>
          )}

          {/* Acciones */}
          <div className={`flex-col gap-3 ${isPremium ? 'flex' : 'hidden'}`}>
            {isPremium && !isCancelled && cancelStep !== 'done' && (
              <>
                {cancelStep === 'idle' && (
                  <button
                    type="button"
                    onClick={() => setCancelStep('confirm')}
                    className="w-full py-3 rounded-xl border border-border-strong text-secondary hover:text-white hover:border-danger/50 hover:bg-danger/5 transition text-sm font-semibold cursor-pointer"
                  >
                    Cancelar suscripción
                  </button>
                )}

                {cancelStep === 'confirm' && (
                  <div className="bg-surface-alt border border-danger/30 rounded-2xl p-5 flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={18} className="text-danger flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-white font-semibold mb-1">¿Cancelar tu suscripción?</p>
                        <p className="text-xs text-secondary leading-relaxed">
                          Seguís con acceso premium hasta el{' '}
                          <span className="text-soft">{fmtLong(sub?.plan_ends_at)}</span>.
                          Después de esa fecha tu cuenta vuelve al plan Básico.
                        </p>
                      </div>
                    </div>
                    <div className="bg-surface border border-border rounded-xl p-3.5">
                      <p className="text-[10px] font-mono tracking-widest text-dim uppercase mb-2">Qué perdés</p>
                      <p className="text-xs text-secondary leading-relaxed">
                        Tus {groups} categoría{groups === 1 ? '' : 's'} y tus estadísticas quedan intactas: sólo se cierra
                        la creación por encima del cupo Básico y el álbum de fotos deja de aceptar cargas.
                      </p>
                    </div>
                    {cancelError && <p className="text-xs text-danger">{cancelError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setCancelStep('idle'); setCancelError(null) }}
                        className="flex-1 py-2.5 rounded-xl border border-border-strong text-secondary hover:text-white transition text-sm font-semibold cursor-pointer"
                      >
                        Volver
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="flex-1 py-2.5 rounded-xl bg-danger text-white font-semibold text-sm hover:brightness-110 active:brightness-90 transition cursor-pointer"
                      >
                        Sí, cancelar
                      </button>
                    </div>
                  </div>
                )}

                {cancelStep === 'cancelling' && (
                  <div className="flex items-center justify-center gap-2 py-3 text-secondary text-sm">
                    <Loader2 size={15} className="animate-spin" />
                    Cancelando suscripción...
                  </div>
                )}
              </>
            )}

            {cancelStep === 'done' && (
              <div className="bg-surface-alt border border-border-strong rounded-2xl p-5 text-center">
                <p className="text-sm text-white font-semibold mb-1">Suscripción cancelada</p>
                <p className="text-xs text-secondary leading-relaxed">
                  {cancelledEndsAt
                    ? <>Tu acceso premium continúa hasta el {fmtLong(cancelledEndsAt)}.</>
                    : 'Tu acceso premium continuará hasta el final del período actual.'}
                </p>
              </div>
            )}

            {isPremium && (
              <p className="text-[11.5px] text-dim leading-relaxed">
                También podés gestionar tu suscripción directamente en la sección{' '}
                <span className="text-brand/70">&quot;Suscripciones&quot;</span> de tu cuenta de Mercado Pago.
              </p>
            )}
          </div>

          {/* Preguntas frecuentes */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-mono tracking-widest text-dim uppercase mb-1">Preguntas frecuentes</p>
            <Faq q="¿Qué pasa con mis datos si cancelo?">
              Se mantienen enteros. Tus categorías, torneos, partidos y estadísticas siguen ahí y siguen funcionando;
              sólo perdés las funciones premium hasta que te vuelvas a suscribir.
            </Faq>
            {isPremium ? (
              <Faq q="¿Puedo pasar de mensual a anual?">
                Sí. Escribinos a <a href="mailto:soporte@hola.padeleando.ar" className="text-brand hover:underline">soporte@hola.padeleando.ar</a>{' '}
                y lo cambiamos sin que pierdas los días que ya pagaste.
              </Faq>
            ) : (
              <Faq q="¿Cómo funciona la prueba de 7 días?">
                La primera vez que quieras ser parte de Premium te regalamos 7 días de prueba. Pedilos por mail a{' '}
                <a href="mailto:soporte@hola.padeleando.ar" className="text-brand hover:underline">soporte@hola.padeleando.ar</a>.
              </Faq>
            )}
          </div>

          {/* Pagó y no se activó */}
          {!isPremium && (
            <div className="bg-surface-alt border border-border-strong rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowClaim((v) => !v)}
                className="w-full flex items-center gap-3 px-4 py-4 text-left bg-transparent hover:bg-surface transition cursor-pointer"
              >
                <ShieldCheck size={17} className="text-brand shrink-0" />
                <span className="flex-1 text-sm text-soft font-semibold">¿Pagaste y no se activó?</span>
                <ChevronDown size={16} className={`text-muted shrink-0 transition-transform duration-200 ${showClaim ? 'rotate-180' : ''}`} />
              </button>
              {showClaim && (
                <div className="px-4 pb-4">
                  <ClaimPremiumRequest compact onActivated={() => api.subscriptions.me().then(setSub)} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showPremiumModal && <PremiumModal onClose={() => setShowPremiumModal(false)} />}
    </div>
  )
}
