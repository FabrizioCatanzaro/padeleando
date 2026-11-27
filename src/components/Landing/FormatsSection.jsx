import { AMERICANO_MIN_PAIRS, AMERICANO_MAX_PAIRS } from '../../utils/helpers'
import { COPA_MAX_PAIRS } from '../../utils/copa'

const FORMATS = [
  { id: 'liga', name: 'Liga', desc: 'Todos contra todos, con tabla por puntos. Ideal para jugar una fecha por semana.', tags: ['Parejas fijas o libres', 'Varias fechas', 'Tabla en vivo'] },
  { id: 'americano', name: 'Americano', desc: 'Una previa para ordenar a las parejas y después un cuadro eliminatorio hasta la final.', tags: [`${AMERICANO_MIN_PAIRS} a ${AMERICANO_MAX_PAIRS} parejas`, 'En un día', 'Cuadro eliminatorio'] },
  { id: 'copa', name: 'Copa', desc: 'Grupos y playoffs, o cuadro directo. Las parejas eliminadas siguen en la copa de plata.', tags: [`Hasta ${COPA_MAX_PAIRS} parejas`, 'Grupos y playoffs', 'Copa de plata'] },
]

export default function FormatsSection() {
  return (
    <section className="bg-land-ink text-land-text py-16 md:py-28">
      <div className="mx-auto max-w-[1200px] px-5 md:px-12">
        <h2 className="land-reveal m-0 max-w-[760px] font-condensed font-bold text-[30px] md:text-[46px] leading-[1.06] tracking-[-0.02em]">Tres formatos para armar tu torneo</h2>
        <p className="land-reveal land-reveal-2 mt-[18px] mb-[52px] max-w-[560px] font-sans text-[17px] md:text-[19px] leading-[1.55] text-land-soft">Elegís el formato, cargás las parejas y la app arma el fixture, la tabla y el cuadro.</p>
        <div className="flex md:grid md:grid-cols-3 gap-3.5 md:gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory -mx-5 px-5 md:mx-0 md:px-0 pb-2.5 md:pb-0">
          {FORMATS.map((f) => (
            <article key={f.id} className="land-reveal min-w-[84%] md:min-w-0 snap-start rounded-[22px] overflow-hidden bg-land-graphite border border-land-line flex flex-col">
              <img src={`/formatos/${f.id}-600.webp`} srcSet={`/formatos/${f.id}-600.webp 600w, /formatos/${f.id}-1200.webp 1200w`}
                sizes="(min-width: 768px) 33vw, 84vw" width="600" height="338" alt="" loading="lazy" decoding="async"
                className="block w-full h-auto aspect-video object-cover" />
              <div className="px-6 pt-6 pb-7 flex flex-col gap-3">
                <h3 className="m-0 font-condensed font-bold text-[26px]">{f.name}</h3>
                <p className="m-0 font-sans text-[16px] leading-[1.5] text-land-text/80">{f.desc}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {f.tags.map((t) => <span key={t} className="font-sans text-[13px] px-2.5 py-[5px] rounded-full bg-land-graphite-2 text-land-text/85">{t}</span>)}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
