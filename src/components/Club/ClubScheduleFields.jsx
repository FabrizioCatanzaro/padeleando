import { DAYS } from './scheduleGrid'

const timeCls = 'bg-surface border border-border-mid text-white text-[12px] font-sans rounded-sm px-1.5 py-1 outline-none'

// Grilla día × horario; grid viene de scheduleGrid.js (7 entradas con open, from, to)
export default function ClubScheduleFields({ grid, onChange }) {
  const anyOpen = grid.some((d) => d.open)

  function toggleDay(key, open) {
    onChange(grid.map((d) => (d.key === key ? { ...d, open } : d)))
  }
  function setHour(key, field, value) {
    onChange(grid.map((d) => (d.key === key ? { ...d, [field]: value } : d)))
  }
  function copyFirstToAll() {
    const first = grid.find((d) => d.open)
    if (!first) return
    onChange(grid.map((d) => ({ ...d, open: true, from: first.from, to: first.to })))
  }

  return (
    <div>
      {anyOpen && (
        <div className="flex justify-end mb-1.5">
          <button
            type="button"
            onClick={copyFirstToAll}
            className="text-[10px] font-mono text-brand hover:underline bg-transparent border-none cursor-pointer p-0"
          >
            Copiar el primer horario a todos los días
          </button>
        </div>
      )}
      <div className="border border-border-mid rounded-sm divide-y divide-border-mid overflow-hidden">
        {grid.map((d, i) => {
          const meta = DAYS[i]
          return (
            <div key={d.key} className="flex items-center gap-2.5 px-3 py-1.5">
              <label className="flex items-center gap-2 w-[68px] shrink-0 cursor-pointer select-none">
                <input type="checkbox" checked={d.open} onChange={(e) => toggleDay(d.key, e.target.checked)} />
                <span className="text-[12px] font-sans text-white">{meta.abbr}</span>
              </label>
              {d.open ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="time" value={d.from} className={timeCls}
                    onChange={(e) => setHour(d.key, 'from', e.target.value)}
                  />
                  <span className="text-muted text-[11px]">a</span>
                  <input
                    type="time" value={d.to} className={timeCls}
                    onChange={(e) => setHour(d.key, 'to', e.target.value)}
                  />
                </div>
              ) : (
                <span className="text-[11.5px] text-dim font-sans">Cerrado</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
