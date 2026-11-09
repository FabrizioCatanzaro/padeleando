// Formatos compartidos por las pantallas de inscripción.

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** '2026-11-13T23:00:00Z' → 'jue 13/11, 20:00' (hora local del navegador). */
export function fmtCierre(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${DIAS[d.getDay()]} ${dd}/${mm}, ${hh}:${mi}`;
}

/** Cupo para mostrar: en la unidad que eligió el organizador. */
export function cupoTexto(signup) {
  const cap = signup?.capacity_players;
  if (cap == null) return null;
  const used = signup.used_players ?? 0;
  if (signup.capacity_unit === 'player') return { used, cap, texto: `${used} de ${cap} jugadores` };
  const u = Math.ceil(used / 2), c = Math.floor(cap / 2);
  return { used: u, cap: c, texto: `${u} de ${c} parejas` };
}

/** Etiqueta de disponibilidad para el jugador: sin números (Fabri 2026-11-09). */
export const DISPONIBILIDAD = {
  open: { label: 'HAY CUPOS',      color: 'text-green border-green/40 bg-green/10' },
  few:  { label: 'ÚLTIMOS CUPOS',  color: 'text-amber-300 border-amber-500/45 bg-amber-500/15' },
  full: { label: 'CUPO COMPLETO',  color: 'text-cyan border-cyan/40 bg-cyan/10' },
};

export const ESTADO_META = {
  pending:   { label: 'Pendiente',      color: 'text-amber-300 border-amber-500/45 bg-amber-500/15' },
  approved:  { label: 'Aprobada',       color: 'text-green border-green/40 bg-green/10' },
  waitlist:  { label: 'En espera',      color: 'text-cyan border-cyan/40 bg-cyan/10' },
  rejected:  { label: 'Rechazada',      color: 'text-danger border-danger/40 bg-danger/10' },
  cancelled: { label: 'Cancelada',      color: 'text-muted border-border-strong bg-surface-alt' },
};
