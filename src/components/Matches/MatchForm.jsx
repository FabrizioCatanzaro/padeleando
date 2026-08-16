import { useState, useEffect, useRef } from "react";
import { getPairLabel, setWinner, setsWon, visibleSetsCount, scoreFromSets, setsResultReady, tournamentCourts } from "../../utils/helpers";
import { CirclePlay, CircleStop, CircleX, Play, Minimize2, Maximize2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { PairAvatar } from "../shared/PlayerAvatar";
import Modal from "../shared/Modal";

const EMPTY_TIMER = { startedAt: null, stoppedAt: null };

// ── Confirmación al cancelar/cerrar un partido nuevo con datos cargados ──────────
function useCancelGuard({ isDirty, isEditing, onCancel }) {
  const [confirming, setConfirming] = useState(false);
  const requestCancel = () => {
    if (isDirty && !isEditing) setConfirming(true);
    else onCancel();
  };
  const cancelModal = confirming ? (
    <Modal
      title="¿Descartar partido?"
      confirmText="Descartar"
      confirmDanger
      onConfirm={() => { setConfirming(false); onCancel(); }}
      onCancel={() => setConfirming(false)}
    >
      Se perderán los datos cargados de este partido en curso.
    </Modal>
  ) : null;
  return { requestCancel, cancelModal };
}

// ── Selector de cancha ─────────────────────────────────────────────────────────
export function CourtSelector({ courts, value, onChange }) {
  const trackRef    = useRef(null);
  const selectedRef = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  function readEdges() {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ left: el.scrollLeft > 2, right: el.scrollLeft < max - 2 });
  }

  // Con muchas canchas la elegida puede quedar fuera de la franja: se centra al abrir.
  useEffect(() => {
    const track = trackRef.current, el = selectedRef.current;
    if (track && el && el.offsetLeft + el.offsetWidth > track.clientWidth) {
      track.scrollLeft = el.offsetLeft - track.clientWidth / 2 + el.offsetWidth / 2;
    }
    readEdges();
    if (!track) return;
    const ro = new ResizeObserver(readEdges);
    ro.observe(track);
    return () => ro.disconnect();
  }, [courts]);

  function nudge(dir) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(120, el.clientWidth * 0.7), behavior: 'smooth' });
  }

  const btnBase   = 'shrink-0 rounded-sm border font-mono font-bold cursor-pointer transition-colors';
  const arrowBase = 'absolute top-0 bottom-0 w-8 flex items-center z-10 border-0 cursor-pointer text-muted hover:text-brand transition-colors';

  return (
    <div className="mt-3 mb-1">
      <div className="text-[11px] tracking-[2px] text-muted font-mono mb-2">CANCHA</div>
      <div className="relative">
      {edges.left && (
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label="Ver canchas anteriores"
          className={`${arrowBase} left-0 justify-start bg-gradient-to-r from-surface via-surface to-transparent`}
        >
          <ChevronLeft size={18} />
        </button>
      )}
      {edges.right && (
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label="Ver más canchas"
          className={`${arrowBase} right-0 justify-end bg-gradient-to-l from-surface via-surface to-transparent`}
        >
          <ChevronRight size={18} />
        </button>
      )}
      <div
        ref={trackRef}
        onScroll={readEdges}
        className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-0.5"
      >
        <button
          type="button"
          ref={value == null ? selectedRef : null}
          onClick={() => onChange(null)}
          className={`${btnBase} px-3 py-1.5 text-[11px] whitespace-nowrap ${
            value == null ? 'bg-brand text-base border-brand' : 'bg-surface border-border-mid text-muted hover:border-border-strong'
          }`}
        >
          Sin asignar
        </button>
        {Array.from({ length: courts }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            ref={value === n ? selectedRef : null}
            onClick={() => onChange(n)}
            className={`${btnBase} w-10 h-8 text-[13px] ${
              value === n ? 'bg-brand text-base border-brand' : 'bg-surface border-border-mid text-muted hover:border-border-strong'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      </div>
    </div>
  );
}

// ── Cronómetro (controlado, basado en timestamps) ──────────────────────────────
export function Timer({ timerState = EMPTY_TIMER, onTimerChange, onStop }) {
  const running = timerState.startedAt !== null && timerState.stoppedAt === null;
  const stopped = timerState.startedAt !== null && timerState.stoppedAt !== null;
  // Init desde el timestamp real: evita el parpadeo a "00" al remontar (minimizar/maximizar)
  const [liveSeconds, setLiveSeconds] = useState(() =>
    running ? Math.floor((Date.now() - timerState.startedAt) / 1000) : 0
  );
  const ref = useRef(null);

  useEffect(() => {
    clearInterval(ref.current);
    if (!running) return;
    const tick = () => setLiveSeconds(Math.floor((Date.now() - timerState.startedAt) / 1000));
    tick(); // primer cálculo inmediato, sin esperar los 500ms del interval
    ref.current = setInterval(tick, 500);
    return () => clearInterval(ref.current);
  }, [running, timerState.startedAt]);

  // Cómputo puro (sin Date.now): solo para stopped e idle
  const seconds = stopped
    ? Math.floor((timerState.stoppedAt - timerState.startedAt) / 1000)
    : running ? liveSeconds : 0;

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  function start() {
    onTimerChange({ startedAt: Date.now(), stoppedAt: null });
  }

  function stop() {
    const now = Date.now();
    const secs = Math.floor((now - timerState.startedAt) / 1000);
    onTimerChange({ startedAt: timerState.startedAt, stoppedAt: now });
    onStop(secs);
  }

  function resume() {
    const elapsed = timerState.stoppedAt - timerState.startedAt;
    const newStartedAt = Date.now() - elapsed;
    onTimerChange({ startedAt: newStartedAt, stoppedAt: null });
    onStop(null);
  }

  if (!running && !stopped) {
    return (
      <button type="button" onClick={start}
        className="flex items-center gap-1.5 text-brand border border-border-strong hover:border-brand px-2.5 py-1 rounded-full font-condensed font-bold text-[12px] tracking-wide cursor-pointer transition-colors shrink-0">
        <Play size={12} />
        <span>INICIAR</span>
      </button>
    );
  }

  if (running) {
    return (
      <div className="flex items-center gap-1.5 bg-brand/10 border border-brand/30 pl-2.5 pr-1.5 py-1 rounded-full shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
        <span className="font-mono text-[15px] text-brand tracking-wide tabular-nums">{mm}:{ss}</span>
        <CircleStop onClick={stop} size={20} className="text-brand cursor-pointer hover:opacity-80 transition-opacity" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-green/10 border border-green/30 pl-2.5 pr-1.5 py-1 rounded-full shrink-0">
      <span className="font-mono text-[15px] text-green tracking-wide tabular-nums">{mm}:{ss}</span>
      <CirclePlay onClick={resume} size={20} className="text-green cursor-pointer hover:opacity-80 transition-opacity" />
    </div>
  );
}

// ── Header de la card (título + cronómetro + minimizar + cerrar) ────────────────
export function MatchCardHeader({ isEditing, onCancel, onMinimize, timer, title }) {
  return (
    <div className="flex flex-row items-center justify-between gap-2 mb-4">
      <span className="font-condensed font-bold text-[14px] tracking-[2px] text-muted shrink-0">
        {title ?? (isEditing ? "EDITAR PARTIDO" : "NUEVO PARTIDO")}
      </span>
      <div className="flex items-center gap-2.5 min-w-0">
        {timer}
        {onMinimize && (
          <button type="button" onClick={onMinimize} title="Minimizar"
            className="text-muted cursor-pointer shrink-0 hover:text-white transition-colors">
            <Minimize2 size={17} />
          </button>
        )}
        <CircleX className="text-muted cursor-pointer shrink-0 hover:text-white transition-colors" size={20} onClick={onCancel} />
      </div>
    </div>
  );
}

// ── Card minimizada (cancha + fotos + marcador + cronómetro) ────────────────────
export function MinimizedMatch({ team1Avatar, team2Avatar, score1, score2, court, timer, onExpand }) {
  return (
    <div className="bg-surface border border-border-mid rounded-lg px-3 py-2.5 mb-6 flex items-center gap-3 flex-wrap">
      {court != null && (
        <span className="font-mono text-[10px] tracking-[1px] text-dim bg-base border border-border px-1.5 py-0.5 rounded-sm shrink-0">
          CANCHA #{court}
        </span>
      )}
      <div className="flex items-center gap-2 min-w-0">
        {team1Avatar}
        <div className="flex items-center gap-1.5 font-mono font-bold text-[18px] tabular-nums">
          <span className="text-brand">{score1}</span>
          <span className="text-muted text-[13px] font-normal">—</span>
          <span className="text-cyan">{score2}</span>
        </div>
        {team2Avatar}
      </div>
      <div className="flex items-center gap-2.5 ml-auto">
        {timer}
        <button type="button" onClick={onExpand} title="Expandir"
          className="text-muted cursor-pointer shrink-0 hover:text-white transition-colors">
          <Maximize2 size={17} />
        </button>
      </div>
    </div>
  );
}

// ── Contador +/- ──────────────────────────────────────────────────────────────
export function ScoreCounter({ value, onChange, color = "text-brand" }) {
  const num = Number(value);
  const btnBase = "w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-border-strong bg-surface text-muted text-[18px] sm:text-[22px] flex items-center justify-center shrink-0 transition-colors";
  return (
    <div className="flex items-center gap-2 sm:gap-3 justify-center">
      <button
        className={`${btnBase} ${num <= 0 ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:border-border-strong hover:text-white"}`}
        onClick={() => onChange(Math.max(0, num - 1))}
        disabled={num <= 0}
      >−</button>
      <span className={`font-mono text-[24px] sm:text-[34px] w-8 sm:min-w-10 text-center font-bold shrink-0 ${color}`}>
        {num}
      </span>
      <button
        className={`${btnBase} ${num >= 7 ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:border-current hover:text-white"}`}
        onClick={() => onChange(Math.min(7, num + 1))}
        disabled={num >= 7}
      >+</button>
    </div>
  );
}

// Celda del tablero: el número con sus flechas. Reemplaza al par de botones
// redondos, que a tres sets ocupaban 264px de alto para seis números.
function ScoreCell({ value, onChange, color, disabled = false }) {
  const num = Number(value) || 0;
  const arrow = "w-full h-5 flex items-center justify-center text-muted transition-colors";
  const dead = (cond) => cond || disabled;
  return (
    <div className={`flex flex-col items-center bg-base/40 border border-border rounded-sm py-0.5 ${disabled ? "opacity-35" : ""}`}>
      <button
        type="button"
        onClick={() => onChange(Math.min(7, num + 1))}
        disabled={dead(num >= 7)}
        aria-label="Sumar"
        className={`${arrow} ${dead(num >= 7) ? "opacity-25 cursor-not-allowed" : "cursor-pointer hover:text-white"}`}
      >
        <ChevronUp size={14} />
      </button>
      <span className={`font-mono font-bold text-[21px] leading-none tabular-nums ${color}`}>{num}</span>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, num - 1))}
        disabled={dead(num <= 0)}
        aria-label="Restar"
        className={`${arrow} ${dead(num <= 0) ? "opacity-25 cursor-not-allowed" : "cursor-pointer hover:text-white"}`}
      >
        <ChevronDown size={14} />
      </button>
    </div>
  );
}

// ── Selector de formato + carga del marcador ──────────────────────────────────
// Tablero: una fila por equipo, una columna por set — el mismo formato en que se
// lee después el resultado. Controlado: `onChange` recibe el patch
// { sets_format, sets, score1, score2 }. Lo comparten la liga y el cuadro.
export function SetsScoring({ setsFormat = null, sets = [], score1 = 0, score2 = 0, onChange, row1, row2 }) {
  function pickFormat(fmt) {
    const empty = { s1: 0, s2: 0 };
    const newSets = fmt === 1 ? [empty] : [empty, empty, empty];
    onChange({ sets_format: fmt, sets: newSets, score1: 0, score2: 0 });
  }

  function updateSet(idx, field, val) {
    const next = sets.map((s, i) => i === idx ? { ...s, [field]: val } : s);
    const [s1, s2] = scoreFromSets(setsFormat, next);
    onChange({ sets_format: setsFormat, sets: next, score1: s1, score2: s2 });
  }

  // Los tres sets se muestran desde el principio; los que todavía no se pueden
  // jugar quedan inertes. Ir revelándolos movía la card debajo del dedo.
  const nPlayable  = visibleSetsCount(setsFormat, sets);
  const [sw1, sw2] = setsWon(sets.slice(0, nPlayable));
  const withSets   = setsFormat != null;
  const cols       = setsFormat === 3 ? 3 : 1;

  const cellsFor = (side) => Array.from({ length: cols }, (_, i) => {
    if (!withSets) {
      const v = side === 1 ? score1 : score2;
      return { key: 'simple', value: v, onChange: (x) => onChange({ [`score${side}`]: x }), won: null, off: false };
    }
    const s = sets[i] ?? { s1: 0, s2: 0 };
    return {
      key: i,
      value: side === 1 ? s.s1 : s.s2,
      onChange: (x) => updateSet(i, side === 1 ? 's1' : 's2', x),
      won: setWinner(s) === side,
      off: i >= nPlayable,
    };
  });

  const rowLabel = (content, accent) => (
    <div className={`flex items-center gap-2 min-w-0 pr-1 font-condensed font-semibold text-[14px] ${accent}`}>
      {content}
    </div>
  );

  const grid = { gridTemplateColumns: `minmax(0,1fr) repeat(${cols}, var(--cell))` };

  return (
    <div className="min-w-0">
      <div className="flex gap-2 mb-3">
        {[1, 3].map((fmt) => (
          <button key={fmt} type="button" onClick={() => pickFormat(fmt)}
            className={`px-3 py-1.5 text-[11px] font-mono font-bold tracking-[1.5px] rounded-sm border cursor-pointer transition-colors ${
              setsFormat === fmt
                ? "bg-brand text-base border-brand"
                : "bg-transparent text-muted border-border-mid"
            }`}>
            {fmt === 1 ? "1 SET" : "3 SETS"}
          </button>
        ))}
      </div>

      <div className="grid gap-x-1 sm:gap-x-1.5 gap-y-1.5 items-center [--cell:2.25rem] sm:[--cell:2.75rem]" style={grid}>
        {cols > 1 && (
          <>
            <div />
            {Array.from({ length: cols }, (_, i) => (
              <div key={i} className={`text-center text-[10px] font-mono tracking-widest ${i >= nPlayable ? 'text-dim/40' : 'text-dim'}`}>
                S{i + 1}
              </div>
            ))}
          </>
        )}

        {rowLabel(row1, 'text-brand')}
        {cellsFor(1).map((c, i) => (
          <ScoreCell key={`a${c.key}${i}`} value={c.value} onChange={c.onChange} disabled={c.off}
            color={c.won === false ? 'text-secondary' : 'text-brand'} />
        ))}

        {rowLabel(row2, 'text-cyan')}
        {cellsFor(2).map((c, i) => (
          <ScoreCell key={`b${c.key}${i}`} value={c.value} onChange={c.onChange} disabled={c.off}
            color={c.won === false ? 'text-secondary' : 'text-cyan'} />
        ))}
      </div>

      {setsFormat === 3 && (sw1 >= 2 || sw2 >= 2) && (
        <p className="font-mono text-[11px] text-muted tracking-widest mt-2.5">
          RESULTADO: {sw1} — {sw2} EN SETS
        </p>
      )}
    </div>
  );
}

// ¿El marcador cargado alcanza para guardar? Sin sets, que no sea empate.
function canSaveMatch(form) {
  return form.sets_format
    ? setsResultReady(form.sets_format, form.sets ?? [])
    : form.score1 !== form.score2;
}

// ── Guardar / cancelar ────────────────────────────────────────────────────────
function FormActions({ isEditing, canSave, onSave, onCancel }) {
  return (
    <div className="flex gap-2.5 mt-4">
      <button onClick={onSave} disabled={!canSave}
        className={`text-base border-0 flex-1 py-2.5 font-condensed font-bold text-[13px] tracking-wide rounded-sm ${!canSave ? "bg-border-mid text-muted cursor-not-allowed" : "bg-brand cursor-pointer"}`}>
        {isEditing ? "GUARDAR CAMBIOS" : "REGISTRAR PARTIDO"}
      </button>
      <button onClick={onCancel} className="bg-transparent text-muted border border-border-strong px-3 py-2 text-[12px] cursor-pointer rounded-sm font-sans">
        Cancelar
      </button>
    </div>
  );
}

// ── Recuadro de equipo/pareja (título integrado como encabezado) ────────────────
function TeamBox({ label, accent = "brand", children }) {
  const dot  = accent === "cyan" ? "bg-cyan"   : "bg-brand";
  const text = accent === "cyan" ? "text-cyan" : "text-brand";
  const tint = accent === "cyan" ? "bg-cyan/5" : "bg-brand/5";
  return (
    <div className="flex-1 min-w-35 bg-base/40 border border-border rounded-md overflow-hidden">
      <div className={`flex items-center gap-2 px-2.5 py-2 border-b border-border ${tint}`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
        <span className={`text-[11px] tracking-[2px] font-mono font-bold ${text}`}>{label}</span>
      </div>
      <div className="flex flex-col gap-2 p-2.5">{children}</div>
    </div>
  );
}

// ── Pairs mode ────────────────────────────────────────────────────────────────
function PairsForm({ form, setForm, tournament, isEditing, onSave, onCancel, timerState, onTimerChange, pairMatchCounts, pairMatchLimit }) {
  const { pairs, players } = tournament;
  const removedIds    = new Set(players.filter((p) => p.removed).map((p) => p.id));
  const selectablePairs = pairs.filter((p) => !removedIds.has(p.p1) && !removedIds.has(p.p2));
  const showCounts = !isEditing && pairMatchCounts && pairMatchLimit;

  function pairOptionLabel(pairId) {
    const base = getPairLabel(pairId, pairs, players);
    if (!showCounts) return base;
    const count = pairMatchCounts[pairId] ?? 0;
    return `${base} · ${count}/${pairMatchLimit} PJ`;
  }

  function isAtLimit(pairId) {
    if (!showCounts) return false;
    return (pairMatchCounts[pairId] ?? 0) >= pairMatchLimit;
  }

  function pairAvatarFor(pairId, size = 42) {
    const pair = pairs.find((p) => p.id === pairId);
    if (!pair) return null;
    const p1 = players.find((pl) => pl.id === pair.p1);
    const p2 = players.find((pl) => pl.id === pair.p2);
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

  const [minimized, setMinimized] = useState(false);
  const teamsComplete = !!form.team1Pair && !!form.team2Pair;
  const timerEl = !isEditing && teamsComplete
    ? <Timer timerState={timerState} onTimerChange={onTimerChange} onStop={(s) => setForm((f) => ({ ...f, duration_seconds: s ?? null }))} />
    : null;

  const isDirty = !!(form.team1Pair || form.team2Pair || timerState?.startedAt != null
    || form.sets_format != null || form.score1 || form.score2 || form.court != null);
  const { requestCancel, cancelModal } = useCancelGuard({ isDirty, isEditing, onCancel });
  const canMinimize = teamsComplete && !isEditing;

  if (minimized && canMinimize) {
    return (
      <MinimizedMatch
        team1Avatar={pairAvatarFor(form.team1Pair, 28)}
        team2Avatar={pairAvatarFor(form.team2Pair, 28)}
        score1={form.score1} score2={form.score2}
        court={form.court}
        timer={timerEl}
        onExpand={() => setMinimized(false)}
      />
    );
  }

  return (
    <div className="bg-surface border border-border-mid rounded-lg p-5 mb-6">
      {cancelModal}
      <MatchCardHeader isEditing={isEditing} onCancel={requestCancel} timer={timerEl}
        onMinimize={canMinimize ? () => setMinimized(true) : undefined} />
      <div className={teamsComplete ? "grid gap-x-5 gap-y-4 sm:grid-cols-2 items-start" : ""}>
        <div className="flex flex-col gap-3 min-w-0">
          <div className={`flex gap-3 flex-wrap ${teamsComplete ? "sm:flex-col" : ""}`}>
            <TeamBox label="PAREJA 1" accent="brand">
              <select className="w-full min-w-0 bg-base border border-border-mid text-content px-3 py-2.25 font-sans text-[13px] rounded-sm outline-none"
                value={form.team1Pair || ""} onChange={(e) => setForm({ ...form, team1Pair: e.target.value })}>
                <option value="">Seleccionar pareja</option>
                {selectablePairs.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={p.id === form.team2Pair || (isAtLimit(p.id) && p.id !== form.team1Pair)}
                  >
                    {pairOptionLabel(p.id)}
                  </option>
                ))}
              </select>
            </TeamBox>
            <TeamBox label="PAREJA 2" accent="cyan">
              <select className="w-full min-w-0 bg-base border border-border-mid text-content px-3 py-2.25 font-sans text-[13px] rounded-sm outline-none"
                value={form.team2Pair || ""} onChange={(e) => setForm({ ...form, team2Pair: e.target.value })}>
                <option value="">Seleccionar pareja</option>
                {selectablePairs.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={p.id === form.team1Pair || (isAtLimit(p.id) && p.id !== form.team2Pair)}
                  >
                    {pairOptionLabel(p.id)}
                  </option>
                ))}
              </select>
            </TeamBox>
          </div>
          {teamsComplete && tournamentCourts(tournament) > 1 && (
            <CourtSelector courts={tournamentCourts(tournament)} value={form.court} onChange={(v) => setForm({ ...form, court: v })} />
          )}
        </div>

        {teamsComplete && (
          <SetsScoring
            setsFormat={form.sets_format} sets={form.sets ?? []}
            score1={form.score1} score2={form.score2}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            row1={<>{pairAvatarFor(form.team1Pair, 24)}<span className="truncate">{getPairLabel(form.team1Pair, pairs, players)}</span></>}
            row2={<>{pairAvatarFor(form.team2Pair, 24)}<span className="truncate">{getPairLabel(form.team2Pair, pairs, players)}</span></>}
          />
        )}
      </div>
      {teamsComplete && (
        <FormActions isEditing={isEditing} canSave={canSaveMatch(form)} onSave={onSave} onCancel={requestCancel} />
      )}
    </div>
  );
}

// ── Free mode ─────────────────────────────────────────────────────────────────
function FreeForm({ form, setForm, tournament, isEditing, onSave, onCancel, timerState, onTimerChange }) {
  const { players } = tournament;
  const selectablePlayers = players.filter((p) => !p.removed);
  const allSelected = [...form.team1, ...form.team2].filter(Boolean);

  function updateTeam(side, index, value) {
    const updated = [...form[side]];
    updated[index] = value;
    setForm({ ...form, [side]: updated });
  }

  const [minimized, setMinimized] = useState(false);
  const teamsComplete = !!(form.team1[0] && form.team1[1] && form.team2[0] && form.team2[1]);
  const timerEl = !isEditing && teamsComplete
    ? <Timer timerState={timerState} onTimerChange={onTimerChange} onStop={(s) => setForm((f) => ({ ...f, duration_seconds: s ?? null }))} />
    : null;

  const isDirty = !!(allSelected.length || timerState?.startedAt != null
    || form.sets_format != null || form.score1 || form.score2 || form.court != null);
  const { requestCancel, cancelModal } = useCancelGuard({ isDirty, isEditing, onCancel });

  const teamNames = (ids) =>
    ids.map((id) => players.find((p) => p.id === id)?.name ?? "?").join(" & ");

  function teamAvatars(ids, size = 42) {
    const p1 = players.find((p) => p.id === ids[0]);
    const p2 = players.find((p) => p.id === ids[1]);
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

  const canMinimize = teamsComplete && !isEditing;
  if (minimized && canMinimize) {
    return (
      <MinimizedMatch
        team1Avatar={teamAvatars(form.team1, 28)}
        team2Avatar={teamAvatars(form.team2, 28)}
        score1={form.score1} score2={form.score2}
        court={form.court}
        timer={timerEl}
        onExpand={() => setMinimized(false)}
      />
    );
  }

  return (
    <div className="bg-surface border border-border-mid rounded-lg p-5 mb-6">
      {cancelModal}
      <MatchCardHeader isEditing={isEditing} onCancel={requestCancel} timer={timerEl}
        onMinimize={canMinimize ? () => setMinimized(true) : undefined} />
      <div className={teamsComplete ? "grid gap-x-5 gap-y-4 sm:grid-cols-2 items-start" : ""}>
        <div className="flex flex-col gap-3 min-w-0">
          <div className={`flex gap-3 flex-wrap ${teamsComplete ? "sm:flex-col" : ""}`}>
            <TeamBox label="EQUIPO 1" accent="brand">
              {[0, 1].map((i) => (
                <select key={i} className="w-full min-w-0 bg-base border border-border-mid text-content px-3 py-2.25 font-sans text-[13px] rounded-sm outline-none"
                  value={form.team1[i]} onChange={(e) => updateTeam("team1", i, e.target.value)}>
                  <option value="">Jugador {i + 1}</option>
                  {selectablePlayers.map((p) => (
                    <option key={p.id} value={p.id} disabled={allSelected.includes(p.id) && form.team1[i] !== p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ))}
            </TeamBox>
            <TeamBox label="EQUIPO 2" accent="cyan">
              {[0, 1].map((i) => (
                <select key={i} className="w-full min-w-0 bg-base border border-border-mid text-content px-3 py-2.25 font-sans text-[13px] rounded-sm outline-none"
                  value={form.team2[i]} onChange={(e) => updateTeam("team2", i, e.target.value)}>
                  <option value="">Jugador {i + 1}</option>
                  {selectablePlayers.map((p) => (
                    <option key={p.id} value={p.id} disabled={allSelected.includes(p.id) && form.team2[i] !== p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ))}
            </TeamBox>
          </div>
          {teamsComplete && tournamentCourts(tournament) > 1 && (
            <CourtSelector courts={tournamentCourts(tournament)} value={form.court} onChange={(v) => setForm({ ...form, court: v })} />
          )}
        </div>

        {teamsComplete && (
          <SetsScoring
            setsFormat={form.sets_format} sets={form.sets ?? []}
            score1={form.score1} score2={form.score2}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            row1={<>{teamAvatars(form.team1, 24)}<span className="truncate">{teamNames(form.team1)}</span></>}
            row2={<>{teamAvatars(form.team2, 24)}<span className="truncate">{teamNames(form.team2)}</span></>}
          />
        )}
      </div>
      {teamsComplete && (
        <FormActions isEditing={isEditing} canSave={canSaveMatch(form)} onSave={onSave} onCancel={requestCancel} />
      )}
    </div>
  );
}

export default function MatchForm(props) {
  return props.tournament.mode === "pairs"
    ? <PairsForm {...props} />
    : <FreeForm  {...props} />;
}
