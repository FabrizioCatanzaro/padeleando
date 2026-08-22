import { useState, useEffect, useContext, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { adaptTournament } from "../../utils/helpers";
import { api } from "../../utils/api";
import { AuthContext } from "../../context/useAuth";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useTournamentAlerts } from "../../hooks/useTournamentAlerts";
import { useAlerts } from "../../context/useAlerts";
import { playTone, TONES } from "../../utils/sound";
import { TournamentHeaderSkeleton, TabsSkeleton, CardSkeleton } from "../shared/Skeleton";
import LazyNotFound from "../NotFound/LazyNotFound";
import SignupBanner from "./SignupBanner";
import { JoinBanner, UltimaActualizacion } from "../Spectator/SpectatorParts";
import TournamentPage from "../Tournament/TournamentPage";

const REFRESCO_MS = 30_000;

/**
 * El link público de un torneo: /view/:id.
 *
 * Sólo trae los datos —de un endpoint que no pide sesión y se puede cachear, que
 * es lo que hace barato dejar la pantalla del club prendida— y los carteles de
 * sumarse e inscribirse. La página que se dibuja es TournamentPage, la misma que
 * ve el organizador: lo único que cambia es que acá nadie puede gestionar.
 */
export default function ReadonlyView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [tournament, setTournament] = useState(null);
  const [error, setError] = useState(false);
  const [club, setClub] = useState(null);
  const [soundOn, setSoundOn] = useState(false);
  const [joinStatus, setJoinStatus] = useState(null);
  const [joinBusy, setJoinBusy] = useState(false);
  const [hideJoinBanner, setHideJoinBanner] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  // El sonido se decide con el valor de ahora, no con el que quedó capturado en
  // el closure del hook de avisos.
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  const { pushAlert } = useAlerts();
  const trackAlerts = useTournamentAlerts(user?.username, {
    onAlert: (list) => { list.forEach(pushAlert); handleAlerts(list); },
  });

  // La detección vive en useTournamentAlerts; acá sólo se les pone sonido.
  function handleAlerts(list) {
    if (!soundRef.current) return;
    const kinds = list.map((a) => a.kind);
    if (kinds.includes('champion'))                                        playTone(TONES.champion, 0.18);
    else if (kinds.some((k) => k === 'your_match' || k === 'bracket_spot')) playTone(TONES.personal);
    else if (kinds.includes('result'))                                     playTone(TONES.result);
    else                                                                   playTone(TONES.live);
  }

  const load = useCallback(async () => {
    try {
      const t = await api.readonly.get(id);
      const adapted = adaptTournament(t);
      setTournament(adapted);
      trackAlerts(adapted);
      setRefreshTick((x) => x + 1);
    } catch (e) {
      setError(e.status === 404 ? 'notfound' : true);
    }
  }, [id, trackAlerts]);

  useEffect(() => {
    load();
    // Con la pestaña oculta no se refresca: una TV del club con el torneo
    // proyectado hacía 120 peticiones/hora aunque nadie la estuviera mirando.
    // Al volver a primer plano se recarga en el acto.
    let interval = null;
    const start = () => { if (!interval) interval = setInterval(load, REFRESCO_MS); };
    const stop  = () => { if (interval) { clearInterval(interval); interval = null; } };
    const onVisibility = () => {
      if (document.hidden) { stop(); return; }
      load();
      start();
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load]);

  // Logo y nombre del club para el encabezado del Modo TV.
  useEffect(() => {
    const cid = tournament?.club_id;
    if (!cid) { setClub(null); return; }
    api.clubs.get(cid).then(setClub).catch(() => setClub(null));
  }, [tournament?.club_id]);

  useEffect(() => {
    const tid = tournament?.id;
    if (!user || !tid) return;
    api.joinRequests.myStatus(tid).then(setJoinStatus).catch(() => {});
  }, [user, tournament?.id]);

  function toggleSound() {
    setSoundOn((v) => {
      const next = !v;
      if (next) playTone(TONES.confirm); // el gesto del usuario habilita el audio
      return next;
    });
  }

  async function handleJoinRequest(playerId) {
    if (joinBusy || !playerId) return;
    setJoinBusy(true);
    try {
      const result = await api.joinRequests.send(tournament.id, playerId);
      setJoinStatus((s) => ({ ...s, is_player: false, request: result }));
    } catch { /* el cartel se queda como estaba */ }
    finally { setJoinBusy(false); }
  }

  async function handleInviteResponse(action) {
    const inv = joinStatus?.invitation;
    if (joinBusy || !inv) return;
    setJoinBusy(true);
    try {
      await api.invitations.respond(inv.id, action);
      setJoinStatus((s) => ({
        ...s,
        invitation: null,
        is_player: action === 'accept' ? true : s.is_player,
      }));
      if (action === 'accept') await load(); // el slot ya lleva el nombre de la cuenta
    } catch { /* el cartel se queda como estaba */ }
    finally { setJoinBusy(false); }
  }

  // Jugadores del torneo sin cuenta vinculada: son los que un espectador puede
  // reclamar al pedir sumarse.
  const claimablePlayers = useMemo(
    () => (tournament?.players ?? [])
      .filter((p) => !p.removed && !p.linked_username)
      .map((p) => ({ id: p.id, name: p.name })),
    [tournament?.players],
  );

  useDocumentTitle(error === 'notfound' ? 'Torneo no encontrado' : tournament?.name);

  if (error === 'notfound') return <LazyNotFound subject="tournament" />;

  if (error) {
    return (
      <div className="bg-base text-content font-sans pb-15 flex items-center justify-center">
        <div className="text-center text-[#666]">
          <div className="text-[48px] mb-3">🔍</div>
          <div className="text-soft font-mono">Torneo no encontrado.</div>
          <div className="text-muted text-[13px] mt-2">El link puede haber expirado o ser inválido.</div>
        </div>
      </div>
    );
  }

  if (!tournament) return (
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

  return (
    <TournamentPage
      tournament={tournament}
      groupId={tournament.group_id}
      canManage={false}
      groupName={tournament.group_name}
      groupEmojis={tournament.group_emojis ?? []}
      groupIsPublic={tournament.group_is_public ?? true}
      groupOwnerIsPremium={tournament.group_owner_is_premium ?? false}
      owner={tournament.owner_username ? {
        username: tournament.owner_username,
        name: tournament.owner_name,
        avatar_url: tournament.owner_avatar_url ?? null,
        isPremium: tournament.group_owner_is_premium ?? false,
      } : null}
      shareUrl={window.location.href}
      club={club}
      tvInicial={new URLSearchParams(window.location.search).get('tv') === '1'}
      espectador={{
        barKey: `refresh-${refreshTick}`,
        barDuration: REFRESCO_MS,
        ultimaActualizacion: <UltimaActualizacion key={refreshTick} />,
        soundOn,
        onToggleSound: toggleSound,
        signupBanner: <SignupBanner signup={tournament.signup} tournamentName={tournament.name} />,
        joinBanner: (
          <JoinBanner
            user={user}
            tournament={tournament}
            joinStatus={joinStatus}
            claimablePlayers={claimablePlayers}
            hidden={hideJoinBanner}
            busy={joinBusy}
            onRequest={handleJoinRequest}
            onRespondInvite={handleInviteResponse}
            onHide={() => setHideJoinBanner(true)}
            onLogin={() => navigate(`/login?redirect=${encodeURIComponent(`/view/${id}`)}`)}
          />
        ),
      }}
    />
  );
}
