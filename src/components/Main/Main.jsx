import { useState, useEffect, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fmt, fmtHora, calcStandings, compareStandingRows, tournamentDisplayStatus, TOURNAMENT_STATUS_META, isAmericanoDraft, isLive, managementWarnings } from "../../utils/helpers";
import { useTournament } from "../../hooks/useTournament";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import Standings    from "../Standings/Standings";
import Matches      from "../Matches/Matches";
// Sólo se monta al abrir la pestaña: importarlo estático arrastraba los
// 111 KB de Recharts a toda visita del torneo.
const Stats = lazy(() => import("../Stats/Stats"));
import Management   from "../Management/Management";
import Previa       from "../Americano/Previa";
import Bracket      from "../Americano/Bracket";
import PhotoGallery from "../Photos/PhotoGallery";
import { Check, Pencil, Share2, Eye, Trophy, Settings, Flame, ChartNoAxesCombined, ChevronLeft, X, List, Split, User, Users, Building2, Calendar, QrCode } from "lucide-react";
import Badge from "../shared/Badge";
import { TournamentHeaderSkeleton, TabsSkeleton, CardSkeleton } from "../shared/Skeleton";
import Btn from "../shared/Btn";
import LazyNotFound from "../NotFound/LazyNotFound";
import ShareModal from "../shared/ShareModal";
import QrModal from "../shared/QrModal";
import FinishTournamentModal from "../shared/FinishTournamentModal";
import SignupPricePill from "../shared/SignupPricePill";
import { resolveSignup } from "../../utils/signup";

const LIGA_TABS = [
  { id: "standings",  label: "TABLA",         icon: Trophy              },
  { id: "matches",    label: "PARTIDOS",       icon: Flame               },
  { id: "stats",      label: "ESTADÍSTICAS",   icon: ChartNoAxesCombined },
  { id: "management", label: "GESTIÓN",        icon: Settings            },
];

const AMERICANO_TABS = [
  { id: "standings",  label: "TABLA",          icon: Trophy              },
  { id: "previa",     label: "PREVIA",         icon: List                },
  { id: "bracket",    label: "CUADRO",        icon: Split           },
  { id: "stats",      label: "ESTADÍSTICAS",   icon: ChartNoAxesCombined },
  { id: "management", label: "GESTIÓN",        icon: Settings            },
];

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

export default function Main() {
  const { groupId, tournamentId } = useParams();
  const navigate = useNavigate();
  const {
    tournament, groupName, groupEmojis, groupOwnerIsPremium, loading, error, notFound, isOwner,
    handleAddMatch, handleEditMatch, handleDeleteMatch,
    handleAddPlayer, handleEditPlayer, handleDeletePlayer,
    handleAddPair, handleEditPair, handleDeletePair,
    handleResetScores, handleDeleteTournament,
    getShareLink, handleToggleStatus, handleUpdateName, handleUpdateClubEvent, handleUpdateSignup, handleSetLiveMatch,
    handleGenerateSchedule, handleGenerateBracket, handleUpdateBracketMatch, handleClearBracketMatch, handleSetBracket, handleDeleteBracket,
    handleUpdateMode, refresh,
  } = useTournament(groupId, tournamentId);

  const [tab, setTab]         = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [qrOpen, setQrOpen]       = useState(false);
  const [finishModal, setFinishModal] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput]     = useState("");

  // Derivar el tab activo sin setState en effect: null = aún no eligió el usuario
  const activeTab = tab ?? (tournament?.format === 'americano' ? 'previa' : 'standings');

  useEffect(() => {
    if (!loading && tournament && !isOwner) {
      navigate(`/view/${tournamentId}`, { replace: true });
    }
  }, [loading, tournament, isOwner, tournamentId, navigate]);

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

  const isAmericano = tournament.format === 'americano';
  const isPairs     = isAmericano || tournament.mode === 'pairs';
  const TABS = isAmericano ? AMERICANO_TABS : LIGA_TABS;
  const canEditMatches = isOwner && tournament.status !== 'finished';

  const shareLink   = getShareLink();
  const bracketPlayed = isAmericano
    ? [...(tournament.bracket?.octavos ?? []), ...(tournament.bracket?.cuartos ?? []),
       ...(tournament.bracket?.semis   ?? []), ...(tournament.bracket?.final ? [tournament.bracket.final] : [])]
      .filter(m => m.winner_id != null).length
    : 0;
  const playedCount = tournament.matches.filter((m) => m.score1 !== "").length + bracketPlayed;
  const isDraft = isAmericanoDraft({ format: tournament.format, pairCount: tournament.pairs.length });
  // Avisos que se resuelven desde gestión (mismo helper que usa PairManager).
  const warningCount = managementWarnings(tournament).length;
  const statusMeta = TOURNAMENT_STATUS_META[tournamentDisplayStatus({
    status: tournament.status, hasLiveMatch: isLive(tournament), hasPlayed: playedCount > 0, isDraft,
  })];

  // Ganador(es) de la torneo — solo cuando está finalizada
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

  return (
    <div className="bg-base text-content font-sans pb-24 sm:pb-15">
      <div className="px-6 pt-5 pb-5 border-b border-border bg-gradient-to-b from-surface/25 to-transparent">
        {/* Breadcrumbs + acciones principales */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Btn size="sm" onClick={() => navigate(`/cat/${groupId}`)} icon={ChevronLeft}>
              Volver
            </Btn>
            {groupName && (
              <div
                onClick={() => navigate(`/cat/${groupId}`)}
                className="inline-flex items-center gap-1.5 bg-surface border border-border-mid rounded-full px-3 py-1 cursor-pointer hover:border-border-strong transition-colors"
              >
                {groupEmojis?.length > 0 && (
                  <span className="text-sm leading-none">{groupEmojis.join(' ')}</span>
                )}
                <span className="text-[11px] font-mono text-muted">{groupName}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Btn size="sm" onClick={() => window.open(shareLink, '_blank', 'noopener')} icon={Eye} title="Ver como espectador">
            </Btn>
            <Btn size="sm" onClick={() => setQrOpen(true)} icon={QrCode} title="Código QR">
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => setShareOpen(true)} icon={Share2}>
            </Btn>
          </div>
        </div>

        {/* Título + edit */}
        {editingName ? (
          <div className="flex items-center gap-2 mb-2">
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nameInput.trim()) { handleUpdateName(nameInput.trim()); setEditingName(false); }
                if (e.key === 'Escape') setEditingName(false);
              }}
              className="bg-surface border border-border-mid text-white px-2.5 py-1 font-condensed font-bold text-[28px] tracking-wide rounded-sm outline-none flex-1 min-w-0 max-w-md"
            />
            <Btn variant="primary" size="sm" onClick={() => { if (nameInput.trim()) { handleUpdateName(nameInput.trim()); } setEditingName(false); }} icon={Check} />
            <Btn size="sm" onClick={() => setEditingName(false)} icon={X} />
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-2">
            <h1 className="font-condensed font-bold text-[32px] text-white tracking-wide leading-tight">
              {tournament.name}
            </h1>
            {isOwner && (
              <div
                onClick={() => { setNameInput(tournament.name); setEditingName(true); }}
                className="bg-transparent text-muted border border-border-strong px-1.5 py-1.5 text-[11px] cursor-pointer rounded-sm font-sans hover:text-white transition-colors"
              >
                <Pencil size={12} />
              </div>
            )}
          </div>
        )}

        {/* Estado + tipo + ganador */}
        <div className="flex items-center gap-2.5 flex-wrap mb-3">
          <Badge variant="status" color={statusMeta.color} icon={statusMeta.icon} pulse={statusMeta.pulse}>
            {statusMeta.label}
          </Badge>
          <span className="text-dim">·</span>
          <span className="text-[12px] font-mono text-muted">
            {isAmericano ? 'americano' : tournament.mode === 'pairs' ? 'parejas fijas' : 'equipos libres'}
          </span>
          {winnerLabel && (
            <Badge variant="chip" color="brand" icon={Trophy}>{winnerLabel}</Badge>
          )}
        </div>

        {/* Metadata — datos pasivos muted + club accesible */}
        <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap text-[11px] font-mono text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={11} className="text-dim" />
            {fmt(tournament.event_date ?? tournament.createdAt)}
            {tournament.event_time && <span className="text-brand">{fmtHora(tournament.event_time)}</span>}
          </span>
          <span className="inline-flex items-center gap-1.5">
            {isPairs ? <Users size={11} className="text-dim" /> : <User size={11} className="text-dim" />}
            {isPairs
              ? `${tournament.pairs.length} parejas`
              : `${tournament.players.filter((p) => !p.removed).length} jugadores`}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Flame size={11} className="text-dim" />
            {playedCount} jugados
          </span>
          <SignupPricePill signup={resolveSignup(tournament, {
            signup_open:       tournament.group_signup_open,
            signup_price:      tournament.group_signup_price,
            signup_price_unit: tournament.group_signup_price_unit,
          })} />
          {tournament.club_id && (
            <button
              onClick={() => navigate(`/club/${tournament.club_id}`)}
              className="inline-flex items-center gap-1.5 bg-surface border border-border-mid rounded-full px-2.5 py-0.5 cursor-pointer hover:border-brand transition-colors text-[11px] font-mono text-muted"
            >
              <Building2 size={11} className="text-brand" />
              <span className="truncate max-w-[160px]">{tournament.club_name ?? 'Club'}</span>
            </button>
          )}
        </div>
      </div>

      {isOwner && isAmericano && tournament.status === 'active' && tournament.bracket?.final?.winner_id && (
        <div className="px-6 py-3 border-b border-border bg-surface-alt flex items-center justify-between gap-3">
          <span className="text-muted font-mono text-[12px]">La final fue jugada. ¿Querés cerrar el torneo?</span>
          <Btn variant="primary" size="sm" onClick={() => setFinishModal(true)}>FINALIZAR TORNEO</Btn>
        </div>
      )}

      {/* Tabs — desktop (sm+) */}
      <div className="hidden sm:flex border-b border-border px-4 items-center overflow-x-auto">
        {TABS.map((t) => (
          <div key={t.id} onClick={() => setTab(t.id)}
            className={`border-0 px-3.5 py-3.5 font-condensed font-bold text-[13px] tracking-wide cursor-pointer border-b-2 rounded-t-md whitespace-nowrap transition-all hover:text-brand ${activeTab === t.id ? 'text-brand border-b-brand bg-brand/10' : 'text-muted border-b-transparent bg-transparent hover:bg-brand/5'}`}>
             <t.icon size={14} className="inline mr-1.5" />{t.label}
            {t.id === 'management' && warningCount > 0 && (
              <WarningMark count={warningCount} className="ml-1.5 align-middle" />
            )}
          </div>
        ))}
      </div>

      {/* Bottom nav — mobile only */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-base border-t border-border flex">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 border-0 cursor-pointer transition-colors ${activeTab === t.id ? 'text-brand bg-brand/10' : 'text-muted bg-transparent'}`}
          >
            <span className="relative inline-flex leading-none">
              <t.icon size={20} />
              {t.id === 'management' && warningCount > 0 && (
                <WarningMark count={warningCount} className="absolute -top-1 -right-2" />
              )}
            </span>
            <span className="text-[9px] font-mono tracking-wide leading-none">
              {t.id === 'standings'  ? 'TABLA'    :
               t.id === 'matches'   ? 'PARTIDOS' :
               t.id === 'previa'    ? 'PREVIA'   :
               t.id === 'bracket'   ? 'CUADRO'   :
               t.id === 'stats'     ? 'STATS'    : 'GESTIÓN'}
            </span>
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Liga tabs */}
        {activeTab === "standings"  && <Standings  tournament={tournament} />}
        {activeTab === "matches"    && <Matches    tournament={tournament} isOwner={canEditMatches} categoryName={groupName} onAddMatch={handleAddMatch} onEditMatch={handleEditMatch} onDeleteMatch={handleDeleteMatch} onSetLiveMatch={handleSetLiveMatch} />}
        {activeTab === "stats"      && <Suspense fallback={<div style={{ minHeight: 400 }} />}><Stats tournament={tournament} ownerIsPremium={groupOwnerIsPremium} /></Suspense>}

        {/* Americano tabs */}
        {activeTab === "previa" && (
          <Previa
            tournament={tournament}
            isOwner={canEditMatches}
            categoryName={groupName}
            onAddMatch={handleAddMatch}
            onEditMatch={handleEditMatch}
            onDeleteMatch={handleDeleteMatch}
            onSetLiveMatch={handleSetLiveMatch}
            onGenerateSchedule={handleGenerateSchedule}
            onGenerateBracket={handleGenerateBracket}
          />
        )}
        {activeTab === "bracket" && (
          <Bracket
            tournament={tournament}
            isOwner={canEditMatches}
            onGenerateBracket={handleGenerateBracket}
            onUpdateMatch={handleUpdateBracketMatch}
            onClearMatch={handleClearBracketMatch}
            onSetBracket={handleSetBracket}
            onDeleteBracket={handleDeleteBracket}
            onSetLiveMatch={handleSetLiveMatch}
          />
        )}

        {/* Gestión (shared) */}
        {activeTab === "management" && (
          <Management
            tournament={tournament}
            isOwner={isOwner}
            onAddPlayer={handleAddPlayer}
            onEditPlayer={handleEditPlayer}
            onDeletePlayer={handleDeletePlayer}
            onAddPair={handleAddPair}
            onEditPair={handleEditPair}
            onDeletePair={handleDeletePair}
            onResetScores={handleResetScores}
            onDeleteTournament={async () => { await handleDeleteTournament(); navigate(`/cat/${groupId}`); }}
            onToggleStatus={handleToggleStatus}
            onUpdateMode={handleUpdateMode}
            onUpdateClubEvent={handleUpdateClubEvent}
            onUpdateSignup={handleUpdateSignup}
            onRefresh={refresh}
          />
        )}

        <PhotoGallery
          tournamentId={tournament.id}
          isOwner={isOwner}
          isPremium={groupOwnerIsPremium}
        />
      </div>

      {shareOpen && (
        <ShareModal
          tournamentName={tournament.name}
          categoryName={groupName}
          clubName={tournament.club_name}
          url={shareLink}
          onClose={() => setShareOpen(false)}
        />
      )}

      {finishModal && (
        <FinishTournamentModal
          tournament={tournament}
          onConfirm={() => { handleToggleStatus(); setFinishModal(false); }}
          onCancel={() => setFinishModal(false)}
        />
      )}

      {qrOpen && (
        <QrModal
          tournamentName={tournament.name}
          categoryName={groupName}
          url={shareLink}
          onClose={() => setQrOpen(false)}
        />
      )}
    </div>
  );
}
