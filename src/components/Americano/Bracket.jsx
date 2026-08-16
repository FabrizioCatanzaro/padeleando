import { useState, useEffect, useRef, useCallback } from "react";
import { Trophy, Pencil, Trash2, Info } from "lucide-react";
import { PairAvatar } from "../shared/PlayerAvatar";
import { courtLabel, AMERICANO_MIN_PAIRS, setWinner, visibleSetsCount, scoreFromSets, setsResultReady, tournamentCourts } from "../../utils/helpers";
import { Timer, CourtSelector, MatchCardHeader, MinimizedMatch, SetsScoring } from "../Matches/MatchForm";
import Modal from "../shared/Modal";
import ShareStoryButton from "../Snapshot/ShareStoryButton";
import SnapshotModal from "../Snapshot/SnapshotModal";
import BracketStory from "../Snapshot/BracketStory";
import MatchScoreboard from "../shared/MatchScoreboard";

const PHASE_TITLE = { octavos: "OCTAVOS", cuartos: "CUARTOS DE FINAL", semis: "SEMIFINALES", final: "FINAL" };
const SLOT_LABEL  = { octavos: "Octavos", cuartos: "Cuartos", semis: "Semi", final: "la Final" };

// Asigna una pareja a un slot del draft. Si esa pareja ya jugaba en otro cruce,
// intercambia ambas en vez de duplicarla, así no hay que vaciar un slot primero.
function assignDraftPair(draft, phaseKey, matchId, slot, pair) {
  const next = JSON.parse(JSON.stringify(draft));
  const target = phaseKey === 'final' ? next.final : next[phaseKey]?.find(m => m.id === matchId);
  if (!target) return draft;

  const displacedId   = target[`${slot}_id`]   ?? null;
  const displacedName = target[`${slot}_name`] ?? null;

  const origin = pair ? findDraftSlot(next, pair.pair_id) : null;
  if (origin && !(origin.match === target && origin.slot === slot)) {
    origin.match[`${origin.slot}_id`]   = displacedId;
    origin.match[`${origin.slot}_name`] = displacedName;
  }

  target[`${slot}_id`]   = pair?.pair_id   ?? null;
  target[`${slot}_name`] = pair?.pair_name ?? null;
  return next;
}

// Dónde está asignada una pareja dentro del draft: { match, slot } o null.
function findDraftSlot(draft, pairId) {
  const rounds = [...(draft.octavos ?? []), ...(draft.cuartos ?? []), ...(draft.semis ?? [])];
  if (draft.final) rounds.push(draft.final);
  for (const m of rounds) {
    if (m.pair1_id != null && String(m.pair1_id) === String(pairId)) return { match: m, slot: 'pair1' };
    if (m.pair2_id != null && String(m.pair2_id) === String(pairId)) return { match: m, slot: 'pair2' };
  }
  return null;
}

// ── Chip de seed con color según posición ──────────────────────────────────────
const SEED_TONE = {
  1: "bg-amber-400 text-base",      // oro
  2: "bg-slate-300 text-base",       // plata
  3: "bg-[#cd7f32] text-white",      // bronce
};
function SeedChip({ seed }) {
  if (seed == null) return null;
  const tone = SEED_TONE[seed] ?? "bg-border-mid text-muted";
  return (
    <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-mono font-bold shrink-0 ${tone}`}>
      {seed}
    </span>
  );
}

// Marcador de una pareja dentro del nodo del cuadro: un número por set jugado,
// o el resultado solo cuando el partido no se cargó por sets.
function NodeScore({ match, side }) {
  const sets     = match.sets ?? [];
  const nVisible = match.sets_format === 3 ? visibleSetsCount(3, sets) : 0;
  const wonMatch = match.winner_id === match[`pair${side}_id`];

  if (nVisible === 0) {
    return (
      <span className={`font-mono font-bold text-[18px] ml-2 shrink-0 ${wonMatch ? "text-brand" : "text-muted"}`}>
        {match[`score${side}`]}
      </span>
    );
  }

  return (
    <span className="flex ml-2 shrink-0 font-mono font-bold text-[13px] tabular-nums">
      {sets.slice(0, nVisible).map((s, i) => {
        const w = setWinner(s);
        return (
          <span
            key={i}
            className={`w-[18px] text-center ${i > 0 ? "border-l border-border-mid" : ""} ${
              w === side ? "text-brand" : "text-dim"
            }`}
          >
            {side === 1 ? s.s1 : s.s2}
          </span>
        );
      })}
    </span>
  );
}

// ── Nombre de pareja en 2 líneas ───────────────────────────────────────────────
// Los nombres se guardan como "Nombre1 & Nombre2"; los partimos en dos renglones
// igual que en la tabla de posiciones para que ninguno quede recortado.
function PairName({ name, className = "" }) {
  const idx = typeof name === "string" ? name.indexOf(" & ") : -1;
  if (idx === -1) {
    return <span className={`line-clamp-2 leading-tight min-w-0 ${className}`}>{name}</span>;
  }
  return (
    <span className={`flex flex-col leading-tight min-w-0 ${className}`}>
      <span className="truncate">{name.slice(0, idx)}</span>
      <span className="truncate">&amp; {name.slice(idx + 3)}</span>
    </span>
  );
}

const EMPTY_TIMER = { startedAt: null, stoppedAt: null };
const getLiveKey  = (id) => `bracket_live_${id}`;

// Inverso de la propagación del ganador: qué partido se alimenta del ganador de matchId.
function findChildMatch(bracket, matchId) {
  for (const qm of bracket.cuartos ?? []) {
    if (qm.slot1_source === matchId || qm.slot2_source === matchId) return qm;
  }
  for (const sm of bracket.semis ?? []) {
    if (sm.source1 === matchId || sm.source2 === matchId) return sm;
  }
  const f = bracket.final;
  if (f && (f.source1 === matchId || f.source2 === matchId)) return f;
  return null;
}

// Cuántos partidos posteriores ya jugados se deshacen en cascada al borrar este resultado.
function countDependentResults(bracket, matchId) {
  let count = 0;
  let child = findChildMatch(bracket, matchId);
  while (child && child.winner_id !== null) {
    count++;
    child = findChildMatch(bracket, child.id);
  }
  return count;
}

// ── Tarjeta de partido del bracket (sólo display + toggle EN VIVO) ─────────────
function pairAvatarFor(pairId, tournament, size = 20) {
  if (!pairId) return null;
  const pair = tournament?.pairs?.find(p => p.id === pairId);
  if (!pair) return null;
  const p1 = tournament.players?.find(pl => pl.id === pair.p1);
  const p2 = tournament.players?.find(pl => pl.id === pair.p2);
  return (
    <PairAvatar
      name1={p1?.name ?? "?"}
      name2={p2?.name ?? "?"}
      src1={p1?.linked_avatar_url ?? null}
      src2={p2?.linked_avatar_url ?? null}
      size={size}
    />
  );
}

function BracketMatchCard({
  match, phase, isOwner, standings, tournament,
  editMode, draftMatch, allPairs, onPairChange, pairLocations,
  isLive, onToggleLive,
}) {
  const isTBD1   = !match.pair1_name;
  const isTBD2   = !match.pair2_name;
  const isPlayed = match.winner_id !== null;

  const seed1 = standings?.find(s => s.pair_id === match.pair1_id)?.seed ?? null;
  const seed2 = standings?.find(s => s.pair_id === match.pair2_id)?.seed ?? null;

  if (editMode) {
    const dm = draftMatch ?? match;
    // Ninguna opción se deshabilita: elegir una pareja que ya juega en otro cruce
    // la intercambia con la de este slot. El sufijo dice dónde está hoy.
    const optionLabel = (p, currentId) => {
      const where = p.pair_id === currentId ? null : pairLocations?.get(p.pair_id);
      return `#${p.seed} ${p.pair_name}${where ? ` — hoy en ${where}` : ''}`;
    };
    const renderOptions = (currentId) => allPairs.map(p => (
      <option key={p.pair_id} value={p.pair_id}>{optionLabel(p, currentId)}</option>
    ));
    return (
      <div className="bg-surface border border-brand/40 rounded-lg p-3">
        <select
          value={dm.pair1_id ?? ''}
          onChange={e => onPairChange(phase, match.id, 'pair1', e.target.value)}
          className="w-full bg-base border border-border-mid text-content px-2 py-1.5 font-sans text-[12px] rounded-sm outline-none mb-1"
        >
          <option value="">— Seleccionar pareja —</option>
          {renderOptions(dm.pair1_id)}
        </select>
        <div className="border-t border-border my-1" />
        <select
          value={dm.pair2_id ?? ''}
          onChange={e => onPairChange(phase, match.id, 'pair2', e.target.value)}
          className="w-full bg-base border border-border-mid text-content px-2 py-1.5 font-sans text-[12px] rounded-sm outline-none mt-1"
        >
          <option value="">— Seleccionar pareja —</option>
          {renderOptions(dm.pair2_id)}
        </select>
      </div>
    );
  }

  return (
    <div className={`bg-surface border rounded-lg p-3 ${
      isLive   ? 'border-green/60 ring-1 ring-green/30' :
      isPlayed ? 'border-brand/50' :
                 'border-border-mid'
    }`}>
      {/* Pareja 1 */}
      <div className={`flex items-center justify-between py-1 px-1 rounded-sm ${isPlayed && match.winner_id === match.pair1_id ? "bg-brand/10" : ""}`}>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <SeedChip seed={seed1} />
          {isTBD1 ? (
            <span className="font-condensed font-semibold text-[12px] sm:text-[14px] leading-tight text-muted italic">A confirmar</span>
          ) : (
            <PairName
              name={match.pair1_name}
              className={`font-condensed font-semibold text-[12px] sm:text-[14px] ${
                isPlayed && match.winner_id === match.pair1_id ? "text-brand" : "text-white"
              }`}
            />
          )}
        </div>
        {isPlayed && <NodeScore match={match} side={1} />}
      </div>

      <div className="border-t border-border my-1" />

      {/* Pareja 2 */}
      <div className={`flex items-center justify-between py-1 px-1 rounded-sm ${isPlayed && match.winner_id === match.pair2_id ? "bg-brand/10" : ""}`}>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <SeedChip seed={seed2} />
          {isTBD2 ? (
            <span className="font-condensed font-semibold text-[12px] sm:text-[14px] leading-tight text-muted italic">A confirmar</span>
          ) : (
            <PairName
              name={match.pair2_name}
              className={`font-condensed font-semibold text-[12px] sm:text-[14px] ${
                isPlayed && match.winner_id === match.pair2_id ? "text-brand" : "text-white"
              }`}
            />
          )}
        </div>
        {isPlayed && <NodeScore match={match} side={2} />}
      </div>

      {/* Cancha */}
      {courtLabel(tournament, match.court) != null && (
        <div className="text-center py-1">
          <span className="text-[10px] font-mono font-bold text-brand border border-brand/40 px-1.5 py-0.5 rounded-sm">
            CANCHA {courtLabel(tournament, match.court)}
          </span>
        </div>
      )}

      {/* Toggle EN VIVO */}
      {isOwner && !isPlayed && !isTBD1 && !isTBD2 && (
        <div className="mt-2.5">
          <button
            onClick={onToggleLive}
            className={`w-full border py-1 font-condensed font-bold text-[11px] tracking-wide cursor-pointer rounded-sm transition-colors ${
              isLive
                ? 'bg-green/10 text-green border-green/40'
                : 'bg-transparent text-muted border-dashed border-border-strong hover:text-white hover:border-border-mid'
            }`}
          >
            {isLive ? '● EN VIVO' : '◌ EN VIVO'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tarjeta "BYE" para parejas que pasan directo a cuartos ────────────────────
function BracketByeCard({ bye }) {
  return (
    <div className="bg-surface/40 border border-dashed border-border-mid rounded-lg p-3 opacity-75">
      <div className="flex items-center gap-1.5 py-1 px-1 min-w-0">
        <SeedChip seed={bye.seed} />
        <PairName name={bye.pair_name ?? "—"} className="font-condensed font-semibold text-[12px] sm:text-[14px] text-soft" />

      </div>
      <div className="mt-1.5 text-[9px] tracking-[2px] text-muted/60 font-mono text-center">
        PASA DIRECTO
      </div>
    </div>
  );
}

// ── Card de partido EN VIVO (debajo del cuadro) ────────────────────────────────
function BracketLiveCard({ liveMatch, bracketMatch, phase, tournament, saving, onScoreChange, onScorePatch, onSave, onCancel, onTimerChange }) {
  const { score1, score2, court, sets_format = null, sets = [] } = liveMatch.score;
  const [minimized, setMinimized] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const resultReady = sets_format
    ? setsResultReady(sets_format, sets)
    : Number(score1) !== Number(score2);
  const isDirty = !!(liveMatch.timer?.startedAt != null || Number(score1) || Number(score2) || court != null || sets_format);
  const requestCancel = () => { if (isDirty) setConfirming(true); else onCancel(); };

  const timerEl = (
    <Timer
      timerState={liveMatch.timer}
      onTimerChange={onTimerChange}
      onStop={secs => onScoreChange('duration_seconds', secs)}
    />
  );

  if (minimized) {
    return (
      <MinimizedMatch
        team1Avatar={pairAvatarFor(bracketMatch.pair1_id, tournament, 28)}
        team2Avatar={pairAvatarFor(bracketMatch.pair2_id, tournament, 28)}
        score1={score1} score2={score2}
        court={court}
        timer={timerEl}
        onExpand={() => setMinimized(false)}
      />
    );
  }

  return (
    <div className="bg-surface border border-border-mid rounded-lg p-5 mb-4">
      {confirming && (
        <Modal
          title="¿Descartar partido?"
          confirmText="Descartar"
          confirmDanger
          onConfirm={() => { setConfirming(false); onCancel(); }}
          onCancel={() => setConfirming(false)}
        >
          Se perderán los datos cargados de este partido en curso.
        </Modal>
      )}
      <MatchCardHeader isEditing={false} title={PHASE_TITLE[phase] ?? "NUEVO PARTIDO"} onCancel={requestCancel} timer={timerEl} onMinimize={() => setMinimized(true)} />

      <div className="flex justify-between items-center gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {pairAvatarFor(bracketMatch.pair1_id, tournament, 26)}
          <span className="font-condensed font-bold text-[16px] text-brand line-clamp-2 leading-tight">{bracketMatch.pair1_name}</span>
        </div>
        <span className="font-condensed font-bold text-[15px] text-border-strong tracking-[3px] mx-2 shrink-0">VS</span>
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
          <span className="font-condensed font-bold text-[16px] text-cyan line-clamp-2 leading-tight">{bracketMatch.pair2_name}</span>
          {pairAvatarFor(bracketMatch.pair2_id, tournament, 26)}
        </div>
      </div>

      {tournamentCourts(tournament) > 1 && (
        <CourtSelector courts={tournamentCourts(tournament)} value={liveMatch.score.court} onChange={v => onScoreChange('court', v)} />
      )}

      <div className="mt-4">
        <SetsScoring
          setsFormat={liveMatch.score.sets_format ?? null}
          sets={liveMatch.score.sets ?? []}
          score1={score1}
          score2={score2}
          onChange={onScorePatch}
          row1={<><span className="truncate">{bracketMatch.pair1_name}</span></>}
          row2={<><span className="truncate">{bracketMatch.pair2_name}</span></>}
        />
      </div>

      <button
        onClick={onSave}
        disabled={saving || !resultReady}
        className={`w-full border-0 py-2.5 font-condensed font-bold text-[13px] tracking-wide rounded-sm mt-4 ${
          saving || !resultReady
            ? "bg-border-mid text-muted cursor-not-allowed"
            : "bg-brand text-base cursor-pointer"
        }`}
      >
        {saving ? "REGISTRANDO..." : "REGISTRAR PARTIDO"}
      </button>
    </div>
  );
}

// ── Card de partido jugado del bracket ────────────────────────────────────────
function BracketPlayedCard({ match, tournament, isOwner, onEdit, onClear, matchNum, phase }) {
  const win1 = match.winner_id === match.pair1_id;
  const court = courtLabel(tournament, match.court);
  return (
    <div className="bg-surface border border-border-mid rounded-lg px-4 py-3.5">
      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-border-mid text-[10px] font-mono">
        <span className="tracking-[2px] text-brand/80">{phase ? (PHASE_TITLE[phase] ?? phase) : ""}</span>
        <span className="tracking-[1px] text-muted">Cancha: {court != null && court !== '-' ? court : 'S/A'}</span>
      </div>
      <div className="flex items-start gap-3">
        {matchNum != null && (
          <span className="text-[10px] font-mono text-muted shrink-0 w-3 text-right mt-1.5">#{matchNum}</span>
        )}
        <div className="flex-1 min-w-0">
          <MatchScoreboard
            label1={match.pair1_name}
            label2={match.pair2_name}
            score1={match.score1}
            score2={match.score2}
            sets={match.sets ?? []}
            setsFormat={match.sets_format ?? null}
            win1={win1}
          />
        </div>
      </div>
      {isOwner && (
        <div className="mt-2.5 pt-2.5 border-t border-border-mid flex items-center gap-4">
          <button
            onClick={onEdit}
            className="bg-transparent border-0 text-muted cursor-pointer text-[12px] font-sans px-1.5 py-0.5 flex items-center gap-1.5 hover:text-white"
          >
            ✎ Editar resultado
          </button>
          <button
            onClick={onClear}
            className="bg-transparent border-0 text-muted cursor-pointer text-[12px] font-sans px-1.5 py-0.5 flex items-center gap-1.5 hover:text-danger"
          >
            <Trash2 size={13} /> Borrar resultado
          </button>
        </div>
      )}
    </div>
  );
}

// ── Formulario de edición de resultado jugado ──────────────────────────────────
function BracketEditCard({ match, tournament, saving, editScore, onScoreChange, onScorePatch, onSave, onCancel }) {
  const s1 = Number(editScore.score1), s2 = Number(editScore.score2);
  const resultReady = editScore.sets_format
    ? setsResultReady(editScore.sets_format, editScore.sets ?? [])
    : s1 !== s2;
  return (
    <div className="bg-surface border border-brand/40 rounded-lg p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-brand font-mono text-[11px] font-bold tracking-wide">✎ EDITAR RESULTADO</span>
        <button onClick={onCancel} className="bg-transparent border-0 text-muted cursor-pointer font-sans text-[13px] hover:text-white">
          ✕ Cancelar
        </button>
      </div>
      <div className="flex justify-between items-center gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {pairAvatarFor(match.pair1_id, tournament, 26)}
          <span className="font-condensed font-bold text-[16px] text-brand line-clamp-2 leading-tight">{match.pair1_name}</span>
        </div>
        <span className="text-muted font-condensed font-bold text-[14px] px-1 shrink-0">VS</span>
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
          <span className="font-condensed font-bold text-[16px] text-cyan line-clamp-2 leading-tight">{match.pair2_name}</span>
          {pairAvatarFor(match.pair2_id, tournament, 26)}
        </div>
      </div>
      <SetsScoring
        setsFormat={editScore.sets_format ?? null}
        sets={editScore.sets ?? []}
        score1={s1}
        score2={s2}
        onChange={onScorePatch}
        row1={<><span className="truncate">{match.pair1_name}</span></>}
        row2={<><span className="truncate">{match.pair2_name}</span></>}
      />
      {tournamentCourts(tournament) > 1 && (
        <CourtSelector courts={tournamentCourts(tournament)} value={editScore.court} onChange={v => onScoreChange('court', v)} />
      )}
      <button
        onClick={onSave}
        disabled={saving || !resultReady}
        className={`w-full border-0 py-2.5 font-condensed font-bold text-[13px] tracking-wide rounded-sm mt-4 ${
          saving || !resultReady ? "bg-border-mid text-muted cursor-not-allowed" : "bg-brand text-base cursor-pointer"
        }`}
      >
        {saving ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
      </button>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function Bracket({ tournament, isOwner, onGenerateBracket, onUpdateMatch, onClearMatch, onSetBracket, onDeleteBracket, onSetLiveMatch }) {
  const bracket = tournament.bracket;

  const [liveMatches,  setLiveMatches]  = useState(() => {
    // En modo readOnly NUNCA se leen partidos en curso: el localStorage se
    // comparte entre pestañas y muestra live matches del owner.
    if (!isOwner) return [];
    try {
      const raw = localStorage.getItem(getLiveKey(tournament.id));
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  // Each entry: { matchId, timer: {...}, score: { score1, score2, duration_seconds } }

  const [saving,       setSaving]       = useState(null);
  const [generating,   setGenerating]   = useState(false);
  const [editMode,     setEditMode]     = useState(false);
  const [draftBracket, setDraftBracket] = useState(null);
  const [savingLayout, setSavingLayout] = useState(false);
  const [editMatchId,  setEditMatchId]  = useState(null);
  const [editScore,    setEditScore]    = useState({ score1: 0, score2: 0 });
  const [showStory,    setShowStory]    = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [clearTarget,  setClearTarget]  = useState(null);
  const [clearing,     setClearing]     = useState(false);
  const [reorgBlocked, setReorgBlocked] = useState(false);

  // Persist liveMatches + sync onSetLiveMatch
  const prevLiveRef = useRef(liveMatches);
  const findBracketMatchWithPhase = useCallback((matchId) => {
    if (!bracket) return null;
    if (bracket.final?.id === matchId) return { match: bracket.final, phase: 'final' };
    for (const phase of ['octavos', 'cuartos', 'semis']) {
      const found = bracket[phase]?.find(m => m.id === matchId);
      if (found) return { match: found, phase };
    }
    return null;
  }, [bracket]);

  useEffect(() => {
    const key = getLiveKey(tournament.id);
    if (liveMatches.length > 0) localStorage.setItem(key, JSON.stringify(liveMatches));
    else                        localStorage.removeItem(key);

    const prevIds = new Set(prevLiveRef.current.map(m => m.matchId));
    const currIds = new Set(liveMatches.map(m => m.matchId));
    const changed = prevIds.size !== currIds.size ||
      [...currIds].some(id => !prevIds.has(id)) ||
      [...prevIds].some(id => !currIds.has(id));

    // Detectar si cambió la cancha o arrancó/reanudó el cronómetro en partidos que
    // ya están en vivo (no sincronizar por cambios en score)
    const dataChanged = liveMatches.some((lm) => {
      const prevMatch = prevLiveRef.current.find(m => m.matchId === lm.matchId);
      if (!prevMatch) return false;
      return prevMatch.score.court !== lm.score.court
        || (prevMatch.timer?.startedAt ?? null) !== (lm.timer?.startedAt ?? null);
    });

    if (changed || dataChanged) {
      const labels = liveMatches.map(lm => {
        const result = findBracketMatchWithPhase(lm.matchId);
        if (!result) return null;
        return { team1Label: result.match.pair1_name, team2Label: result.match.pair2_name, phase: result.phase, court: lm.score.court ?? null, startedAt: lm.timer?.startedAt ?? null };
      }).filter(Boolean);
      onSetLiveMatch?.(labels.length > 0 ? labels : null);
    }
    prevLiveRef.current = liveMatches;
  }, [liveMatches, tournament.id, findBracketMatchWithPhase, onSetLiveMatch]);

  function handleToggleLive(matchId) {
    const existing = liveMatches.find(m => m.matchId === matchId);
    if (existing) {
      setLiveMatches(prev => prev.filter(m => m.matchId !== matchId));
    } else {
      setLiveMatches(prev => [...prev, {
        matchId,
        timer: EMPTY_TIMER,
        score: { score1: 0, score2: 0, duration_seconds: null, court: null, sets_format: null, sets: [] },
      }]);
    }
  }

  function handleTimerChange(matchId, newTimer) {
    setLiveMatches(prev => prev.map(m => m.matchId === matchId ? { ...m, timer: newTimer } : m));
  }

  function handleScoreChange(matchId, field, value) {
    setLiveMatches(prev => prev.map(m =>
      m.matchId === matchId ? { ...m, score: { ...m.score, [field]: value } } : m
    ));
  }

  function handleScorePatch(matchId, patch) {
    setLiveMatches(prev => prev.map(m =>
      m.matchId === matchId ? { ...m, score: { ...m.score, ...patch } } : m
    ));
  }

  async function handleSaveResult(matchId) {
    const lm = liveMatches.find(m => m.matchId === matchId);
    if (!lm) return;
    const fmt = lm.score.sets_format ?? null;
    const nv  = fmt ? visibleSetsCount(fmt, lm.score.sets ?? []) : 0;
    const [s1, s2] = fmt
      ? scoreFromSets(fmt, lm.score.sets ?? [])
      : [Number(lm.score.score1), Number(lm.score.score2)];
    if (s1 === s2) return;

    // Si el cronómetro está corriendo, detenerlo y calcular la duración
    let duration = lm.score.duration_seconds;
    if (lm.timer.startedAt !== null && lm.timer.stoppedAt === null) {
      duration = Math.floor((Date.now() - lm.timer.startedAt) / 1000);
    }

    // Cerrar la card ANTES del await para evitar que un remount restaure desde localStorage
    const remaining = liveMatches.filter(m => m.matchId !== matchId);
    setLiveMatches(remaining);
    const key = getLiveKey(tournament.id);
    if (remaining.length > 0) localStorage.setItem(key, JSON.stringify(remaining));
    else localStorage.removeItem(key);
    setSaving(matchId);
    try {
      await onUpdateMatch(matchId, s1, s2, duration ?? null, lm.score.court ?? null, false, {
        sets_format: fmt,
        sets: nv > 0 ? (lm.score.sets ?? []).slice(0, nv) : [],
      });
    } finally {
      setSaving(null);
    }
  }

  function handleOpenEdit(match) {
    setEditMatchId(match.id);
    setEditScore({
      score1: match.score1, score2: match.score2,
      duration_seconds: match.duration_seconds ?? null, court: match.court ?? null,
      sets_format: match.sets_format ?? null, sets: match.sets ?? [],
    });
  }

  async function handleSaveEdit() {
    const fmt = editScore.sets_format ?? null;
    const nv  = fmt ? visibleSetsCount(fmt, editScore.sets ?? []) : 0;
    const [s1, s2] = fmt
      ? scoreFromSets(fmt, editScore.sets ?? [])
      : [Number(editScore.score1), Number(editScore.score2)];
    if (s1 === s2) return;
    setSaving(editMatchId);
    try {
      await onUpdateMatch(editMatchId, s1, s2, editScore.duration_seconds ?? null, editScore.court ?? null, true, {
        sets_format: fmt,
        sets: nv > 0 ? (editScore.sets ?? []).slice(0, nv) : [],
      });
      setEditMatchId(null);
    } finally {
      setSaving(null);
    }
  }

  async function handleClearResult() {
    if (!clearTarget) return;
    setClearing(true);
    try {
      await onClearMatch?.(clearTarget.id);
      setClearTarget(null);
      if (editMatchId === clearTarget.id) setEditMatchId(null);
    } finally { setClearing(false); }
  }

  async function handleGenerateBracket() {
    setGenerating(true);
    try { await onGenerateBracket(); }
    finally { setGenerating(false); }
  }

  async function handleDeleteBracket() {
    setDeleting(true);
    try { await onDeleteBracket?.(); }
    finally { setDeleting(false); setConfirmDelete(false); }
  }

  // ── Reorganizar ──────────────────────────────────────────────────────────────
  function enterEditMode()  { setDraftBracket(JSON.parse(JSON.stringify(bracket))); setEditMode(true); }
  function cancelEditMode() { setDraftBracket(null); setEditMode(false); }

  async function confirmEditMode() {
    setSavingLayout(true);
    try { await onSetBracket(draftBracket); setEditMode(false); setDraftBracket(null); }
    finally { setSavingLayout(false); }
  }

  // rawValue viene del <select>, siempre string; los pair_id son TEXT, se comparan como tales.
  function updateDraftPair(phaseKey, matchId, slot, rawValue) {
    const pair = rawValue ? bracket.standings?.find(s => String(s.pair_id) === rawValue) : null;
    setDraftBracket(prev => assignDraftPair(prev, phaseKey, matchId, slot, pair ?? null));
  }

  function getDraftMatch(phaseKey, matchId) {
    if (!draftBracket) return null;
    if (phaseKey === 'final') return draftBracket.final;
    return draftBracket[phaseKey]?.find(m => m.id === matchId) ?? null;
  }

  // Dónde juega hoy cada pareja en el draft, para anunciarlo en los selects.
  function collectPairLocations() {
    if (!draftBracket) return null;
    const map = new Map();
    const add = (m, label) => {
      if (!m) return;
      if (m.pair1_id) map.set(m.pair1_id, label);
      if (m.pair2_id) map.set(m.pair2_id, label);
    };
    ['octavos', 'cuartos', 'semis'].forEach(k =>
      (draftBracket[k] ?? []).forEach((m, i) => add(m, `${SLOT_LABEL[k]} ${i + 1}`))
    );
    add(draftBracket.final, SLOT_LABEL.final);
    return map;
  }
  const pairLocations = editMode ? collectPairLocations() : null;

  // ── Sin bracket ──────────────────────────────────────────────────────────────
  if (!bracket) {
    // Borrador: sin el mínimo de parejas no se puede generar el cuadro.
    const pairCount = tournament.pairs?.length ?? 0;
    if (pairCount < AMERICANO_MIN_PAIRS) {
      const missing = AMERICANO_MIN_PAIRS - pairCount;
      return (
        <div>
          <div className="font-condensed font-bold text-[14px] tracking-[3px] text-muted mb-4">CUADRO</div>
          <div className="bg-surface border border-brand/30 rounded-lg p-4">
            <div className="font-condensed font-bold text-[13px] tracking-[2px] text-brand mb-1.5">BORRADOR</div>
            <p className="text-soft font-sans text-[13px] leading-relaxed">
              Falta{missing === 1 ? '' : 'n'} <strong className="text-white">{missing}</strong> {missing === 1 ? 'pareja' : 'parejas'} para
              llegar al mínimo de <strong className="text-white">{AMERICANO_MIN_PAIRS}</strong>.
              {isOwner ? ' Completalas desde GESTIÓN para habilitar el cuadro.' : ' El organizador todavía está armando las parejas.'}
            </p>
          </div>
        </div>
      );
    }
    return (
      <div>
        <div className="font-condensed font-bold text-[14px] tracking-[3px] text-muted mb-4">CUADRO</div>
        {isOwner ? (
          <>
            <p className="text-muted font-mono text-[12px] mb-4">
              Completá todos los partidos de la fase previa para generar el cuadro.
            </p>
            <button
              onClick={handleGenerateBracket}
              disabled={generating}
              className="w-full bg-brand text-base border-0 py-3.5 font-condensed font-black text-[16px] tracking-[2px] rounded-sm cursor-pointer disabled:opacity-60"
            >
              {generating ? "GENERANDO..." : "GENERAR CUADRO"}
            </button>
          </>
        ) : (
          <p className="text-muted font-mono text-[13px]">El cuadro aún no fue generado.</p>
        )}
      </div>
    );
  }

  const standings = bracket.standings ?? [];

  // Estado "en vivo" de un cruce. Para el owner sale de sus liveMatches locales;
  // para el espectador se deriva de la metadata que difunde el owner
  // (tournament.live_match), matcheando por fase y nombres de pareja.
  const liveEntries = Array.isArray(tournament.live_match) ? tournament.live_match : [];
  function isMatchLive(match, phase) {
    if (isOwner) return liveMatches.some(lm => lm.matchId === match.id);
    if (!match.pair1_name || !match.pair2_name) return false;
    return liveEntries.some(e =>
      e.phase === phase &&
      ((e.team1Label === match.pair1_name && e.team2Label === match.pair2_name) ||
       (e.team1Label === match.pair2_name && e.team2Label === match.pair1_name))
    );
  }

  const hasResults = bracket.octavos?.some(m => m.winner_id) ||
                     bracket.cuartos?.some(m => m.winner_id) ||
                     bracket.semis?.some(m => m.winner_id)   ||
                     bracket.final?.winner_id;

  // Construye los 8 slots de octavos: reales + "byes" (parejas que pasan directo)
  // en el orden que dicta la pairing de cuartos, de modo que cada par de slots
  // alimente al mismo cuarto y el árbol quede balanceado.
  function buildOctavosSlots() {
    if (!bracket.octavos?.length) return null;
    const slots = [];
    for (const qm of bracket.cuartos) {
      for (const n of [1, 2]) {
        const src = qm[`slot${n}_source`];
        if (src) {
          const octavo = bracket.octavos.find(m => m.id === src);
          if (octavo) slots.push({ type: "match", data: octavo });
        } else {
          slots.push({
            type: "bye",
            data: {
              pair_id:   qm[`pair${n}_id`],
              pair_name: qm[`pair${n}_name`],
              seed:      qm[`slot${n}_seed`],
            },
          });
        }
      }
    }
    return slots;
  }

  const wrapMatches = (arr) => arr.map(m => ({ type: "match", data: m }));
  const octavosSlots = buildOctavosSlots();

  const phases = [
    octavosSlots
      ? { key: "octavos", label: "OCTAVOS",         items: octavosSlots }
      : null,
    { key: "cuartos", label: "CUARTOS DE FINAL", items: wrapMatches(bracket.cuartos) },
    { key: "semis",   label: "SEMIFINALES",     items: wrapMatches(bracket.semis)   },
    { key: "final",   label: "FINAL",           items: bracket.final ? wrapMatches([bracket.final]) : [] },
  ].filter(Boolean);

  // Partidos jugados del bracket (para mostrar como cards)
  const playedBracketMatches = phases
    .flatMap(p => p.items.filter(it => it.type === "match").map(it => ({ ...it.data, phase: p.key })))
    .filter(m => m.winner_id !== null && m.pair1_name && m.pair2_name);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="font-condensed font-bold text-[14px] tracking-[3px] text-muted">CUADRO</div>
        {!editMode && (
          <div className="flex gap-2">
            <ShareStoryButton onClick={() => setShowStory(true)} />
            {isOwner && (
              <button
                onClick={() => hasResults ? setReorgBlocked(true) : enterEditMode()}
                aria-label="Reorganizar"
                title="Reorganizar"
                className={`bg-transparent border px-3 py-2 cursor-pointer rounded-sm inline-flex items-center ${
                  hasResults ? "text-border-strong border-border" : "text-muted border-border-strong"
                }`}
              >
                <Pencil size={15} />
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => setConfirmDelete(true)}
                aria-label="Borrar cuadro"
                title="Borrar cuadro"
                className="bg-transparent text-danger border border-danger/40 px-3 py-2 cursor-pointer rounded-sm hover:bg-danger/10 inline-flex items-center"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
        {editMode && (
          <div className="flex gap-2">
            <button onClick={cancelEditMode} className="bg-transparent text-muted border border-border-strong px-3 py-2 font-condensed font-bold text-[12px] cursor-pointer rounded-sm">
              CANCELAR
            </button>
            <button onClick={confirmEditMode} disabled={savingLayout} className="bg-brand text-base border-0 px-4 py-2 font-condensed font-bold text-[12px] tracking-wide cursor-pointer rounded-sm disabled:opacity-60">
              {savingLayout ? "..." : "CONFIRMAR"}
            </button>
          </div>
        )}
      </div>

      {editMode && (
        <div className="bg-surface-alt border border-brand/30 rounded-md px-3.5 py-2.5 text-[11px] text-brand font-mono mb-4 leading-relaxed">
          Modo reorganizar: elegí la pareja que querés en cada lugar. Si ya está jugando en otro
          cruce, las dos se intercambian solas. Los cambios se aplican al confirmar.
          <span className="block mt-1 text-soft">
            Dejá los cruces como los querés antes de arrancar: en cuanto cargues el primer resultado el cuadro queda fijo.
          </span>
        </div>
      )}

      {/* Aviso previo: el cuadro sólo se puede reorganizar mientras no haya resultados. */}
      {isOwner && !editMode && !hasResults && (
        <div className="flex items-start gap-2 text-[11px] text-muted font-mono mb-4 leading-relaxed">
          <Info size={13} className="shrink-0 mt-px" />
          <span>Podés reorganizar los cruces con el lápiz hasta que cargues el primer resultado.</span>
        </div>
      )}

      {/* Momento campeón — solo cuando la final está definida y no estamos editando */}
      {!editMode && bracket.final?.winner_name && (() => {
        const winnerPair = tournament.pairs?.find((p) => p.id === bracket.final.winner_id);
        const wp1 = winnerPair ? tournament.players.find((p) => p.id === winnerPair.p1) : null;
        const wp2 = winnerPair ? tournament.players.find((p) => p.id === winnerPair.p2) : null;
        return (
        <div className="relative mb-6 overflow-hidden rounded-lg border border-amber-400/40 bg-gradient-to-b from-amber-400/15 via-amber-400/5 to-transparent p-6 text-center">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
          <Trophy size={36} className="mx-auto mb-2 text-amber-400" />
          <div className="font-mono text-[10px] tracking-[4px] text-amber-400/70 mb-1.5">CAMPEONES</div>
          {winnerPair && (
            <div className="flex justify-center mb-2">
              <PairAvatar
                name1={wp1?.name ?? "?"}
                name2={wp2?.name ?? "?"}
                src1={wp1?.linked_avatar_url ?? null}
                src2={wp2?.linked_avatar_url ?? null}
                size={56}
              />
            </div>
          )}
          <div className="font-condensed font-black text-[24px] text-white leading-tight">
            {bracket.final.winner_name}
          </div>
          {bracket.final.score1 != null && bracket.final.score2 != null && (
            <div className="mt-2 font-mono text-[11px] text-muted">
              Final: {Math.max(bracket.final.score1, bracket.final.score2)}
              <span className="text-border-strong mx-1.5">—</span>
              {Math.min(bracket.final.score1, bracket.final.score2)}
            </div>
          )}
        </div>
        );
      })()}

      {/* Bracket en columnas — altura mínima compartida para que cada columna
          distribuya sus cards con justify-around y se alineen como un árbol. */}
      {/* Mobile/tablet: caja con alto acotado que scrollea internamente en ambos
          ejes, para que el sticky de los títulos de fase se pinnee al tope de la
          caja. Desktop (lg+): las columnas entran sin scroll horizontal y, al no
          ser scroll-container, el sticky se pinnea respecto de la página. */}
      <div className="overflow-auto max-h-[75vh] lg:overflow-visible lg:max-h-none">
        <div
          className="flex gap-10 pb-4 items-stretch"
          style={{ minHeight: `${Math.max(...phases.map(p => p.items.length)) * 140}px` }}
        >
          {phases.map((phase, phaseIdx) => {
            const isFirst    = phaseIdx === 0;
            const isLast     = phaseIdx === phases.length - 1;
            const nextLen    = phases[phaseIdx + 1]?.items.length ?? 0;
            // shouldPair: el árbol es balanceado (esta columna dobla a la siguiente).
            // Con los byes virtuales, octavos siempre tiene 8 items y cuartos 4.
            const shouldPair = !isLast && phase.items.length === 2 * nextLen;

            const renderItem = (item, idx) => {
              const key = item.type === "match" ? item.data.id : `bye-${phase.key}-${idx}`;
              return (
                <div key={key} className="relative">
                  {item.type === "match" ? (
                    <BracketMatchCard
                      match={item.data}
                      phase={phase.key}
                      isOwner={isOwner}
                      standings={standings}
                      tournament={tournament}
                      editMode={editMode}
                      draftMatch={getDraftMatch(phase.key, item.data.id)}
                      allPairs={standings}
                      onPairChange={updateDraftPair}
                      pairLocations={pairLocations}
                      isLive={isMatchLive(item.data, phase.key)}
                      onToggleLive={() => handleToggleLive(item.data.id)}
                    />
                  ) : (
                    <BracketByeCard bye={item.data} />
                  )}
                </div>
              );
            };

            // Líneas fijas al 25%/75% del pair-group — independiente de la altura real
            // de cada card, así mixing bye (más bajo) + match (más alto) no desalinea.
            const connectorRight = !isLast && (
              <>
                <span className="absolute left-full top-1/4 -translate-y-1/2 w-5 h-px bg-border-mid pointer-events-none" />
                <span className="absolute left-full top-3/4 -translate-y-1/2 w-5 h-px bg-border-mid pointer-events-none" />
                <span className="absolute left-full top-1/4 bottom-1/4 ml-5 w-px bg-border-mid pointer-events-none" />
              </>
            );
            const connectorLeft = !isFirst && (
              <>
                <span className="absolute right-full top-1/4 -translate-y-1/2 w-5 h-px bg-border-mid pointer-events-none" />
                <span className="absolute right-full top-3/4 -translate-y-1/2 w-5 h-px bg-border-mid pointer-events-none" />
              </>
            );

            return (
              <div key={phase.key} className={`flex flex-col flex-1 ${editMode ? "min-w-60 max-w-72 lg:max-w-none" : "min-w-60 max-w-68 lg:max-w-none"}`}>
                <div className="sticky top-0 z-10 bg-base text-[10px] tracking-[2px] text-brand font-mono text-center pt-1 pb-3">
                  {phase.label}
                </div>
                {shouldPair ? (
                  <div className="flex flex-col flex-1 justify-around">
                    {Array.from({ length: phase.items.length / 2 }).map((_, gi) => (
                      <div
                        key={gi}
                        className="relative flex flex-col justify-around flex-1"
                      >
                        {renderItem(phase.items[gi * 2], gi * 2)}
                        {renderItem(phase.items[gi * 2 + 1], gi * 2 + 1)}
                        {connectorRight}
                        {connectorLeft}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`relative flex flex-col flex-1 ${phase.items.length === 1 ? "justify-center" : "justify-around"}`}>
                    {phase.items.map(renderItem)}
                    {/* Final (1 ítem): tick al 50% del contenedor */}
                    {!isFirst && phase.items.length === 1 && (
                      <span className="absolute right-full top-1/2 -translate-y-1/2 w-5 h-px bg-border-mid pointer-events-none" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cards EN VIVO (debajo del cuadro) — sólo para el owner */}
      {isOwner && liveMatches.length > 0 && (
        <div className="mt-6">
          <div className="font-condensed font-bold text-[12px] tracking-[3px] text-muted mb-3">PARTIDOS EN CURSO</div>
          {liveMatches.map(lm => {
            const result = findBracketMatchWithPhase(lm.matchId);
            if (!result) return null;
            return (
              <BracketLiveCard
                key={lm.matchId}
                liveMatch={lm}
                bracketMatch={result.match}
                phase={result.phase}
                tournament={tournament}
                saving={saving === lm.matchId}
                onScoreChange={(field, value) => handleScoreChange(lm.matchId, field, value)}
                onScorePatch={(patch) => handleScorePatch(lm.matchId, patch)}
                onSave={() => handleSaveResult(lm.matchId)}
                onCancel={() => handleToggleLive(lm.matchId)}
                onTimerChange={newTimer => handleTimerChange(lm.matchId, newTimer)}
              />
            );
          })}
        </div>
      )}

      {/* Partidos jugados del bracket — se muestran siempre (también tras finalizar
          el torneo, cuando isOwner pasa a false); la edición queda gateada por isOwner. */}
      {playedBracketMatches.length > 0 && (
        <div className="mt-6">
          <div className="font-condensed font-bold text-[12px] tracking-[3px] text-muted mb-3">RESULTADOS</div>
          <div className="flex flex-col gap-2.5">
            {[...playedBracketMatches].reverse().map((m, i) => {
              const matchNum = playedBracketMatches.length - i;
              return editMatchId === m.id ? (
                <BracketEditCard
                  key={m.id}
                  match={m}
                  tournament={tournament}
                  saving={saving === m.id}
                  editScore={editScore}
                  onScoreChange={(field, value) => setEditScore(prev => ({ ...prev, [field]: value }))}
                  onScorePatch={(patch) => setEditScore(prev => ({ ...prev, ...patch }))}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditMatchId(null)}
                />
              ) : (
                <BracketPlayedCard key={m.id} match={m} tournament={tournament} isOwner={isOwner} onEdit={() => handleOpenEdit(m)} onClear={() => setClearTarget(m)} matchNum={matchNum} phase={m.phase} />
              );
            })}
          </div>
        </div>
      )}

      {showStory && (
        <SnapshotModal
          filename={`cuadro-${tournament.name ?? 'torneo'}.png`}
          onClose={() => setShowStory(false)}
          story={<BracketStory tournament={tournament} />}
        />
      )}

      {reorgBlocked && (
        <Modal
          title="El cuadro ya está en juego"
          confirmText="Entendido"
          hideCancel
          onConfirm={() => setReorgBlocked(false)}
          onCancel={() => setReorgBlocked(false)}
        >
          Los cruces no se pueden reorganizar porque ya hay resultados cargados: mover una pareja
          dejaría partidos jugados que no corresponden a ningún cruce.
          <span className="block mt-2">
            Si necesitás cambiarlos, borrá primero los resultados desde la lista de abajo
            (cada uno tiene "Borrar resultado") y el lápiz vuelve a habilitarse.
          </span>
        </Modal>
      )}

      {clearTarget && (() => {
        const dependents = countDependentResults(bracket, clearTarget.id);
        return (
          <Modal
            title="¿Borrar el resultado?"
            confirmText={clearing ? "Borrando..." : "Borrar resultado"}
            confirmDanger
            confirmDisabled={clearing}
            onConfirm={handleClearResult}
            onCancel={() => !clearing && setClearTarget(null)}
          >
            El cruce <strong className="text-white">{clearTarget.pair1_name} vs {clearTarget.pair2_name}</strong> vuelve
            a quedar sin jugar y podrás cargarlo de nuevo.
            {dependents > 0 && (
              <> También se {dependents === 1 ? "deshace" : "deshacen"} <strong className="text-white">{dependents}</strong> {dependents === 1 ? "partido posterior" : "partidos posteriores"} del
              cuadro, porque dependían de este ganador.</>
            )}
          </Modal>
        );
      })()}

      {confirmDelete && (
        <Modal
          title="¿Borrar el cuadro?"
          confirmText={deleting ? "Borrando..." : "Borrar cuadro"}
          confirmDanger
          confirmDisabled={deleting}
          onConfirm={handleDeleteBracket}
          onCancel={() => !deleting && setConfirmDelete(false)}
        >
          Se eliminará el cuadro eliminatorio completo{hasResults ? ", incluyendo los resultados de los partidos ya jugados en él" : ""}.
          La fase previa y sus resultados no se tocan. Esta acción no se puede deshacer;
          después podrás volver a generar el cuadro.
        </Modal>
      )}
    </div>
  );
}
