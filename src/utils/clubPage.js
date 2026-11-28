// Todo lo que la página del club deriva de la lista de eventos que ya llegó.
// Nada de acá justifica una consulta nueva: la respuesta de /clubs/:id/events
// trae la categoría, el organizador y la fecha de cada torneo, y hasta ahora
// las tres cosas se descartaban.

// Un string YYYY-MM-DD se parsea como medianoche UTC y en Argentina retrocede
// un día. Con T00:00 (sin Z) el navegador lo lee en hora local.
function localDate(value) {
  const s = String(value ?? '');
  if (!s) return null;
  const d = new Date(s.length === 10 ? `${s}T00:00` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const eventDate = (ev) => localDate(ev?.event_date ?? ev?.created_at);

/** Categorías que jugaron alguna jornada en el club, de más a menos. */
export function categoryRows(events = []) {
  const by = new Map();
  for (const ev of events) {
    if (!ev.group_id) continue;
    const key = String(ev.group_id);
    const row = by.get(key) ?? {
      id: ev.group_id,
      name: ev.group_name ?? 'Categoría',
      emojis: ev.group_emojis ?? [],
      owner_username: ev.owner_username ?? null,
      jornadas: 0,
    };
    row.jornadas++;
    by.set(key, row);
  }
  return [...by.values()].sort((a, b) => b.jornadas - a.jornadas || a.name.localeCompare(b.name, 'es'));
}

/** Quién organiza acá. Sale de las mismas filas, agrupado por persona. */
export function organizerRows(events = []) {
  const by = new Map();
  for (const ev of events) {
    if (!ev.owner_username) continue;
    const row = by.get(ev.owner_username) ?? {
      username: ev.owner_username,
      name: ev.owner_name ?? ev.owner_username,
      avatar_url: ev.owner_avatar_url ?? null,
      jornadas: 0,
      grupos: new Set(),
    };
    row.jornadas++;
    if (ev.group_id) row.grupos.add(String(ev.group_id));
    by.set(ev.owner_username, row);
  }
  return [...by.values()]
    .map(({ grupos, ...r }) => ({ ...r, categorias: grupos.size }))
    .sort((a, b) => b.jornadas - a.jornadas);
}

/**
 * Cuántos campos opcionales quedaron sin cargar. Decide si el pedido de
 * correcciones es una nota al pie o la invitación principal de la página.
 */
export function missingFields(club) {
  return [
    !(club?.schedule?.length),
    !club?.contact_phone && !club?.contact_whatsapp,
    !((club?.social_links ?? []).some((s) => s?.url)),
    club?.courts == null,
  ].filter(Boolean).length;
}
