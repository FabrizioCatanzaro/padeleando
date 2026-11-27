import { useState, useEffect, useRef } from 'react'
import { useAdFree } from '../../hooks/useAdFree'

const CONTACT_HREF = 'mailto:publicidad@padeleando.ar?subject=Publicidad%20en%20Padeleando&body=Hola%20Padeleando!'

const CDN = 'https://res.cloudinary.com/dm80qflwa/image/upload'

const ADS = [
  { src: `${CDN}/v1795467118/ads/banner_padeleando_sumate.jpg`,       href: CONTACT_HREF },
  { src: `${CDN}/v1795467129/ads/banner_torneo_abierto.jpg`,          href: CONTACT_HREF },
  { src: `${CDN}/v1795467140/ads/banner_punto_de_oro_padel_shop.jpg`, href: CONTACT_HREF },
  { src: `${CDN}/v1795467150/ads/banner_la_smasheria.jpg`,            href: CONTACT_HREF },
  { src: `${CDN}/v1795467160/ads/banner_carniceria_el_tanito.jpg`,    href: CONTACT_HREF },
]

// Los originales miden 2304x1856: el slot usa esa proporción y nunca recorta.
const WIDTH = 300
const HEIGHT = 242
const SIZES = [300, 600, 900]

const cdnUrl = (src, w) => src.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${w}/`)
const srcSet = (src) => SIZES.map((w) => `${cdnUrl(src, w)} ${w}w`).join(', ')

const ROTATION_MS = 7_000

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function AdBanner(props) {
  const adFree = useAdFree()
  return adFree ? null : <AdSlot {...props} />
}

function AdSlot({ className = '' }) {
  const ref = useRef(null)
  const [start] = useState(() => Math.floor(Math.random() * ADS.length))
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const idx = (start + step) % ADS.length

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || ADS.length <= 1 || reducedMotion()) return
    const id = setInterval(() => setStep((s) => s + 1), ROTATION_MS)
    return () => clearInterval(id)
  }, [visible])

  return (
    <div ref={ref} className={`relative overflow-hidden rounded-xl bg-surface w-full max-w-[300px] aspect-[2304/1856] mx-auto ${className}`}>
      {ADS.map((ad, i) => {
        if ((i - start + ADS.length) % ADS.length > step + 1) return null
        const active = i === idx
        const wrapperClass = `absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${active ? 'opacity-100' : 'opacity-0 pointer-events-none'}`
        const img = (
          <img
            src={cdnUrl(ad.src, WIDTH * 2)}
            srcSet={srcSet(ad.src)}
            sizes={`${WIDTH}px`}
            alt="Publicidad"
            width={WIDTH}
            height={HEIGHT}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain"
          />
        )
        return ad.href ? (
          <a key={ad.src} href={ad.href} target="_blank" rel="noopener noreferrer" className={wrapperClass} tabIndex={active ? 0 : -1} aria-hidden={!active}>
            {img}
          </a>
        ) : (
          <div key={ad.src} className={wrapperClass} aria-hidden={!active}>
            {img}
          </div>
        )
      })}
    </div>
  )
}
