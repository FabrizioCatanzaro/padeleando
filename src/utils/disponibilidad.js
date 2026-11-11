// Disponibilidad horaria: espejo de lib/availability.js del backend.
import { diaCorto } from './fechas';

export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
// La semana empieza el lunes.
export const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0];
export const MAX_RANGOS = 2;
export const MAX_NOTA = 200;

const pad = (n) => String(n).padStart(2, '0');
// De 07:00 a 24:00, cada 30 minutos.
export const HORAS = Array.from({ length: 35 }, (_, i) => `${pad(7 + Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`);

export const aMin = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const deMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
/** '19:00' → '19', '19:30' → '19:30'. */
export const horaCorta = (h) => (h.endsWith(':00') ? String(Number(h.slice(0, 2))) : `${Number(h.slice(0, 2))}:${h.slice(3)}`);
const rango = (r) => `${horaCorta(r.from)}–${horaCorta(r.to)}`;

/** Disponibilidad vacía o sin nada cargado. */
export const sinDisponibilidad = (av) => !av || ((av.slots?.length ?? 0) === 0 && !av.note);

/** 'lun y mié 19–23 · sáb 10–13': agrupa los días con los mismos rangos. */
export function resumenDisponibilidad(av) {
  if (!av?.slots?.length) return '';
  const porDia = new Map();
  for (const s of av.slots) porDia.set(s.day, [...(porDia.get(s.day) ?? []), s]);
  const grupos = [];
  for (const d of ORDEN_DIAS) {
    if (!porDia.has(d)) continue;
    const txt = porDia.get(d).map(rango).join(' y ');
    const g = grupos.find((x) => x.txt === txt);
    if (g) g.dias.push(CORTOS[d]); else grupos.push({ txt, dias: [CORTOS[d]] });
  }
  return grupos.map((g) => {
    const dias = g.dias.length > 1 ? `${g.dias.slice(0, -1).join(', ')} y ${g.dias.at(-1)}` : g.dias[0];
    return `${dias} ${g.txt}`;
  }).join(' · ');
}

/** Rangos de un día de la semana, como minutos. */
const rangosDelDia = (av, day) => (av?.slots ?? []).filter((s) => s.day === day).map((s) => [aMin(s.from), aMin(s.to)]);

/** Intersección de dos listas de rangos en minutos. */
function cruzar(a, b) {
  const out = [];
  for (const [a1, a2] of a) for (const [b1, b2] of b) {
    const ini = Math.max(a1, b1), fin = Math.min(a2, b2);
    if (fin - ini >= 60) out.push([ini, fin]);
  }
  return out;
}

/**
 * Días de la lista en los que coinciden todas las disponibilidades, con al
 * menos una hora en común: [{ date, label, ranges: [{ from, to }] }].
 */
export function coincidencias(disponibilidades, fechasIso) {
  const lista = disponibilidades.filter((av) => av?.slots?.length);
  if (lista.length < 2) return [];
  return fechasIso.map((date) => {
    const day = new Date(`${date}T00:00`).getDay();
    const comunes = lista.slice(1).reduce((acc, av) => cruzar(acc, rangosDelDia(av, day)), rangosDelDia(lista[0], day));
    return { date, label: diaCorto(date), ranges: comunes.map(([f, t]) => ({ from: deMin(f), to: deMin(t) })) };
  }).filter((c) => c.ranges.length > 0);
}

export const rangoTexto = rango;

/** ¿Hay algún rango con la hora de inicio después de la de fin? */
export const disponibilidadInvalida = (av) => (av?.slots ?? []).some((s) => aMin(s.from) >= aMin(s.to));
