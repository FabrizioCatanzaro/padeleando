import { useState, useEffect, useContext, useCallback, useMemo, useRef, useSyncExternalStore, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { calcStandings, compareStandingRows, courtLabel, getPairLabel, isAmericanoDraft, isDeletedAccount, fmt, fmtHora, tournamentDisplayStatus, TOURNAMENT_STATUS_META,
  getAllMatches, playedMatches, calcPartnerships, tiedLabel, fmtMMSS, fmtDuracion, TIED_NAMES_PAIRS,
  setWinner, visibleSetsCount } from "../../utils/helpers";

// Mínimo de partidos para que la pantalla de estadísticas entre en el Modo TV.
const TV_STATS_MIN_MATCHES = 3;
import Standings from "../Standings/Standings";
// Sólo se monta al abrir la pestaña: importarlo estático arrastraba los
// 111 KB de Recharts a toda visita del modo espectador.
const Stats = lazy(() => import("../Stats/Stats"));
import MatchCard from "../Matches/MatchCard";
import Bracket from "../Americano/Bracket";
import PhotoGallery from "../Photos/PhotoGallery";
import PlayerAvatar, { PairAvatar } from "../shared/PlayerAvatar";
import { api } from '../../utils/api';
import { adaptTournament } from '../../utils/helpers';
import { AuthContext } from '../../context/useAuth';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useTournamentAlerts } from '../../hooks/useTournamentAlerts';
import { useAlerts } from '../../context/useAlerts';
import SignupBanner from './SignupBanner';
import SignupPricePill from '../shared/SignupPricePill';
import { playTone, TONES } from '../../utils/sound';
import { ChartNoAxesCombined, ChevronLeft, ChevronRight, Eye, Flame, Lock, Share2, QrCode, Split, List, Trophy, User, Users, Building2, Zap, Tv, Pause, Play, Volume2, VolumeX, Maximize, Minimize, Clock, X, Calendar, MapPin, Hourglass, Timer } from "lucide-react";
import courtSvg from "../../assets/padel-court.svg";
import appLogo from "../../assets/padeleando.svg";
import Badge from "../shared/Badge";
import { TournamentHeaderSkeleton, TabsSkeleton, CardSkeleton } from "../shared/Skeleton";
import Btn from "../shared/Btn";
import LazyNotFound from "../NotFound/LazyNotFound";
import ShareModal from "../shared/ShareModal";
import ShareFixtureModal from "../shared/ShareFixtureModal";
import QrModal from "../shared/QrModal";

const PHASE_LABEL = { previa: 'FASE PREVIA', octavos: 'OCTAVOS', cuartos: 'CUARTOS', semis: 'SEMIS', final: 'FINAL' };

// Cantidad de partidos jugados (liga + bracket) — usado para el badge de PJ y
// para disparar el sonido cuando se registra un resultado nuevo.
function countPlayed(t) {
  if (!t) return 0;
  const bracketPlayed = t.format === 'americano'
    ? [...(t.bracket?.octavos ?? []), ...(t.bracket?.cuartos ?? []),
       ...(t.bracket?.semis ?? []), ...(t.bracket?.final ? [t.bracket.final] : [])]
      .filter(m => m.winner_id != null).length
    : 0;
  return t.matches.filter((m) => m.score1 !== "").length + bracketPlayed;
}

const LIGA_TABS = [
  { id: "standings", label: "TABLA",        icon: Trophy },
  { id: "matches",   label: "PARTIDOS",     icon: Flame },
  { id: "players",   label: "JUGADORES",    icon: User },
  { id: "stats",     label: "ESTADÍSTICAS", icon: ChartNoAxesCombined },
];

const AMERICANO_TABS = [
  { id: "standings", label: "TABLA",      icon: Trophy },
  { id: "matches",   label: "PREVIA",     icon: List },
  { id: "bracket",   label: "CUADRO",     icon: Split },
  { id: "stats",     label: "ESTADÍSTICAS", icon: ChartNoAxesCombined },
  { id: "players",   label: "JUGADORES",  icon: User },
];

// Contador de frescura: segundos transcurridos desde el último refresco de datos.
// Se remonta (key=refreshTick) en cada poll de la vista readonly, reiniciando a 0.
function LastUpdated() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, []);
  return (
    <span className="text-[11px] font-mono text-cyan/70">
      Actualizado hace {secs} {secs === 1 ? "segundo" : "segundos"}
    </span>
  );
}

// Cartel "¿Jugás en este torneo?" — reutilizable en la vista normal y en el Modo TV.
// Invitados (sin cuenta) ven un CTA para iniciar sesión; los logueados que no son
// jugadores ni dueños eligen a qué jugador reclamar y solicitan unirse. Si ya los
// invitaron, el cartel se transforma en la propia invitación.
function JoinBanner({ user, tournament, joinStatus, claimablePlayers = [], hidden, busy, onRequest, onRespondInvite, onHide, onLogin }) {
  const [selectedId, setSelectedId] = useState('');
  // Valor efectivo: la elección del usuario si sigue disponible, si no el primero.
  const effectiveId = claimablePlayers.some((p) => p.id === selectedId)
    ? selectedId
    : (claimablePlayers[0]?.id ?? '');

  if (hidden) return null;

  const closeBtn = (tone) => (
    <button onClick={onHide} className={`${tone} cursor-pointer transition-colors shrink-0`}>✕</button>
  );

  // Invitación pendiente: tiene prioridad sobre todo lo demás y se muestra sea
  // cual sea el estado del torneo. Antes sólo se podía aceptar desde la campana,
  // y acá aparecía un "solicitar unirse" que no correspondía.
  const invitation = joinStatus?.invitation;
  if (invitation && !joinStatus.is_player) {
    return (
      <div className="px-6 py-2.5 bg-brand/8 border-y border-brand/20 flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[12px] font-mono text-brand/80">
          @{invitation.invited_by_username} te invitó a unirte como{' '}
          <span className="text-brand font-bold">{invitation.player_name}</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRespondInvite('accept')}
            disabled={busy}
            className="text-[11px] font-mono px-3 py-1.5 rounded border border-brand text-brand hover:bg-brand hover:text-base cursor-pointer transition-colors disabled:opacity-40"
          >
            {busy ? 'Procesando...' : 'Aceptar'}
          </button>
          <button
            onClick={() => onRespondInvite('reject')}
            disabled={busy}
            className="text-[11px] font-mono px-3 py-1.5 rounded border border-border-strong text-muted hover:text-danger hover:border-danger/40 cursor-pointer transition-colors disabled:opacity-40"
          >
            Rechazar
          </button>
          {closeBtn('text-brand/60 hover:text-brand')}
        </div>
      </div>
    );
  }

  // También en los terminados: reclamar el lugar en un torneo ya jugado es
  // justamente el caso en que a alguien le interesa que esos partidos le cuenten
  // en el perfil. El backend nunca miró el estado para aceptar la solicitud.
  if (tournament?.status !== 'active' && tournament?.status !== 'finished') return null;

  // Invitado sin cuenta → CTA de inicio de sesión.
  if (!user) {
    return (
      <div className="px-6 py-2.5 bg-brand/8 border-y border-brand/20 flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[12px] font-mono text-brand/80">¿Jugás en este torneo?</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onLogin}
            className="text-[11px] font-mono px-3 py-1.5 rounded border border-brand text-brand hover:bg-brand hover:text-base cursor-pointer transition-colors"
          >
            Iniciar sesión para unirte
          </button>
          {closeBtn('text-brand/60 hover:text-brand')}
        </div>
      </div>
    );
  }

  // Logueado: sólo si no es jugador ni dueño y ya cargó el estado.
  if (!joinStatus || joinStatus.is_player || joinStatus.is_owner) return null;
  const req = joinStatus.request;

  if (!req || req.status === 'rejected') {
    return (
      <div className="px-6 py-2.5 bg-brand/8 border-y border-brand/20 flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[12px] font-mono text-brand/80 shrink-0">
          {req?.status === 'rejected' ? 'Tu solicitud fue rechazada.' : '¿Jugás en este torneo?'}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {claimablePlayers.length === 0 ? (
            <span className="text-[11px] font-mono text-dim">No hay jugadores disponibles para reclamar.</span>
          ) : (
            <>
              <select
                value={effectiveId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="bg-surface border border-brand/40 text-white text-[12px] font-mono rounded px-2 py-1.5 cursor-pointer outline-none max-w-[45vw] sm:max-w-none"
              >
                {claimablePlayers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button
                onClick={() => onRequest(effectiveId)}
                disabled={busy || !effectiveId}
                className="text-[11px] font-mono px-3 py-1.5 rounded border border-brand text-brand hover:bg-brand hover:text-base cursor-pointer transition-colors disabled:opacity-40"
              >
                {busy ? 'Enviando...' : 'Solicitar unirse'}
              </button>
            </>
          )}
          {closeBtn('text-brand/60 hover:text-brand')}
        </div>
      </div>
    );
  }

  if (req.status === 'pending') {
    return (
      <div className="px-6 py-2.5 bg-surface border-y border-border-mid flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono text-muted">
          ⏳ Solicitud pendiente de aprobación
          {req.requested_player_name ? <> — pediste unirte como <span className="text-soft">{req.requested_player_name}</span></> : null}
        </span>
        {closeBtn('text-muted/60 hover:text-muted')}
      </div>
    );
  }

  return null;
}

export default function ReadonlyView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [tournament, setTournament] = useState(null);
  // Vienen dentro de la propia respuesta del torneo. Antes se pedían aparte a
  // /groups/:id/meta, una llamada que sólo podía salir después de ésta y que al
  // volver insertaba la píldora de la categoría sobre el título, empujando la
  // página 39 px. Derivarlos elimina el salto y un round-trip.
  const groupName           = tournament?.group_name ?? null;
  const groupEmojis         = tournament?.group_emojis ?? [];
  const groupIsPublic       = tournament?.group_is_public ?? true;
  const groupOwnerIsPremium = tournament?.group_owner_is_premium ?? false;
  const groupOwner = useMemo(
    () => (tournament?.owner_username
      ? {
          username:   tournament.owner_username,
          name:       tournament.owner_name,
          avatar_url: tournament.owner_avatar_url ?? null,
        }
      : null),
    [tournament?.owner_username, tournament?.owner_name, tournament?.owner_avatar_url],
  );
  const [error, setError]           = useState(false);
  const [tab, setTab]               = useState("standings");
  const [shareOpen, setShareOpen]   = useState(false);
  const [qrOpen, setQrOpen]         = useState(false);
  const [joinStatus, setJoinStatus] = useState(null); // { is_player, is_owner, request, invitation }
  const [joinBusy, setJoinBusy]     = useState(false);
  const [hideJoinBanner, setHideJoinBanner] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  // ── Modo TV (rotación automática de pantallas) ─────────────────────────────
  // La vista de espectador arranca directo en Modo TV; la cruz (onExit) vuelve al
  // modo normal con tabs.
  // Arranca apagado: el modo TV sirve para dejar puesta una pantalla en el club,
  // no para el que abre el link a mirar un resultado. Se entra con el botón.
  const [tvMode, setTvMode]     = useState(false);
  const [tvPaused, setTvPaused] = useState(false);
  const [tvStep, setTvStep]     = useState(0);
  const [soundOn, setSoundOn]   = useState(false);
  const [club, setClub]         = useState(null);

  // La pila de avisos es global: la comparte con la campana.
  const { pushAlert } = useAlerts();
  const trackAlerts = useTournamentAlerts(user?.username, {
    onAlert: (list) => { list.forEach(pushAlert); handleAlerts(list); },
  });

  // Sólo el torneo: es lo único que cambia entre ciclos de refresco.
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

  const REFRESH_MS = 30_000;
  useEffect(() => {
    load();
    // Con la pestaña oculta no se refresca: una TV del club con el torneo
    // proyectado hacía 120 peticiones/hora aunque nadie la estuviera mirando.
    // Al volver a primer plano se recarga en el acto.
    let interval = null;
    const start = () => { if (!interval) interval = setInterval(load, REFRESH_MS); };
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

  // Datos del club (logo + nombre) para el header del modo TV
  useEffect(() => {
    const cid = tournament?.club_id;
    if (!cid) { setClub(null); return; }
    api.clubs.get(cid).then(setClub).catch(() => setClub(null));
  }, [tournament?.club_id]);

  function toggleSound() {
    setSoundOn((v) => {
      const next = !v;
      if (next) playTone(TONES.confirm); // el gesto del usuario habilita el audio
      return next;
    });
  }

  // La detección vive en useTournamentAlerts; acá sólo se les pone sonido.
  function handleAlerts(list) {
    if (!soundOn) return;
    const kinds = list.map((a) => a.kind);
    if (kinds.includes('champion'))                                        playTone(TONES.champion, 0.18);
    else if (kinds.some((k) => k === 'your_match' || k === 'bracket_spot')) playTone(TONES.personal);
    else if (kinds.includes('result'))                                     playTone(TONES.result);
    else                                                                   playTone(TONES.live);
  }

  // Secuencia de pantallas del modo TV (depende del formato y de si hay cuadro)
  const hasBracketTv = tournament?.format === 'americano' && !!tournament?.bracket;
  // Con uno o dos partidos los destacados son ruido (un MVP con una victoria),
  // así que la pantalla de stats entra en la rotación recién a partir de 3.
  const tvPlayedCount = useMemo(
    () => (tournament ? playedMatches(getAllMatches(tournament)).length : 0),
    [tournament]
  );
  const tvSequence = useMemo(() => {
    const seq = [
      { screen: 'standings', label: 'TABLA DE POSICIONES', duration: 10000 },
      { screen: 'live',      label: 'PARTIDOS EN VIVO',    duration: 10000 },
    ];
    if (tvPlayedCount >= TV_STATS_MIN_MATCHES) seq.push({ screen: 'stats', label: 'ESTADÍSTICAS', duration: 12000 });
    if (hasBracketTv) seq.push({ screen: 'bracket', label: 'CUADRO', duration: 20000 });
    return seq;
  }, [hasBracketTv, tvPlayedCount]);

  // Mantener el índice dentro del rango si cambia la secuencia (p.ej. aparece el cuadro)
  useEffect(() => {
    setTvStep((s) => (s >= tvSequence.length ? 0 : s));
  }, [tvSequence.length]);

  function toggleTv() {
    setTvMode((v) => {
      const next = !v;
      if (next) { setTvStep(0); setTvPaused(false); }
      return next;
    });
  }
  function nextScreen() { setTvStep((s) => (s + 1) % tvSequence.length); }
  function prevScreen() { setTvStep((s) => (s - 1 + tvSequence.length) % tvSequence.length); }
  function handleBarEnd() {
    if (tvMode && !tvPaused) setTvStep((s) => (s + 1) % tvSequence.length);
  }

  useEffect(() => {
    const tid = tournament?.id;
    if (!user || !tid) return;
    api.joinRequests.myStatus(tid)
      .then(setJoinStatus)
      .catch(() => {});
  }, [user, tournament?.id]);

  async function handleJoinRequest(playerId) {
    if (joinBusy || !playerId) return;
    setJoinBusy(true);
    try {
      const result = await api.joinRequests.send(tournament.id, playerId);
      setJoinStatus((s) => ({ ...s, is_player: false, request: result }));
    } catch {
      //
    } finally {
      setJoinBusy(false);
    }
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
    } catch {
      //
    } finally {
      setJoinBusy(false);
    }
  }

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
      <TabsSkeleton count={4} />
      <div className="p-6 flex flex-col gap-3">
        <CardSkeleton lines={3} />
        <CardSkeleton lines={2} />
        <CardSkeleton lines={2} />
      </div>
    </div>
  );

  const isAmericano = tournament.format === 'americano';
  const TABS = isAmericano ? AMERICANO_TABS : LIGA_TABS;

  // La página normal usa siempre el tab manual; el modo TV vive en su overlay.
  const activeTab   = tab;
  // Barra de progreso de la página: cuenta el próximo refresco (30s).
  const barDuration = REFRESH_MS;
  const barKey      = `refresh-${refreshTick}`;

  let winnerLabel = null;
  if (tournament.status === 'finished') {
    if (isAmericano) {
      if (tournament.bracket?.final?.winner_name) winnerLabel = tournament.bracket.final.winner_name;
    } else {
      const standings = calcStandings(tournament.players, tournament.matches);
      if (tournament.mode === 'pairs' && tournament.pairs?.length > 0) {
        const pairRows = tournament.pairs.map((pair) => {
          const stats  = standings.find((r) => r.id === pair.p1) ?? standings.find((r) => r.id === pair.p2) ?? { pj: 0, pg: 0, sf: 0, sc: 0 };
          const p1Name = tournament.players.find((p) => p.id === pair.p1)?.name ?? '?';
          const p2Name = tournament.players.find((p) => p.id === pair.p2)?.name ?? '?';
          return { ...stats, id: pair.id, name: `${p1Name} & ${p2Name}` };
        }).sort(compareStandingRows);
        const topPg   = pairRows[0]?.pg ?? 0;
        const topDiff = pairRows[0] ? pairRows[0].sf - pairRows[0].sc : 0;
        const top     = pairRows.filter((r) => r.pj > 0 && r.pg === topPg && (r.sf - r.sc) === topDiff);
        if (top.length) winnerLabel = top.map((r) => r.name).join(' / ');
      } else {
        const topPg   = standings[0]?.pg ?? 0;
        const topDiff = standings[0] ? standings[0].sf - standings[0].sc : 0;
        const top     = standings.filter((r) => r.pj > 0 && r.pg === topPg && (r.sf - r.sc) === topDiff);
        if (top.length) winnerLabel = top.map((r) => r.name).join(' / ');
      }
    }
  }

  const bracketPlayed = isAmericano
    ? [...(tournament.bracket?.octavos ?? []), ...(tournament.bracket?.cuartos ?? []),
       ...(tournament.bracket?.semis   ?? []), ...(tournament.bracket?.final ? [tournament.bracket.final] : [])]
      .filter(m => m.winner_id != null).length
    : 0;
  const playedCount = tournament.matches.filter((m) => m.score1 !== "").length + bracketPlayed;
  const isDraft = isAmericanoDraft({ format: tournament.format, pairCount: tournament.pairs?.length });

  // Estado mostrado — mismo criterio que la vista del organizador (incluye "PRÓXIMAMENTE")
  const liveMatches = Array.isArray(tournament.live_match) ? tournament.live_match : [];
  const statusMeta = TOURNAMENT_STATUS_META[tournamentDisplayStatus({
    status: tournament.status,
    hasLiveMatch: liveMatches.some((m) => m.startedAt != null),
    hasPlayed: playedCount > 0,
    isDraft,
  })];

  // Cantidad de parejas o jugadores según el modo del torneo
  const isPairs     = isAmericano || tournament.mode === 'pairs';
  const entityCount = isPairs ? (tournament.pairs?.length ?? 0) : tournament.players.filter((p) => !p.removed).length;

  const MOBILE_LABEL = {
    standings: 'TABLA',
    matches:   isAmericano ? 'PREVIA' : 'PARTIDOS',
    players:   'JUGAD.',
    stats:     'STATS',
    bracket:   'CUADRO',
  };

  // Jugadores del torneo que todavía no tienen una cuenta vinculada: son los que
  // un espectador puede reclamar al solicitar unirse.
  const claimablePlayers = (tournament.players ?? [])
    .filter((p) => !p.removed && !p.linked_username)
    .map((p) => ({ id: p.id, name: p.name }));

  // Cartel de "¿Jugás en este torneo?" — se muestra en la vista normal y también
  // dentro del Modo TV. Para invitados (sin cuenta) ofrece iniciar sesión.
  const signupBanner = (
    <SignupBanner signup={tournament.signup} tournamentName={tournament.name} />
  );

  const joinBanner = (
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
  );

  return (
    <div className="bg-base text-content font-sans pb-24 sm:pb-15">
      <div className="px-6 pt-5 pb-5 border-b border-border bg-gradient-to-b from-surface/25 to-transparent">
        {/* Breadcrumbs + compartir */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {window.history.length > 1 && (
              <div
                onClick={() => navigate(-1)}
                className="flex flex-row gap-1.5 items-center text-muted border border-border-strong px-2.5 py-1 text-[11px] cursor-pointer rounded-sm font-sans hover:text-white transition-colors"
              >
                <ChevronLeft size={14} />
                <span>Volver</span>
              </div>
            )}
            {groupName && (
              groupIsPublic ? (
                <div
                  onClick={() => navigate(`/cat/${tournament.group_id}`)}
                  className="inline-flex items-center gap-1.5 bg-surface border border-border-mid rounded-full px-3 py-1 cursor-pointer hover:border-border-strong transition-colors"
                >
                  {groupEmojis?.length > 0 && (
                    <span className="text-sm leading-none">{groupEmojis.join(' ')}</span>
                  )}
                  <span className="text-[11px] font-mono text-muted">{groupName}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 bg-surface border border-border-mid rounded-full px-3 py-1">
                  {groupEmojis?.length > 0 && (
                    <span className="text-sm leading-none">{groupEmojis.join(' ')}</span>
                  )}
                  <span className="text-[11px] font-mono text-muted">{groupName}</span>
                  <Lock size={10} className="text-yellow-400" />
                </div>
              )
            )}
          </div>
          <div className="flex items-center gap-2">
            <Btn variant={tvMode ? 'primary' : 'secondary'} size="sm" onClick={toggleTv} icon={Tv}
              title={tvMode ? 'Salir del modo TV' : 'Modo TV (rotación automática)'} />
            <Btn size="sm" onClick={() => setQrOpen(true)} icon={QrCode} title="Código QR" />
            <Btn variant="primary" size="sm" onClick={() => setShareOpen(true)} icon={Share2} />
          </div>
        </div>

        {/* Título */}
        <h1 className="font-condensed font-bold text-[40px] sm:text-[52px] text-white tracking-wide leading-none text-center mb-3">
          {tournament.name}
        </h1>

        {/* Estado + ganador + dueño */}
        <div className="flex items-center justify-center gap-2.5 flex-wrap">
          <Badge variant="status" color={statusMeta.color} icon={statusMeta.icon} pulse={statusMeta.pulse}>
            {statusMeta.label}
          </Badge>
          {winnerLabel && (
            <Badge variant="chip" color="brand" icon={Trophy}>{winnerLabel}</Badge>
          )}
          {groupOwner && (
            isDeletedAccount(groupOwner.username) ? (
              <span className="inline-flex items-center gap-1.5 bg-surface border border-border-strong rounded-full pl-2 pr-2.5 py-0.5 text-[11px] font-mono text-[#444]">
                <User size={11} />
                Cuenta Eliminada
              </span>
            ) : (
              <span
                onClick={() => navigate(`/u/${groupOwner.username}`)}
                className="inline-flex items-center gap-1.5 bg-surface border border-border-strong rounded-full pl-0.5 pr-2.5 py-0.5 text-[11px] font-mono text-[#444] hover:bg-border-mid hover:text-white cursor-pointer transition-colors"
              >
                <PlayerAvatar
                  name={groupOwner.name ?? groupOwner.username}
                  src={groupOwner.avatar_url}
                  size={18}
                  premium={groupOwnerIsPremium}
                />
                @{groupOwner.username}
              </span>
            )
          )}
        </div>

        {/* Metadata — fecha · cantidad · jugados · club */}
        <div className="mt-3 flex items-center justify-center gap-x-3 gap-y-1.5 flex-wrap text-[11px] font-mono text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={11} className="text-dim" />
            {fmt(tournament.event_date ?? tournament.createdAt)}
            {tournament.event_time && <span className="text-brand">{fmtHora(tournament.event_time)}</span>}
          </span>
          <span className="inline-flex items-center gap-1.5">
            {isPairs ? <Users size={11} className="text-dim" /> : <User size={11} className="text-dim" />}
            {entityCount} {isPairs ? 'parejas' : 'jugadores'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Flame size={11} className="text-dim" />
            {playedCount} jugados
          </span>
          <SignupPricePill signup={tournament.signup} />
          {tournament.club_id && (
            <button
              onClick={() => navigate(`/club/${tournament.club_id}`)}
              className="inline-flex items-center gap-1.5 bg-surface border border-border-mid rounded-full px-2.5 py-0.5 cursor-pointer hover:border-brand transition-colors text-[11px] font-mono text-muted"
            >
              <Building2 size={11} className="text-brand" />
              <span className="truncate max-w-[160px]">{tournament.club_name ?? club?.name ?? 'Club'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra discreta: vista de espectadores + progreso de refresco */}
      <div className="bg-cyan/5 border-b border-cyan/15">
        {/* Barra de progreso (se llena de izquierda a derecha) */}
        <div className="h-1 bg-cyan/10 overflow-hidden">
          <div
            key={barKey}
            className="readonly-progress h-full w-full bg-cyan/50"
            style={{ animationDuration: `${barDuration}ms` }}
          />
        </div>
        <div className="px-6 py-1.5 flex items-center gap-2 flex-wrap">
          <Eye size={11} className="text-cyan/70" />
          <LastUpdated key={refreshTick} />
        </div>
      </div>

      {/* Banner de solicitud de unión */}
      {signupBanner}
      {joinBanner}

      <LiveTicker tournament={tournament} isAmericano={isAmericano} />

      {/* Tabs — desktop (sm+) */}
      <div className="hidden sm:flex border-b border-border px-4 items-center overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => { setTvMode(false); setTab(t.id); }}
            className={`flex flex-row gap-2 items-center border-0 px-3.5 py-3.5 font-condensed font-bold text-[13px] tracking-wide cursor-pointer border-b-2 rounded-t-md whitespace-nowrap transition-all hover:text-brand ${activeTab === t.id ? 'text-brand border-b-brand bg-brand/10' : 'text-muted border-b-transparent bg-transparent hover:bg-brand/5'}`}>
            <t.icon size={15}/>{t.label}
          </button>
        ))}
      </div>

      {/* Bottom nav — mobile only */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-base border-t border-border flex">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTvMode(false); setTab(t.id); }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 border-0 cursor-pointer transition-colors ${activeTab === t.id ? 'text-brand bg-brand/10' : 'text-muted bg-transparent'}`}
          >
            <t.icon size={20} />
            <span className="text-[9px] font-mono tracking-wide leading-none">
              {MOBILE_LABEL[t.id] ?? t.label}
            </span>
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === "standings" && <Standings tournament={tournament} />}
        {activeTab === "stats"     && <Suspense fallback={<div style={{ minHeight: 400 }} />}><Stats tournament={tournament} ownerIsPremium={groupOwnerIsPremium} /></Suspense>}
        {activeTab === "matches"   && <><SpectatorLive tournament={tournament} isAmericano={isAmericano} scope="previa" /><ReadonlyMatches tournament={tournament} groupName={groupName} /></>}
        {activeTab === "players"   && <ReadonlyPlayers tournament={tournament} />}
        {activeTab === "bracket"   && <><SpectatorLive tournament={tournament} isAmericano={isAmericano} scope="bracket" /><Bracket tournament={tournament} isOwner={false} /></>}

        <PhotoGallery tournamentId={tournament.id} isOwner={false} canUpload={false} />
      </div>

      {tvMode && (
        <TvOverlay
          tournament={tournament}
          isAmericano={isAmericano}
          club={club}
          groupName={groupName}
          groupEmojis={groupEmojis}
          seq={tvSequence}
          step={tvStep}
          paused={tvPaused}
          onTogglePause={() => setTvPaused((p) => !p)}
          onPrev={prevScreen}
          onNext={nextScreen}
          onBarEnd={handleBarEnd}
          onExit={() => setTvMode(false)}
          soundOn={soundOn}
          onToggleSound={toggleSound}
          playedCount={playedCount}
          joinBanner={joinBanner}
          signupBanner={signupBanner}
        />
      )}

      {shareOpen && (
        <ShareModal
          tournamentName={tournament.name}
          categoryName={groupName}
          clubName={tournament.club_name ?? club?.name}
          url={window.location.href}
          onClose={() => setShareOpen(false)}
        />
      )}

      {qrOpen && (
        <QrModal
          tournamentName={tournament.name}
          categoryName={groupName}
          url={window.location.href}
          onClose={() => setQrOpen(false)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODO TV — overlay full-screen tipo scoreboard (rotación automática de pantallas)
// ══════════════════════════════════════════════════════════════════════════════

// Reloj / cualquier tick temporal.
function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

// Fecha larga en español (para el subtítulo del header).
function longEsDate(dstr) {
  const s = dstr ? String(dstr).slice(0, 10) : null;
  const d = s ? new Date(`${s}T00:00:00`) : new Date();
  try {
    return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
  } catch { return ''; }
}

// Contenedor que auto-scrollea lento en vertical (ping-pong) si su contenido no
// entra en el alto disponible. Se reinicia cuando cambia `resetKey`.
// En mobile/tablet (< lg) NO auto-scrollea: el usuario scrollea a mano.
function AutoScrollY({ children, resetKey, speed = 26, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = 0;
    const mq = window.matchMedia('(min-width: 1024px)');
    let raf;
    const start = () => {
      cancelAnimationFrame(raf);
      el.scrollTop = 0;
      // Sólo auto-scrollear en desktop; en pantallas chicas queda el scroll manual.
      if (!mq.matches) return;
      let dir = 1, pos = 0, holdUntil = 0;
      let last = performance.now();
      const tick = (now) => {
        const dt = Math.min(now - last, 64);
        last = now;
        const max = el.scrollHeight - el.clientHeight;
        if (max > 8 && now >= holdUntil) {
          pos += dir * speed * (dt / 1000);
          if (pos >= max)      { pos = max; dir = -1; holdUntil = now + 2500; }
          else if (pos <= 0)   { pos = 0;   dir = 1;  holdUntil = now + 2500; }
          el.scrollTop = pos;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    start();
    mq.addEventListener('change', start);
    return () => { cancelAnimationFrame(raf); mq.removeEventListener('change', start); };
  }, [resetKey, speed]);
  return <div ref={ref} className={`h-full overflow-x-hidden overflow-y-auto lg:overflow-hidden ${className}`}>{children}</div>;
}

// Botón circular de la barra superior.
function TvIconBtn({ children, onClick, title, active }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-9 h-9 lg:w-10 lg:h-10 flex items-center justify-center rounded-full border transition-colors cursor-pointer shrink-0 ${
        active ? 'border-brand/50 text-brand bg-brand/10' : 'border-border-mid text-muted bg-surface hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function TvClock() {
  const now = useNow(1000);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return (
    <div className="hidden sm:flex items-center gap-2 px-3 h-9 lg:h-10 rounded-full border border-border-mid bg-surface">
      <Clock size={14} className="text-brand" />
      <span className="font-mono text-[13px] lg:text-[15px] text-white tabular-nums tracking-wide">{hh}:{mm}:{ss}</span>
    </div>
  );
}

function FullscreenBtn() {
  const [fs, setFs] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);
  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);
  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.();
  };
  return (
    <TvIconBtn title={fs ? 'Salir de pantalla completa' : 'Pantalla completa'} onClick={toggle}>
      {fs ? <Minimize size={16} /> : <Maximize size={16} />}
    </TvIconBtn>
  );
}

// Aviso de bienvenida al Modo TV: el visitante entra directo al overlay y nada
// le indica que hay una vista normal debajo. Se muestra una sola vez por
// dispositivo y se va solo; flota sobre el contenido para no mover el layout.
const TV_HINT_KEY = 'padeleando:tv-hint-seen';
const TV_HINT_MS  = 9000;

function TvHint({ onExit }) {
  const [show, setShow] = useState(() => {
    try { return !localStorage.getItem(TV_HINT_KEY); } catch { return false; }
  });

  useEffect(() => {
    if (!show) return;
    try { localStorage.setItem(TV_HINT_KEY, '1'); } catch { /* modo privado */ }
    const id = setTimeout(() => setShow(false), TV_HINT_MS);
    return () => clearTimeout(id);
  }, [show]);

  if (!show) return null;

  return (
    <div role="status" className="absolute top-3 right-3 lg:right-6 z-20 max-w-[min(320px,calc(100vw-1.5rem))] animate-[fadeInUp_0.3s_ease-out]">
      <div className="absolute -top-1.5 right-8 w-3 h-3 rotate-45 border-l border-t border-brand/40 bg-surface-alt" />
      <div className="relative rounded-xl border border-brand/40 bg-surface-alt shadow-xl px-4 py-3">
        <button
          onClick={() => setShow(false)}
          title="Entendido"
          className="absolute top-2 right-2 text-muted hover:text-white transition-colors cursor-pointer bg-transparent border-none"
        >
          <X size={13} />
        </button>
        <div className="flex items-center gap-1.5 text-brand font-mono text-[10px] tracking-wide mb-1">
          <Tv size={12} />MODO TV
        </div>
        <p className="text-[12px] text-secondary leading-snug pr-4">
          Las pantallas rotan solas. Tocá{' '}
          <button
            onClick={onExit}
            className="text-white font-semibold underline underline-offset-2 bg-transparent border-none p-0 cursor-pointer"
          >
            SALIR
          </button>{' '}
          para ver posiciones, partidos y estadísticas por tu cuenta.
        </p>
      </div>
    </div>
  );
}

function TvHeader({ tournament, club, groupName, groupEmojis, paused, onPrev, onNext, onTogglePause, soundOn, onToggleSound, onExit }) {
  const clubName = club?.name ?? tournament.club_name ?? null;
  const clubLogo = club?.photo_url ?? null;
  const dateLabel = longEsDate(tournament.event_date);

  // Estado del torneo con el mismo criterio del resto de la app, con un matiz
  // extra para el scoreboard: "EN VIVO" cuando hay un partido jugándose ahora,
  // "EN CURSO" si el torneo está en marcha pero sin partido activo.
  const liveTv  = Array.isArray(tournament.live_match) ? tournament.live_match : [];
  const hasLive = liveTv.some((m) => m.startedAt != null);
  const dispStatus = tournamentDisplayStatus({
    status: tournament.status,
    hasLiveMatch: hasLive,
    hasPlayed: countPlayed(tournament) > 0,
    isDraft: isAmericanoDraft({ format: tournament.format, pairCount: tournament.pairs?.length }),
  });
  const status = TOURNAMENT_STATUS_META[dispStatus === 'active' && hasLive ? 'live' : dispStatus];
  const StatusIcon = status.icon;
  const statusCls = {
    default: 'border-border-mid text-muted bg-surface',
    brand:   'border-brand/40 text-brand bg-brand/10',
    cyan:    'border-cyan/40 text-cyan bg-cyan/10',
    green:   'border-green/40 text-green bg-green/10',
    danger:  'border-danger/50 text-danger bg-danger/10',
  }[status.color];

  return (
    <header className="shrink-0 flex items-start gap-3 lg:gap-5 px-4 lg:px-8 py-3 border-b border-border bg-gradient-to-b from-surface/40 to-transparent">
      {/* Logo del club (o de la app como fallback) */}
      <div className="shrink-0 w-14 h-14 lg:w-16 lg:h-16 rounded-xl border border-border-mid bg-surface overflow-hidden flex items-center justify-center">
        {clubLogo
          ? <img src={clubLogo} alt={clubName ?? ''} className="w-full h-full object-contain" />
          : <img src={appLogo} alt="" className="w-8 h-8 lg:w-10 lg:h-10 object-contain opacity-80" />}
      </div>

      {/* Título + estado + club + categoría + fecha */}
      <div className="min-w-0 flex-1">
        <h1 className="font-condensed font-bold text-white text-[20px] lg:text-[30px] leading-tight tracking-wide">
          {tournament.name}
        </h1>
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono tracking-wide ${statusCls}`}>
            {StatusIcon
              ? <StatusIcon size={11} className="shrink-0" />
              : <span className={`w-1.5 h-1.5 rounded-full bg-current shrink-0 ${status.pulse ? 'animate-pulse' : ''}`} />}
            {status.label}
          </span>
          {clubName && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border-mid bg-surface text-[10px] font-mono tracking-wide text-soft">
              <MapPin size={11} className="text-brand/60" />
              <span className="max-w-[160px] truncate">{clubName}</span>
            </span>
          )}
          {groupName && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-brand/40 bg-gradient-to-b from-brand/15 to-brand/5 text-[10px] font-condensed font-bold tracking-wide text-white">
              <Trophy size={12} className="text-brand" />
              {groupEmojis?.length > 0 && <span>{groupEmojis.join(' ')}</span>}
              {groupName}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-wide text-muted">
            <Calendar size={11} />{dateLabel}
            {tournament.event_time && <span className="text-brand">{fmtHora(tournament.event_time)}</span>}
          </span>
        </div>
      </div>

      {/* Controles — en mobile: navegación arriba, iconos al medio, salir abajo */}
      <div className="shrink-0 flex flex-col items-center gap-2 lg:flex-row lg:gap-2.5">
        <div className="flex items-center rounded-full border border-border-mid bg-surface overflow-hidden h-9 lg:h-10">
          <button onClick={onPrev} title="Pantalla anterior" className="px-2 h-full text-muted hover:text-white transition-colors cursor-pointer">
            <ChevronLeft size={16} />
          </button>
          <button onClick={onTogglePause} title={paused ? 'Reanudar' : 'Pausar'} className="px-3 h-full border-x border-border-mid text-brand hover:text-white transition-colors cursor-pointer flex items-center gap-1.5">
            {paused ? <Play size={15} /> : <Pause size={15} />}
            <span className="font-mono text-[10px] tracking-wide hidden lg:inline">{paused ? 'PLAY' : 'PAUSA'}</span>
          </button>
          <button onClick={onNext} title="Pantalla siguiente" className="px-2 h-full text-muted hover:text-white transition-colors cursor-pointer">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 lg:gap-2.5">
          <TvIconBtn title={soundOn ? 'Silenciar' : 'Activar sonido'} onClick={onToggleSound} active={soundOn}>
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </TvIconBtn>
          <FullscreenBtn />
          <TvClock />
        </div>

        {/* El rótulo "MODO TV" vive dentro del propio botón de salida: avisa en
            qué modo está el visitante y dónde se sale, sin una píldora suelta.
            En mobile baja a su propia fila, donde entra sin apretar los iconos. */}
        <button
          onClick={onExit}
          title="Salir del modo TV"
          className="flex flex-col rounded-2xl border border-border-mid bg-surface overflow-hidden text-muted hover:text-white hover:border-border-strong transition-colors cursor-pointer shrink-0"
        >
          <span className="flex items-center justify-center gap-1 px-3 py-0.5 border-b border-border-mid bg-brand/10 text-brand font-mono text-[9px] lg:text-[10px] tracking-wide">
            <Tv size={10} />MODO TV
          </span>
          <span className="flex items-center justify-center gap-1.5 px-3 py-1.5">
            <X size={15} />
            <span className="font-mono text-[10px] lg:text-[11px] tracking-wide">SALIR</span>
          </span>
        </button>
      </div>
    </header>
  );
}

// ── Pantalla: TABLA DE POSICIONES ──────────────────────────────────────────────
function TvStandingsScreen({ tournament }) {
  return (
    <AutoScrollY resetKey={`st-${tournament.matches.length}-${tournament.pairs.length}`} className="px-4 lg:px-8 py-5">
      <div className="max-w-4xl mx-auto">
        <Standings tournament={tournament} />
      </div>
    </AutoScrollY>
  );
}

// ── Pantalla: PARTIDOS EN VIVO ─────────────────────────────────────────────────
// El tamaño de los avatares es una prop numérica, no una clase, así que no se
// puede resolver con breakpoints. En la cancha del modo TV importa: con 40 px
// sobre el ancho de un teléfono el nombre se queda sin lugar dentro de su
// píldora.
const MQ_WIDE = '(min-width: 1024px)';

function subscribeWide(onChange) {
  const mq = window.matchMedia(MQ_WIDE);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function useIsWide() {
  return useSyncExternalStore(subscribeWide, () => window.matchMedia(MQ_WIDE).matches);
}

function TvLiveScreen({ tournament, isAmericano }) {
  const wide = useIsWide();
  const all = Array.isArray(tournament.live_match) ? tournament.live_match : [];
  const enVivo   = all.filter((m) => m.startedAt != null);
  const proximos = all.filter((m) => m.startedAt == null);

  if (all.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
        <Zap size={44} className="text-border-strong" />
        <div className="font-condensed font-bold text-[26px] text-muted tracking-wide">No hay partidos en vivo</div>
        <div className="text-[15px] text-dim">Cuando arranque un partido, aparecerá acá.</div>
      </div>
    );
  }

  // En mobile las dos secciones van apiladas, no lado a lado: la columna de
  // próximos medía 288 px fijos y sobre un viewport de 390 dejaba la cancha en
  // vivo con unos 60 px de ancho, donde ningún nombre era legible.
  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 lg:gap-6 px-4 lg:px-8 py-5">
      {/* En juego */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-2 font-condensed font-bold text-[16px] tracking-[3px] text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse" /> PARTIDOS EN JUEGO
          </div>
          <span className="font-mono text-[11px] text-muted">{enVivo.length} ACTIVO(S)</span>
        </div>
        {enVivo.length > 0 ? (
          <AutoScrollY resetKey={`live-${enVivo.length}`} className="flex-1">
            <div className={enVivo.length === 1 ? 'grid grid-cols-1 gap-5 max-w-3xl' : 'grid grid-cols-1 xl:grid-cols-2 gap-5'}>
              {enVivo.map((m, i) => (
                <LiveCourt key={i} match={m} tournament={tournament} isAmericano={isAmericano} avatarSize={wide ? 40 : 26} />
              ))}
            </div>
          </AutoScrollY>
        ) : (
          <div className="flex-1 flex items-center justify-center text-dim font-mono text-[13px]">
            Aún no arrancó ningún partido.
          </div>
        )}
      </div>

      {/* Próximos */}
      {proximos.length > 0 && (
        <div className="shrink-0 min-h-0 max-h-[42%] w-full flex flex-col lg:max-h-none lg:w-72 xl:w-80">
          <div className="flex items-center gap-2 mb-3 shrink-0 font-condensed font-bold text-[15px] tracking-[2px] text-muted">
            <Calendar size={15} /> PRÓXIMOS PARTIDOS
          </div>
          <AutoScrollY resetKey={`prox-${proximos.length}`} className="flex-1">
            <div className="flex flex-col gap-3">
              {proximos.map((m, i) => (
                <ProximoMatch key={i} match={m} tournament={tournament} isAmericano={isAmericano} avatarSize={wide ? 26 : 22} />
              ))}
            </div>
          </AutoScrollY>
        </div>
      )}
    </div>
  );
}

// ── Pantalla: ESTADÍSTICAS ─────────────────────────────────────────────────────
// Los mismos destacados que la pestaña STATS, en tamaño scoreboard. Los números
// salen de las primitivas de helpers para no abrir una cuarta forma de contar.
// El tamaño sale del largo del valor: un contador entra enorme, un nombre de
// pareja a ese cuerpo ocupa cuatro renglones y empuja las tarjetas de abajo
// fuera de la pantalla.
function mainSizeFor(main) {
  const len = String(main).length;
  if (len <= 4)  return 'text-[44px] lg:text-[76px]';
  if (len <= 16) return 'text-[26px] lg:text-[44px]';
  if (len <= 28) return 'text-[22px] lg:text-[34px]';
  return 'text-[19px] lg:text-[27px]';
}

function TvStatCard({ icon, label, main, sub, tone = 'text-brand' }) {
  const Icon = icon;
  return (
    <div className="flex flex-col justify-center bg-surface border border-border-mid rounded-xl px-5 py-4 lg:px-7 lg:py-5 min-h-0 overflow-hidden">
      <div className="flex items-center gap-2 mb-1.5 lg:mb-2.5">
        <Icon size={16} className={`${tone} shrink-0`} />
        <span className="font-condensed font-bold text-[11px] lg:text-[13px] tracking-[2px] text-muted">{label}</span>
      </div>
      <div className={`font-condensed font-black leading-[1.05] ${tone} ${mainSizeFor(main)} break-words`}>
        {main}
      </div>
      {sub && <div className="font-mono text-[11px] lg:text-[14px] text-soft mt-1.5 lg:mt-2.5">{sub}</div>}
    </div>
  );
}

function TvStatsScreen({ tournament }) {
  const { players } = tournament;
  const matches = getAllMatches(tournament);
  const played  = playedMatches(matches);

  // MVP — mismo criterio que la pestaña STATS: la cima por victorias y diferencia.
  const standings = calcStandings(players, matches);
  const topPg     = standings[0]?.pg ?? 0;
  const topDiff   = standings[0] ? standings[0].sf - standings[0].sc : 0;
  const leaders   = standings.filter((p) => p.pg === topPg && (p.sf - p.sc) === topDiff);

  const partnerships = calcPartnerships(players, played);
  const best         = partnerships[0];
  const tiedBest     = best
    ? partnerships.filter((p) => p.winRate === best.winRate && p.wins === best.wins && p.played === best.played && p.diff === best.diff)
    : [];

  const games    = played.reduce((acc, m) => acc + (+m.score1) + (+m.score2), 0);
  const tight    = played.filter((m) => Math.abs(+m.score1 - +m.score2) === 1).length;
  const timed    = played.filter((m) => (m.duration_seconds ?? 0) > 0);
  const totalSec = timed.reduce((acc, m) => acc + m.duration_seconds, 0);
  const avgSec   = timed.length > 0 ? totalSec / timed.length : 0;

  // Mismo criterio que la pestaña STATS: el más rápido descarta los cronómetros
  // de menos de un minuto (arrancados por error) y no se repite con el más largo.
  const longest  = timed.reduce((max, m) => (m.duration_seconds > (max?.duration_seconds ?? 0) ? m : max), null);
  const shortest = timed.reduce(
    (min, m) => (m.duration_seconds > 60 && (!min || m.duration_seconds < min.duration_seconds) ? m : min), null);
  const sidesOf = (m) => {
    const win1 = +m.score1 > +m.score2;
    const name = (ids) => ids.map((id) => players.find((p) => p.id === id)?.name ?? '?').join(' & ');
    return `${name(win1 ? m.team1 : m.team2)} vs ${name(win1 ? m.team2 : m.team1)}`;
  };

  // En un torneo por parejas el MVP es siempre la mejor pareja: mostrar las dos
  // tarjetas repetía el mismo nombre. Cuando coinciden, va la mayor diferencia.
  const mvpLabel  = tiedLabel(leaders.map((p) => p.name));
  const bestLabel = best ? tiedLabel(tiedBest.map((p) => p.label), TIED_NAMES_PAIRS) : null;
  // Por ids, no por el label: los nombres pueden traer un "&" adentro.
  const leaderIds = leaders.map((p) => p.id).sort().join('-');
  const showMvp   = !(tiedBest.length === 1 && leaderIds === tiedBest[0].key);

  const biggest = played.reduce((max, m) =>
    Math.abs(+m.score1 - +m.score2) > Math.abs(+(max?.score1 ?? 0) - +(max?.score2 ?? 0)) ? m : max, null);
  const biggestWinner = biggest
    ? (+biggest.score1 > +biggest.score2 ? biggest.team1 : biggest.team2)
        .map((id) => players.find((p) => p.id === id)?.name ?? '?').join(' & ')
    : null;
  const biggestScore = biggest
    ? `${Math.max(+biggest.score1, +biggest.score2)}-${Math.min(+biggest.score1, +biggest.score2)}`
    : null;
  const biggestSub = biggest
    ? `ganó ${biggestScore}${biggest.duration_seconds > 0 ? ` en ${fmtMMSS(biggest.duration_seconds)}` : ''}`
    : null;

  // Las tarjetas de tiempo sólo existen si alguien cronometró. Sin ellas la
  // pantalla cae en los games jugados, que salen de los marcadores.
  const cards = [
    showMvp
      ? { icon: Trophy, label: leaders.length > 1 ? 'MVP · EMPATE' : 'MVP', main: mvpLabel,
          sub: `${topPg} ${topPg === 1 ? 'victoria' : 'victorias'}` }
      : biggestWinner && { icon: Trophy, label: 'MAYOR DIFERENCIA', main: biggestWinner, sub: biggestSub },
    best && { icon: Flame, label: tiedBest.length > 1 ? 'MEJOR PAREJA · EMPATE' : 'MEJOR PAREJA',
              main: bestLabel, sub: `${best.winRate}% · ${best.wins} de ${best.played}`, tone: 'text-cyan' },
    { icon: Zap, label: 'PARTIDOS JUGADOS', main: played.length,
      sub: tight > 0 ? `${tight} ${tight === 1 ? 'ajustado' : 'ajustados'} por 1 game` : null },
    timed.length > 0
      ? { icon: Hourglass, label: 'TIEMPO DE JUEGO', main: fmtDuracion(totalSec),
          sub: `${fmtMMSS(avgSec)} promedio · ${timed.length} de ${played.length} con tiempo`, tone: 'text-cyan' }
      : { icon: Clock, label: 'GAMES JUGADOS', main: games, tone: 'text-cyan' },
    longest && { icon: Clock, label: 'PARTIDO MÁS LARGO', main: fmtMMSS(longest.duration_seconds),
                 sub: sidesOf(longest), tone: 'text-green' },
    shortest && shortest !== longest && { icon: Timer, label: 'PARTIDO MÁS RÁPIDO',
                 main: fmtMMSS(shortest.duration_seconds), sub: sidesOf(shortest), tone: 'text-secondary' },
  ].filter(Boolean);

  // Con seis tarjetas la grilla pasa a 3 columnas para que sigan entrando sin scroll.
  const cols = cards.length > 4 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2';

  return (
    <AutoScrollY resetKey={`stats-${played.length}`} className="px-4 lg:px-8 py-4 lg:py-6">
      {/* En una TV entran sin scroll; en mobile se apilan. */}
      <div className={`max-w-6xl mx-auto grid grid-cols-1 ${cols} gap-3 lg:gap-5 lg:h-full lg:grid-rows-2`}>
        {cards.map((c) => <TvStatCard key={c.label} {...c} />)}
      </div>
    </AutoScrollY>
  );
}

// ── Pantalla: CUADRO ───────────────────────────────────────────────────────────
function TvBracketScreen({ tournament }) {
  return (
    <AutoScrollY resetKey={`br-${countPlayed(tournament)}`} className="px-4 lg:px-8 py-5">
      <div className="max-w-6xl mx-auto">
        <Bracket tournament={tournament} isOwner={false} />
      </div>
    </AutoScrollY>
  );
}

function TvOverlay({ tournament, isAmericano, club, groupName, groupEmojis, seq, step, paused, onTogglePause, onPrev, onNext, onBarEnd, onExit, soundOn, onToggleSound, playedCount, joinBanner, signupBanner }) {
  const current = seq[step] ?? seq[0];
  const screen  = current?.screen ?? 'standings';

  // Bloquear scroll del body + atajos de teclado mientras el overlay está abierto.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape')           onExit();
      else if (e.key === 'ArrowRight')  onNext();
      else if (e.key === 'ArrowLeft')   onPrev();
      else if (e.key === ' ')           { e.preventDefault(); onTogglePause(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onExit, onNext, onPrev, onTogglePause]);

  return (
    <div className="fixed inset-0 z-50 bg-base text-content font-sans flex flex-col overflow-hidden">
      {/* Barra de progreso de la pantalla actual */}
      <div className="h-1 bg-brand/10 shrink-0 overflow-hidden">
        <div
          key={`tvbar-${step}`}
          onAnimationEnd={onBarEnd}
          className="readonly-progress h-full bg-brand"
          style={{ animationDuration: `${current?.duration ?? 12000}ms`, animationPlayState: paused ? 'paused' : 'running' }}
        />
      </div>

      <TvHeader
        tournament={tournament}
        club={club}
        groupName={groupName}
        groupEmojis={groupEmojis}
        paused={paused}
        onPrev={onPrev}
        onNext={onNext}
        onTogglePause={onTogglePause}
        soundOn={soundOn}
        onToggleSound={onToggleSound}
        onExit={onExit}
      />

      {/* Contenido principal */}
      <main className="flex-1 min-h-0 relative">
        <TvHint onExit={onExit} />
        {screen === 'standings' && <TvStandingsScreen tournament={tournament} />}
        {screen === 'live'      && <TvLiveScreen tournament={tournament} isAmericano={isAmericano} />}
        {screen === 'stats'     && <TvStatsScreen tournament={tournament} />}
        {screen === 'bracket'   && <TvBracketScreen tournament={tournament} />}
      </main>

      {/* Cartel de "¿Jugás en este torneo?" (invitados y espectadores logueados) */}
      {signupBanner && <div className="shrink-0">{signupBanner}</div>}
      {joinBanner && <div className="shrink-0">{joinBanner}</div>}

      {/* Live ticker (parte inferior) */}
      <div className="shrink-0">
        <LiveTicker tournament={tournament} isAmericano={isAmericano} />
      </div>

      {/* Footer — crédito de la app */}
      <footer className="shrink-0 flex items-center justify-between px-4 lg:px-8 py-2 border-t border-border bg-surface/40">
        <div className="flex items-center gap-2">
          <img src={appLogo} alt="" className="w-5 h-5 object-contain opacity-70" />
          <span className="font-condensed font-bold text-[10px] tracking-[2px] text-muted">padeleando.ar</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-dim">
          <Flame size={12} className="text-brand/60" /> {playedCount} PARTIDOS JUGADOS
        </div>
      </footer>
    </div>
  );
}

// Un nombre por línea, en todos los tamaños. La tarjeta vive en una columna de
// 288 px: con los dos equipos enfrentados lado a lado, cada nombre se quedaba
// con unos 30 px una vez descontados el padding, los avatares y el "vs" —
// alcanzaba para la inicial y nada más.
function ProximoTeam({ players, avatarSize }) {
  return (
    <div className="flex items-center gap-2 lg:gap-3 min-w-0">
      <div className="flex -space-x-1.5 shrink-0">
        {players.map((p, i) => (
          <PlayerAvatar key={i} name={p.name} src={p.src} size={avatarSize} premium={p.premium} />
        ))}
      </div>
      <div className="min-w-0 font-condensed font-bold text-[14px] sm:text-[15px] lg:text-[20px] text-white leading-tight">
        {/* Los nombres largos bajan de línea en lugar de cortarse: en una
            pantalla que se mira de lejos, media palabra no sirve de nada. */}
        {players.map((p, i) => (
          <div key={i} className="break-words">{i > 0 ? `& ${p.name}` : p.name}</div>
        ))}
      </div>
    </div>
  );
}

function ProximoMatch({ match, tournament, isAmericano, avatarSize }) {
  const court = courtLabel(tournament, match.court);
  const phase = isAmericano && match.phase ? (PHASE_LABEL[match.phase] ?? match.phase.toUpperCase()) : null;
  const team1 = splitNames(match.team1Label).map((n) => resolveCourtPlayer(n, tournament));
  const team2 = splitNames(match.team2Label).map((n) => resolveCourtPlayer(n, tournament));
  const chipCls = "inline-flex items-center border border-border-strong rounded-sm px-1.5 lg:px-2.5 py-0.5 lg:py-1 text-[10px] lg:text-[14px] font-mono font-bold text-muted";

  return (
    <div className="bg-surface border border-border-mid rounded-lg px-4 lg:px-6 py-3 lg:py-4">
      {(phase || court != null) && (
        <div className="flex items-center gap-1.5 lg:gap-2 mb-2 lg:mb-3">
          {phase && <span className={chipCls}>{phase}</span>}
          {court != null && <span className={chipCls}>CANCHA {court}</span>}
        </div>
      )}
      <div className="flex flex-col gap-1.5 lg:gap-2">
        <ProximoTeam players={team1} avatarSize={avatarSize} />
        <span className="text-muted font-mono text-[11px] lg:text-[13px] self-start">vs</span>
        <ProximoTeam players={team2} avatarSize={avatarSize} />
      </div>
    </div>
  );
}

// Ubicación de cada jugador dentro de la cancha (la red divide en 50%).
// Equipo 1 → mitad izquierda; equipo 2 → mitad derecha.
const TEAM1_POS = {
  1: [{ left: "25%", top: "50%" }],
  2: [{ left: "25%", top: "30%" }, { left: "25%", top: "70%" }],
};
const TEAM2_POS = {
  1: [{ left: "75%", top: "50%" }],
  2: [{ left: "75%", top: "30%" }, { left: "75%", top: "70%" }],
};

function splitNames(label) {
  return String(label ?? "")
    .split(/\s*&\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function CourtName({ pos, player, side, avatarSize = 22 }) {
  return (
    <div
      // w-max es necesario: al estar posicionada con `left`, la píldora calcula
      // su ancho contra lo que queda desde ese punto hasta el borde, así que la
      // del equipo 2 (left 75 %) envolvía el nombre aun sobrándole lugar.
      className="absolute -translate-x-1/2 -translate-y-1/2 w-max max-w-[46%]"
      style={{ left: pos.left, top: pos.top }}
    >
      <div className={`flex items-center gap-1.5 lg:gap-2.5 pl-1 pr-3 lg:pr-4 py-1 lg:py-1.5 rounded-full border shadow-lg ${side === 1 ? "bg-brand border-brand" : "bg-cyan border-cyan"}`}>
        <PlayerAvatar name={player.name} src={player.src} size={avatarSize} premium={player.premium} />
        {/* La píldora no puede pasar del 46 % del ancho para no cruzar la red,
            así que en mobile un nombre y apellido no entra en una línea. Se
            deja envolver en vez de cortarse. */}
        <span className="font-condensed font-bold text-[12px] sm:text-[15px] lg:text-[22px] leading-tight text-black break-words">{player.name}</span>
      </div>
    </div>
  );
}

// Cronómetro que tickea desde el timestamp de inicio del partido.
function CourtTimer({ startedAt }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const secs = Math.max(0, Math.floor((now - startedAt) / 1000));
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return (
    <div className="flex items-center gap-1.5 lg:gap-2 bg-base/85 border border-brand/40 backdrop-blur-sm rounded-full px-3 lg:px-4 py-1 lg:py-1.5 shadow-lg">
      <span className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-brand animate-pulse" />
      <span className="font-mono text-[13px] sm:text-[15px] lg:text-[22px] text-brand tabular-nums tracking-wide">{mm}:{ss}</span>
    </div>
  );
}

// Resuelve un nombre del label a su jugador (para foto y premium).
function resolveCourtPlayer(name, tournament) {
  const p = tournament.players?.find((pl) => pl.name === name);
  return { name, src: p?.linked_avatar_url ?? null, premium: p?.is_premium ?? false };
}

function LiveCourt({ match, tournament, isAmericano, avatarSize = 22 }) {
  const team1 = splitNames(match.team1Label).map((n) => resolveCourtPlayer(n, tournament));
  const team2 = splitNames(match.team2Label).map((n) => resolveCourtPlayer(n, tournament));
  const pos1 = TEAM1_POS[Math.min(team1.length, 2)] ?? TEAM1_POS[2];
  const pos2 = TEAM2_POS[Math.min(team2.length, 2)] ?? TEAM2_POS[2];
  const court = courtLabel(tournament, match.court);
  const phase = isAmericano && match.phase ? (PHASE_LABEL[match.phase] ?? match.phase.toUpperCase()) : null;
  const chipCls = "bg-base/85 border border-brand/40 backdrop-blur-sm rounded-full px-2.5 lg:px-3.5 py-0.5 lg:py-1 font-mono text-[10px] sm:text-[11px] lg:text-[16px] text-brand tracking-wide shadow-lg";

  return (
    <div className="relative w-full aspect-[2/1] rounded-xl overflow-hidden border border-brand/25 shadow-xl">
      <img src={courtSvg} alt="" className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none" />

      {/* Fase / cancha — franja superior de la imagen, fuera de la cancha */}
      {(phase || court != null) && (
        <div className="absolute left-1/2 top-[9%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 lg:gap-2 whitespace-nowrap z-10">
          {phase && <span className={chipCls}>{phase}</span>}
          {court != null && <span className={chipCls}>CANCHA {court}</span>}
        </div>
      )}

      {/* Jugadores ubicados */}
      {team1.map((p, idx) => (
        <CourtName key={`a${idx}`} pos={pos1[idx] ?? pos1[pos1.length - 1]} player={p} side={1} avatarSize={avatarSize} />
      ))}
      {team2.map((p, idx) => (
        <CourtName key={`b${idx}`} pos={pos2[idx] ?? pos2[pos2.length - 1]} player={p} side={2} avatarSize={avatarSize} />
      ))}

      {/* VS sobre la red */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-9 h-9 sm:w-11 sm:h-11 lg:w-14 lg:h-14 rounded-full bg-base/85 border border-brand/40 backdrop-blur-sm flex items-center justify-center">
          <span className="font-condensed font-bold text-brand text-[12px] sm:text-[14px] lg:text-[18px]">VS</span>
        </div>
      </div>

      {/* Cronómetro — franja inferior de la imagen */}
      {match.startedAt != null && (
        <div className="absolute left-1/2 top-[91%] -translate-x-1/2 -translate-y-1/2 z-10">
          <CourtTimer startedAt={match.startedAt} />
        </div>
      )}
    </div>
  );
}

// Etiqueta de un equipo (array de ids) → "Nombre1 & Nombre2"
function teamLabel(team, tournament) {
  const { players, pairs, mode } = tournament;
  if (mode === "pairs") {
    const pair = pairs?.find(
      (p) => (p.p1 === team[0] && p.p2 === team[1]) || (p.p1 === team[1] && p.p2 === team[0])
    );
    if (pair) return getPairLabel(pair.id, pairs, players);
  }
  return (team ?? []).map((id) => players.find((p) => p.id === id)?.name ?? "?").join(" & ");
}

// Carrusel horizontal que va pasando partidos en vivo + resultados recientes.
// Resultados jugados del cuadro (americano), de más reciente (final) a más
// antiguo (octavos), para incluirlos en el ticker junto con los de la previa.
function bracketRecentItems(tournament) {
  const b = tournament.bracket;
  if (!b) return [];
  const byPhase = [
    ["final",   b.final ? [b.final] : []],
    ["semis",   b.semis   ?? []],
    ["cuartos", b.cuartos ?? []],
    ["octavos", b.octavos ?? []],
  ];
  const out = [];
  for (const [phase, matches] of byPhase) {
    for (const m of matches) {
      if (m.winner_id == null || !m.pair1_name || !m.pair2_name) continue;
      out.push({
        key: `bracket-${m.id}`,
        type: "recent",
        court: courtLabel(tournament, m.court),
        phase,
        team1: m.pair1_name,
        team2: m.pair2_name,
        s1: m.score1,
        s2: m.score2,
        sets: m.sets ?? [],
        setsFormat: m.sets_format ?? null,
        win1: m.winner_id === m.pair1_id,
      });
    }
  }
  return out;
}

function LiveTicker({ tournament, isAmericano }) {
  const maskRef = useRef(null);
  const setRef  = useRef(null);
  const [scroll, setScroll] = useState(false);

  const live = Array.isArray(tournament.live_match) ? tournament.live_match : [];

  const liveItems = live
    .filter((m) => m.startedAt != null)
    .map((m, i) => ({
      key: `live-${i}`,
      type: "live",
      phase: isAmericano ? m.phase : null,
      court: courtLabel(tournament, m.court),
      team1: m.team1Label,
      team2: m.team2Label,
    }));

  const previaItems = tournament.matches
    .filter((m) => m.score1 !== "" && m.score2 !== "")
    .slice(0, 8)
    .map((m, i) => {
      const s1 = m.sets_format === 1 ? (m.sets?.[0]?.s1 ?? m.score1) : m.score1;
      const s2 = m.sets_format === 1 ? (m.sets?.[0]?.s2 ?? m.score2) : m.score2;
      return {
        key: `recent-${m.id ?? i}`,
        type: "recent",
        court: courtLabel(tournament, m.court),
        phase: m.phase ?? (isAmericano ? "previa" : null),
        team1: teamLabel(m.team1, tournament),
        team2: teamLabel(m.team2, tournament),
        s1,
        s2,
        sets: m.sets ?? [],
        setsFormat: m.sets_format ?? null,
        win1: parseInt(m.score1) > parseInt(m.score2),
      };
    });

  // Los resultados del cuadro son más recientes que los de la previa → primero.
  const recentItems = [...(isAmericano ? bracketRecentItems(tournament) : []), ...previaItems].slice(0, 10);

  // Deduplicar por contenido (por si live_match trae entradas repetidas).
  const seen = new Set();
  const items = [...liveItems, ...recentItems].filter((it) => {
    const sig = it.type === "live"
      ? `live|${it.phase}|${it.team1}|${it.team2}`
      : `recent|${it.phase}|${it.team1}|${it.team2}|${it.s1}|${it.s2}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });

  // Sólo animar/duplicar cuando el contenido no entra en el ancho disponible;
  // si entra, se muestra una sola vez (sin la copia del marquee).
  useEffect(() => {
    const mask = maskRef.current, set = setRef.current;
    if (!mask || !set) return;
    const check = () => setScroll(set.scrollWidth > mask.clientWidth + 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(mask);
    ro.observe(set);
    return () => ro.disconnect();
  }, [items.length]);

  if (items.length === 0) return null;

  const duration = Math.max(items.length * 7, 22);

  return (
    <div ref={maskRef} className="ticker-mask relative overflow-hidden border-b border-brand/20 bg-gradient-to-r from-brand/5 via-transparent to-brand/5">
      <div className={`ticker-track flex items-stretch py-2.5 ${scroll ? "ticker-animate" : ""}`} style={scroll ? { animationDuration: `${duration}s` } : undefined}>
        <div ref={setRef} className="flex items-stretch shrink-0">
          {items.map((it, i) => (
            <TickerItem key={`${it.key}-a-${i}`} item={it} />
          ))}
        </div>
        {scroll && (
          <div className="flex items-stretch shrink-0" aria-hidden="true">
            {items.map((it, i) => (
              <TickerItem key={`${it.key}-b-${i}`} item={it} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Los parciales van en línea (6-4 6-0) para no romper la altura de la cinta.
function TickerScore({ item }) {
  const nVisible = item.setsFormat === 3 ? visibleSetsCount(3, item.sets ?? []) : 0;

  if (nVisible === 0) {
    return (
      <span className="font-condensed font-black text-[15px]">
        <span className={item.win1 ? "text-brand" : "text-secondary"}>{item.s1}</span>
        <span className="text-border-strong mx-0.5">–</span>
        <span className={!item.win1 ? "text-cyan" : "text-secondary"}>{item.s2}</span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2.5 font-mono font-bold text-[13px] tabular-nums">
      {item.sets.slice(0, nVisible).map((s, i) => {
        const w = setWinner(s);
        return (
          <span key={i}>
            <span className={w === 1 ? "text-brand" : "text-dim"}>{s.s1}</span>
            <span className="text-muted mx-px">-</span>
            <span className={w === 2 ? "text-cyan" : "text-dim"}>{s.s2}</span>
          </span>
        );
      })}
    </span>
  );
}

function TickerItem({ item }) {
  const isLive = item.type === "live";
  const phaseLabel = item.phase ? (PHASE_LABEL[item.phase] ?? item.phase.toUpperCase()) : null;
  const hasTitle = isLive || item.court != null || phaseLabel;
  const sep = isLive ? "text-brand/30" : "text-border-strong";
  const meta = isLive ? "text-brand/70" : "text-brand/30";

  return (
    <div className={`mr-3 shrink-0 whitespace-nowrap flex flex-col items-center gap-0.5 rounded-xl border px-4 py-1.5 ${isLive ? "bg-brand/12 border-brand/30" : "bg-surface border-border-mid"}`}>
      {/* Título: estado · cancha · fase */}
      {hasTitle && (
        <div className="flex items-center gap-1.5 font-mono text-[9px] tracking-wide leading-none">
          {isLive && (
            <span className="flex items-center gap-1 text-brand">
              <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
              EN VIVO
            </span>
          )}
          {item.court != null && (
            <>
              {isLive && <span className={sep}>·</span>}
              <span className={meta}>CANCHA {item.court}</span>
            </>
          )}
          {phaseLabel && (
            <>
              {(isLive || item.court != null) && <span className={sep}>·</span>}
              <span className={meta}>{phaseLabel}</span>
            </>
          )}
        </div>
      )}

      {/* Equipos + resultado */}
      {isLive ? (
        <div className="flex items-center gap-2">
          <span className="font-condensed font-bold text-[14px] text-white">{item.team1}</span>
          <span className="font-mono text-[10px] text-muted">vs</span>
          <span className="font-condensed font-bold text-[14px] text-white">{item.team2}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className={`font-condensed font-semibold text-[14px] ${item.win1 ? "text-brand" : "text-secondary"}`}>{item.team1}</span>
          <TickerScore item={item} />
          <span className={`font-condensed font-semibold text-[14px] ${!item.win1 ? "text-cyan" : "text-secondary"}`}>{item.team2}</span>
        </div>
      )}
    </div>
  );
}

// ── Partidos en vivo / próximos para el espectador (fuera del Modo TV) ─────────
// Se inyecta arriba de la Previa (fase de grupos) y del Cuadro, filtrando por fase.
const BRACKET_PHASES = new Set(['octavos', 'cuartos', 'semis', 'final']);

// Cronómetro compacto que tickea desde el inicio del partido.
function LiveClock({ startedAt }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const secs = Math.max(0, Math.floor((now - startedAt) / 1000));
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return <span className="font-mono text-[11px] text-brand tabular-nums shrink-0">{mm}:{ss}</span>;
}

function SpectatorLiveCard({ match, tournament, isAmericano }) {
  const court = courtLabel(tournament, match.court);
  const phaseLabel = isAmericano && match.phase ? (PHASE_LABEL[match.phase] ?? match.phase.toUpperCase()) : null;
  const live = match.startedAt != null;
  const t1 = splitNames(match.team1Label);
  const t2 = splitNames(match.team2Label);
  return (
    <div className={`rounded-lg border px-4 py-3 ${live ? "bg-brand/8 border-brand/40" : "bg-surface border-border-mid"}`}>
      <div className="flex items-center justify-between gap-2 mb-2.5 font-mono text-[10px] tracking-wide">
        <div className="flex items-center gap-1.5 min-w-0">
          {live ? (
            <span className="flex items-center gap-1 text-brand shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" /> EN VIVO
            </span>
          ) : (
            <span className="text-muted shrink-0">PRÓXIMO</span>
          )}
          {phaseLabel && <span className="text-brand/40 truncate">· {phaseLabel}</span>}
          {court != null && <span className="text-brand/40 shrink-0">· CANCHA {court}</span>}
        </div>
        {live && <LiveClock startedAt={match.startedAt} />}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0 font-condensed font-bold text-[14px] text-white leading-tight text-left">
          <div className="truncate">{t1[0]}</div>
          {t1[1] && <div className="truncate">&amp; {t1[1]}</div>}
        </div>
        <span className="text-muted font-mono text-[11px] shrink-0">vs</span>
        <div className="flex-1 min-w-0 font-condensed font-bold text-[14px] text-white leading-tight text-right">
          <div className="truncate">{t2[0]}</div>
          {t2[1] && <div className="truncate">&amp; {t2[1]}</div>}
        </div>
      </div>
    </div>
  );
}

function SpectatorLive({ tournament, isAmericano, scope }) {
  const all = Array.isArray(tournament.live_match) ? tournament.live_match : [];
  const inScope = all.filter((m) => {
    const isBracket = BRACKET_PHASES.has(m.phase);
    return scope === 'bracket' ? isBracket : !isBracket;
  });
  if (inScope.length === 0) return null;
  // EN VIVO (con cronómetro arrancado) primero, luego los próximos.
  const sorted = [...inScope].sort((a, b) => Number(b.startedAt != null) - Number(a.startedAt != null));
  const anyLive = inScope.some((m) => m.startedAt != null);
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3 font-condensed font-bold text-[12px] tracking-[3px] text-muted">
        <span className={`w-2 h-2 rounded-full ${anyLive ? "bg-danger animate-pulse" : "bg-border-strong"}`} />
        {anyLive ? "EN VIVO" : "PRÓXIMOS"}
      </div>
      <div className="flex flex-col gap-2.5">
        {sorted.map((m, i) => (
          <SpectatorLiveCard key={i} match={m} tournament={tournament} isAmericano={isAmericano} />
        ))}
      </div>
    </div>
  );
}

function ReadonlyMatches({ tournament, groupName }) {
  const [shareFixture, setShareFixture] = useState(false);
  // Más nuevo primero, igual que en la vista del organizador: así el #1 (played.length - i)
  // le toca al primer partido jugado.
  const played = tournament.matches
    .filter((m) => m.score1 !== "" && m.score2 !== "")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (played.length === 0)
    return <div className="text-center text-dim py-10 font-sans">No hay partidos jugados todavía.</div>;
  return (
    <div>
      {shareFixture && (
        <ShareFixtureModal
          tournament={tournament}
          matches={played}
          categoryName={groupName}
          onClose={() => setShareFixture(false)}
        />
      )}
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setShareFixture(true)}
          title="Compartir partidos"
          aria-label="Compartir partidos"
          className="inline-flex items-center gap-2 bg-transparent text-muted border border-border-strong px-3 py-2 font-condensed font-bold text-[12px] tracking-wide cursor-pointer rounded-sm hover:text-white transition-colors"
        >
          <Share2 size={14} /> COMPARTIR
        </button>
      </div>
      <div className="flex flex-col gap-2.5">
        {played.map((m, i) => (
          <MatchCard key={m.id} match={m} tournament={tournament} isOwner={false} matchNum={played.length - i} />
        ))}
      </div>
    </div>
  );
}

function ReadonlyPlayers({ tournament }) {
  const navigate = useNavigate();
  const { players, pairs, mode } = tournament;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="font-condensed font-bold text-[16px] tracking-[3px] text-muted mb-3">JUGADORES</div>
        {players.length === 0
          ? <div className="text-dim font-sans text-sm">No hay jugadores registrados.</div>
          : (
            <div className="flex flex-col gap-2">
              {players.map((p, i) => {
                const username = p.linked_username ?? null;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 bg-surface border border-border-mid rounded-md px-3.5 py-2.5 ${username ? 'cursor-pointer hover:border-border-strong transition-colors' : ''}`}
                    onClick={() => username && navigate(`/u/${username}`)}
                  >
                    <div className="min-w-6 text-muted font-mono font-bold text-[13px]">{i + 1}</div>
                    <PlayerAvatar name={p.name} src={p.linked_avatar_url ?? null} size={28} premium={p.is_premium ?? false} />
                    <div className={`font-semibold ${username ? 'text-white' : 'text-white'}`}>{p.name}</div>
                    {username && <div className="ml-auto text-[11px] font-mono text-dim">@{username}</div>}
                  </div>
                );
              })}
            </div>
          )
        }
      </div>

      {mode === "pairs" && pairs.length > 0 && (
        <div>
          <div className="font-condensed font-bold text-[16px] tracking-[3px] text-muted mb-3">PAREJAS</div>
          <div className="flex flex-col gap-2">
            {pairs.map((pair, i) => {
              const player1 = players.find((p) => p.id === pair.p1);
              const player2 = players.find((p) => p.id === pair.p2);
              const p1 = player1?.name ?? "?";
              const p2 = player2?.name ?? "?";
              return (
                <div key={pair.id} className="flex items-center gap-3 bg-surface border border-border-mid rounded-md px-3.5 py-2.5">
                  <div className="min-w-6 text-muted font-mono font-bold text-[13px]">{i + 1}</div>
                  <PairAvatar
                    name1={p1}
                    name2={p2}
                    src1={player1?.linked_avatar_url ?? null}
                    src2={player2?.linked_avatar_url ?? null}
                    size={26}
                  />
                  <div className="text-white font-semibold">{p1} <span className="text-muted">&</span> {p2}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
