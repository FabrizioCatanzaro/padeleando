// Categorías de juego. Espejo de lib/category.js del backend, que es el que manda.
//
// Jugador: rama C (Caballeros) o D (Damas) + número del 1 al 10, escrito "C7".
// El 1 es el nivel más alto.
// Torneo: C7 / D5 (fija), M6 (mixto de categoría), SC11 / SD11 / SM11 (suma
// de caballeros, damas o mixto: los números de la pareja suman 11 o más).

export const CATEGORY_BRANCHES = [
  { value: 'C', label: 'Caballeros' },
  { value: 'D', label: 'Damas' },
];

export const LEVEL_BRANCHES = [...CATEGORY_BRANCHES, { value: 'M', label: 'Mixto' }];

export const CATEGORY_NUMBERS = Array.from({ length: 10 }, (_, i) => i + 1);
// SUMA va de 8 a 15: los valores que se juegan (Fabri, 2026-11-09).
export const SUM_NUMBERS      = Array.from({ length: 8 }, (_, i) => i + 8);

export const CATEGORY_RE = /^[CD]([1-9]|10)$/;
export const LEVEL_RE    = /^([CDM]([1-9]|10)|S[CDM]([89]|1[0-5]))$/;

/** 'C7' → { branch: 'C', number: 7 }; null si no es válida. */
export function splitCategory(value) {
  if (!value || !CATEGORY_RE.test(value)) return null;
  return { branch: value[0], number: Number(value.slice(1)) };
}

/** Categoría de un jugador como se lee en el pádel: 'C7'. */
export function categoryLabel(value) {
  return splitCategory(value) ? value : null;
}

/** 'SC11' → { kind: 'sum', branch: 'C', value: 11 }; 'M6' → { kind: 'fixed', branch: 'M', value: 6 }. */
export function describeLevel(level) {
  if (!level || !LEVEL_RE.test(level)) return null;
  const sum = level[0] === 'S';
  return { kind: sum ? 'sum' : 'fixed', branch: sum ? level[1] : level[0], value: Number(level.slice(sum ? 2 : 1)) };
}

/** Categoría de un torneo para mostrar: 'C7', 'MIXTO 6', 'SUMA 11 · Caballeros'. */
export function levelLabel(level) {
  const l = describeLevel(level);
  if (!l) return null;
  const branch = LEVEL_BRANCHES.find((b) => b.value === l.branch)?.label ?? '';
  if (l.kind === 'sum') return `SUMA ${l.value} · ${branch}`;
  return l.branch === 'M' ? `MIXTO ${l.value}` : level;
}

/** Arma el código de torneo desde sus tres partes. */
export function buildLevel(kind, branch, value) {
  if (!value) return null;
  return kind === 'sum' ? `S${branch}${value}` : `${branch}${value}`;
}

/**
 * Faltas de una inscripción contra la categoría del torneo. Espejo de
 * checkRegistrationLevel del back. Las faltas avisan; no bloquean.
 * @param {Array<string|null>} categories - categorías de los jugadores (null = desconocida)
 * @returns {{ issues: string[], unknown: boolean }}
 */
export function checkRegistrationLevel(categories, level, { solo = false } = {}) {
  const lvl = describeLevel(level);
  const players = categories.map(splitCategory);
  const known = players.filter(Boolean);
  const unknown = players.some((p) => !p);
  const issues = [];
  if (!lvl) return { issues, unknown };

  const branchName = { C: 'caballeros', D: 'damas' };
  if (lvl.branch === 'M') {
    if (!solo && known.length === 2 && known[0].branch === known[1].branch) {
      issues.push('Mixto: la pareja tiene que ser un caballero y una dama');
    }
  } else {
    for (const p of known) {
      if (p.branch !== lvl.branch) issues.push(`El torneo es de ${branchName[lvl.branch]}`);
    }
  }

  if (lvl.kind === 'fixed') {
    for (const p of known) {
      if (p.number < lvl.value) issues.push(`${p.branch}${p.number} es de un nivel más alto que el torneo`);
    }
  } else if (!unknown && known.length === 2) {
    const total = known[0].number + known[1].number;
    if (total < lvl.value) issues.push(`Suman ${total}: el torneo pide ${lvl.value} o más`);
  } else if (solo && known.length === 1 && known[0].number + 10 < lvl.value) {
    issues.push(`Con ${known[0].branch}${known[0].number} ninguna pareja llega a sumar ${lvl.value}`);
  }

  return { issues: [...new Set(issues)], unknown };
}
