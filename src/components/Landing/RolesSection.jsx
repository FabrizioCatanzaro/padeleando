import { Link } from 'react-router-dom'
import { UserRound, ClipboardList, Building2, Check } from 'lucide-react'

const ROLES = [
  {
    id: 'rol-jugadores', icon: UserRound, title: 'Jugadores', desc: 'Encontrá dónde jugar y seguí todo desde el celular.',
    cta: 'Empezar a jugar', to: '/register',
    items: ['Inscribite a torneos desde la app', 'Mirá la tabla y la cancha de cada partido en vivo', 'Sumate a amistosos abiertos cerca tuyo', 'Armá tu historial con rachas y títulos'],
  },
  {
    id: 'rol-organizadores', icon: ClipboardList, title: 'Organizadores', desc: 'Armá en la compu, cargá en vivo desde el celular.',
    cta: 'Organizar un torneo', to: '/register?redirect=%2Ftorneos%2Forganizar',
    items: ['Ligas, americanos y copas en minutos', 'Inscripciones con cobro online por Mercado Pago', 'Si una pareja se baja, la tabla no se desarma', 'Sumá co-organizadores a tu categoría'],
  },
  {
    id: 'rol-clubes', icon: Building2, title: 'Clubes', desc: 'Tu club visible para los jugadores de la zona.',
    cta: 'Sumar mi club', to: '/register?redirect=%2Fpadeleros%2Fclubes',
    items: ['Perfil del club con canchas y precios', 'Reservas de turnos desde la app', 'Cobro online de reservas', 'Tus torneos y amistosos en el mapa'],
  },
]

export default function RolesSection() {
  return (
    <section id="roles" className="bg-land-night text-land-text py-16 md:py-28">
      <div className="mx-auto max-w-[1200px] px-5 md:px-12">
        <h2 className="land-reveal m-0 max-w-[760px] font-condensed font-bold text-[30px] md:text-[46px] leading-[1.06] tracking-[-0.02em]">Una cuenta, tres formas de usarla</h2>
        <p className="land-reveal land-reveal-2 mt-[18px] mb-14 max-w-[560px] font-sans text-[17px] md:text-[19px] leading-[1.55] text-land-night-soft">Sos jugador, organizador y dueño de club con el mismo usuario. Activás solo lo que usás.</p>
        <div className="flex md:grid md:grid-cols-3 gap-3.5 md:gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory scroll-px-5 -mx-5 px-5 md:mx-0 md:px-0 pb-2.5 md:pb-0">
          {ROLES.map(({ id, icon, title, desc, cta, to, items }) => {
            const Icon = icon
            return (
            <article key={id} id={id} className="land-reveal scroll-mt-6 min-w-[84%] md:min-w-0 snap-start p-[30px] rounded-[22px] bg-land-night-2 border border-land-night-line flex flex-col">
              <span className="w-[52px] h-[52px] rounded-[14px] bg-land-lime text-land-ink flex items-center justify-center"><Icon size={24} aria-hidden="true" /></span>
              <h3 className="mt-6 mb-2 font-condensed font-bold text-[24px] leading-[1.2]">{title}</h3>
              <p className="m-0 mb-5 font-sans text-[16px] leading-[1.5] text-land-night-soft">{desc}</p>
              <ul className="list-none m-0 mb-[26px] p-0 flex flex-col gap-3 flex-1">
                {items.map((it) => (
                  <li key={it} className="flex gap-2.5 font-sans text-[15px] leading-[1.45] text-land-text/90">
                    <Check size={16} strokeWidth={3} className="shrink-0 mt-[3px] text-land-cyan" aria-hidden="true" />{it}
                  </li>
                ))}
              </ul>
              <Link to={to} className="self-start inline-flex items-center h-11 px-5 rounded-full bg-land-lime/10 font-sans font-bold text-[14px] text-land-lime no-underline hover:bg-land-lime/20 transition-colors">{cta}</Link>
            </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
