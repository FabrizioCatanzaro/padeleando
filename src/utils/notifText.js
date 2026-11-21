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

const REMINDER_TEXT = {
  cargar:    (w) => `Falta cargar el resultado del amistoso${w}`,
  responder: (w) => `Te toca revisar el resultado del amistoso${w}`,
  segundo:   (w) => `El amistoso${w} sigue sin resultado. A los 30 días vence y no suma`,
};

const FRIENDLY_TEXT = {
  friendly_added:     (a, w) => `${a} te sumó a un amistoso${w}`,
  friendly_joined:    (a, w) => `${a} se sumó a tu amistoso${w}`,
  friendly_left:      (a, w) => `${a} dejó tu amistoso${w}`,
  friendly_removed:   (a, w) => `${a} te quitó del amistoso${w}`,
  friendly_full:      (a, w) => `El amistoso${w} ya tiene los 4 jugadores`,
  friendly_updated:   (a, w) => `${a} cambió el horario o la cancha del amistoso${w}`,
  friendly_proposal:  (a, w) => `${a} cargó un resultado del amistoso${w}. Revisalo para que sume`,
  friendly_confirmed: (a, w) => `Se confirmó el resultado del amistoso${w}`,
  friendly_cancelled: (a, w) => `${a} canceló el amistoso${w}`,
  friendly_reminder:  (a, w, n) => (REMINDER_TEXT[n?.body] ?? REMINDER_TEXT.cargar)(w),
};

export const isFriendlyNotif = (n) => Boolean(n?.type && FRIENDLY_TEXT[n.type]);
export const friendlyHref = (n) => (n?.entity_id ? `/amistoso/${n.entity_id}` : null);

/** "del 20/11 19:00 en Pádel Norte", con lo que haya. */
function friendlyWhen(n) {
  const d = n.friendly_date ? String(n.friendly_date).slice(0, 10) : null;
  const fecha = d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : null;
  const hora = n.friendly_time ? String(n.friendly_time).slice(0, 5) : null;
  const cuando = [fecha, hora].filter(Boolean).join(' ');
  return `${cuando ? ` del ${cuando}` : ''}${n.friendly_club_name ? ` en ${n.friendly_club_name}` : ''}`;
}

export function friendlyText(n) {
  const fn = FRIENDLY_TEXT[n?.type];
  return fn ? fn(actor(n), friendlyWhen(n), n) : null;
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
  ...Object.fromEntries(Object.keys(FRIENDLY_TEXT).map((t) => [t, friendlyText])),
};

const MAX = 120;
const clip = (s) => (s.length > MAX ? `${s.slice(0, MAX - 1).trimEnd()}…` : s);

export function notifTitle(n) {
  if (n?.type === 'admin_message') return n.title ?? 'Mensaje del equipo';
  if (n?.type === 'registration_received') return 'Inscripción nueva';
  if (n?.type === 'registration_partner')  return 'Te inscribieron';
  if (n?.type === 'registration_decided')  return 'Tu inscripción';
  if (isFriendlyNotif(n)) return 'Amistoso';
  return 'Notificación nueva';
}

export function notifSummary(n) {
  if (!n) return '';
  const fn = BY_TYPE[n.type];
  return clip(fn ? fn(n) : 'Tenés una notificación nueva');
}
