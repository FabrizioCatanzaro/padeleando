// Espejo de MAX_RULES en lib/signup.js del backend.
export const MAX_RULES = 10_000;

const URL_RE = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

/** Texto del reglamento en partes: texto plano y enlaces http(s). */
export function partesDelReglamento(texto) {
  return String(texto ?? '').split(URL_RE).map((t, i) => ({ link: i % 2 === 1, t })).filter((p) => p.t);
}
