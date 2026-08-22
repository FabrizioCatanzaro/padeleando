import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check, Trophy, Settings, Flame, ChartNoAxesCombined, X, List, Split, Users, Eye,
} from "lucide-react";
import {
  countPlayed, isAmericanoDraft, isLive, managementWarnings,
  tournamentDisplayStatus, TOURNAMENT_STATUS_META, winnerLabelOf,
} from "../../utils/helpers";
import Standings from "../Standings/Standings";
import Matches from "../Matches/Matches";
// Sólo se monta al abrir la pestaña: importarlo estático arrastraba los
// 111 KB de Recharts a toda visita del torneo.
const Stats = lazy(() => import("../Stats/Stats"));
import Management from "../Management/Management";
import Previa from "../Americano/Previa";
import Bracket from "../Americano/Bracket";
import PhotoGallery from "../Photos/PhotoGallery";
import Btn from "../shared/Btn";
import ShareModal from "../shared/ShareModal";
import QrModal from "../shared/QrModal";
import FinishTournamentModal from "../shared/FinishTournamentModal";
import TournamentHero from "../Main/TournamentHero";
import {
  TvOverlay, LiveTicker, SpectatorLive, ReadonlyMatches, ReadonlyPlayers,
} from "../Spectator/SpectatorParts";
import { resolveSignup } from "../../utils/signup";

// Marca de "hay algo para revisar" en la pestaña de gestión.
function WarningMark({ className = "", count }) {
  const label = count === 1 ? '1 aviso en gestión' : `${count} avisos en gestión`;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-black font-condensed font-bold text-[10px] leading-none ${className}`}
    >
      !
    </span>
  );
}

// Las solapas dependen del formato y de si podés gestionar. El que sólo mira no
// tiene GESTIÓN; a cambio tiene JUGADORES, que al organizador le vive dentro de
// gestión.
function tabsDe({ esAmericano, puedeGestionar }) {
  const tabs = [{ id: 'standings', label: 'TABLA', corto: 'TABLA', icon: Trophy }];
  if (esAmericano) {
    tabs.push({ id: 'matches', label: 'PREVIA',  corto: 'PREVIA', icon: List });
    tabs.push({ id: 'bracket', label: 'CUADRO',  corto: 'CUADRO', icon: Split });
  } else {
    tabs.push({ id: 'matches', label: 'PARTIDOS', corto: 'PARTIDOS', icon: Flame });
  }
  if (!puedeGestionar) tabs.push({ id: 'players', label: 'JUGADORES', corto: 'JUGAD.', icon: Users });
  tabs.push({ id: 'stats', label: 'ESTADÍSTICAS', corto: 'STATS', icon: ChartNoAxesCombined });
  if (puedeGestionar) tabs.push({ id: 'management', label: 'GESTIÓN', corto: 'GESTIÓN', icon: Settings });
  return tabs;
}

/**
 * La página de un torneo. Una sola, en dos modos.
 *
 * Antes eran dos: el organizador veía Main y al que no podía gestionar se lo
 * redirigía a ReadonlyView, con su propio encabezado, sus propias solapas y su
 * propia idea de qué es un partido jugado. Cada arreglo había que hacerlo dos
 * veces, y cuando no, las dos vistas se separaban un poco más.
 *
 * Acá el modo lo decide `puedeGestionar`: lo mismo se muestra, y lo que se puede
 * tocar cambia. Las dos rutas —la del organizador y el link público— montan esta
 * misma página; lo único que cambia es de dónde salen los datos.
 */
export default function TournamentPage({
  tournament, groupId, canManage: puedeGestionar,
  groupName, groupEmojis = [], groupIsPublic = true, groupOwnerIsPremium = false, owner = null,
  shareUrl,
  // Modo organizador: todo lo que se puede tocar. Nulo para el que sólo mira.
  acciones = null,
  // Modo espectador: la barra de refresco y los carteles de sumarse/inscribirse.
  espectador = null,
  // Datos del club para el encabezado del Modo TV.
  club = null,
  // ?tv=1 entra directo: es el enlace que se pega en la pantalla del club.
  tvInicial = false,
  myPlayerIds = [],
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [finishModal, setFinishModal] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [tvMode, setTvMode] = useState(tvInicial);
  const [tvPaused, setTvPaused] = useState(false);
  const [tvStep, setTvStep] = useState(0);

  const esAmericano = tournament.format === 'americano';
  const isPairs = esAmericano || tournament.mode === 'pairs';
  const TABS = tabsDe({ esAmericano, puedeGestionar });
  const activeTab = tab ?? (esAmericano ? 'matches' : 'standings');
  const canEditMatches = puedeGestionar && tournament.status !== 'finished';

  const playedCount = countPlayed(tournament);
  // Partidos programados sin resultado. Viven en su propia tabla para no
  // contaminar los quince criterios de "jugado" que ya recorren la app.
  const scheduled = tournament.scheduled_matches ?? [];
  const isDraft = isAmericanoDraft({ format: tournament.format, pairCount: tournament.pairs.length });
  const warningCount = puedeGestionar ? managementWarnings(tournament).length : 0;
  const statusMeta = TOURNAMENT_STATUS_META[tournamentDisplayStatus({
    status: tournament.status, hasLiveMatch: isLive(tournament), hasPlayed: playedCount > 0, isDraft,
  })];
  const winnerLabel = winnerLabelOf(tournament);

  // El torneo puede traer la inscripción ya resuelta (la resuelve el servidor);
  // si no, se arma acá con lo de la categoría.
  const signup = tournament.signup ?? resolveSignup(tournament, {
    signup_open: tournament.group_signup_open,
    signup_price: tournament.group_signup_price,
    signup_price_unit: tournament.group_signup_price_unit,
  });

  const enlace = shareUrl ?? (typeof window !== 'undefined' ? window.location.href : '');

  // ── Modo TV ────────────────────────────────────────────────────────────────
  // La secuencia depende del formato y de cuánto se jugó: con uno o dos partidos
  // los destacados son ruido, así que estadísticas entra recién a partir de tres.
  const tvSequence = (() => {
    const seq = [
      { screen: 'standings', label: 'TABLA DE POSICIONES', duration: 10000 },
      { screen: 'live', label: 'PARTIDOS EN VIVO', duration: 10000 },
    ];
    if (playedCount >= 3) seq.push({ screen: 'stats', label: 'ESTADÍSTICAS', duration: 12000 });
    if (esAmericano && tournament.bracket) seq.push({ screen: 'bracket', label: 'CUADRO', duration: 20000 });
    return seq;
  })();
  const pasoTv = tvStep >= tvSequence.length ? 0 : tvStep;
  const avanzarTv = (d) => setTvStep((s) => (((s + d) % tvSequence.length) + tvSequence.length) % tvSequence.length);
  function toggleTv() {
    setTvMode((v) => {
      const next = !v;
      if (next) { setTvStep(0); setTvPaused(false); }
      return next;
    });
  }

  const irATab = (id) => { setTvMode(false); setTab(id); };

  return (
    <div className="bg-base text-content font-sans pb-24 sm:pb-15">
      <TournamentHero
        tournament={tournament}
        groupId={groupId ?? tournament.group_id}
        groupName={groupName}
        groupEmojis={groupEmojis}
        groupIsPublic={groupIsPublic}
        owner={owner}
        isOwner={puedeGestionar}
        playedCount={playedCount}
        scheduledCount={scheduled.length}
        statusMeta={statusMeta}
        winnerLabel={winnerLabel}
        isPairs={isPairs}
        signup={signup}
        tvActivo={tvMode}
        onEditName={() => { setNameInput(tournament.name); setEditingName(true); }}
        onShare={() => setShareOpen(true)}
        onQr={() => setQrOpen(true)}
        onTv={toggleTv}
        onSpectator={() => window.open(enlace, '_blank', 'noopener')}
        onManage={() => irATab('management')}
      />

      {/* El nombre se edita en el lugar donde se lee. */}
      {editingName && puedeGestionar && (
        <div className="px-5 sm:px-6 pt-3 flex items-center gap-2">
          <input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { acciones?.onUpdateName?.(nameInput); setEditingName(false); }
              if (e.key === 'Escape') setEditingName(false);
            }}
            aria-label="Nombre del torneo"
            className="bg-surface border border-border-mid text-white px-2.5 py-1 font-condensed font-bold text-[24px] tracking-wide rounded-sm outline-none flex-1 min-w-0 max-w-md"
          />
          <Btn variant="primary" size="sm" icon={Check}
            onClick={() => { acciones?.onUpdateName?.(nameInput); setEditingName(false); }} />
          <Btn size="sm" onClick={() => setEditingName(false)} icon={X} />
        </div>
      )}

      {/* Barra del espectador: cuándo se actualizó y cuánto falta para el próximo
          refresco. El organizador no la necesita — sus cambios son suyos. */}
      {espectador && (
        <div className="bg-cyan/5 border-b border-cyan/15">
          <div className="h-1 bg-cyan/10 overflow-hidden">
            <div
              key={espectador.barKey}
              className="readonly-progress h-full w-full bg-cyan/50"
              style={{ animationDuration: `${espectador.barDuration}ms` }}
            />
          </div>
          <div className="px-6 py-1.5 flex items-center gap-2 flex-wrap">
            <Eye size={11} className="text-cyan/70" />
            {espectador.ultimaActualizacion}
          </div>
        </div>
      )}

      {espectador?.signupBanner}
      {espectador?.joinBanner}
      {espectador && <LiveTicker tournament={tournament} isAmericano={esAmericano} />}

      {puedeGestionar && esAmericano && tournament.status === 'active' && tournament.bracket?.final?.winner_id && (
        <div className="px-6 py-3 border-b border-border bg-surface-alt flex items-center justify-between gap-3">
          <span className="text-muted font-mono text-[12px]">La final fue jugada. ¿Querés cerrar el torneo?</span>
          <Btn variant="primary" size="sm" onClick={() => setFinishModal(true)}>FINALIZAR TORNEO</Btn>
        </div>
      )}

      {/* Solapas — escritorio */}
      <div className="hidden sm:flex border-b border-border px-4 items-center overflow-x-auto">
        {TABS.map((t) => (
          <div key={t.id} onClick={() => irATab(t.id)}
            className={`border-0 px-3.5 py-3.5 font-condensed font-bold text-[13px] tracking-wide cursor-pointer border-b-2 rounded-t-md whitespace-nowrap transition-all hover:text-brand ${activeTab === t.id && !tvMode ? 'text-brand border-b-brand bg-brand/10' : 'text-muted border-b-transparent bg-transparent hover:bg-brand/5'}`}>
            <t.icon size={14} className="inline mr-1.5" />{t.label}
            {t.id === 'management' && warningCount > 0 && (
              <WarningMark count={warningCount} className="ml-1.5 align-middle" />
            )}
          </div>
        ))}
      </div>

      {/* Barra inferior — mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-base border-t border-border flex">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => irATab(t.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 border-0 cursor-pointer transition-colors ${activeTab === t.id && !tvMode ? 'text-brand bg-brand/10' : 'text-muted bg-transparent'}`}
          >
            <span className="relative inline-flex leading-none">
              <t.icon size={20} />
              {t.id === 'management' && warningCount > 0 && (
                <WarningMark count={warningCount} className="absolute -top-1 -right-2" />
              )}
            </span>
            <span className="text-[9px] font-mono tracking-wide leading-none">{t.corto}</span>
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === 'standings' && <Standings tournament={tournament} />}

        {activeTab === 'stats' && (
          <Suspense fallback={<div style={{ minHeight: 400 }} />}>
            <Stats tournament={tournament} ownerIsPremium={groupOwnerIsPremium} />
          </Suspense>
        )}

        {activeTab === 'players' && <ReadonlyPlayers tournament={tournament} />}

        {/* PARTIDOS (liga) o PREVIA (americano). El que gestiona carga resultados;
            el que mira ve lo que se está jugando y lo que ya se jugó. */}
        {activeTab === 'matches' && (
          puedeGestionar ? (
            esAmericano ? (
              <Previa
                tournament={tournament}
                isOwner={canEditMatches}
                categoryName={groupName}
                myPlayerIds={myPlayerIds}
                onAddMatch={acciones.onAddMatch}
                onEditMatch={acciones.onEditMatch}
                onDeleteMatch={acciones.onDeleteMatch}
                onSetLiveMatch={acciones.onSetLiveMatch}
                onAddScheduled={acciones.onAddScheduled}
                onEditScheduled={acciones.onEditScheduled}
                onDeleteScheduled={acciones.onDeleteScheduled}
                onGenerateSchedule={acciones.onGenerateSchedule}
                onGenerateBracket={acciones.onGenerateBracket}
              />
            ) : (
              <Matches
                tournament={tournament}
                isOwner={canEditMatches}
                categoryName={groupName}
                myPlayerIds={myPlayerIds}
                onAddMatch={acciones.onAddMatch}
                onEditMatch={acciones.onEditMatch}
                onDeleteMatch={acciones.onDeleteMatch}
                onSetLiveMatch={acciones.onSetLiveMatch}
                onAddScheduled={acciones.onAddScheduled}
                onEditScheduled={acciones.onEditScheduled}
                onDeleteScheduled={acciones.onDeleteScheduled}
              />
            )
          ) : (
            <>
              <SpectatorLive tournament={tournament} isAmericano={esAmericano} scope="previa" />
              <ReadonlyMatches tournament={tournament} groupName={groupName} />
            </>
          )
        )}

        {activeTab === 'bracket' && (
          <>
            {!puedeGestionar && (
              <SpectatorLive tournament={tournament} isAmericano={esAmericano} scope="bracket" />
            )}
            <Bracket
              tournament={tournament}
              isOwner={canEditMatches}
              onGenerateBracket={acciones?.onGenerateBracket}
              onUpdateMatch={acciones?.onUpdateBracketMatch}
              onClearMatch={acciones?.onClearBracketMatch}
              onSetBracket={acciones?.onSetBracket}
              onDeleteBracket={acciones?.onDeleteBracket}
              onSetLiveMatch={acciones?.onSetLiveMatch}
            />
          </>
        )}

        {activeTab === 'management' && puedeGestionar && (
          <Management
            tournament={tournament}
            isOwner={puedeGestionar}
            onAddPlayer={acciones.onAddPlayer}
            onEditPlayer={acciones.onEditPlayer}
            onDeletePlayer={acciones.onDeletePlayer}
            onAddPair={acciones.onAddPair}
            onEditPair={acciones.onEditPair}
            onDeletePair={acciones.onDeletePair}
            onResetScores={acciones.onResetScores}
            onDeleteTournament={async () => {
              await acciones.onDeleteTournament();
              navigate(`/cat/${groupId ?? tournament.group_id}`);
            }}
            onToggleStatus={acciones.onToggleStatus}
            onUpdateMode={acciones.onUpdateMode}
            onUpdateClubEvent={acciones.onUpdateClubEvent}
            onUpdateSignup={acciones.onUpdateSignup}
            onRefresh={acciones.onRefresh}
          />
        )}

        <PhotoGallery
          tournamentId={tournament.id}
          isOwner={puedeGestionar}
          isPremium={groupOwnerIsPremium}
          canUpload={puedeGestionar}
        />
      </div>

      {tvMode && (
        <TvOverlay
          tournament={tournament}
          isAmericano={esAmericano}
          club={club}
          groupName={groupName}
          groupEmojis={groupEmojis}
          seq={tvSequence}
          step={pasoTv}
          paused={tvPaused}
          onTogglePause={() => setTvPaused((v) => !v)}
          onPrev={() => avanzarTv(-1)}
          onNext={() => avanzarTv(1)}
          onBarEnd={() => { if (!tvPaused) avanzarTv(1); }}
          onExit={() => setTvMode(false)}
          soundOn={espectador?.soundOn ?? false}
          onToggleSound={espectador?.onToggleSound}
          playedCount={playedCount}
          joinBanner={espectador?.joinBanner}
          signupBanner={espectador?.signupBanner}
        />
      )}

      {shareOpen && (
        <ShareModal
          tournamentName={tournament.name}
          categoryName={groupName}
          clubName={tournament.club_name ?? club?.name}
          url={enlace}
          onClose={() => setShareOpen(false)}
        />
      )}

      {finishModal && puedeGestionar && (
        <FinishTournamentModal
          tournament={tournament}
          onConfirm={() => { acciones?.onToggleStatus?.(); setFinishModal(false); }}
          onCancel={() => setFinishModal(false)}
        />
      )}

      {qrOpen && (
        <QrModal
          tournamentName={tournament.name}
          categoryName={groupName}
          url={enlace}
          onClose={() => setQrOpen(false)}
        />
      )}
    </div>
  );
}
