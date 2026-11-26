// Copa: grupos + playoffs, o cuadro directo. La API llama "zona" al grupo; la interfaz dice "Grupo".
// Espejo de lib/copa.js del back, que es el que manda. Tests: test/copa.test.js.

export const COPA_MAX_PAIRS = 32;
export const ZONAS_MIN = 2;
export const ZONAS_MAX = 8;
export const ZONA_MIN_PAIRS = 3;
export const ZONA_MAX_PAIRS = 6;
export const MAX_PRIZE_TEXT = 200;
export const MAX_PRIZE_TITLE = 60;
export const MAX_PRIZE_PLACE = 4;
export const MAX_PRIZES = 12;

export const esCopa = (t) => t?.format === 'copa';
export const esCopaZonas = (t) => esCopa(t) && t?.copa_config?.mode === 'zonas';
export const esCopaCuadro = (t) => esCopa(t) && t?.copa_config?.mode === 'cuadro';
/** Torneos con fixture por fechas: liga en varios días y copa con grupos. */
export const usaFechas = (t) => (t?.format === 'liga' && t?.liga_mode === 'temporada') || esCopaZonas(t);

/** Letra del grupo: 1 → A. */
export const grupoLetra = (n) => String.fromCharCode(64 + Number(n));
export const grupoNombre = (n) => `Grupo ${grupoLetra(n)}`;

export function defaultCopaConfig(mode = 'zonas') {
  return mode === 'cuadro'
    ? { mode, tercer_puesto: false }
    : { mode: 'zonas', zonas: 2, ruedas: 1, clasifican: 2, mejores_extra: 0, plata: false, tercer_puesto: false };
}

export const totalClasificados = (c) => (c.zonas ?? 0) * (c.clasifican ?? 0) + (c.mejores_extra ?? 0);

/** Parejas mínimas para jugar: 3 por grupo, o 2 en la copa de cuadro. */
export const copaMinPairs = (c) => (c?.mode === 'zonas' ? (c.zonas ?? ZONAS_MIN) * ZONA_MIN_PAIRS : 2);

// Solo las claves de la variante elegida, como las espera la API.
export function copaConfigBody(c) {
  const base = defaultCopaConfig(c.mode);
  return Object.fromEntries(Object.keys(base).map((k) => [k, c[k] ?? base[k]]));
}

// Mismo mensaje que la API, para avisar antes de enviar. null si está bien.
export function copaConfigError(c) {
  if (c.mode !== 'zonas') return null;
  if (c.mejores_extra > c.zonas - 1) return 'Los mejores siguientes tienen que ser menos que los grupos';
  if (c.mejores_extra > 0 && c.clasifican >= ZONA_MAX_PAIRS - 1) return 'Con esa cantidad por grupo no quedan parejas para los mejores siguientes';
  const total = totalClasificados(c);
  if (total < 2 || total > COPA_MAX_PAIRS) return `A playoffs pasan de 2 a ${COPA_MAX_PAIRS} parejas`;
  return null;
}

// Premios por puesto cargados al crear: [{ kind, cup, place, description }], sin los vacíos.
export function premiosDePuestos(textos, cup = 'oro') {
  return textos
    .map((t, i) => ({ kind: 'puesto', cup, place: i + 1, description: String(t ?? '').trim() }))
    .filter((p) => p.description);
}

const ORDINAL = { 1: 'Campeón', 2: 'Subcampeón', 3: 'Tercer puesto', 4: 'Cuarto puesto' };
/** Nombre de un premio para mostrar. */
export function premioTitulo(p) {
  const base = p.kind === 'especial' ? p.title : (ORDINAL[p.place] ?? `Puesto ${p.place}`);
  return p.cup === 'plata' ? `${base} · Copa de plata` : base;
}

const parKey = (ids) => [...ids].map(String).sort().join('|');
const retirada = (p) => p?.status === 'withdrawn';

// Sets y games de un partido. Sin detalle de sets cuenta como un set con ese marcador.
function setsYGames(m) {
  const s1 = Number(m.score1), s2 = Number(m.score2);
  const sets = Array.isArray(m.sets) ? m.sets.filter((s) => Number(s?.s1) !== Number(s?.s2)) : [];
  if (sets.length === 0) return { sets: s1 > s2 ? [1, 0] : [0, 1], games: [s1, s2] };
  const out = { sets: [0, 0], games: [0, 0] };
  for (const s of sets) {
    const a = Number(s.s1) || 0, b = Number(s.s2) || 0;
    out.sets[a > b ? 0 : 1]++;
    out.games[0] += a;
    out.games[1] += b;
  }
  return out;
}

// Orden de la Copa: puntos, victorias, diferencia de sets, diferencia de games, games a favor.
export function compareCopaRows(a, b) {
  return b.pts - a.pts
      || b.pg - a.pg
      || b.sd - a.sd
      || b.gd - a.gd
      || b.gf - a.gf
      || String(a.id).localeCompare(String(b.id));
}

// Tabla de un grupo. `pairs` usa p1/p2 y `matches` team1/team2, como los deja adaptTournament.
export function copaStandings(pairs, matches, { win = 3, loss = 0 } = {}) {
  const rows = new Map(pairs.map((p) => [parKey([p.p1, p.p2]), {
    id: p.id, zona: p.zona ?? null, pj: 0, pg: 0, pp: 0, pts: 0, sf: 0, sc: 0, gf: 0, gc: 0, sd: 0, gd: 0,
    withdrawn: retirada(p),
  }]));
  for (const m of matches) {
    const s1 = Number(m.score1), s2 = Number(m.score2);
    if (m.score1 === '' || m.score1 == null || !Number.isFinite(s1) || !Number.isFinite(s2) || s1 === s2) continue;
    const r1 = rows.get(parKey(m.team1 ?? []));
    const r2 = rows.get(parKey(m.team2 ?? []));
    if (!r1 || !r2) continue;
    const { sets, games } = setsYGames(m);
    [[r1, 0, s1 > s2], [r2, 1, s2 > s1]].forEach(([r, i, won]) => {
      r.pj++;
      if (won) { r.pg++; r.pts += win; }
      else { r.pp++; if (!m.walkover) r.pts += loss; }
      r.sf += sets[i]; r.sc += sets[1 - i];
      r.gf += games[i]; r.gc += games[1 - i];
    });
  }
  return [...rows.values()]
    .map((r) => ({ ...r, sd: r.sf - r.sc, gd: r.gf - r.gc }))
    .sort((a, b) => Number(a.withdrawn) - Number(b.withdrawn) || compareCopaRows(a, b))
    .map((r, i) => ({ ...r, pos: i + 1 }));
}

/** Parejas agrupadas por grupo, en orden: [{ zona, pairs }]. Sin las que no tienen grupo. */
export function parejasPorGrupo(pairs = []) {
  const out = new Map();
  for (const p of pairs) {
    if (p.zona == null) continue;
    if (!out.has(p.zona)) out.set(p.zona, []);
    out.get(p.zona).push(p);
  }
  return [...out.entries()].sort((a, b) => a[0] - b[0]).map(([zona, list]) => ({ zona, pairs: list }));
}

/** Tabla de cada grupo: [{ zona, rows }]. */
export function tablasPorGrupo(pairs, matches, puntos) {
  return parejasPorGrupo(pairs).map(({ zona, pairs: list }) => ({ zona, rows: copaStandings(list, matches, puntos) }));
}

/** ¿Ya se armaron los grupos? */
export const gruposArmados = (t) => (t?.pairs ?? []).some((p) => p.zona != null);

/** WhatsApp del perfil, privado o público: '+5491112345678', o '' si no cargó. */
export function whatsappDePerfil(user) {
  return user?.whatsapp ? String(user.whatsapp) : '';
}

/** Link de WhatsApp para un número cargado a mano. null si no tiene dígitos. */
export function whatsappHref(numero) {
  const digits = String(numero ?? '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}

/** ¿El torneo pide WhatsApp y disponibilidad a cada jugador? */
export const pideDatos = (t) => usaFechas(t) || esCopa(t);

// Mini pasos del alta de una copa, según el tipo.
export function copaSecciones(mode) {
  return mode === 'zonas'
    ? [{ id: 'tipo', label: 'Tipo de copa' }, { id: 'grupos', label: 'Grupos' }, { id: 'playoffs', label: 'Playoffs' }, { id: 'puntos', label: 'Puntos' }, { id: 'premios', label: 'Premios' }]
    : [{ id: 'tipo', label: 'Tipo de copa' }, { id: 'tercer', label: 'Tercer puesto' }, { id: 'premios', label: 'Premios' }];
}

// Primera ronda de un cuadro de n parejas por número de siembra: [a, b], con b null si a pasa directo.
export function crucesPrimeraRonda(n) {
  if (n < 2) return [];
  let size = 2;
  while (size < n) size *= 2;
  let pos = [1, 2];
  while (pos.length < size) pos = pos.flatMap((x) => [x, pos.length * 2 + 1 - x]);
  const out = [];
  for (let i = 0; i < pos.length; i += 2) {
    const [a, b] = [pos[i], pos[i + 1]].sort((x, y) => x - y);
    out.push([a, b <= n ? b : null]);
  }
  return out;
}
