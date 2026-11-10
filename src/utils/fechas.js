// Liga por fechas: la temporada se divide en fechas con sus días de juego.

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** ¿Es una liga que se juega en varios días? */
export const esTemporada = (t) => t?.format === 'liga' && t?.liga_mode === 'temporada';

const aFecha = (iso) => new Date(`${String(iso).slice(0, 10)}T00:00`);

/** '2026-11-22' → 'sáb 22'. */
export function diaCorto(iso) {
  if (!iso) return '';
  const d = aFecha(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()}`;
}

/** '2026-11-22' → 'sáb 22/11'. */
export function diaConMes(iso) {
  if (!iso) return '';
  const d = aFecha(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

/** Días de una fecha, del primero al último (a lo sumo 7). */
export function diasDeFecha(fecha) {
  if (!fecha?.start_date) return [];
  const out = [];
  const d = aFecha(fecha.start_date);
  const fin = aFecha(fecha.end_date ?? fecha.start_date);
  while (d <= fin && out.length < 7) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** 'sáb 22/11' o 'sáb 22 y dom 23/11' o 'sáb 22 al lun 24/11'. */
export function rangoDeFecha(fecha) {
  const dias = diasDeFecha(fecha);
  if (dias.length === 0) return '';
  if (dias.length === 1) return diaConMes(dias[0]);
  const union = dias.length === 2 ? ' y ' : ' al ';
  return `${diaCorto(dias[0])}${union}${diaConMes(dias[dias.length - 1])}`;
}

const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Número de la fecha en curso: la primera que no terminó, o la última. */
export function fechaEnCurso(fechas = [], hoy = hoyIso()) {
  if (fechas.length === 0) return null;
  const abierta = fechas.find((f) => String(f.end_date ?? f.start_date).slice(0, 10) >= hoy);
  return (abierta ?? fechas[fechas.length - 1]).number;
}

const claveEquipo = (team) => [...(team ?? [])].map(String).sort().join('|');

/** Id de la pareja cuyo equipo son exactamente esos dos jugadores. */
export function parejaDeEquipo(team, pairs = []) {
  const k = claveEquipo(team);
  return pairs.find((p) => claveEquipo([p.p1, p.p2]) === k)?.id ?? null;
}

/** Parejas activas que no juegan en esa fecha (ni jugado ni programado). */
export function libresDeFecha(tournament, number) {
  const enFecha = [
    ...(tournament.matches ?? []).filter((m) => m.round === number),
    ...(tournament.scheduled_matches ?? []).filter((s) => s.round === number),
  ];
  if (enFecha.length === 0) return [];
  const juegan = new Set(enFecha.flatMap((m) => [claveEquipo(m.team1), claveEquipo(m.team2)]));
  return (tournament.pairs ?? [])
    .filter((p) => p.status !== 'withdrawn' && !juegan.has(claveEquipo([p.p1, p.p2])));
}

/** Estado de una fecha para su chip: 'completa', 'pendiente' (ya pasó con partidos sin jugar) o null. */
export function estadoDeFecha(tournament, fecha, hoy = hoyIso()) {
  const pendientes = (tournament.scheduled_matches ?? []).filter((s) => s.round === fecha.number).length;
  const jugados = (tournament.matches ?? []).filter((m) => m.round === fecha.number).length;
  if (pendientes === 0 && jugados > 0) return 'completa';
  const termino = String(fecha.end_date ?? fecha.start_date).slice(0, 10) < hoy;
  return termino && pendientes > 0 ? 'pendiente' : null;
}
