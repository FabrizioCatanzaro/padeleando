import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTournament } from "../../hooks/useTournament";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { TournamentHeaderSkeleton, TabsSkeleton, CardSkeleton } from "../shared/Skeleton";
import LazyNotFound from "../NotFound/LazyNotFound";
import TournamentPage from "../Tournament/TournamentPage";
import { UltimaActualizacion } from "../Spectator/SpectatorParts";

/**
 * La ruta del organizador: /cat/:groupId/torneo/:tournamentId.
 *
 * Acá sólo se traen los datos y se arman los handlers; lo que se dibuja es
 * TournamentPage, la misma página que ve el que entra por el link público. Antes
 * este componente tenía la página entera adentro y, cuando el que entraba no
 * podía gestionar, lo mandaba a /view/:id — otra página, con otro encabezado y
 * otras solapas.
 */
export default function Main() {
  const { groupId, tournamentId } = useParams();
  const {
    tournament, groupName, groupEmojis, groupOwnerIsPremium, loading, error, notFound, isOwner,
    handleAddMatch, handleEditMatch, handleDeleteMatch,
    handleAddScheduled, handleEditScheduled, handleDeleteScheduled,
    handleAddPlayer, handleEditPlayer, handleDeletePlayer,
    handleAddPair, handleEditPair, handleDeletePair,
    handleResetScores, handleDeleteTournament,
    getShareLink, handleToggleStatus, handleUpdateName, handleUpdateClubEvent, handleUpdateSignup, handleSetLiveMatch,
    handleGenerateSchedule, handleGenerateBracket, handleUpdateBracketMatch, handleClearBracketMatch, handleSetBracket, handleDeleteBracket,
    handleUpdateMode, refresh,
  } = useTournament(groupId, tournamentId);

  // El que entra a esta ruta y no puede gestionar ve la misma página en modo
  // espectador. Como no va a tocar nada, los datos tienen que llegarle solos:
  // se refrescan cada 30 s, y no mientras la pestaña está oculta.
  const REFRESCO_MS = 30_000;
  const [tick, setTick] = useState(0);
  const mirando = !loading && !!tournament && !isOwner;
  useEffect(() => {
    if (!mirando) return undefined;
    let id = null;
    const refrescar = () => { refresh?.(true); setTick((x) => x + 1); };
    const arrancar = () => { if (!id) id = setInterval(refrescar, REFRESCO_MS); };
    const parar    = () => { if (id) { clearInterval(id); id = null; } };
    const alCambiar = () => {
      if (document.hidden) { parar(); return; }
      refrescar(); arrancar();
    };
    if (!document.hidden) arrancar();
    document.addEventListener('visibilitychange', alCambiar);
    return () => { parar(); document.removeEventListener('visibilitychange', alCambiar); };
  }, [mirando, refresh]);

  useDocumentTitle(notFound ? 'Torneo no encontrado' : tournament?.name);

  if (loading) return (
    <div className="bg-base text-content font-sans pb-24 sm:pb-15">
      <TournamentHeaderSkeleton />
      <TabsSkeleton count={5} />
      <div className="p-6 flex flex-col gap-3">
        <CardSkeleton lines={3} />
        <CardSkeleton lines={2} />
        <CardSkeleton lines={2} />
      </div>
    </div>
  );
  if (notFound) return <LazyNotFound subject="tournament" />;
  if (error || !tournament) return (
    <div className="bg-base text-content font-sans flex items-center justify-center">
      <div className="text-danger p-10">{error ?? "Error cargando torneo"}</div>
    </div>
  );

  // Sólo se pasan si se pueden usar: la página no tiene que decidir dos veces.
  const acciones = isOwner ? {
    onAddMatch: handleAddMatch, onEditMatch: handleEditMatch, onDeleteMatch: handleDeleteMatch,
    onAddScheduled: handleAddScheduled, onEditScheduled: handleEditScheduled,
    onDeleteScheduled: handleDeleteScheduled,
    onAddPlayer: handleAddPlayer, onEditPlayer: handleEditPlayer, onDeletePlayer: handleDeletePlayer,
    onAddPair: handleAddPair, onEditPair: handleEditPair, onDeletePair: handleDeletePair,
    onResetScores: handleResetScores, onDeleteTournament: handleDeleteTournament,
    onToggleStatus: handleToggleStatus, onUpdateName: handleUpdateName,
    onUpdateClubEvent: handleUpdateClubEvent, onUpdateSignup: handleUpdateSignup,
    onSetLiveMatch: handleSetLiveMatch,
    onGenerateSchedule: handleGenerateSchedule, onGenerateBracket: handleGenerateBracket,
    onUpdateBracketMatch: handleUpdateBracketMatch, onClearBracketMatch: handleClearBracketMatch,
    onSetBracket: handleSetBracket, onDeleteBracket: handleDeleteBracket,
    onUpdateMode: handleUpdateMode, onRefresh: refresh,
  } : null;

  return (
    <TournamentPage
      tournament={tournament}
      groupId={groupId}
      canManage={isOwner}
      groupName={groupName ?? tournament.group_name}
      groupEmojis={groupEmojis}
      groupIsPublic={tournament.group_is_public ?? true}
      groupOwnerIsPremium={groupOwnerIsPremium}
      owner={tournament.owner_username ? {
        username: tournament.owner_username,
        name: tournament.owner_name,
        avatar_url: tournament.owner_avatar_url ?? null,
        isPremium: groupOwnerIsPremium,
      } : null}
      shareUrl={getShareLink()}
      acciones={acciones}
      espectador={isOwner ? null : {
        barKey: `refresh-${tick}`,
        barDuration: REFRESCO_MS,
        ultimaActualizacion: <UltimaActualizacion key={tick} />,
      }}
      tvInicial={new URLSearchParams(window.location.search).get('tv') === '1'}
    />
  );
}
