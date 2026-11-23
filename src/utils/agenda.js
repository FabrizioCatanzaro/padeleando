const DOW = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
const MONTH = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const parse = (day) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function dayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDaysKey(day, n) {
  const dt = parse(day)
  dt.setDate(dt.getDate() + n)
  return dayKey(dt)
}

export function dayParts(day) {
  const dt = parse(day)
  return { dow: DOW[dt.getDay()], num: String(dt.getDate()) }
}

export function shortDay(day) {
  const dt = parse(day)
  return `${DOW[dt.getDay()].toLowerCase()} ${dt.getDate()} ${MONTH[dt.getMonth()]}`
}

export const ROUND_LABEL = {
  dieciseisavos: '16avos', octavos: 'Octavos', cuartos: 'Cuartos', semis: 'Semifinal', final: 'Final', tercer: 'Tercer puesto',
}
