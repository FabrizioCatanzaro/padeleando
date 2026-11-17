import { useRef, useEffect, useCallback } from 'react';
import { getAllMatches, playedMatches, bracketNodes } from '../utils/helpers';

// Nunca dispara en la primera carga: ahí todo es "nuevo".

const liveKey = (m) => `${m.team1Label}|${m.team2Label}|${m.court ?? ''}`;

function buildSignature(t) {
  const live = Array.isArray(t.live_match) ? t.live_match : [];
  return {
    started:  live.filter((m) => m.startedAt != null).map(liveKey),
    loaded:   live.map(liveKey),
    played:   playedMatches(getAllMatches(t)).length,
    bracket:  !!t.bracket,
    champion: t.bracket?.final?.winner_id ?? null,
  };
}

// Por linked_username, nunca por nombre.
function viewerPlayerIds(t, username) {
  if (!username) return [];
  return (t.players ?? [])
    .filter((p) => p.linked_username && p.linked_username === username)
    .map((p) => p.id);
}

const involves = (ids, playerIds) => (ids ?? []).some((id) => playerIds.includes(id));

function pairHasViewer(pairId, t, playerIds) {
  const pair = (t.pairs ?? []).find((p) => p.id === pairId);
  return !!pair && (playerIds.includes(pair.p1) || playerIds.includes(pair.p2));
}

// El bracket guarda ids de pareja, así que no hay labels de por medio.
function bracketPairIds(bracket) {
  const ids = bracketNodes(bracket).flatMap((m) => [m?.pair1_id, m?.pair2_id]).filter(Boolean);
  return [...new Set(ids)];
}

// Pura a propósito: se puede ejercitar sin React.
export function detectAlerts(prev, tournament, username) {
  const sig = buildSignature(tournament);
  if (!prev) return { sig, alerts: [] };

  const playerIds = viewerPlayerIds(tournament, username);
  const live = Array.isArray(tournament.live_match) ? tournament.live_match : [];
  const next = [];
  const push = (a) => next.push(a);

    // Personales primero: si te toca jugar, es lo que importa.
    for (const m of live) {
      const key = liveKey(m);
      if (m.startedAt == null || prev.started.includes(key)) continue;
      const mine = involves(m.team1Ids, playerIds) || involves(m.team2Ids, playerIds);
      push(mine
        ? {
            kind: 'your_match',
            title: 'Te toca jugar',
            body: m.court != null ? `Cancha ${m.court} · ${m.team1Label} vs ${m.team2Label}` : `${m.team1Label} vs ${m.team2Label}`,
          }
        : {
            kind: 'live_started',
            title: 'Empezó un partido',
            body: m.court != null ? `Cancha ${m.court} · ${m.team1Label} vs ${m.team2Label}` : `${m.team1Label} vs ${m.team2Label}`,
          });
    }

    if (sig.played > prev.played) {
      const delta = sig.played - prev.played;
      push({
        kind: 'result',
        title: delta === 1 ? 'Se cargó un resultado' : `Se cargaron ${delta} resultados`,
        body: 'Mirá cómo quedó la tabla de posiciones.',
      });
    }

    if (sig.bracket && !prev.bracket) {
      const mine = playerIds.length > 0 &&
        [...bracketPairIds(tournament.bracket), ...bracketPairIds(tournament.bracket_plata)].some((pid) => pairHasViewer(pid, tournament, playerIds));
      push(mine
        ? { kind: 'bracket_spot', title: 'Estás en el cuadro', body: 'Se armaron los cruces y tenés tu lugar asegurado.' }
        : { kind: 'bracket', title: 'Se generó el cuadro', body: 'Ya están definidos los cruces.' });
    }

    if (sig.champion && sig.champion !== prev.champion) {
      const mine = pairHasViewer(sig.champion, tournament, playerIds);
      push({
        kind: 'champion',
        title: mine ? '¡Ganaste el torneo!' : 'Hay campeón',
        body: tournament.bracket?.final?.winner_name ?? 'Se jugó la final.',
      });
    }

  return { sig, alerts: next };
}

// `track` se llama con cada torneo que llega: la novedad es un evento de datos.
export function useTournamentAlerts(username, { onAlert } = {}) {
  const sigRef = useRef(null);
  // En un ref para que cambiar de handler no obligue a rehacer `track`.
  const onAlertRef = useRef(onAlert);
  useEffect(() => { onAlertRef.current = onAlert; });

  return useCallback((tournament) => {
    if (!tournament) return;
    const { sig, alerts: found } = detectAlerts(sigRef.current, tournament, username);
    sigRef.current = sig;
    if (found.length) onAlertRef.current?.(found);
  }, [username]);
}
