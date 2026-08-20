// Las cuatro listas de la portada se funden en una sola: una categoría puede
// estar en varias a la vez (favorita y jugando, por ejemplo) y el listado
// unificado necesita un único rol por fila. Gana el más fuerte, en este orden.
export const ROLES = ['own', 'co', 'play', 'fav'];

export const ROLE_META = {
  own:  { tag: 'MÍA',    chip: 'Mías',        cls: 'bg-brand text-base' },
  co:   { tag: 'CO-ORG', chip: 'Co-organizo', cls: 'text-cyan border border-cyan/40' },
  play: { tag: 'JUEGO',  chip: 'Juego',       cls: 'text-green border border-green/40' },
  fav:  { tag: 'FAV',    chip: 'Favoritas',   cls: 'text-muted border border-border-strong' },
};

export function mergeGroups({ groups = [], coorgGroups = [], partGroups = [], favGroups = [], liveGroupIds }) {
  const byId = new Map();
  const add = (list, role) => {
    list.forEach((g) => { if (!byId.has(g.id)) byId.set(g.id, { ...g, role }); });
  };
  add(groups, 'own');
  add(coorgGroups, 'co');
  add(partGroups, 'play');
  add(favGroups, 'fav');

  const rank = (g) => ROLES.indexOf(g.role);
  // Lo que se está jugando ahora sube al tope: es lo único de la lista que
  // caduca en minutos.
  return [...byId.values()].sort((a, b) => {
    const la = liveGroupIds?.has(a.id) ? 0 : 1;
    const lb = liveGroupIds?.has(b.id) ? 0 : 1;
    return la - lb || rank(a) - rank(b);
  });
}

export const countByRole = (merged) =>
  merged.reduce((acc, g) => ({ ...acc, [g.role]: (acc[g.role] ?? 0) + 1 }), {});

// Sumas del riel de números. Todo sale de lo que la portada ya cargó: ninguna
// de estas cifras justifica una petición extra. Por eso no hay winrate ni racha
// acá: sólo salen del perfil, que es la consulta más cara del backend.
// Tampoco hay total de jugadores: sumar `player_count` de cada categoría cuenta
// dos veces a quien juega en dos, y un número que no cierra es peor que ninguno.
export function railStats(merged, liveCount, upcomingCount) {
  const sum = (key) => merged.reduce((n, g) => n + (g[key] ?? 0), 0);
  return [
    { n: liveCount,               label: 'En juego',  brand: liveCount > 0 },
    { n: merged.length,           label: 'Categorías' },
    { n: sum('tournament_count'), label: 'Torneos' },
    { n: upcomingCount,           label: 'Próximas' },
  ];
}

// Las fechas sin hora se parsean como UTC y en Argentina retroceden un día.
const DAY_MS = 86400000;
const localDate = (d) => {
  const s = String(d);
  return new Date(s.length === 10 ? `${s}T00:00` : s);
};

// "HOY" y "MAÑANA" pesan más que la fecha; el resto se abrevia.
export function dateLabel(eventDate) {
  if (!eventDate) return null;
  const d = localDate(eventDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / DAY_MS);
  if (diff === 0) return 'HOY';
  if (diff === 1) return 'MAÑANA';
  const s = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  return s.charAt(0).toUpperCase() + s.slice(1).replace('.', '');
}

// La próxima jornada de cada categoría, para la columna derecha del listado.
export function nextByGroup(upcoming = []) {
  const map = new Map();
  upcoming.forEach((t) => { if (!map.has(t.group_id)) map.set(t.group_id, t); });
  return map;
}
