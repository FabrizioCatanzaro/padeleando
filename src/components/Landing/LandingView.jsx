import { useEffect, useRef, useState } from 'react'
import { api } from '../../utils/api'
import LandingHero from './LandingHero'
import OpenNow from './OpenNow'
import RolesSection from './RolesSection'
import PlansBand from './PlansBand'
import FormatsSection from './FormatsSection'
import StatsShowcase from './StatsShowcase'
import ChampionsCarousel from './ChampionsCarousel'
import JoinBand from './JoinBand'
import MobileJoinBar from './MobileJoinBar'

function Totals({ totals }) {
  const items = [
    [totals?.matches, 'partidos cargados'],
    [totals?.players, 'jugadores en torneos'],
    [totals?.tournaments, 'torneos jugados'],
    [totals?.clubs, 'clubes en el mapa'],
  ]
  return (
    <section id="numeros" aria-label="Padeleando en números" className="bg-land-graphite border-y border-land-line text-land-text">
      <div className="mx-auto max-w-[1200px] px-5 md:px-12 py-11 grid grid-cols-2 md:grid-cols-4 gap-x-3.5 gap-y-7 md:gap-5">
        {items.map(([n, label], i) => (
          <div key={label} className={`land-reveal ${i ? 'land-reveal-2' : ''}`}>
            <div className={`font-condensed font-extrabold text-[34px] md:text-[46px] leading-none h-[34px] md:h-[46px] ${i ? 'text-land-text' : 'text-land-lime'}`}>
              {n == null ? <span className="inline-block w-24 h-full rounded-lg bg-land-graphite-2 animate-pulse" /> : `+${n.toLocaleString('es-AR')}`}
            </div>
            <div className="mt-2 font-sans text-[15px] text-land-soft">{label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// Portada del visitante: presenta la app a jugadores, organizadores y clubes.
export default function LandingView() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pastHero, setPastHero] = useState(false)
  const heroRef = useRef(null)

  useEffect(() => {
    api.home.get().then(setData).catch(() => setData(null)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const el = heroRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(([e]) => setPastHero(!e.isIntersecting && e.boundingClientRect.top < 0))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div className="bg-land-ink">
      <LandingHero heroRef={heroRef} />
      <Totals totals={data?.totals} />
      <OpenNow data={data} loading={loading} />
      <RolesSection />
      <PlansBand />
      <FormatsSection />
      <StatsShowcase />
      <ChampionsCarousel champions={data?.champions} />
      <JoinBand />
      <MobileJoinBar visible={pastHero} />
    </div>
  )
}
