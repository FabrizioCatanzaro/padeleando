import { useState } from 'react';
import { X, Check, ChevronDown, Loader2, UserRound, Trophy, Layers, Building2 } from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../context/useAuth';
import {
  PLAN_INFO, PLAN_ORDER, PLAN_COMPARISON, COMPARISON_PLANS, ANNUAL_MONTHS,
  planPrice, isPurchasable, userPlan, CLUB_MIN_PRICE,
} from '../../utils/plan';

const PLAN_ICON = { jugador_plus: UserRound, organizador: Trophy, combo: Layers, club: Building2 };
const FOCUS_PLAN = { jugador: 'jugador_plus', organizador: 'organizador', club: 'club' };

const fmt = (n) => n.toLocaleString('es-AR');

const FAQS = [
  {
    q: '¿Por qué hay un plan para cada rol?',
    a: 'Pagás sólo lo que usás. Si jugás, Jugador+ te da tus estadísticas a fondo. Si organizás, Organizador te saca los límites. Si hacés las dos cosas, el Combo sale más barato que los dos por separado.',
  },
  {
    q: '¿Hasta cuándo dura el precio promocional?',
    a: 'Quien se suscribe con el precio promocional lo mantiene 12 meses. Después pasa al precio de lista.',
  },
  {
    q: '¿Puedo cancelar en cualquier momento?',
    a: 'Sí. Cancelás desde "Mi suscripción" o desde tu cuenta de Mercado Pago. Seguís con el plan hasta el final del período pagado.',
  },
  {
    q: '¿Qué pasa con lo que creé si cancelo?',
    a: 'Nada se borra ni se esconde. Tus categorías, torneos y fotos siguen funcionando. Sólo se frena crear más de lo que permite el plan Gratis.',
  },
  {
    q: '¿Con qué cuenta de Mercado Pago pago?',
    a: 'Con la que quieras. Después de pagar, tocá "Volver al sitio" en Mercado Pago y activamos tu plan, sin importar el email de tu cuenta.',
  },
];

function PlanCard({ plan, billing, highlighted, current, loading, onChoose }) {
  const info = PLAN_INFO[plan];
  const Icon = PLAN_ICON[plan];
  const available = isPurchasable(plan);
  const promo = planPrice(plan, billing);
  const list = planPrice(plan, billing, { list: true });

  return (
    <div className={`relative flex flex-col rounded-xl p-5 ${
      highlighted ? 'border-2 border-brand bg-brand/5' : 'border border-border-strong'
    } ${available ? '' : 'opacity-70'}`}>
      {highlighted && available && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest whitespace-nowrap">
          Para vos
        </span>
      )}
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} className={highlighted ? 'text-brand' : 'text-soft'} />
        <span className="font-condensed font-bold text-xl text-white">{info.name}</span>
        {current && (
          <span className="bg-border-strong text-soft text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Actual</span>
        )}
      </div>
      <p className="text-secondary text-xs mb-4">{info.tagline}</p>

      <div className="mb-4 min-h-[64px]">
        {promo != null ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-muted line-through font-mono">AR${fmt(list)}</span>
              <span className="bg-brand text-black text-[10px] font-bold px-2 py-0.5 rounded-full leading-none tracking-wide">PROMO</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-secondary text-xs">AR$</span>
              <span className="font-condensed font-bold text-4xl text-white">{fmt(promo)}</span>
              <span className="text-secondary text-sm">{billing === 'annual' ? '/año' : '/mes'}</span>
            </div>
            {billing === 'annual' && (
              <p className="text-[11px] text-muted mt-1">Equivale a AR${fmt(Math.round(promo / 12))} por mes</p>
            )}
          </>
        ) : (
          <>
            <p className="font-condensed font-bold text-2xl text-white">{info.priceLabel}</p>
            <p className="text-[11px] text-muted mt-1">
              Canchas activas × precio del turno de 1 h. Mínimo AR${fmt(CLUB_MIN_PRICE)} por mes.
            </p>
          </>
        )}
      </div>

      <ul className="flex flex-col gap-2 mb-5 flex-1">
        {info.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-soft">
            <Check size={14} className={`shrink-0 mt-0.5 ${highlighted ? 'text-brand' : 'text-green'}`} />
            {f}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onChoose(plan)}
        disabled={!available || current || loading}
        className={`w-full flex items-center justify-center gap-2 font-condensed font-bold tracking-wide py-3 rounded-xl transition cursor-pointer disabled:cursor-not-allowed ${
          highlighted
            ? 'bg-brand text-black hover:brightness-110 active:brightness-90 disabled:opacity-60'
            : 'bg-surface-alt border border-border-strong text-white hover:border-brand/50 disabled:opacity-60'
        }`}
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {!available ? 'Próximamente' : current ? 'Tu plan actual' : loading ? 'Redirigiendo a Mercado Pago...' : `Elegir ${info.name}`}
      </button>
    </div>
  );
}

function Cell({ value }) {
  if (value === true) return <Check size={14} className="text-brand" />;
  if (value === false) return <X size={14} className="text-muted" />;
  return <span className="text-xs text-soft text-center">{value}</span>;
}

export default function PremiumModal({ onClose, reason, focus }) {
  const { user } = useAuth();
  const current = userPlan(user);
  const highlightedPlan = FOCUS_PLAN[focus] ?? 'combo';

  const [billing, setBilling] = useState('monthly');
  const [openFaq, setOpenFaq] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState(null);

  async function handleCheckout(plan) {
    setLoadingPlan(plan);
    setError(null);
    try {
      const data = await api.subscriptions.checkout(plan, billing);
      window.location.href = data.init_point;
    } catch (e) {
      setError(e.message || 'Error al iniciar el pago. Intentá de nuevo.');
      setLoadingPlan(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-start justify-center z-[1000] overflow-y-auto py-6 px-4" onClick={onClose}>
      <div
        className="bg-surface border border-border-strong rounded-2xl w-full max-w-md lg:max-w-6xl xl:max-w-7xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute top-4 right-4 text-muted hover:text-white transition p-1 z-10 cursor-pointer">
          <X size={20} />
        </button>

        <div className="text-center pt-10 pb-6 px-6 lg:px-10">
          <h2 className="font-condensed font-bold text-3xl text-white tracking-wide mb-2">Elegí tu plan</h2>
          <p className="text-secondary text-sm">Pagás sólo por el rol que usás. Jugar sigue siendo gratis.</p>
          {reason && (
            <p className="max-w-md mx-auto mt-4 bg-surface-alt border border-border-strong rounded-xl px-4 py-3 text-sm text-soft">{reason}</p>
          )}
        </div>

        <div className="px-6 lg:px-10 pb-6">
          <div className="max-w-lg mx-auto mb-8 flex items-center bg-surface-alt rounded-xl p-1 border border-border-strong">
            {['monthly', 'annual'].map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBilling(b)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                  billing === b ? 'bg-surface text-white shadow' : 'text-secondary'
                }`}
              >
                {b === 'monthly' ? 'Mensual' : 'Anual'}
                {b === 'annual' && (
                  <span className="bg-brand text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {12 - ANNUAL_MONTHS} meses gratis
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
            {PLAN_ORDER.map((plan) => (
              <PlanCard
                key={plan}
                plan={plan}
                billing={billing}
                highlighted={plan === highlightedPlan}
                current={plan === current}
                loading={loadingPlan === plan}
                onChoose={handleCheckout}
              />
            ))}
          </div>
          {error && <p className="text-center text-xs text-danger mt-4">{error}</p>}

          <div className="mt-5 border border-border-strong rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className="font-condensed font-bold text-white">{PLAN_INFO.free.name}</span>
            <span className="text-xs text-secondary">{PLAN_INFO.free.features.join(' · ')}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
            <div>
              <span className="block text-[10px] font-mono tracking-widest text-dim uppercase mb-4">Comparación de planes</span>
              <div className="border border-border-strong rounded-xl overflow-x-auto">
                <div className="min-w-[460px]">
                  <div className="grid grid-cols-[1.4fr_repeat(4,1fr)] bg-surface-alt px-4 py-2.5 border-b border-border-strong">
                    <span className="text-xs text-secondary font-semibold">Característica</span>
                    {COMPARISON_PLANS.map((p) => (
                      <span key={p} className={`text-xs font-semibold text-center ${p === 'free' ? 'text-secondary' : 'text-brand'}`}>
                        {PLAN_INFO[p].name}
                      </span>
                    ))}
                  </div>
                  {PLAN_COMPARISON.map((row, i) => (
                    <div
                      key={row.feature}
                      className={`grid grid-cols-[1.4fr_repeat(4,1fr)] px-4 py-3 items-center ${
                        i < PLAN_COMPARISON.length - 1 ? 'border-b border-border-strong/40' : ''
                      }`}
                    >
                      <span className="text-xs text-secondary">{row.feature}</span>
                      {COMPARISON_PLANS.map((p) => (
                        <div key={p} className="flex justify-center"><Cell value={row[p]} /></div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-mono tracking-widest text-dim uppercase mb-4">Preguntas frecuentes</span>
              <div className="flex flex-col gap-2">
                {FAQS.map((faq, i) => (
                  <div key={faq.q} className="border border-border-strong rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between px-4 py-3.5 text-left bg-transparent hover:bg-surface-alt transition cursor-pointer"
                    >
                      <span className="text-sm text-soft pr-4">{faq.q}</span>
                      <ChevronDown size={16} className={`text-muted shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                    </button>
                    {openFaq === i && (
                      <div className="px-4 pb-4 pt-3 text-xs text-secondary leading-relaxed border-t border-border-strong/40">{faq.a}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 lg:px-10 pb-8">
          <p className="text-[11px] text-dim text-center leading-relaxed">
            La suscripción se renueva automáticamente al final de cada período. Podés cancelar en cualquier momento. Precios promocionales en pesos argentinos.
          </p>
        </div>
      </div>
    </div>
  );
}
