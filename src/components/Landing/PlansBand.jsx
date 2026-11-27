import { Check } from 'lucide-react'
import { PLAN_INFO, planPrice, ANNUAL_MONTHS } from '../../utils/plan'
import { formatMoney } from '../../utils/money'

const PAID = ['jugador_plus', 'organizador', 'club']
const SOON = '(próximamente)'
const MAX_FEATURES = 5

const features = (plan) => PLAN_INFO[plan].features.filter((f) => !f.includes(SOON)).slice(0, MAX_FEATURES)

function FeatureList({ items, iconClass }) {
  return (
    <ul className="list-none m-0 mt-1.5 p-0 flex flex-col gap-2.5 font-sans text-[15px] leading-[1.4] flex-1">
      {items.map((f) => (
        <li key={f} className="flex gap-2"><Check size={15} strokeWidth={3} className={`shrink-0 mt-[3px] ${iconClass}`} aria-hidden="true" />{f}</li>
      ))}
    </ul>
  )
}

function PaidCard({ plan }) {
  const info = PLAN_INFO[plan]
  const promo = planPrice(plan)
  const list = planPrice(plan, 'monthly', { list: true })
  const soon = info.available === false
  return (
    <article className={`land-reveal land-reveal-2 min-w-[84%] md:min-w-0 snap-start p-[26px] rounded-[22px] flex flex-col gap-3.5 ${soon ? 'border-[1.5px] border-dashed border-land-ink text-land-ink' : 'bg-land-ink text-land-text'}`}>
      <div className="flex justify-between items-center gap-2">
        <h3 className="m-0 font-condensed font-bold text-[20px]">{info.name}</h3>
        {!soon && promo != null && <span className="font-sans text-[12px] font-bold text-land-lime">Promo</span>}
      </div>
      {promo != null ? (
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <span className="font-condensed font-extrabold text-[36px] md:text-[40px] leading-none text-land-lime">{formatMoney(promo)}</span>
          {list != null && list !== promo && <span className="font-sans text-[15px] line-through opacity-60">{formatMoney(list)}</span>}
        </div>
      ) : (
        <div className="font-condensed font-extrabold text-[20px] leading-tight break-words">{soon ? 'Próximamente' : info.priceLabel}</div>
      )}
      <div className="font-sans text-[14px] opacity-75">{promo != null ? 'por mes' : info.priceLabel}</div>
      <FeatureList items={features(plan)} iconClass={soon ? 'text-land-ink' : 'text-land-lime'} />
    </article>
  )
}

export default function PlansBand() {
  const combo = planPrice('combo')
  return (
    <section id="planes" className="bg-land-lime text-land-ink py-16 md:py-28 scroll-mt-0">
      <div className="mx-auto max-w-[1200px] px-5 md:px-12">
        <div className="flex flex-wrap justify-between items-end gap-5 mb-12">
          <div>
            <h2 className="land-reveal m-0 max-w-[720px] font-condensed font-bold text-[30px] md:text-[46px] leading-[1.06] tracking-[-0.02em]">Jugar es gratis. Los planes suman extras.</h2>
            <p className="land-reveal land-reveal-2 mt-4 mb-0 max-w-[560px] font-sans text-[17px] md:text-[19px] leading-[1.55] text-land-olive">Cada rol paga solo lo que usa. Nada de lo que ya creaste se bloquea si dejás un plan.</p>
          </div>
          <span className="land-reveal land-reveal-3 font-sans font-bold text-[15px] px-4 py-2.5 rounded-full bg-land-ink text-land-lime">Precio de lanzamiento</span>
        </div>
        <div className="flex md:grid md:grid-cols-2 xl:grid-cols-4 gap-3.5 md:gap-5 overflow-x-auto md:overflow-visible snap-x snap-mandatory scroll-px-5 -mx-5 px-5 md:mx-0 md:px-0 pb-2.5 md:pb-0">
          <article className="land-reveal min-w-[84%] md:min-w-0 snap-start p-[26px] rounded-[22px] border-[1.5px] border-land-ink flex flex-col gap-3.5">
            <h3 className="m-0 font-condensed font-bold text-[20px]">{PLAN_INFO.free.name}</h3>
            <div className="font-condensed font-extrabold text-[36px] md:text-[40px] leading-none">$0</div>
            <div className="font-sans text-[14px] text-land-olive">Para siempre</div>
            <FeatureList items={features('free')} iconClass="text-land-ink" />
          </article>
          {PAID.map((p) => <PaidCard key={p} plan={p} />)}
        </div>
        <p className="land-reveal mt-7 mb-0 max-w-[820px] font-sans text-[14px] leading-[1.55] text-land-olive">
          Precio promocional para quien se suscribe en los 3 meses posteriores al lanzamiento, y lo mantiene 12 meses. Pago anual: {12 - ANNUAL_MONTHS} meses gratis.{combo != null && ` Combo Organizador + Jugador+: ${formatMoney(combo)} por mes.`}
        </p>
      </div>
    </section>
  )
}
