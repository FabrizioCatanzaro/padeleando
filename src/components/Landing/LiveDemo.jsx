import { useEffect, useState } from 'react'

const SEQ = [[0, 0, 4, 3], [15, 0, 4, 3], [30, 0, 4, 3], [30, 15, 4, 3], [40, 15, 4, 3], [0, 0, 5, 3], [0, 15, 5, 3], [15, 15, 5, 3]]
const TABLE = [
  { pos: 1, name: 'Ríos / Medina', pg: 2, dif: '+7' },
  { pos: 2, name: 'Paz / Ferreyra', pg: 2, dif: '+4' },
  { pos: 3, name: 'Gómez / Sosa', pg: 0, dif: '−11' },
]

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Partido de muestra que avanza solo: enseña el marcador en vivo sin depender de datos reales.
export default function LiveDemo({ className = '', style }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (reducedMotion()) return
    const id = setInterval(() => setTick((t) => t + 1), 2400)
    return () => clearInterval(id)
  }, [])

  const [a, b, g1, g2] = SEQ[tick % SEQ.length]
  const rows = [
    { name: 'Ríos / Medina', s1: 6, s2: g1, pt: a, lead: a > b },
    { name: 'Paz / Ferreyra', s1: 4, s2: g2, pt: b, lead: b > a },
  ]

  return (
    <div style={style} className={`w-full rounded-[22px] p-5 sm:p-[22px] bg-land-night/75 border border-land-text/12 backdrop-blur-md shadow-[0_30px_80px_rgb(0_0_0/0.55)] ${className}`}>
      <div className="flex items-center justify-between gap-2.5 mb-[18px]">
        <span className="flex items-center gap-2 font-sans text-[13px] font-bold text-land-cyan">
          <span className="land-ping w-2 h-2 rounded-full bg-land-cyan" aria-hidden="true" />En vivo · Cancha 2
        </span>
        <span className="font-sans text-[13px] text-land-soft">Americano C7 · ejemplo</span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_34px_34px_64px] gap-2 items-center px-1 pb-2 font-sans text-[12px] text-land-soft">
        <span>Pareja</span><span className="text-center">S1</span><span className="text-center">S2</span><span className="text-center">Punto</span>
      </div>
      {rows.map((r) => (
        <div key={r.name} className="grid grid-cols-[minmax(0,1fr)_34px_34px_64px] gap-2 items-center px-1 py-3 border-t border-land-text/8">
          <span className="font-sans font-bold text-[16px] text-land-text truncate">{r.name}</span>
          <span className="text-center font-condensed font-semibold text-[18px] text-land-soft">{r.s1}</span>
          <span className="text-center font-condensed font-bold text-[18px] text-land-text">{r.s2}</span>
          <span className={`flex justify-center items-center h-[42px] rounded-[10px] overflow-hidden transition-colors ${r.lead ? 'bg-land-lime text-land-ink' : 'bg-land-text/7 text-land-text'}`}>
            <span key={`${tick}-${r.pt}`} className="land-point font-condensed font-extrabold text-[20px]">{r.pt}</span>
          </span>
        </div>
      ))}

      <div className="mt-4 px-3.5 pt-3.5 pb-1.5 rounded-[14px] bg-land-text/4">
        <div className="flex justify-between font-sans text-[12px] text-land-soft mb-1.5"><span>Tabla del grupo B</span><span>PG · Dif</span></div>
        {TABLE.map((r) => (
          <div key={r.pos} className="flex items-center gap-2.5 py-2 font-sans text-[14px] border-t border-land-text/6">
            <span className={`w-[18px] font-extrabold ${r.pos === 1 ? 'text-land-lime' : r.pos === 2 ? 'text-land-text' : 'text-land-soft'}`}>{r.pos}</span>
            <span className="flex-1 font-semibold text-land-text">{r.name}</span>
            <span className="text-land-text/80">{r.pg} · {r.dif}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
