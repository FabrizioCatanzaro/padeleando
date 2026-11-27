import { Link } from 'react-router-dom'
import { UserRound, ClipboardList, Building2, ChevronDown } from 'lucide-react'
import logoUrl from '../../assets/padeleando-logo.webp'
import logoTxtUrl from '../../assets/padeleando-txt.webp'
import LiveDemo from './LiveDemo'

const NAV = [
  { to: '/torneos', label: 'Torneos' },
  { to: '/partidos', label: 'Partidos' },
  { to: '/padeleros/clubes', label: 'Clubes' },
]

const ROLE_CHIPS = [
  { icon: UserRound, label: 'Soy jugador', href: '#rol-jugadores' },
  { icon: ClipboardList, label: 'Organizo torneos', href: '#rol-organizadores' },
  { icon: Building2, label: 'Tengo un club', href: '#rol-clubes' },
]

const delay = (ms) => ({ animationDelay: `${ms}ms` })

function scrollToContent(e) {
  const target = document.getElementById('numeros')
  if (!target) return
  e.preventDefault()
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
}

export default function LandingHero({ heroRef }) {
  return (
    <section ref={heroRef} className="relative overflow-hidden bg-land-ink text-land-text min-h-svh flex flex-col">
      <picture>
        <source media="(max-width: 767px)" sizes="100vw"
          srcSet="/login/cancha-vertical-480.webp 480w, /login/cancha-vertical-768.webp 768w, /login/cancha-vertical-1080.webp 1080w" />
        <img src="/login/cancha-1440.webp" sizes="100vw"
          srcSet="/login/cancha-960.webp 960w, /login/cancha-1440.webp 1440w, /login/cancha-1920.webp 1920w"
          width="1440" height="896" alt="" fetchPriority="high"
          className="land-zoom absolute inset-0 w-full h-full object-cover object-top md:object-[center_40%]" />
      </picture>
      <div className="land-hero-shade absolute inset-0" aria-hidden="true" />

      <div className="relative flex-1 flex flex-col">
        <header className="w-full mx-auto max-w-[1200px] px-5 md:px-12 py-5 flex items-center justify-between gap-4">
          <Link to="/" aria-label="Padeleando, inicio" className="flex items-center gap-2.5 shrink-0">
            <img src={logoUrl} width="34" height="34" alt="" className="w-[34px] h-[34px]" />
            <img src={logoTxtUrl} width="87" height="18" alt="Padeleando" className="h-[18px] w-auto max-[419px]:hidden" />
          </Link>
          <nav aria-label="Secciones" className="hidden lg:flex gap-[30px] font-sans text-[15px] font-semibold text-land-text/85">
            {NAV.map((n) => <Link key={n.to} to={n.to} className="no-underline text-inherit hover:text-land-lime transition-colors">{n.label}</Link>)}
            <a href="#planes" className="no-underline text-inherit hover:text-land-lime transition-colors">Planes</a>
          </nav>
          <div className="flex gap-2.5">
            <Link to="/login" className="inline-flex items-center whitespace-nowrap h-[42px] px-4 sm:px-[18px] rounded-full border border-land-text/28 font-sans font-bold text-[14px] sm:text-[15px] text-land-text no-underline hover:border-land-text/60 transition-colors">Ingresar</Link>
            <Link to="/register" className="inline-flex items-center whitespace-nowrap h-[42px] px-4 sm:px-[18px] rounded-full bg-land-lime font-sans font-bold text-[14px] sm:text-[15px] text-land-ink no-underline hover:brightness-105 transition">Crear cuenta</Link>
          </div>
        </header>

        <div className="w-full flex-1 mx-auto max-w-[1200px] px-5 md:px-12 pt-7 pb-14 lg:py-10 lg:[@media(max-height:820px)]:py-5 grid content-center grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-9 lg:gap-16 items-center">
          <div>
            <p className="land-rise m-0 mb-[26px] [@media(max-height:820px)]:mb-5 font-sans text-[15px] font-semibold text-land-text/85">Amistosos, torneos y gestión de clubes de pádel</p>
            <h1 className="m-0 font-condensed font-extrabold text-[42px] md:text-[64px] xl:text-[78px] xl:[@media(max-height:820px)]:text-[64px] leading-[0.98] tracking-[-0.025em] text-land-text">
              <span className="land-rise block" style={delay(150)}>Jugá.</span>
              <span className="land-rise block" style={delay(300)}>Organizá.</span>
              <span className="land-rise block text-land-lime" style={delay(450)}>Seguí cada punto.</span>
            </h1>
            <p className="land-rise mt-7 mb-[34px] [@media(max-height:820px)]:mt-5 [@media(max-height:820px)]:mb-7 max-w-[560px] font-sans text-[17px] md:text-[19px] leading-[1.55] text-land-text/80" style={delay(650)}>
              Inscribite a torneos, sumate a partidos abiertos y mirá la tabla en tiempo real. Si organizás o tenés un club, gestionás todo desde el mismo lugar.
            </p>
            <div className="land-rise flex flex-wrap gap-3" style={delay(650)}>
              <Link to="/register" className="inline-flex items-center justify-center h-[54px] px-[30px] rounded-full bg-land-lime font-sans font-bold text-[16px] text-land-ink no-underline hover:-translate-y-px transition-transform">Crear cuenta gratis</Link>
              <Link to="/login" className="inline-flex items-center justify-center h-[54px] px-7 rounded-full border border-land-text/32 font-sans font-bold text-[16px] text-land-text no-underline hover:border-land-text/60 hover:-translate-y-px transition">Ya tengo cuenta</Link>
            </div>
            <div className="land-rise flex flex-wrap gap-2 mt-[34px] [@media(max-height:820px)]:mt-6" style={delay(900)}>
              {ROLE_CHIPS.map(({ icon, label, href }) => {
                const Icon = icon
                return (
                <a key={href} href={href} className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-land-text/8 border border-land-text/12 font-sans text-[14px] font-semibold text-land-text no-underline hover:border-land-lime/60 transition-colors">
                  <Icon size={16} className="text-land-lime" aria-hidden="true" />{label}
                </a>
                )
              })}
            </div>
          </div>

          <LiveDemo className="land-rise lg:justify-self-end lg:max-w-[440px]" style={delay(900)} />
        </div>

        <a href="#numeros" onClick={scrollToContent} style={delay(1300)}
          className="land-rise hidden lg:flex self-center flex-col items-center gap-1 pb-7 [@media(max-height:820px)]:pb-4 font-sans text-[13px] font-semibold text-land-text/70 no-underline hover:text-land-lime transition-colors">
          Conocé más
          <ChevronDown size={22} className="land-cue" aria-hidden="true" />
        </a>
      </div>
    </section>
  )
}
