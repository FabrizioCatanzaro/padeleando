/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from "react";
import { expandPair, emptyForm, localDateStr, getPairLabel, visibleSetsCount, scoreFromSets, pairKeyOf, AMERICANO_MIN_PAIRS } from "../../utils/helpers";
import MatchCard from "../Matches/MatchCard";
import MatchForm from "../Matches/MatchForm";
import ScheduledCard from "../Matches/ScheduledCard";
import ScheduleForm from "../Matches/ScheduleForm";
import Modal from "../shared/Modal";
import ShareFixtureModal from "../shared/ShareFixtureModal";
import { Share2, Trash2, Dices, CalendarPlus, Check } from "lucide-react";

const EMPTY_TIMER = { startedAt: null, stoppedAt: null };
const getLiveKey  = (id) => `live_${id}`;
const genId       = () => Math.random().toString(36).slice(2, 7);

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

function findPlayedMatch(tournament, entry) {
  const pair1 = tournament.pairs.find(p => p.id === entry.team1.id);
  const pair2 = tournament.pairs.find(p => p.id === entry.team2.id);
  if (!pair1 || !pair2) return null;
  const ids1 = new Set([pair1.p1, pair1.p2]);
  const ids2 = new Set([pair2.p1, pair2.p2]);
  return tournament.matches.find(m => {
    const mt1 = new Set(m.team1);
    const mt2 = new Set(m.team2);
    return (setsEqual(mt1, ids1) && setsEqual(mt2, ids2))
        || (setsEqual(mt1, ids2) && setsEqual(mt2, ids1));
  }) ?? null;
}

export default function Previa({
  tournament, isOwner, categoryName, myPlayerIds = [],
  onAddMatch, onEditMatch, onDeleteMatch, onSetLiveMatch,
  onAddScheduled, onEditScheduled, onDeleteScheduled,
  onGenerateSchedule, onGenerateBracket,
}) {
  const SCHEDULE_KEY = `previa_schedule_${tournament.id}`;

  const [schedule, setSchedule] = useState(() => {
    try {
      const raw = localStorage.getItem(SCHEDULE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [showSchedule,      setShowSchedule]      = useState(true);
  const [generating,        setGenerating]        = useState(false);
  const [generatingBracket, setGeneratingBracket] = useState(false);

  // ── Match management (mirrors Matches.jsx) ──────────────────────────────────
  const [liveMatches, setLiveMatches] = useState(() => {
    try {
      const raw = localStorage.getItem(getLiveKey(tournament.id));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [{ id: genId(), ...parsed }];
      return parsed;
    } catch { return []; }
  });

  const [editId,       setEditId]       = useState(null);
  const [editForm,     setEditForm]     = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmClearSchedule, setConfirmClearSchedule] = useState(false);
  const [shareFixture, setShareFixture] = useState(false);
  // Programar un partido nuevo de la previa, o editar la programación de uno.
  const [scheduling, setScheduling] = useState(null);
  const [confirmUnschedule, setConfirmUnschedule] = useState(null);

  useEffect(() => {
    const key = getLiveKey(tournament.id);
    if (liveMatches.length > 0) localStorage.setItem(key, JSON.stringify(liveMatches));
    else                        localStorage.removeItem(key);
  }, [liveMatches, tournament.id]);

  function resolveTeamLabels(form) {
    const { players, pairs } = tournament;
    return {
      team1Label: getPairLabel(form.team1Pair, pairs, players),
      team2Label: getPairLabel(form.team2Pair, pairs, players),
      court: form.court ?? null,
    };
  }

  function buildLivePayload(matches) {
    return matches
      .filter((m) => !!(m.form.team1Pair && m.form.team2Pair))
      .map((m) => ({ ...resolveTeamLabels(m.form), phase: 'previa', startedAt: m.timer.startedAt }));
  }

  // Sincroniza live_match sólo si el payload cambió. Incluye partidos "cargados"
  // (parejas elegidas) aunque el cronómetro no haya arrancado — el espectador los
  // separa en EN VIVO (startedAt != null) y PRÓXIMOS (startedAt == null).
  // Inicializamos el ref con el payload actual para no sincronizar en el montaje.
  const lastSyncedRef = useRef(undefined);
  if (lastSyncedRef.current === undefined) {
    lastSyncedRef.current = JSON.stringify(buildLivePayload(liveMatches));
  }
  function syncLive(matches) {
    const payload = buildLivePayload(matches);
    const serialized = JSON.stringify(payload);
    if (serialized === lastSyncedRef.current) return Promise.resolve();
    lastSyncedRef.current = serialized;
    return Promise.resolve(onSetLiveMatch?.(payload.length > 0 ? payload : null));
  }

  useEffect(() => {
    syncLive(liveMatches);
  }, [liveMatches]);

  function handleTimerChange(liveId, newTimerState) {
    setLiveMatches(prev => prev.map(m => m.id === liveId ? { ...m, timer: newTimerState } : m));
  }

  function handleFormChange(liveId, updater) {
    setLiveMatches(prev => prev.map(m => {
      if (m.id !== liveId) return m;
      const newForm = typeof updater === "function" ? updater(m.form) : updater;
      return { ...m, form: newForm };
    }));
  }

  function addNewMatch(prefilledPairs = {}) {
    setLiveMatches(prev => [...prev, { id: genId(), form: { ...emptyForm(), ...prefilledPairs }, timer: EMPTY_TIMER }]);
  }

  function handleCancelMatch(liveId) {
    const cancelado = liveMatches.find(m => m.id === liveId);
    const remaining = liveMatches.filter(m => m.id !== liveId);
    setLiveMatches(remaining);
    syncLive(remaining);
    // "Empezar ahora" anota el partido en el fixture para que sobreviva a cerrar
    // la tarjeta. Si el que cierra es quien lo anotó, se deshace.
    if (cancelado?.form?.scheduledCreado && cancelado.form.scheduledId) {
      onDeleteScheduled?.(cancelado.form.scheduledId);
    }
  }

  /**
   * Empezar un partido que nadie programó: lo anota en el fixture y arranca el
   * cronómetro, para que sobreviva a cerrar la tarjeta.
   */
  async function empezarAhora(liveId) {
    const lm = liveMatches.find(m => m.id === liveId);
    if (!lm) return;
    if (lm.timer?.startedAt != null || lm.form?.scheduledId) return;
    const { form } = lm;
    if (!form.team1Pair || !form.team2Pair) return;
    const team1 = expandPair(form.team1Pair, tournament.pairs);
    const team2 = expandPair(form.team2Pair, tournament.pairs);

    let scheduledId = null;
    try {
      scheduledId = (await onAddScheduled?.({
        team1, team2, court: form.court ?? null, scheduled_at: null,
      }))?.id ?? null;
    } catch {
      // Si no se pudo anotar, igual arranca: el cronómetro es lo urgente.
    }
    setLiveMatches(prev => prev.map(m => (m.id === liveId ? {
      ...m,
      form: { ...m.form, scheduledId: scheduledId ?? m.form.scheduledId ?? null, scheduledCreado: !!scheduledId },
      timer: { startedAt: Date.now(), stoppedAt: null },
    } : m)));
  }


  /**
   * Lo mismo que Empezar ahora, pero sin arrancar el cronómetro: el partido se
   * anota en el fixture y la tarjeta se cierra. Es la salida para cuando abriste
   * NUEVO PARTIDO y en realidad lo querías para más tarde.
   */
  async function programarDesdeForm(liveId) {
    const lm = liveMatches.find(m => m.id === liveId);
    if (!lm || lm.timer?.startedAt != null || lm.form?.scheduledId) return;
    const { form } = lm;
    if (!form.team1Pair || !form.team2Pair) return;
    const team1 = expandPair(form.team1Pair, tournament.pairs);
    const team2 = expandPair(form.team2Pair, tournament.pairs);

    await onAddScheduled?.({ team1, team2, court: form.court ?? null, scheduled_at: null });
    const remaining = liveMatches.filter(m => m.id !== liveId);
    setLiveMatches(remaining);
    syncLive(remaining);
  }

  /**
   * Abre un partido del fixture como partido en curso. `arrancar` decide si el
   * cronómetro sale corriendo.
   */
  function abrirProgramado(sm, arrancar) {
    if (liveMatches.some(m => m.form?.scheduledId === sm.id)) return;
    const buscar = (team) => tournament.pairs.find(
      p => (p.p1 === team[0] && p.p2 === team[1]) || (p.p1 === team[1] && p.p2 === team[0]),
    )?.id ?? '';
    setLiveMatches(prev => [...prev, {
      id: genId(),
      form: {
        ...emptyForm(),
        team1Pair: buscar(sm.team1), team2Pair: buscar(sm.team2),
        court: sm.court ?? null, scheduledId: sm.id,
      },
      timer: arrancar ? { startedAt: Date.now(), stoppedAt: null } : EMPTY_TIMER,
    }]);
  }

  async function handleSaveMatch(liveId) {
    const liveMatch = liveMatches.find(m => m.id === liveId);
    if (!liveMatch) return;
    const { form } = liveMatch;

    // A 1 set el marcador son los juegos de ese set; a 3, los sets ganados.
    // Antes acá se leía siempre el primer set y los sets no se guardaban: un
    // partido a tres sets de la previa quedaba registrado como si fuera a uno.
    let s1, s2;
    if (form.sets_format) {
      [s1, s2] = scoreFromSets(form.sets_format, form.sets ?? []);
    } else {
      s1 = parseInt(form.score1);
      s2 = parseInt(form.score2);
    }

    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) return alert("Ingresá un marcador válido");
    if (!form.team1Pair || !form.team2Pair) return alert("Seleccioná las dos parejas");
    const team1 = expandPair(form.team1Pair, tournament.pairs);
    const team2 = expandPair(form.team2Pair, tournament.pairs);
    const nv = form.sets_format ? visibleSetsCount(form.sets_format, form.sets) : 0;

    // Si el cronómetro está corriendo, detenerlo y calcular la duración
    let duration = form.duration_seconds;
    if (liveMatch.timer.startedAt !== null && liveMatch.timer.stoppedAt === null) {
      duration = Math.floor((Date.now() - liveMatch.timer.startedAt) / 1000);
    }

    const matchData = {
      team1, team2, score1: s1, score2: s2, date: form.date,
      duration_seconds: duration, court: form.court ?? null,
      sets_format: form.sets_format ?? null,
      sets: nv > 0 ? (form.sets ?? []).slice(0, nv) : [],
      // Si salió del fixture, el backend lo saca de ahí al registrarlo.
      scheduledId: form.scheduledId ?? null,
    };

    const remaining = liveMatches.filter(m => m.id !== liveId);
    if (remaining.length === 0) localStorage.removeItem(getLiveKey(tournament.id));
    else                        localStorage.setItem(getLiveKey(tournament.id), JSON.stringify(remaining));
    setLiveMatches(remaining);

    // Sincronizar live_match en el servidor ANTES del reload para que el
    // tournament recargado no traiga el partido en curso viejo. Fijamos el ref
    // para que el efecto no vuelva a sincronizar el mismo payload.
    const payload = buildLivePayload(remaining);
    lastSyncedRef.current = JSON.stringify(payload);
    await onSetLiveMatch?.(payload.length > 0 ? payload : null);

    await onAddMatch(matchData);
  }

  async function handleSaveEdit() {
    if (!editId || !editForm) return;

    let s1, s2;
    if (editForm.sets_format && editForm.sets?.[0]) {
      s1 = parseInt(editForm.sets[0].s1);
      s2 = parseInt(editForm.sets[0].s2);
    } else {
      s1 = parseInt(editForm.score1);
      s2 = parseInt(editForm.score2);
    }

    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) return alert("Ingresá un marcador válido");
    if (!editForm.team1Pair || !editForm.team2Pair) return alert("Seleccioná las dos parejas");
    const team1 = expandPair(editForm.team1Pair, tournament.pairs);
    const team2 = expandPair(editForm.team2Pair, tournament.pairs);
    const nv = editForm.sets_format ? visibleSetsCount(editForm.sets_format, editForm.sets) : 0;
    await onEditMatch(editId, { team1, team2, score1: s1, score2: s2, date: editForm.date, duration_seconds: editForm.duration_seconds ?? null, sets_format: editForm.sets_format ?? null, sets: nv > 0 ? (editForm.sets ?? []).slice(0, nv) : [], court: editForm.court ?? null });
    setEditId(null);
    setEditForm(null);
  }

  function handleEdit(m) {
    const pair1 = tournament.pairs?.find(
      p => (p.p1 === m.team1[0] && p.p2 === m.team1[1]) || (p.p1 === m.team1[1] && p.p2 === m.team1[0])
    );
    const pair2 = tournament.pairs?.find(
      p => (p.p1 === m.team2[0] && p.p2 === m.team2[1]) || (p.p1 === m.team2[1] && p.p2 === m.team2[0])
    );
    setEditForm({
      ...emptyForm(),
      team1Pair: pair1?.id ?? "",
      team2Pair: pair2?.id ?? "",
      score1: String(m.score1),
      score2: String(m.score2),
      date: m.date || localDateStr(),
      duration_seconds: m.duration_seconds ?? null,
      sets_format: m.sets_format ?? null,
      sets: m.sets ?? [],
      court: m.court ?? null,
    });
    setEditId(m.id);
  }

  async function handleDelete(id) {
    setConfirmDelete(id);
  }

  // ── Schedule generation ──────────────────────────────────────────────────────
  async function handleGenerateSchedule() {
    setGenerating(true);
    try {
      const sched = await onGenerateSchedule();
      setSchedule(sched);
    } finally {
      setGenerating(false);
    }
  }

  // Borra el calendario sugerido. Es sólo una guía local: los partidos ya
  // registrados no se tocan.
  function handleClearSchedule() {
    localStorage.removeItem(SCHEDULE_KEY);
    setSchedule(null);
    setShowSchedule(true);
  }

  async function handleGenerateBracket() {
    setGeneratingBracket(true);
    try { await onGenerateBracket(); }
    finally { setGeneratingBracket(false); }
  }

  // ── Derived state ────────────────────────────────────────────────────────────
  const allSchedulePlayed = schedule &&
    schedule.every(entry => findPlayedMatch(tournament, entry) !== null);

  const sorted = [...tournament.matches].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Contar PJ por pareja (usando el mismo matching de player IDs que findPlayedMatch)
  const pairMatchCounts = {};
  tournament.pairs.forEach(p => { pairMatchCounts[p.id] = 0; });
  tournament.matches.forEach(m => {
    const mt1 = new Set(m.team1);
    const mt2 = new Set(m.team2);
    for (const p of tournament.pairs) {
      const ps = new Set([p.p1, p.p2]);
      if (setsEqual(ps, mt1) || setsEqual(ps, mt2)) pairMatchCounts[p.id]++;
    }
  });

  const MAX_PREVIA_MATCHES = 2;

  // Los ids del fixture abiertos ahora mismo en un formulario: mientras se están
  // cargando no siguen figurando como "por jugar".
  const idsAbiertos = new Set(liveMatches.map(m => m.form?.scheduledId).filter(Boolean));
  const programados = (tournament.scheduled_matches ?? []).filter(sm => !idsAbiertos.has(sm.id));
  const esMio = (sm) => myPlayerIds.length > 0
    && [...sm.team1, ...sm.team2].some(id => myPlayerIds.includes(id));

  // Para el tope de la previa, un partido programado ya ocupa uno de los dos
  // lugares: si no contara, se podrían programar tres para la misma pareja.
  // `pairMatchCounts` (sólo jugados) sigue mandando en si la previa terminó,
  // porque el cuadro se arma con resultados, no con promesas.
  const cuposUsados = { ...pairMatchCounts };
  for (const sm of tournament.scheduled_matches ?? []) {
    for (const equipo of [sm.team1, sm.team2]) {
      const clave = pairKeyOf(equipo);
      const par = tournament.pairs.find(p => pairKeyOf([p.p1, p.p2]) === clave);
      if (par) cuposUsados[par.id] = (cuposUsados[par.id] ?? 0) + 1;
    }
  }

  // Partido en curso (cargado en liveMatches) que corresponde a una entrada del calendario
  function findLiveForEntry(entry) {
    const t1 = String(entry.team1.id), t2 = String(entry.team2.id);
    return liveMatches.find(m => {
      const a = String(m.form.team1Pair), b = String(m.form.team2Pair);
      return (a === t1 && b === t2) || (a === t2 && b === t1);
    }) ?? null;
  }

  // ¿Hay algún partido con el cronómetro corriendo? → bloquea regenerar el calendario
  const anyLiveRunning = liveMatches.some(m => m.timer.startedAt !== null && m.timer.stoppedAt === null);

  // La previa se agota cuando quedan menos de 2 parejas con cupo: un partido
  // necesita dos, así que con una sola libre tampoco hay nada que generar.
  const pairsWithSlot  = tournament.pairs.filter(p => pairMatchCounts[p.id] < MAX_PREVIA_MATCHES);
  const previaComplete = tournament.pairs.length > 0 && pairsWithSlot.length < 2;

  // Va dentro del aviso de previa completa o al final de la lista, nunca en los
  // dos: en el aviso al tamaño de los botones de acción, al final como CTA.
  const bracketButton = (cls) => (
    <button
      onClick={handleGenerateBracket}
      disabled={generatingBracket}
      className={`bg-brand text-base border-0 font-condensed rounded-sm cursor-pointer disabled:opacity-60 ${cls}`}
    >
      {generatingBracket ? 'GENERANDO...' : 'GENERAR CUADRO'}
    </button>
  );

  // Borrador: todavía no hay parejas suficientes para jugar el americano.
  // No se puede generar calendario, cargar partidos ni generar el cuadro.
  const pairCount   = tournament.pairs.length;
  const isDraft     = pairCount < AMERICANO_MIN_PAIRS;
  const missingPairs = AMERICANO_MIN_PAIRS - pairCount;

  return (
    <div>
      {confirmDelete && (
        <Modal
          title="Eliminar partido"
          message="¿Estás seguro que querés eliminar este partido? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          confirmDanger
          onConfirm={async () => { setConfirmDelete(null); await onDeleteMatch(confirmDelete); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {confirmClearSchedule && (
        <Modal
          title="Eliminar calendario sugerido"
          message="El calendario es sólo una guía: los partidos ya registrados no se borran. Podés volver a generar uno con el botón del dado."
          confirmText="Eliminar"
          confirmDanger
          onConfirm={() => { handleClearSchedule(); setConfirmClearSchedule(false); }}
          onCancel={() => setConfirmClearSchedule(false)}
        />
      )}
      {confirmUnschedule && (
        <Modal
          title="Sacar del fixture"
          message="El partido deja de estar programado. No se borra ningún resultado, porque todavía no se jugó."
          confirmText="Sacar"
          confirmDanger
          onConfirm={async () => { const id = confirmUnschedule; setConfirmUnschedule(null); await onDeleteScheduled(id); }}
          onCancel={() => setConfirmUnschedule(null)}
        />
      )}
      {shareFixture && (
        <ShareFixtureModal
          tournament={tournament}
          matches={tournament.matches}
          categoryName={categoryName}
          onClose={() => setShareFixture(false)}
        />
      )}
      {/* Header */}
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="font-condensed font-bold text-[16px] tracking-[3px] text-muted">FASE PREVIA</div>
        <div className="flex gap-2 flex-wrap">
          {sorted.length > 0 && (
            <button
              onClick={() => setShareFixture(true)}
              title="Compartir partidos"
              aria-label="Compartir partidos"
              className="bg-transparent text-muted border border-border-strong px-3 py-2.5 cursor-pointer rounded-sm hover:text-white transition-colors"
            >
              <Share2 size={15} />
            </button>
          )}
          {isOwner && !isDraft && (
            <>
              <button
                onClick={handleGenerateSchedule}
                disabled={generating || anyLiveRunning || previaComplete}
                title={previaComplete ? 'Todas las parejas ya jugaron sus partidos de la fase previa'
                     : anyLiveRunning ? 'No se puede regenerar el calendario con un partido en vivo'
                     : 'Generar calendario al azar'}
                aria-label="Generar calendario al azar"
                className="bg-transparent text-muted border border-border-strong px-3 py-2.5 cursor-pointer rounded-sm hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Dices size={15} className={generating ? 'animate-spin' : undefined} />
              </button>
              <button
                onClick={() => setScheduling({ nuevo: true })}
                disabled={previaComplete}
                title={previaComplete ? 'Todas las parejas ya jugaron sus partidos de la fase previa' : 'Programar un partido'}
                className="inline-flex items-center gap-2 bg-transparent text-content border border-border-strong px-3.5 py-2.5 font-sans text-[12.5px] cursor-pointer rounded-sm hover:text-white hover:border-soft transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CalendarPlus size={14} /> Programar
              </button>
              <button
                onClick={() => addNewMatch()}
                disabled={previaComplete}
                title={previaComplete ? 'Todas las parejas ya jugaron sus partidos de la fase previa' : undefined}
                className="bg-brand text-base border-0 px-5 py-2.5 font-condensed font-bold text-[13px] tracking-wide cursor-pointer rounded-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + NUEVO PARTIDO
              </button>
            </>
          )}
        </div>
      </div>

      {/* Aviso de borrador — sin el mínimo de parejas no se puede jugar */}
      {isDraft && (
        <div className="bg-surface border border-brand/30 rounded-lg p-4 mb-5">
          <div className="font-condensed font-bold text-[13px] tracking-[2px] text-brand mb-1.5">BORRADOR</div>
          <p className="text-soft font-sans text-[13px] leading-relaxed">
            Hay <strong className="text-white">{pairCount} {pairCount === 1 ? 'pareja' : 'parejas'}</strong> y
            el americano necesita <strong className="text-white">{AMERICANO_MIN_PAIRS}</strong> para arrancar —
            falta{missingPairs === 1 ? '' : 'n'} <strong className="text-white">{missingPairs}</strong>.
          </p>
          <p className="text-muted font-mono text-[12px] leading-relaxed mt-2">
            {isOwner
              ? 'Sumá los jugadores y armá las parejas desde GESTIÓN. Al llegar al mínimo se habilitan el calendario, los partidos y el cuadro.'
              : 'El organizador todavía está armando las parejas.'}
          </p>
        </div>
      )}

      {/* Previa agotada — el siguiente paso es el cuadro */}
      {previaComplete && !isDraft && !tournament.bracket && (
        <div className="bg-surface border border-brand/30 rounded-lg p-4 mb-5">
          <div className="font-condensed font-bold text-[13px] tracking-[2px] text-brand mb-1.5">FASE PREVIA COMPLETA</div>
          <p className="text-soft font-sans text-[13px] leading-relaxed">
            Las <strong className="text-white">{tournament.pairs.length} parejas</strong> ya jugaron
            sus {MAX_PREVIA_MATCHES} partidos: no quedan cruces por generar.
          </p>
          <p className="text-muted font-mono text-[12px] leading-relaxed mt-2">
            {isOwner
              ? 'Las posiciones de esta fase definen los cruces del cuadro eliminatorio.'
              : 'El organizador ya puede generar el cuadro eliminatorio.'}
          </p>
          {isOwner && bracketButton('mt-4 px-5 py-2.5 font-bold text-[13px] tracking-wide')}
        </div>
      )}

      {/* Schedule guide */}
      {schedule && !isDraft && (
        <div className="mb-5 bg-surface border border-border-mid rounded-lg overflow-hidden">
          <div
            className="flex items-center justify-between gap-2 px-4 py-2.5 cursor-pointer"
            onClick={() => setShowSchedule(v => !v)}
          >
            <div className="text-[11px] tracking-[2px] text-brand font-mono">CALENDARIO SUGERIDO</div>
            <div className="flex items-center gap-3">
              {isOwner && (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmClearSchedule(true); }}
                  title="Eliminar el calendario sugerido"
                  className="bg-transparent border-0 text-muted cursor-pointer p-0 leading-none hover:text-danger transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <span className="text-muted text-[11px] font-mono">{showSchedule ? '▲' : '▼'}</span>
            </div>
          </div>
          {showSchedule && (
            <div className="border-t border-border px-4 pb-3 pt-2">
              {[...new Set(schedule.map(e => e.round))].sort().map(round => (
                <div key={round}>
                  <div className="text-[10px] tracking-[1px] text-muted font-mono mb-1.5 mt-2">RONDA {round}</div>
                  <div className="flex flex-col gap-1.5">
                    {schedule.filter(e => e.round === round).map(entry => {
                      const played  = findPlayedMatch(tournament, entry);
                      const key     = `${entry.team1.id}_${entry.team2.id}_r${entry.round}`;
                      const win1    = played && parseInt(played.score1) > parseInt(played.score2);
                      const live    = played ? null : findLiveForEntry(entry);
                      const liveRunning = !!live && live.timer.startedAt !== null && live.timer.stoppedAt === null;
                      const canLoad = !played && !live
                        && (pairMatchCounts[entry.team1.id] ?? 0) < 2
                        && (pairMatchCounts[entry.team2.id] ?? 0) < 2;
                      return (
                        <div key={key} className="flex items-center gap-2 py-1.5">
                          <span className={`flex-1 font-condensed font-semibold text-[14px] ${played ? (win1 ? 'text-brand' : 'text-muted') : 'text-white'}`}>
                            {entry.team1.name}
                          </span>
                          {played ? (
                            <span className="font-condensed font-black text-[17px] flex items-center gap-1 shrink-0">
                              <span className={win1 ? 'text-brand' : 'text-muted'}>{played.score1}</span>
                              <span className="text-border-strong text-[13px]">—</span>
                              <span className={!win1 ? 'text-cyan' : 'text-muted'}>{played.score2}</span>
                            </span>
                          ) : liveRunning ? (
                            <span className="shrink-0 flex items-center gap-1.5 font-mono font-bold text-[10px] tracking-[1px] text-green bg-green/10 border border-green/30 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
                              EN VIVO
                            </span>
                          ) : live ? (
                            <span className="shrink-0 font-mono text-[10px] tracking-[1px] text-muted bg-base border border-border px-2 py-0.5 rounded-full">
                              cargado
                            </span>
                          ) : (
                            <>
                              <span className="text-border-strong font-condensed text-[13px] shrink-0">vs</span>
                              {isOwner && canLoad && (
                                <button
                                  onClick={() => addNewMatch({ team1Pair: entry.team1.id, team2Pair: entry.team2.id })}
                                  className="shrink-0 bg-surface-alt border border-border-strong text-muted px-2 py-0.5 font-condensed font-bold text-[11px] tracking-wide cursor-pointer rounded-sm hover:text-white"
                                >
                                  + cargar
                                </button>
                              )}
                            </>
                          )}
                          <span className={`flex-1 font-condensed font-semibold text-[14px] text-right ${played ? (!win1 ? 'text-cyan' : 'text-muted') : 'text-white'}`}>
                            {entry.team2.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit form */}
      {editId && editForm && (
        <MatchForm
          form={editForm} setForm={setEditForm}
          tournament={tournament}
          onSave={handleSaveEdit}
          onCancel={() => { setEditId(null); setEditForm(null); }}
          isEditing={true}
          timerState={EMPTY_TIMER}
          onTimerChange={() => {}}
        />
      )}

      {/* Live match forms */}
      {liveMatches.map(liveMatch => (
        <MatchForm
          key={liveMatch.id}
          form={liveMatch.form}
          setForm={updater => handleFormChange(liveMatch.id, updater)}
          tournament={tournament}
          pairMatchCounts={cuposUsados}
          pairMatchLimit={MAX_PREVIA_MATCHES}
          onSave={() => handleSaveMatch(liveMatch.id)}
          onCancel={() => handleCancelMatch(liveMatch.id)}
          onEmpezar={() => empezarAhora(liveMatch.id)}
          onProgramar={() => programarDesdeForm(liveMatch.id)}
          isEditing={false}
          timerState={liveMatch.timer}
          onTimerChange={newTimer => handleTimerChange(liveMatch.id, newTimer)}
        />
      ))}

      {/* Programar: equipos, cancha y hora, sin resultado. */}
      {scheduling && (
        <ScheduleForm
          tournament={tournament}
          scheduled={scheduling.nuevo ? null : scheduling}
          onSave={async (data) => {
            if (scheduling.nuevo) await onAddScheduled(data);
            else await onEditScheduled(scheduling.id, data);
            setScheduling(null);
          }}
          onCancel={() => setScheduling(null)}
        />
      )}

      {/* PRÓXIMOS — el fixture de la previa. Para el que viene a jugar es la
          respuesta a "¿contra quién y en qué cancha?". */}
      {programados.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2.5 mb-2.5">
            <span className="font-condensed font-bold text-[11px] tracking-[0.15em] text-muted shrink-0">PRÓXIMOS</span>
            <span className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-dim shrink-0">
              {programados.length} {programados.length === 1 ? 'programado' : 'programados'}
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            {programados.map(sm => (
              <ScheduledCard
                key={sm.id}
                match={sm}
                tournament={tournament}
                isOwner={isOwner}
                esMio={esMio(sm)}
                onEmpezar={() => abrirProgramado(sm, true)}
                onCargar={() => abrirProgramado(sm, false)}
                onEdit={() => setScheduling(sm)}
                onDelete={() => setConfirmUnschedule(sm.id)}
              />
            ))}
          </div>
        </div>
      )}

      {sorted.length > 0 && programados.length > 0 && (
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="font-condensed font-bold text-[11px] tracking-[0.15em] text-muted shrink-0">JUGADOS</span>
          <span className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-dim shrink-0">{sorted.length}</span>
        </div>
      )}

      {/* Match list */}
      {sorted.length === 0 && liveMatches.length === 0 ? (
        isDraft ? null : (
        <div className="text-center text-dim py-10 px-5 font-sans leading-loose">
          {programados.length > 0
            ? <>Todavía no se jugó ninguno de los partidos programados.</>
            : <>No hay partidos registrados todavía.<br />
              {isOwner ? `Usá el botón del dado para generar el calendario o "NUEVO PARTIDO" para agregar uno manualmente.` : '¡Pronto habrá resultados!'}</>}
        </div>
        )
      ) : (
        <div className="flex flex-col gap-2.5">
          {sorted.map((m, i) => (
            <MatchCard key={m.id} match={m} tournament={tournament} isOwner={isOwner}
              onEdit={() => handleEdit(m)} onDelete={() => handleDelete(m.id)}
              matchNum={sorted.length - i} />
          ))}
        </div>
      )}

      {/* Generate bracket */}
      {isOwner && !isDraft && !tournament.bracket && !previaComplete && (allSchedulePlayed || !schedule) && tournament.matches.length > 0 &&
        bracketButton('mt-6 w-full py-3.5 font-black text-[16px] tracking-[2px]')}
      {tournament.bracket && (
        <div className="bg-surface-alt border border-border-strong rounded-md px-3.5 py-2.5 text-[12px] text-brand font-mono mt-4 flex items-center justify-center gap-1.5">
          <Check size={13} strokeWidth={3} className="shrink-0" />
          Cuadro de eliminación generado — miralo en la pestaña CUADRO
        </div>
      )}
    </div>
  );
}
