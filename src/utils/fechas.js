// Liga por fechas: la temporada se divide en fechas con sus días de juego.
import { fmtHora } from './helpers';

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

/** Fechas que lleva la temporada sin cruces repetidos, o null si no se sabe. */
export function totalDeFechas(t) {
  const activas = (t.pairs ?? []).filter((p) => p.status !== 'withdrawn').length;
  if (t.allow_rematch || activas < 2) return null;
  return Math.max((t.fechas ?? []).length, activas % 2 ? activas : activas - 1);
}

// Encabezado: "Fecha 3 de 9 · sáb 22 y dom 23/11" y el partido del que mira.
export function resumenTemporada(t, mios = []) {
  const fechas = t.fechas ?? [];
  if (t.bracket) return { linea: t.bracket.final?.winner_id ? 'Playoffs terminados' : 'Playoffs en juego', miPartido: null };
  if (fechas.length === 0) return { linea: 'Fechas a confirmar', miPartido: null };
  const n = fechaEnCurso(fechas);
  const fecha = fechas.find((f) => f.number === n);
  const total = totalDeFechas(t);
  const linea = `Fecha ${n}${total ? ` de ${total}` : ''} · ${rangoDeFecha(fecha)}`;

  const ids = new Set(mios.map(String));
  if (ids.size === 0) return { linea, miPartido: null };
  const juega = (m) => [...(m.team1 ?? []), ...(m.team2 ?? [])].some((id) => ids.has(String(id)));
  const programado = (t.scheduled_matches ?? []).find((s) => s.round === n && juega(s));
  if (programado) {
    const cuando = [
      diaCorto(programado.scheduled_date),
      programado.scheduled_at ? fmtHora(programado.scheduled_at) : null,
      programado.court != null ? `Cancha ${programado.court}` : null,
    ].filter(Boolean).join(' · ');
    return { linea, miPartido: `Tu partido: ${cuando || 'a programar'}${programado.postponed ? ' (postergado)' : ''}` };
  }
  if ((t.matches ?? []).some((m) => m.round === n && juega(m))) return { linea, miPartido: 'Ya jugaste esta fecha' };
  const miPareja = (t.pairs ?? []).find((p) => p.status !== 'withdrawn' && (ids.has(String(p.p1)) || ids.has(String(p.p2))));
  if (miPareja && libresDeFecha(t, n).some((p) => p.id === miPareja.id)) return { linea, miPartido: 'Libre esta fecha' };
  return { linea, miPartido: null };
}
