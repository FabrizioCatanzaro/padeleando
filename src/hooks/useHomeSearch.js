import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const EMPTY = { users: [], groups: [], clubs: [], tours: [] };

// El buscador de la portada, fuera del componente: lo comparten la barra del
// visitante y la paleta del usuario con sesión, y ambos terminan en la misma
// vista de resultados.
export default function useHomeSearch() {
  const [q,          setQ]          = useState('');
  const [live,       setLive]       = useState(EMPTY);
  const [searching,  setSearching]  = useState(false);
  const [committedQ, setCommittedQ] = useState('');
  const [committed,  setCommitted]  = useState(EMPTY);
  const [committing, setCommitting] = useState(false);

  const fetchAll = useCallback(async (term) => {
    const [users, groups, clubs, tours] = await Promise.all([
      api.auth.search(term),
      api.groups.search(term),
      api.clubs.list(term),
      api.tournaments.search(term),
    ]);
    return { users, groups, clubs, tours };
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setLive(EMPTY); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { setLive(await fetchAll(q)); } catch { setLive(EMPTY); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q, fetchAll]);

  const commit = useCallback(async () => {
    const term = q.trim();
    if (term.length < 2) return;
    setCommitting(true);
    try {
      const r = await fetchAll(term);
      setCommittedQ(term); setCommitted(r); setLive(EMPTY);
    } catch {
      setCommittedQ(term); setCommitted(EMPTY);
    } finally { setCommitting(false); }
  }, [q, fetchAll]);

  const clear = useCallback(() => {
    setQ(''); setCommittedQ(''); setCommitted(EMPTY); setLive(EMPTY);
  }, []);

  const liveCount = live.users.length + live.groups.length + live.clubs.length + live.tours.length;

  return { q, setQ, live, liveCount, searching, committedQ, committed, committing, commit, clear };
}
