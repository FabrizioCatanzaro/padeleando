/*
 * Las piezas de la vista de espectador y el Modo TV.
 *
 * Vivían dentro de ReadonlyView.jsx junto con la página, y por eso el
 * organizador y el espectador terminaron siendo dos páginas distintas: lo que
 * hacía falta para las dos estaba encerrado en una. Ahora la página es una sola
 * (TournamentPage) y estas piezas se importan desde ahí.
 */
import { useState, useEffect, useRef, useSyncExternalStore, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { calcStandings, courtLabel, getPairLabel, isAmericanoDraft, fmtHora, tournamentDisplayStatus, TOURNAMENT_STATUS_META,
  getAllMatches, playedMatches, calcPartnerships, tiedLabel, fmtMMSS, fmtDuracion, TIED_NAMES_PAIRS,
  setWinner, visibleSetsCount, countPlayed, PHASE_LABEL, BRACKET_PHASES } from "../../utils/helpers";

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
import { AuthContext } from '../../context/useAuth';
import SignupPricePill from '../shared/SignupPricePill';
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
export function UltimaActualizacion() {
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
export function JoinBanner({ user, tournament, joinStatus, claimablePlayers = [], hidden, busy, onRequest, onRespondInvite, onHide, onLogin }) {
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

export function TvOverlay({ tournament, isAmericano, club, groupName, groupEmojis, seq, step, paused, onTogglePause, onPrev, onNext, onBarEnd, onExit, soundOn, onToggleSound, playedCount, joinBanner, signupBanner }) {
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

export function LiveTicker({ tournament, isAmericano }) {
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

// Cronómetro compacto que tickea desde el inicio del partido.
export function LiveClock({ startedAt }) {
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

export function SpectatorLiveCard({ match, tournament, isAmericano }) {
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

export function SpectatorLive({ tournament, isAmericano, scope }) {
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

export function ReadonlyMatches({ tournament, groupName }) {
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

export function ReadonlyPlayers({ tournament }) {
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
