import { api } from './api'

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function fechaCorta(date, time) {
  const [y, m, d] = String(date).slice(0, 10).split('-').map(Number)
  const dia = DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${dia} ${d}/${m}${time ? `, ${String(time).slice(0, 5)}` : ''}`
}

function faltan(match) {
  const libres = (match.players ?? []).filter((p) => !p.user && !p.guest_name).length
  if (match.status !== 'abierto' || libres === 0) return null
  return libres === 1 ? 'Falta 1 jugador.' : `Faltan ${libres} jugadores.`
}

function detalleAmistoso(match) {
  return [match.club?.name && `${match.club.name}.`, faltan(match)].filter(Boolean).join(' ')
}

// Qué va a hacer la persona después de ingresar, según la ruta de ?redirect=.
export function redirectContext(target) {
  if (!target || !target.startsWith('/') || target === '/') return null
  const url = new URL(target, 'https://padeleando.ar')
  const path = url.pathname
  let m

  if ((m = path.match(/^\/amistoso\/invitacion\/([^/]+)$/))) {
    const token = decodeURIComponent(m[1])
    return {
      icon: 'users',
      title: 'Te invitaron a un amistoso',
      detail: 'Ingresá para tomar tu lugar en el partido.',
      action: 'y sumarme',
      load: () => api.friendlies.inviteInfo(token).then(({ match }) => ({
        title: `Amistoso del ${fechaCorta(match.date, match.start_time)}`,
        detail: match.club?.name ? `${match.club.name}. Te guardaron un lugar.` : 'Te guardaron un lugar.',
      })),
    }
  }
  if ((m = path.match(/^\/amistoso\/([^/]+)$/))) {
    const id = decodeURIComponent(m[1])
    return {
      icon: 'users',
      title: 'Amistoso',
      detail: 'Ingresá para sumarte al partido.',
      action: 'y sumarme',
      load: () => api.friendlies.get(id, url.searchParams.get('t')).then((match) => ({
        title: `Amistoso del ${fechaCorta(match.date, match.start_time)}`,
        detail: detalleAmistoso(match) || 'Ingresá para ver el partido.',
        action: faltan(match) ? 'y sumarme' : null,
      })),
    }
  }
  if (path === '/amistosos/nuevo') {
    return { icon: 'plus', title: 'Creá tu amistoso', detail: 'Ingresá para armar el partido.' }
  }
  if (/^\/invitacion\/[^/]+$/.test(path)) {
    return { icon: 'mail', title: 'Tenés una invitación', detail: 'Ingresá para verla y aceptarla.' }
  }
  if (/^\/cat\/[^/]+\/torneo\/[^/]+$/.test(path)) {
    return { icon: 'trophy', title: 'Inscripción al torneo', detail: 'Ingresá para inscribirte.' }
  }
  if (/^\/view\/[^/]+$/.test(path)) {
    return { icon: 'trophy', title: 'Sumate al torneo', detail: 'Ingresá para pedir tu lugar.' }
  }
  if (path === '/padeleros/jugadores') {
    return { icon: 'users', title: 'Tu red de padeleros', detail: 'Ingresá para ver con quién jugaste.' }
  }
  return null
}
