import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { adaptTournament, adaptMatch, patchBracketNames, getTournamentWinnerLabel } from '../utils/helpers';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';

export function useTournament(groupId, tournamentId) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tournament, setTournament] = useState(null);
  const [canManage,         setCanManage]         = useState(false);
  const [groupOwnerIsPremium, setGroupOwnerIsPremium] = useState(false);
  const [groupName,  setGroupName]  = useState(null);
  const [groupEmojis, setGroupEmojis] = useState([]);
  // groupId puede venir de la URL o resolverse desde el torneo cargado.
  const [groupIdResolved, setGroupIdResolved] = useState(groupId ?? null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [notFound,   setNotFound]   = useState(false);
  const [saved,      setSaved]      = useState(false);

  // Carga el torneo al montar (o cuando cambia tournamentId).
  // `silent` refresca los datos sin activar el skeleton de carga: se usa tras
  // agregar/editar jugadores o parejas para evitar el parpadeo de recarga.
  const reload = useCallback(async (silent = false) => {
    if (!tournamentId) {
      if (groupId) {
        setGroupIdResolved(groupId);
        try {
          const g = await api.groups.meta(groupId);
          setGroupOwnerIsPremium(g.owner_is_premium ?? false);
        } catch { /* ignorar */ }
      }
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const t = await api.tournaments.get(tournamentId);
      setTournament(adaptTournament(t));
      setCanManage(t.can_manage ?? false);
      setGroupOwnerIsPremium(t.owner_is_premium ?? false);
      setGroupIdResolved(groupId ?? t.group_id ?? null);
    } catch (e) {
      setError(e.message);
      setNotFound(e.status === 404);
    } finally {
      setLoading(false);
    }
  }, [tournamentId, groupId]);

  useEffect(() => { reload(); }, [reload]);

  // El nombre y los emojis de la categoría no cambian mientras se juega, así
  // que se piden una vez y no en cada reload(). Antes iban encadenados dentro
  // de reload() —una segunda petición en serie— y se repetían tras cada
  // partido, jugador o pareja que se cargaba.
  useEffect(() => {
    if (!groupIdResolved) return;
    let cancelled = false;
    api.groups.meta(groupIdResolved)
      .then((g) => {
        if (cancelled) return;
        setGroupName(g.name);
        setGroupEmojis(g.emojis ?? []);
      })
      .catch(() => { /* el encabezado se muestra sin nombre de categoría */ });
    return () => { cancelled = true; };
  }, [groupIdResolved]);
 
  function flash() { setSaved(true); setTimeout(() => setSaved(false), 1500); }
 
  // ── Crear torneo ────────────────────────────────────────────────────
  async function handleCreate(name, playerNames, pairsInput, format = 'liga', numberOfCourts = 1, extra = {}) {

    const t = await api.tournaments.create({
      groupId,
      name,
      mode:             pairsInput ? 'pairs' : 'free',
      format,
      playerNames:      playerNames.filter(Boolean),
      pairs:            pairsInput ?? [],
      number_of_courts: numberOfCourts ?? 1,
      club_id:          extra.club_id ?? null,
      event_date:       extra.event_date ?? null,
      event_time:       extra.event_time ?? null,
      pending_club_request_id: extra.pending_club_request_id ?? null,
      signup_open:       extra.signup_open ?? null,
      signup_price:      extra.signup_price ?? null,
      signup_price_unit: extra.signup_price_unit ?? null,
      signup_contacts:   extra.signup_contacts?.length ? extra.signup_contacts : null,
    });
    setTournament(adaptTournament(t));
    return t.id; // para que App.js pueda navegar al torneo
  }
 
  // ── Partidos ────────────────────────────────────────────────────────
  // Cargar y corregir resultados es la acción más repetida del producto: se
  // hace decenas de veces durante un torneo. Los tres endpoints devuelven la
  // fila afectada (RETURNING *), así que se aplica esa respuesta al estado
  // local en vez de volver a pedir el torneo entero. La tabla de posiciones se
  // deriva de `matches` en el cliente, de modo que se actualiza sola.
  async function handleAddMatch(matchData) {
    const created = await api.matches.create({
      tournamentId: tournament.id,
      team1:        matchData.team1,
      team2:        matchData.team2,
      score1:       matchData.score1,
      score2:       matchData.score2,
      playedAt:     matchData.date,
      duration_seconds: matchData.duration_seconds,
      sets_format:  matchData.sets_format ?? null,
      sets:         matchData.sets ?? [],
      court:        matchData.court ?? null,
    });
    // El backend ordena por created_at DESC: el nuevo va al principio.
    setTournament((prev) =>
      prev ? { ...prev, matches: [adaptMatch(created), ...prev.matches] } : prev
    );
    flash();
    showToast('Partido registrado');
  }

  async function handleEditMatch(matchId, matchData) {
    const updated = await api.matches.update(matchId, {
      team1:            matchData.team1,
      team2:            matchData.team2,
      score1:           matchData.score1,
      score2:           matchData.score2,
      playedAt:         matchData.date,
      duration_seconds: matchData.duration_seconds ?? null,
      sets_format:      matchData.sets_format ?? null,
      sets:             matchData.sets ?? [],
      court:            matchData.court ?? null,
    });
    setTournament((prev) =>
      prev
        ? { ...prev, matches: prev.matches.map((m) => (m.id === matchId ? adaptMatch(updated) : m)) }
        : prev
    );
    flash();
    showToast('Partido actualizado');
  }

  async function handleDeleteMatch(matchId) {
    await api.matches.delete(matchId);
    setTournament((prev) =>
      prev ? { ...prev, matches: prev.matches.filter((m) => m.id !== matchId) } : prev
    );
    showToast('Partido eliminado', 'error');
  }
 
  // ── Jugadores ───────────────────────────────────────────────────────
  async function syncMode() {
    const t = await api.tournaments.get(tournamentId);
    // El americano es siempre por parejas: nunca se cambia el modo. Si se hiciera,
    // desaparecería el gestor de parejas y no habría toggle para volver a activarlo.
    if (t.format === 'americano') return;
    const count = (t.players ?? []).filter((p) => !p.removed).length;
    // Solo forzar 'free' si el count es impar (no se pueden tener parejas fijas con impar)
    if (count % 2 !== 0 && t.mode === 'pairs') {
      await api.tournaments.update(t.id, { mode: 'free' });
    }
  }

  async function handleUpdateMode(newMode) {
    await api.tournaments.update(tournament.id, { mode: newMode });
    await reload(true);
    flash();
    showToast(newMode === 'pairs' ? 'Modo: parejas fijas' : 'Modo: equipos libres', 'info');
  }

  async function handleAddPlayer(name) {
    await api.players.resolve(name, groupId, tournamentId);
    await syncMode();
    await reload(true);
    flash();
    showToast('Jugador agregado');
  }

  async function handleEditPlayer(playerId, newName) {
    await api.players.rename(playerId, newName, groupId);
    await reload(true);
    flash();
    showToast('Jugador actualizado');
  }

  async function handleDeletePlayer(playerId) {
    await api.players.removeFromTournament(playerId, tournamentId);
    await syncMode();
    await reload(true);
    showToast('Jugador eliminado', 'error');
  }

  // ── Parejas ─────────────────────────────────────────────────────────
  async function handleAddPair(p1Id, p2Id) {
    await api.pairs.create({ tournamentId: tournament.id, p1Id, p2Id });
    if (tournament.mode === 'free') {
      await api.tournaments.update(tournament.id, { mode: 'pairs' });
    }
    await reload(true);
    flash();
    showToast('Pareja creada');
  }

  async function handleEditPair(pairId, p1Id, p2Id) {
    await api.pairs.update(pairId, { p1Id, p2Id });
    await reload(true);
    flash();
    showToast('Pareja actualizada');
  }

  async function handleDeletePair(pairId) {
    await api.pairs.delete(pairId);
    await reload(true);
    showToast('Pareja eliminada', 'error');
  }

  // ── Scores y torneo ─────────────────────────────────────────────────
  async function handleResetScores() {
    await api.tournaments.resetScores(tournament.id);
    await reload();
    showToast('Puntos reiniciados', 'info');
  }

  async function handleDeleteTournament() {
    await api.tournaments.delete(tournament.id);
    showToast('Torneo eliminado', 'error');
  }

  // PATCH devuelve la fila de tournaments, sin players/pairs/matches ni los
  // campos derivados de los JOIN (club_name, owner_is_premium…). Por eso se
  // fusionan sólo los campos escalares que la propia respuesta trae, en vez de
  // reemplazar el torneo entero.
  async function handleToggleStatus() {
    const newStatus = tournament.status === 'active' ? 'finished' : 'active';
    const body = { status: newStatus };
    // El ganador de una liga sólo se resuelve si el torneo está finalizado, y
    // acá el estado local todavía es el anterior: sin forzarlo, winner_label se
    // guardaba siempre vacío salvo en americano.
    if (newStatus === 'finished') {
      body.winner_label = getTournamentWinnerLabel({ ...tournament, status: 'finished' }) ?? '';
    }
    const updated = await api.tournaments.update(tournament.id, body);
    setTournament((prev) =>
      prev ? { ...prev, status: updated.status, winner_label: updated.winner_label } : prev
    );
    showToast(newStatus === 'finished' ? 'Torneo finalizado' : 'Torneo reanudado', 'info');
  }

  async function handleUpdateName(name) {
    const updated = await api.tournaments.update(tournament.id, { name });
    setTournament((prev) => (prev ? { ...prev, name: updated.name } : prev));
    showToast('Nombre actualizado');
  }

  // Acá sí hace falta recargar: club_name y club_courts salen de un JOIN con
  // clubs que el PATCH no devuelve.
  async function handleUpdateClubEvent({ club_id, pending_club_request_id, event_date, event_time, number_of_courts }) {
    await api.tournaments.update(tournament.id, { club_id, pending_club_request_id, event_date, event_time, number_of_courts });
    await reload(true);
    showToast('Club y fecha actualizados');
  }

  async function handleUpdateSignup({ open, price, unit, contacts }) {
    const updated = await api.tournaments.update(tournament.id, {
      signup_open:       open,
      signup_price:      price,
      signup_price_unit: unit,
      signup_contacts:   (contacts ?? []).filter((c) => c.value.trim()),
    });
    setTournament((prev) => (prev ? { ...prev, ...updated } : prev));
    showToast('Inscripción actualizada');
  }

  async function handleSetLiveMatch(data) {
    await api.tournaments.setLive(tournament.id, data ?? null);
    // Solo es metadata para los espectadores (ReadonlyView). No hace falta
    // recargar todo el torneo (eso disparaba el skeleton de carga y el
    // parpadeo al iniciar el cronómetro); basta con actualizar el estado local.
    setTournament((prev) => (prev ? { ...prev, live_match: data ?? null } : prev));
  }

  async function handleGenerateSchedule() {
    const data = await api.tournaments.schedule(tournament.id);
    localStorage.setItem(`previa_schedule_${tournament.id}`, JSON.stringify(data.schedule));
    return data.schedule;
  }

  async function handleGenerateBracket() {
    const res = await api.tournaments.bracket(tournament.id);
    applyBracket(res.bracket);
    showToast('Cuadro generado');
  }

  // Los tres endpoints del cuadro devuelven el bracket ya actualizado: se aplica al
  // estado local como con los partidos de la previa, sin volver a pedir el torneo
  // (eso disparaba el skeleton y hacía "parpadear" toda la página tras cada carga).
  function applyBracket(bracket) {
    setTournament((prev) =>
      prev ? { ...prev, bracket: patchBracketNames(bracket, prev.pairs, prev.players) } : prev
    );
  }

  async function handleUpdateBracketMatch(matchId, score1, score2, duration_seconds, court, isEdit = false, setsData = {}) {
    const res = await api.tournaments.updateBracket(tournament.id, matchId, {
      score1, score2, duration_seconds, court,
      sets_format: setsData.sets_format ?? null,
      sets:        setsData.sets ?? [],
    });
    applyBracket(res.bracket);
    flash();
    showToast(isEdit ? 'Partido actualizado' : 'Partido registrado');
  }

  async function handleClearBracketMatch(matchId) {
    const res = await api.tournaments.clearBracketMatch(tournament.id, matchId);
    applyBracket(res.bracket);
    flash();
    showToast('Resultado borrado');
  }

  async function handleSetBracket(bracket) {
    const res = await api.tournaments.setBracket(tournament.id, bracket);
    applyBracket(res.bracket);
    flash();
    showToast('Cruces actualizados');
  }

  async function handleDeleteBracket() {
    await api.tournaments.deleteBracket(tournament.id);
    localStorage.removeItem(`bracket_live_${tournament.id}`);
    setTournament((prev) => (prev ? { ...prev, bracket: null, live_match: null } : prev));
    showToast('Cuadro borrado');
  }

  function getShareLink() {
    if (!tournament) return '';
    return `${window.location.origin}/view/${tournament.id}`;
  }
 
  // Gate general de gestión: dueño de la categoría O co-organizador (backend can_manage).
  const isOwner = !!user && !!tournament && canManage;

  return {
    tournament, groupName, groupEmojis, groupOwnerIsPremium, loading, error, notFound, saved, isOwner,
    handleCreate,
    handleAddMatch,    handleEditMatch,    handleDeleteMatch,
    handleAddPlayer,   handleEditPlayer,   handleDeletePlayer,
    handleAddPair,     handleEditPair,     handleDeletePair,
    handleResetScores, handleDeleteTournament,
    getShareLink, handleToggleStatus, handleUpdateName, handleUpdateClubEvent, handleUpdateSignup, handleSetLiveMatch,
    handleGenerateSchedule, handleGenerateBracket, handleUpdateBracketMatch, handleClearBracketMatch, handleSetBracket, handleDeleteBracket,
    handleUpdateMode,
    refresh: () => reload(true),
  };
}
