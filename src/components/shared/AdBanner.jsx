import { useState, useEffect } from 'react'

const CONTACT_HREF = 'mailto:publicidad@padeleando.ar?subject=Publicidad%20en%20Padeleando&body=Hola%20Padeleando!'

const CDN = 'https://res.cloudinary.com/dm80qflwa/image/upload'

const ADS = [
  { src: `${CDN}/v1795467118/ads/banner_padeleando_sumate.jpg`,       href: CONTACT_HREF },
  { src: `${CDN}/v1795467129/ads/banner_torneo_abierto.jpg`,          href: CONTACT_HREF },
  { src: `${CDN}/v1795467140/ads/banner_punto_de_oro_padel_shop.jpg`, href: CONTACT_HREF },
  { src: `${CDN}/v1795467150/ads/banner_la_smasheria.jpg`,            href: CONTACT_HREF },
  { src: `${CDN}/v1795467160/ads/banner_carniceria_el_tanito.jpg`,    href: CONTACT_HREF },
]

const WIDTH = 300
const HEIGHT = 250

// Los originales son 2304x1856: se recortan al centro a 6:5 y se piden al doble para pantallas retina.
function cdnUrl(src) {
  return src.replace('/upload/', `/upload/f_auto,q_auto,c_fill,g_center,w_${WIDTH * 2},h_${HEIGHT * 2}/`)
}

const ROTATION_MS = 7_000

export default function AdBanner() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (ADS.length <= 1) return
    const id = setInterval(() => {
      setIdx(i => (i + 1) % ADS.length)
    }, ROTATION_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative overflow-hidden rounded-xl w-full max-w-[300px] aspect-[6/5] mx-auto">
      {ADS.map((ad, i) => {
        const active = i === idx
        const wrapperClass = `absolute inset-0 transition-opacity duration-700 ${active ? 'opacity-100' : 'opacity-0 pointer-events-none'}`
        const img = (
          <img
            src={cdnUrl(ad.src)}
            alt="Publicidad"
            width={WIDTH}
            height={HEIGHT}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        )
        return ad.href ? (
          <a key={ad.src} href={ad.href} target="_blank" rel="noopener noreferrer" className={wrapperClass} tabIndex={active ? 0 : -1}>
            {img}
          </a>
        ) : (
          <div key={ad.src} className={wrapperClass}>
            {img}
          </div>
        )
      })}
    </div>
  )
}
