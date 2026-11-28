// Filtros y agrupado de /club/:id/torneos; sin imports para poder probarlo con node --test

export const STATES = [
  { id: 'todos',    label: 'Todos' },
  { id: 'abierta',  label: 'Inscripción abierta' },
  { id: 'curso',    label: 'En curso' },
  { id: 'proximos', label: 'Próximos' },
  { id: 'fin',      label: 'Finalizados' },
]

const day = (t) => String(t.event_date ?? t.created_at ?? '').slice(0, 10)

export function tournamentState(t) {
  if (t.status === 'finished') return 'fin'
  if (t.has_live || (t.match_count ?? 0) > 0) return 'curso'
  return 'proximos'
}

const matches = (t, f) => (
  (f.estado === 'todos' || (f.estado === 'abierta' ? !!t.signup_open : tournamentState(t) === f.estado))
  && (!f.formato || t.format === f.formato)
  && (!f.grupo || String(t.group_id) === f.grupo)
  && (!f.organizador || t.owner_username === f.organizador)
  && (!f.anio || day(t).startsWith(f.anio))
)

export function filterTournaments(list, f) {
  return list.filter((t) => matches(t, f)).sort((a, b) => day(b).localeCompare(day(a)))
}

export function countByState(list, f) {
  return Object.fromEntries(STATES.map((s) => [s.id, list.filter((t) => matches(t, { ...f, estado: s.id })).length]))
}

export function groupByMonth(list) {
  const groups = []
  for (const t of list) {
    const key = day(t).slice(0, 7)
    const last = groups[groups.length - 1]
    if (last?.key === key) last.items.push(t)
    else groups.push({ key, items: [t] })
  }
  return groups
}

export function filterOptions(list) {
  const uniq = (xs) => [...new Map(xs.filter((x) => x.value).map((x) => [x.value, x])).values()]
  return {
    formatos: uniq(list.map((t) => ({ value: t.format }))).map((x) => x.value),
    grupos: uniq(list.map((t) => ({ value: String(t.group_id ?? ''), label: t.group_name }))).sort((a, b) => a.label.localeCompare(b.label, 'es')),
    organizadores: uniq(list.map((t) => ({ value: t.owner_username }))).map((x) => x.value).sort(),
    anios: [...new Set(list.map((t) => day(t).slice(0, 4)).filter(Boolean))].sort().reverse(),
  }
}
