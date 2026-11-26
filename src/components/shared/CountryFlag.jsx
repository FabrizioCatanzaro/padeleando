import { useEffect, useState } from 'react'
import { loadFlag, countryName } from '../../utils/countries'

// Bandera 3:2 de un país; cada SVG se carga solo cuando hace falta.
export default function CountryFlag({ code, width = 20, className = '' }) {
  const [src, setSrc] = useState(null)
  useEffect(() => {
    let alive = true
    loadFlag(code).then((url) => { if (alive) setSrc(url) })
    return () => { alive = false }
  }, [code])
  const height = Math.round((width * 2) / 3)
  if (!code) return null
  return (
    <span className={`inline-block shrink-0 overflow-hidden rounded-[2px] bg-border-mid ${className}`} style={{ width, height }}>
      {src && <img src={src} alt={countryName(code)} width={width} height={height} className="block w-full h-full" />}
    </span>
  )
}
