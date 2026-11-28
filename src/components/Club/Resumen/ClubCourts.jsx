import { Link } from 'react-router-dom'
import { courtSummary, courtFloorColor, courtWallColor } from '../../../utils/clubProfile'
import { formatMoney } from '../../../utils/money'
import CourtGlyph from '../CourtGlyph'

export default function ClubCourts({ club, canManage }) {
  const courts = (club.courts_list ?? []).filter((c) => c.active)
  if (!courts.length && !canManage) return null
  return (
    <section aria-labelledby="club-courts">
      <div className="flex justify-between items-baseline gap-3 mb-3.5">
        <h2 id="club-courts" className="m-0 font-condensed font-bold text-[15px] text-white">Canchas</h2>
        {canManage && <Link to={`/club/${club.id}/editar#canchas`} className="text-[13px] font-bold text-brand no-underline hover:underline">Editar canchas</Link>}
      </div>
      {!courts.length && <p className="m-0 text-sm text-secondary">Todavía no cargaste las canchas del club.</p>}
      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
        {courts.map((c) => {
          const tags = courtSummary(c)
          const price = c.price_60 != null ? Number(c.price_60) : c.price_30 != null ? Number(c.price_30) * 2 : null
          return (
            <article key={c.id} className="rounded-xl border border-border-mid bg-surface p-3.5 flex gap-3.5">
              <CourtGlyph color={courtFloorColor(c)} wall={courtWallColor(c)} className="w-10 h-[70px] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2">
                  <h3 className="m-0 font-sans font-bold text-[15px] text-white">{c.name}</h3>
                  {price != null && <span className="text-[13px] text-white shrink-0 tabular-nums">{formatMoney(price)}/h</span>}
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.map((t) => <span key={t} className="text-[12px] text-content bg-surface-alt border border-border-mid rounded-md px-2 py-0.5">{t}</span>)}
                  </div>
                )}
                {c.description && <p className="m-0 mt-2 text-[13px] text-secondary leading-relaxed">{c.description}</p>}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
