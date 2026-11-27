import { Link } from 'react-router-dom'
import logoUrl from '../../assets/padeleando-logo.webp'

export default function JoinBand() {
  return (
    <section className="bg-land-lime text-land-ink py-16 md:py-28 text-center">
      <div className="mx-auto max-w-[1200px] px-5 md:px-12 flex flex-col items-center">
        <img src={logoUrl} alt="" width="64" height="64" loading="lazy" className="land-reveal w-16 h-16 brightness-0" />
        <h2 className="land-reveal land-reveal-2 mt-[26px] mb-0 max-w-[900px] font-condensed font-extrabold text-[38px] md:text-[64px] xl:text-[78px] leading-[0.98] tracking-[-0.025em]">Tu próximo partido ya tiene tabla</h2>
        <p className="land-reveal land-reveal-3 mt-6 mb-[34px] max-w-[560px] font-sans text-[17px] md:text-[19px] leading-[1.55] text-land-olive">Creá tu cuenta en un minuto, elegí tu categoría y anotate al próximo torneo.</p>
        <div className="land-reveal land-reveal-3 flex flex-wrap justify-center gap-3">
          <Link to="/register" className="inline-flex items-center justify-center h-14 px-8 rounded-full bg-land-ink font-sans font-bold text-[16px] text-land-lime no-underline hover:-translate-y-px transition-transform">Crear cuenta gratis</Link>
          <Link to="/login" className="inline-flex items-center justify-center h-14 px-[30px] rounded-full border-[1.5px] border-land-ink font-sans font-bold text-[16px] text-land-ink no-underline hover:-translate-y-px transition-transform">Ingresar</Link>
        </div>
      </div>
    </section>
  )
}
