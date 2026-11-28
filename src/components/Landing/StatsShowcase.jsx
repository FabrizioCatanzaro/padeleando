import { Check, Lock } from 'lucide-react'

const KPIS = [
  { v: '48', l: 'Partidos', c: 'text-land-text' },
  { v: '64 %', l: 'Victorias', c: 'text-land-lime' },
  { v: '5', l: 'Racha', c: 'text-land-cyan' },
  { v: '3', l: 'Títulos', c: 'text-premium-hi' },
]
const FORM = 'GGPGGGPGPGGG'.split('')
const POINTS = [
  'Porcentaje de victorias, rachas y títulos',
  'Con quién jugás más y con quién ganás más',
  'Con Jugador+: rendimiento por compañero, por día y cara a cara',
]

export default function StatsShowcase() {
  return (
    <section className="bg-land-night text-land-text py-16 md:py-28">
      <div className="mx-auto max-w-[1200px] px-5 md:px-12 grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-9 lg:gap-16 items-center">
        <div>
          <h2 className="land-reveal m-0 font-condensed font-bold text-[30px] md:text-[46px] leading-[1.06] tracking-[-0.02em]">Cada partido suma a tu historial</h2>
          <p className="land-reveal land-reveal-2 mt-[18px] mb-[30px] max-w-[560px] font-sans text-[17px] md:text-[19px] leading-[1.55] text-land-night-soft">Tus resultados de torneos y amistosos arman tu perfil público. Sin planillas ni capturas de WhatsApp.</p>
          <ul className="list-none m-0 p-0 flex flex-col gap-3.5">
            {POINTS.map((p, i) => (
              <li key={p} className={`land-reveal ${i < 2 ? 'land-reveal-2' : 'land-reveal-3'} flex gap-3 font-sans text-[16px] text-land-text/90`}>
                <Check size={18} strokeWidth={3} className="shrink-0 mt-0.5 text-land-lime" aria-hidden="true" />{p}
              </li>
            ))}
          </ul>
        </div>

        <figure className="land-reveal m-0 rounded-[24px] p-5 sm:p-[26px] bg-land-night-2 border border-land-night-line shadow-[0_30px_70px_rgb(0_0_0/0.4)]">
          <div className="flex items-center gap-3.5">
            <span className="w-14 h-14 rounded-full bg-land-lime text-land-ink flex items-center justify-center font-condensed font-extrabold text-[20px]" aria-hidden="true">MR</span>
            <div className="min-w-0">
              <div className="font-sans font-bold text-[18px]">Martín Ríos</div>
              <div className="font-sans text-[14px] text-land-night-soft">@martinrios · C6</div>
            </div>
            <span className="ml-auto self-start font-sans text-[12px] text-land-night-soft">Perfil de ejemplo</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-[22px]">
            {KPIS.map((k) => (
              <div key={k.l} className="px-3 py-3.5 rounded-[14px] bg-land-night-3">
                <div className={`font-condensed font-extrabold text-[24px] leading-none ${k.c}`}>{k.v}</div>
                <div className="mt-1.5 font-sans text-[12px] text-land-night-soft">{k.l}</div>
              </div>
            ))}
          </div>
          <div className="mt-[22px] flex justify-between font-sans text-[13px] text-land-night-soft"><span>Últimos 12 partidos</span><span>9 ganados</span></div>
          <div className="flex gap-1.5 mt-2.5" role="img" aria-label="9 ganados y 3 perdidos en los últimos 12 partidos">
            {FORM.map((r, i) => (
              <span key={i} className={`flex-1 h-[34px] rounded-[7px] flex items-center justify-center font-sans text-[12px] font-extrabold ${r === 'G' ? 'bg-land-lime text-land-ink' : 'bg-land-night-3 text-land-night-soft'}`}>{r}</span>
            ))}
          </div>
          <div className="mt-5 p-3.5 rounded-[14px] bg-land-night-3 flex justify-between items-center gap-2.5 font-sans text-[14px]">
            <span>Compañero frecuente <strong className="text-land-text">Lucas Paz</strong></span>
            <span className="text-land-night-soft shrink-0">21 partidos · 71 %</span>
          </div>
          <div className="mt-2.5 p-3.5 rounded-[14px] border border-dashed border-land-night-line flex justify-between items-center gap-2.5 font-sans text-[14px] text-land-night-soft">
            <span className="flex items-center gap-2"><Lock size={15} aria-hidden="true" />Cara a cara y rendimiento por día</span>
            <span className="shrink-0 font-extrabold text-[12px] px-2.5 py-1 rounded-full bg-linear-to-r from-premium to-premium-hi text-premium-ink">Jugador+</span>
          </div>
        </figure>
      </div>
    </section>
  )
}
