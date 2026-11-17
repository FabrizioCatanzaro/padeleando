import { bracketNodes } from './helpers';

// Partidos del cuadro de un americano o una copa: viven en el JSONB del bracket, no en `matches`.
function bracketPlayedCount(t) {
  if (t.format !== 'americano' && t.format !== 'copa') return 0;
  return [...bracketNodes(t.bracket), ...bracketNodes(t.bracket_plata)].filter((m) => m.winner_id != null).length;
}

// Dónde jugó la categoría. Se calcula sobre los torneos del histórico: los que
// no tienen club quedan afuera.
export function buildClubRows(tournaments = []) {
  const by = new Map();
  tournaments.forEach((t) => {
    if (!t.club_id) return;
    const row = by.get(t.club_id)
      ?? { id: t.club_id, name: t.club_name ?? 'Club', photo_url: t.club_photo_url ?? null, jornadas: 0, partidos: 0 };
    row.jornadas++;
    row.partidos += (t.matches?.length ?? 0) + bracketPlayedCount(t);
    by.set(t.club_id, row);
  });
  return [...by.values()].sort((a, b) => b.jornadas - a.jornadas || b.partidos - a.partidos);
}
