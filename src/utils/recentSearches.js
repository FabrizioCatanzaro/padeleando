// Búsquedas recientes (solo términos, no resultados)

const KEY = 'padeliando_recent_searches';
const MAX = 8;

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* modo privado */ }
  return list;
}

export const getRecentSearches = () => read();

export function addRecentSearch(term) {
  const clean = term.trim();
  if (!clean) return read();
  const rest = read().filter((t) => t.toLowerCase() !== clean.toLowerCase());
  return write([clean, ...rest].slice(0, MAX));
}

export function removeRecentSearch(term) {
  return write(read().filter((t) => t !== term));
}

export function clearRecentSearches() {
  return write([]);
}
