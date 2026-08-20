import { tournamentDisplayStatus, isAmericanoDraft, isLive } from './helpers';

export const EMPTY_FILTERS = { q: '', statuses: [], formats: [], from: '', to: '' };

export const STATUS_ORDER = ['draft', 'upcoming', 'active', 'finished'];

export const DEFAULT_SORT = 'date-desc';

// El orden no es un filtro: no cuenta para countActiveFilters ni lo limpia el
// botón de limpiar. Por eso vive fuera de EMPTY_FILTERS.
export const SORT_OPTIONS = [
  { id: 'date-desc', short: 'Fecha ↓',  label: 'Fecha · más nueva primero' },
  { id: 'date-asc',  short: 'Fecha ↑',  label: 'Fecha · más vieja primero' },
  { id: 'name-asc',  short: 'Nombre ↓', label: 'Nombre · A → Z' },
  { id: 'name-desc', short: 'Nombre ↑', label: 'Nombre · Z → A' },
];

const DIACRITICS = new RegExp('[\u0300-\u036f]', 'g');

const norm = (s) => String(s ?? '')
  .normalize('NFD').replace(DIACRITICS, '')
  .toLowerCase().trim();

// La jornada se ubica por su fecha de juego, no por cuándo se cargó.
const dateOf = (t) => String(t.event_date ?? t.created_at ?? '').slice(0, 10);

// Mismo estado que muestra la tarjeta, para que el chip y la insignia no difieran.
export function statusOf(t) {
  return tournamentDisplayStatus({
    status: t.status,
    hasLiveMatch: isLive(t),
    hasPlayed: (t.match_count ?? 0) > 0,
    isDraft: isAmericanoDraft({ format: t.format, pairCount: t.pair_count }),
  });
}

export function countActiveFilters(f) {
  return (f.q.trim() ? 1 : 0) + f.statuses.length + f.formats.length + (f.from ? 1 : 0) + (f.to ? 1 : 0);
}

// numeric: sin esto "Americano #10" queda antes que "#9". sensitivity base
// iguala mayúsculas y acentos, que es lo que espera alguien buscando en español.
const byName = (a, b) =>
  String(a.name ?? '').localeCompare(String(b.name ?? ''), 'es', { numeric: true, sensitivity: 'base' });

// Por fecha de juego, no de carga: dateOf ya cae a created_at cuando la jornada
// no tiene fecha asignada. El desempate por nombre lo hace estable.
export function sortTournaments(list, sort = DEFAULT_SORT) {
  const out = [...(list ?? [])];
  switch (sort) {
    case 'date-asc':  return out.sort((a, b) => dateOf(a).localeCompare(dateOf(b)) || byName(a, b));
    case 'name-asc':  return out.sort(byName);
    case 'name-desc': return out.sort((a, b) => byName(b, a));
    default:          return out.sort((a, b) => dateOf(b).localeCompare(dateOf(a)) || byName(a, b));
  }
}

export function filterTournaments(list, f) {
  if (!list?.length) return [];
  const q = norm(f.q);
  return list.filter((t) => {
    if (q && !norm(t.name).includes(q) && !norm(t.club_name).includes(q)) return false;
    if (f.formats.length && !f.formats.includes(t.format === 'americano' ? 'americano' : 'liga')) return false;
    if (f.statuses.length && !f.statuses.includes(statusOf(t))) return false;
    if (f.from || f.to) {
      const d = dateOf(t);
      if (!d) return false;
      if (f.from && d < f.from) return false;
      if (f.to   && d > f.to)   return false;
    }
    return true;
  });
}
