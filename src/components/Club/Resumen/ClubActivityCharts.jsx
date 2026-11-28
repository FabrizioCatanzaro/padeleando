import { useEffect, useMemo, useState } from 'react'
import { Lock } from 'lucide-react'
import { api } from '../../../utils/api'
import { occupancyGrid } from '../../../utils/clubOccupancy'
import { DAYS } from '../scheduleGrid'

const MONTH = new Intl.DateTimeFormat('es-AR', { month: 'short' })
const monthInitial = (key) => {
  const [y, m] = key.split('-').map(Number)
  return MONTH.format(new Date(y, m - 1, 1)).charAt(0).toUpperCase()
}
const monthLong = (key) => {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

function Bars({ title, total, bars, colorCls, note, aria }) {
  const max = Math.max(1, ...bars.map((b) => b.n))
  return (
    <figure className="m-0 rounded-xl border border-border-mid bg-surface p-4 sm:p-5">
      <figcaption className="flex justify-between items-baseline gap-2">
        <span className="text-[13px] text-soft">{title}</span>
        <span className="font-condensed font-black text-[20px] text-white tabular-nums">{total}</span>
      </figcaption>
      <div role="img" aria-label={aria} className="flex items-end gap-1 sm:gap-1.5 h-[120px] mt-4 border-b border-border-strong">
        {bars.map((b) => (
          <div key={b.key} className="flex-1 h-full flex flex-col justify-end items-center gap-1" title={`${b.full}: ${b.n}`}>
            {b.n > 0 && <span className="text-[11px] text-soft tabular-nums">{b.n}</span>}
            <div className={`w-full max-w-[34px] rounded-t ${colorCls}`} style={{ height: `${Math.max(3, Math.round((b.n / max) * 82))}%` }} />
          </div>
        ))}
      </div>
      <div className="flex gap-1 sm:gap-1.5 mt-1.5" aria-hidden="true">
        {bars.map((b) => <span key={b.key} className="flex-1 text-center text-[11px] text-dim">{b.label}</span>)}
      </div>
      {note && <p className="m-0 mt-2.5 text-[12px] text-dim">{note}</p>}
    </figure>
  )
}

const HEAT = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4']

function Occupancy({ club, grid }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    let cancelled = false
    api.clubs.bookings.occupancy(club.id).then((d) => { if (!cancelled) setData(d) }).catch(() => {})
    return () => { cancelled = true }
  }, [club.id])
  const courts = (club.courts_list ?? []).filter((c) => c.active).length || club.courts || 1
  const occ = useMemo(() => (data ? occupancyGrid(grid, data.cells, courts, data.weeks) : null), [data, grid, courts])
  if (!grid) return null
  return (
    <figure className="m-0 mt-3.5 rounded-xl border border-brand/30 bg-surface p-4 sm:p-5 min-h-[260px]">
      <figcaption className="flex justify-between items-center gap-2 flex-wrap">
        <span>
          <span className="block text-[13px] text-soft">Ocupación de reservas · últimas 8 semanas</span>
          <span className="block font-condensed font-black text-[20px] text-white mt-1 tabular-nums">{occ ? `${occ.percent} %` : '—'}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-[12px] text-brand"><Lock size={13} aria-hidden="true" />Solo lo ves vos</span>
      </figcaption>
      {occ && (
        <>
          <div role="img" aria-label={`Ocupación por día y franja horaria, ${occ.percent} % en total`}
            className="grid gap-1 mt-4" style={{ gridTemplateColumns: `42px repeat(${occ.bands.length}, minmax(0, 1fr))` }}>
            <span />
            {occ.bands.map((b) => <span key={b} className="text-[11px] text-dim text-center">{b * 2}</span>)}
            {occ.rows.map((r) => (
              <div key={r.idx} className="contents">
                <span className="text-[12px] text-secondary self-center">{DAYS[r.idx].abbr}</span>
                {r.cells.map((c) => (
                  <span key={c.band} title={c.ratio == null ? 'Cerrado' : `${Math.round(c.ratio * 100)} %`}
                    className={`h-[22px] rounded ${c.level == null ? 'bg-transparent border border-dashed border-border' : HEAT[c.level]}`} />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-dim" aria-hidden="true">
            Libre {HEAT.map((h) => <span key={h} className={`w-4 h-2.5 rounded-sm ${h}`} />)} Lleno
          </div>
        </>
      )}
    </figure>
  )
}

// Torneos y jugadores del club por mes o por año; el dueño ve además la ocupación
export default function ClubActivityCharts({ club, activity, grid, showOccupancy }) {
  const [period, setPeriod] = useState('mes')
  if (!activity) return null
  const anyActivity = activity.months.some((m) => m.torneos || m.jugadores) || activity.years.length > 0
  if (!anyActivity && !showOccupancy) return null
  const rows = period === 'mes'
    ? activity.months.map((m) => ({ key: m.key, label: monthInitial(m.key), full: monthLong(m.key), t: m.torneos, j: m.jugadores }))
    : activity.years.map((y) => ({ key: y.key, label: y.key, full: y.key, t: y.torneos, j: y.jugadores }))
  const sum = (k) => rows.reduce((n, r) => n + r[k], 0)
  const peak = rows.reduce((a, r) => (r.j > (a?.j ?? -1) ? r : a), null)
  const seg = (on) => `border-0 px-3.5 py-2 text-[13px] font-semibold cursor-pointer ${on ? 'bg-white text-base' : 'bg-transparent text-soft'}`

  return (
    <section aria-labelledby="club-act">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3.5">
        <h2 id="club-act" className="m-0 font-condensed font-bold text-[15px] text-white">Actividad del club</h2>
        <div role="group" aria-label="Período" className="flex border border-border-strong rounded-lg overflow-hidden">
          <button type="button" aria-pressed={period === 'mes'} onClick={() => setPeriod('mes')} className={seg(period === 'mes')}>Por mes</button>
          <button type="button" aria-pressed={period === 'anio'} onClick={() => setPeriod('anio')} className={seg(period === 'anio')}>Por año</button>
        </div>
      </div>
      {anyActivity && (
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
          <Bars title={period === 'mes' ? 'Torneos por mes' : 'Torneos por año'} total={sum('t')} colorCls="bg-chart-1"
            bars={rows.map((r) => ({ key: r.key, label: r.label, full: r.full, n: r.t }))}
            aria={`${sum('t')} torneos ${period === 'mes' ? 'en los últimos 12 meses' : 'en total'}`}
            note={period === 'mes' ? 'Últimos 12 meses' : null} />
          <Bars title={period === 'mes' ? 'Jugadores distintos por mes' : 'Jugadores distintos por año'}
            total={period === 'mes' ? activity.jugadores_total : activity.jugadores_total} colorCls="bg-chart-2"
            bars={rows.map((r) => ({ key: r.key, label: r.label, full: r.full, n: r.j }))}
            aria={`Jugadores distintos ${period === 'mes' ? 'por mes' : 'por año'}${peak?.j ? `, con pico de ${peak.j} en ${peak.full}` : ''}`}
            note={`${activity.jugadores_total} personas distintas en total, en torneos y amistosos`} />
        </div>
      )}
      {showOccupancy && <Occupancy club={club} grid={grid} />}
    </section>
  )
}
