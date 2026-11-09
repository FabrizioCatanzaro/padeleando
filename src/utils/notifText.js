// Texto plano para el aviso flotante; el panel y /notifications tienen el suyo.

const actor = (n) => (n.actor_username ? `@${n.actor_username}` : n.actor_name ?? 'Alguien');
const grupo = (n) => n.group_name ?? 'una categoría';

/** "Fecha 3 (7ma Caballeros)": el torneo siempre con su categoría. */
export const torneoConCategoria = (n) => {
  const t = n.tournament_name ?? 'un torneo';
  return n.group_name ? `${t} (${n.group_name})` : t;
};
const torneo = torneoConCategoria;

/** Texto de los avisos de inscripción. Lo usan el aviso flotante, el panel y /notifications. */
export function registrationText(n) {
  if (n.type === 'registration_received') return `${actor(n)} se inscribió en ${torneo(n)}.`;
  if (n.type === 'registration_partner')  return `${actor(n)} te inscribió como su pareja en ${torneo(n)}.`;
  if (n.type === 'registration_decided') {
    if (n.title === 'approved') return `Tu inscripción a ${torneo(n)} fue aprobada. Ya tenés un lugar.`;
    if (n.title === 'waitlist') return `Tu inscripción a ${torneo(n)} quedó en lista de espera.`;
    if (n.title === 'rejected') {
      const motivo = n.registration_reason?.trim() || 'Por motivos que definió el organizador.';
      return `Tu inscripción a ${torneo(n)} no fue aprobada. ${motivo}`;
    }
    return `Hay novedades de tu inscripción a ${torneo(n)}.`;
  }
  return null;
}

export const isRegistrationNotif = (n) =>
  n?.type === 'registration_received' || n?.type === 'registration_decided' || n?.type === 'registration_partner';

/** Destino del aviso de inscripción: el organizador va a la solapa INSCRIPCIONES. */
export function registrationHref(n) {
  if (!n?.group_id || !n?.tournament_id) return null;
  const base = `/cat/${n.group_id}/torneo/${n.tournament_id}`;
  return n.type === 'registration_received' ? `${base}?tab=registrations` : base;
}

const BY_TYPE = {
  registration_received: registrationText,
  registration_partner:  registrationText,
  registration_decided:  registrationText,
  follow:             (n) => `${actor(n)} te empezó a seguir`,
  invitation:         (n) => `${actor(n)} te invitó a unirte a ${grupo(n)}${n.player_name ? ` como ${n.player_name}` : ''}`,
  join_request:       (n) => `${actor(n)} solicitó unirse a ${torneoConCategoria(n)}`,
  collab_invite:      (n) => `${actor(n)} te invitó a co-organizar ${grupo(n)}`,
  ownership_transfer: (n) => `${actor(n)} quiere transferirte ${grupo(n)}`,
  ownership_received: (n) => `Ahora sos el dueño de ${grupo(n)}`,
  player_unlinked:    (n) => `${actor(n)} te desvinculó de ${grupo(n)}`,
  new_tournament:     (n) => `${actor(n)} creó ${n.tournament_name ?? 'un torneo'} en ${grupo(n)}`,
  club_request:       ()  => 'Novedades sobre tu solicitud de club',
  club_claim:         (n) => n.body ?? 'Novedades sobre tu reclamo de club',
  premium_claim:      ()  => 'Tenés un código premium para reclamar',
  admin_message:      (n) => n.body ?? 'Mensaje del equipo',
  booking_decided:    (n) => n.body ?? 'Novedades sobre tu turno',
  booking_requested:  (n) => n.body ?? 'Nueva solicitud de turno',
  booking_cancelled:  (n) => n.body ?? 'Se canceló una reserva',
};

const MAX = 120;
const clip = (s) => (s.length > MAX ? `${s.slice(0, MAX - 1).trimEnd()}…` : s);

export function notifTitle(n) {
  if (n?.type === 'admin_message') return n.title ?? 'Mensaje del equipo';
  if (n?.type === 'registration_received') return 'Inscripción nueva';
  if (n?.type === 'registration_partner')  return 'Te inscribieron';
  if (n?.type === 'registration_decided')  return 'Tu inscripción';
  return 'Notificación nueva';
}

export function notifSummary(n) {
  if (!n) return '';
  const fn = BY_TYPE[n.type];
  return clip(fn ? fn(n) : 'Tenés una notificación nueva');
}
