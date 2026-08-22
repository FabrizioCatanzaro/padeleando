/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from "react";
import { expandPair, emptyForm, localDateStr, getPairLabel, visibleSetsCount, scoreFromSets } from "../../utils/helpers";
import MatchCard from "./MatchCard";
import MatchForm from "./MatchForm";
import ScheduledCard from "./ScheduledCard";
import ScheduleForm from "./ScheduleForm";
import Modal from "../shared/Modal";
import ShareFixtureModal from "../shared/ShareFixtureModal";
import { Share2, CalendarPlus } from "lucide-react";

const EMPTY_TIMER = { startedAt: null, stoppedAt: null };
const getLiveKey  = (id) => `live_${id}`;
const genId       = () => Math.random().toString(36).slice(2, 7);

export default function Matches({
  tournament, isOwner, categoryName, myPlayerIds = [],
  onAddMatch, onEditMatch, onDeleteMatch, onSetLiveMatch,
  onAddScheduled, onEditScheduled, onDeleteScheduled,
}) {
  const isPairs = tournament.mode === "pairs";
  const canEdit = isOwner && tournament.status !== 'finished';

  // Array de partidos en progreso: [{ id, form, timer }, ...]
  const [liveMatches, setLiveMatches] = useState(() => {
    try {
      const raw = localStorage.getItem(getLiveKey(tournament.id));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      // Backward compat: formato viejo era un objeto único { form, timer }
      if (!Array.isArray(parsed)) return [{ id: genId(), ...parsed }];
      return parsed;
    } catch { return []; }
  });

  // Partido en edición (separado de los live)
  const [editId,        setEditId]        = useState(null);
  const [editForm,      setEditForm]      = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [shareFixture,  setShareFixture]  = useState(false);
  // Programar un partido nuevo, o editar la programación de uno existente.
  const [scheduling,    setScheduling]    = useState(null);
  const [confirmUnschedule, setConfirmUnschedule] = useState(null);

  // Persistir a localStorage
  useEffect(() => {
    const key = getLiveKey(tournament.id);
    if (liveMatches.length > 0) {
      localStorage.setItem(key, JSON.stringify(liveMatches));
    } else {
      localStorage.removeItem(key);
    }
  }, [liveMatches, tournament.id]);

  // Sincronizar live_match: incluye partidos "cargados" (equipos elegidos) aunque
  // el cronómetro no haya arrancado — el espectador separa EN VIVO / PRÓXIMOS.
  function resolveTeamLabels(form) {
    const { mode, players, pairs } = tournament;
    const court = form.court ?? null;
    if (mode === "pairs") {
      return {
        team1Label: getPairLabel(form.team1Pair, pairs, players),
        team2Label: getPairLabel(form.team2Pair, pairs, players),
        team1Ids: expandPair(form.team1Pair, pairs),
        team2Ids: expandPair(form.team2Pair, pairs),
        court,
      };
    }
    const res = (ids) => ids.map((id) => players.find((p) => p.id === id)?.name ?? "?").join(" & ");
    return {
      team1Label: res(form.team1),
      team2Label: res(form.team2),
      team1Ids: form.team1.filter(Boolean),
      team2Ids: form.team2.filter(Boolean),
      court,
    };
  }
  function teamsComplete(form) {
    if (isPairs) return !!(form.team1Pair && form.team2Pair);
    return !!(form.team1?.[0] && form.team1?.[1] && form.team2?.[0] && form.team2?.[1]);
  }

  function buildLivePayload(matches) {
    return matches
      .filter((m) => teamsComplete(m.form))
      .map((m) => ({ ...resolveTeamLabels(m.form), startedAt: m.timer.startedAt }));
  }

  // Sincroniza sólo si el payload cambió (evita PATCH redundantes / por-segundo).
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
    setLiveMatches((prev) =>
      prev.map((m) => (m.id === liveId ? { ...m, timer: newTimerState } : m))
    );
  }

  function handleFormChange(liveId, updater) {
    setLiveMatches((prev) =>
      prev.map((m) => {
        if (m.id !== liveId) return m;
        const newForm = typeof updater === "function" ? updater(m.form) : updater;
        return { ...m, form: newForm };
      })
    );
  }

  function addNewMatch() {
    setLiveMatches((prev) => [...prev, { id: genId(), form: emptyForm(), timer: EMPTY_TIMER }]);
  }

  /**
   * Empezar un partido que nadie programó: lo anota en el fixture y arranca el
   * cronómetro. Anotarlo es lo que hace que sobreviva a cerrar la tarjeta —el
   * `live_match` de hoy se arma desde los formularios abiertos, así que al
   * cerrarlos el reloj del espectador se quedaba sin dueño.
   */
  async function empezarAhora(liveId) {
    const lm = liveMatches.find((m) => m.id === liveId);
    if (!lm) return;
    // Ya arrancó o ya está anotado: no se anota de nuevo.
    if (lm.timer?.startedAt != null || lm.form?.scheduledId) return;
    const { form } = lm;
    const team1 = isPairs ? expandPair(form.team1Pair, tournament.pairs) : form.team1;
    const team2 = isPairs ? expandPair(form.team2Pair, tournament.pairs) : form.team2;
    if (!team1?.[0] || !team1?.[1] || !team2?.[0] || !team2?.[1]) return;

    let scheduledId = null;
    try {
      scheduledId = (await onAddScheduled?.({
        team1, team2, court: form.court ?? null, scheduled_at: null,
      }))?.id ?? null;
    } catch {
      // Si no se pudo anotar, igual arranca: el cronómetro es lo urgente y el
      // partido se puede cargar lo mismo.
    }
    setLiveMatches((prev) => prev.map((m) => (m.id === liveId ? {
      ...m,
      form: {
        ...m.form,
        scheduledId: scheduledId ?? m.form.scheduledId ?? null,
        scheduledCreado: !!scheduledId,
      },
      timer: { startedAt: Date.now(), stoppedAt: null },
    } : m)));
  }


  /**
   * Lo mismo que Empezar ahora, pero sin arrancar el cronómetro: el partido se
   * anota en el fixture y la tarjeta se cierra. Es la salida para cuando abriste
   * NUEVO PARTIDO y en realidad lo querías para más tarde.
   */
  async function programarDesdeForm(liveId) {
    const lm = liveMatches.find((m) => m.id === liveId);
    if (!lm || lm.timer?.startedAt != null || lm.form?.scheduledId) return;
    const { form } = lm;
    const team1 = isPairs ? expandPair(form.team1Pair, tournament.pairs) : form.team1;
    const team2 = isPairs ? expandPair(form.team2Pair, tournament.pairs) : form.team2;
    if (!team1?.[0] || !team1?.[1] || !team2?.[0] || !team2?.[1]) return;

    await onAddScheduled?.({ team1, team2, court: form.court ?? null, scheduled_at: null });
    const remaining = liveMatches.filter((m) => m.id !== liveId);
    setLiveMatches(remaining);
    syncLive(remaining);
  }

  /**
   * Abre un partido del fixture como partido en curso. `arrancar` decide si el
   * cronómetro sale corriendo: Empezar sí, Cargar resultado no —ese es el que
   * se usa cuando el partido ya terminó y recién ahí lo cargás—.
   */
  function abrirProgramado(sm, arrancar) {
    // Si ya está abierto, no se duplica: dos toques seguidos —o un toque sobre
    // una tarjeta que quedó vieja en pantalla— abrían otra tarjeta cada vez.
    if (liveMatches.some((m) => m.form?.scheduledId === sm.id)) return;
    const base = emptyForm();
    const form = { ...base, court: sm.court ?? null, scheduledId: sm.id };
    if (isPairs) {
      const buscar = (team) => tournament.pairs.find(
        (p) => (p.p1 === team[0] && p.p2 === team[1]) || (p.p1 === team[1] && p.p2 === team[0]),
      )?.id ?? '';
      form.team1Pair = buscar(sm.team1);
      form.team2Pair = buscar(sm.team2);
    } else {
      form.team1 = [...sm.team1];
      form.team2 = [...sm.team2];
    }
    setLiveMatches((prev) => [...prev, {
      id: genId(), form,
      timer: arrancar ? { startedAt: Date.now(), stoppedAt: null } : EMPTY_TIMER,
    }]);
  }

  function handleCancelMatch(liveId) {
    const cancelado = liveMatches.find((m) => m.id === liveId);
    const remaining = liveMatches.filter((m) => m.id !== liveId);
    setLiveMatches(remaining);
    syncLive(remaining);
    // "Empezar ahora" anota el partido en el fixture para que sobreviva a cerrar
    // la tarjeta. Si el que cierra es quien lo anotó, se deshace: cancelar tiene
    // que dejar las cosas como estaban.
    if (cancelado?.form?.scheduledCreado && cancelado.form.scheduledId) {
      onDeleteScheduled?.(cancelado.form.scheduledId);
    }
  }

  async function handleSaveMatch(liveId) {
    const liveMatch = liveMatches.find((m) => m.id === liveId);
    if (!liveMatch) return;
    const { form } = liveMatch;

    // A 1 set el marcador son los juegos de ese set; a 3, los sets ganados.
    let s1, s2;
    if (form.sets_format) {
      [s1, s2] = scoreFromSets(form.sets_format, form.sets ?? []);
    } else {
      s1 = parseInt(form.score1);
      s2 = parseInt(form.score2);
    }

    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) return alert("Ingresá un marcador válido");

    let team1, team2;
    if (isPairs) {
      if (!form.team1Pair || !form.team2Pair) return alert("Seleccioná las dos parejas");
      team1 = expandPair(form.team1Pair, tournament.pairs);
      team2 = expandPair(form.team2Pair, tournament.pairs);
    } else {
      team1 = form.team1; team2 = form.team2;
      if (!team1[0] || !team1[1] || !team2[0] || !team2[1]) return alert("Completá los 4 jugadores");
      if (new Set([...team1, ...team2]).size !== 4) return alert("Los jugadores no pueden repetirse");
    }

    const nv = form.sets_format ? visibleSetsCount(form.sets_format, form.sets) : 0;

    // Si el cronómetro está corriendo, detenerlo y calcular la duración
    let duration = form.duration_seconds;
    if (liveMatch.timer.startedAt !== null && liveMatch.timer.stoppedAt === null) {
      duration = Math.floor((Date.now() - liveMatch.timer.startedAt) / 1000);
    }

    const matchData = {
      team1, team2, score1: s1, score2: s2,
      date: form.date, duration_seconds: duration,
      sets_format: form.sets_format ?? null,
      sets: nv > 0 ? (form.sets ?? []).slice(0, nv) : [],
      court: form.court ?? null,
      // Si salió del fixture, el backend lo saca de ahí al registrarlo.
      scheduledId: form.scheduledId ?? null,
    };

    // ─── Fix bug: limpiar localStorage ANTES del await para evitar restore en remount ───
    const remaining = liveMatches.filter((m) => m.id !== liveId);
    if (remaining.length === 0) {
      localStorage.removeItem(getLiveKey(tournament.id));
    } else {
      localStorage.setItem(getLiveKey(tournament.id), JSON.stringify(remaining));
    }
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

    // A 1 set el marcador son los juegos de ese set; a 3, los sets ganados.
    let s1, s2;
    if (editForm.sets_format) {
      [s1, s2] = scoreFromSets(editForm.sets_format, editForm.sets ?? []);
    } else {
      s1 = parseInt(editForm.score1);
      s2 = parseInt(editForm.score2);
    }

    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) return alert("Ingresá un marcador válido");

    let team1, team2;
    if (isPairs) {
      if (!editForm.team1Pair || !editForm.team2Pair) return alert("Seleccioná las dos parejas");
      team1 = expandPair(editForm.team1Pair, tournament.pairs);
      team2 = expandPair(editForm.team2Pair, tournament.pairs);
    } else {
      team1 = editForm.team1; team2 = editForm.team2;
      if (!team1[0] || !team1[1] || !team2[0] || !team2[1]) return alert("Completá los 4 jugadores");
      if (new Set([...team1, ...team2]).size !== 4) return alert("Los jugadores no pueden repetirse");
    }

    const nv = editForm.sets_format ? visibleSetsCount(editForm.sets_format, editForm.sets) : 0;
    await onEditMatch(editId, {
      team1, team2, score1: s1, score2: s2, date: editForm.date,
      duration_seconds: editForm.duration_seconds ?? null,
      sets_format: editForm.sets_format ?? null,
      sets: nv > 0 ? (editForm.sets ?? []).slice(0, nv) : [],
      court: editForm.court ?? null,
    });
    setEditId(null);
    setEditForm(null);
  }

  function handleEdit(m) {
    if (isPairs) {
      const pair1 = tournament.pairs?.find(
        (p) => (p.p1 === m.team1[0] && p.p2 === m.team1[1]) || (p.p1 === m.team1[1] && p.p2 === m.team1[0])
      );
      const pair2 = tournament.pairs?.find(
        (p) => (p.p1 === m.team2[0] && p.p2 === m.team2[1]) || (p.p1 === m.team2[1] && p.p2 === m.team2[0])
      );
      setEditForm({ ...emptyForm(), team1Pair: pair1?.id ?? "", team2Pair: pair2?.id ?? "",
        score1: String(m.score1), score2: String(m.score2), date: m.date || localDateStr(),
        duration_seconds: m.duration_seconds ?? null,
        sets_format: m.sets_format ?? null, sets: m.sets ?? [],
        court: m.court ?? null });
    } else {
      setEditForm({ team1: [...m.team1], team2: [...m.team2],
        score1: String(m.score1), score2: String(m.score2), date: m.date || localDateStr(),
        duration_seconds: m.duration_seconds ?? null,
        sets_format: m.sets_format ?? null, sets: m.sets ?? [],
        court: m.court ?? null });
    }
    setEditId(m.id);
  }

  function handleDelete(id) {
    setConfirmDelete(id);
  }

  const sorted = [...tournament.matches].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  // Los ids del fixture que ahora mismo están abiertos en un formulario. Un
  // partido no puede estar a la vez "por jugar" y "cargándose": mientras tenga
  // su tarjeta de carga abierta, sale de PRÓXIMOS.
  const idsAbiertos = new Set(
    liveMatches.map((lm) => lm.form?.scheduledId).filter(Boolean),
  );
  const programados = (tournament.scheduled_matches ?? []).filter((sm) => !idsAbiertos.has(sm.id));
  // El partido del que mira, para que el fixture le resuelva cuál es el suyo.
  const esMio = (sm) => myPlayerIds.length > 0
    && [...sm.team1, ...sm.team2].some((id) => myPlayerIds.includes(id));

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
      <div className="flex justify-between items-center gap-2 flex-wrap mb-4">
        <div className="font-condensed font-bold text-[16px] tracking-[3px] text-muted">PARTIDOS</div>
        <div className="flex gap-2 flex-wrap justify-end min-w-0">
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
          {canEdit && (
            <button
              onClick={() => setScheduling({ nuevo: true })}
              title="Programar un partido"
              className="inline-flex items-center gap-2 bg-transparent text-content border border-border-strong px-3.5 py-2.5 font-sans text-[12.5px] cursor-pointer rounded-sm hover:text-white hover:border-soft transition-colors whitespace-nowrap"
            >
              <CalendarPlus size={14} /> Programar
            </button>
          )}
          {canEdit && (
            <button
              onClick={addNewMatch}
              className="bg-brand text-base border-0 px-5 py-2.5 font-condensed font-bold text-[13px] tracking-wide cursor-pointer rounded-sm whitespace-nowrap"
            >
              + NUEVO PARTIDO
            </button>
          )}
        </div>
      </div>

      {/* Formularios de partidos en progreso */}
      {canEdit && liveMatches.map((liveMatch) => (
        <MatchForm
          key={liveMatch.id}
          form={liveMatch.form}
          setForm={(updater) => handleFormChange(liveMatch.id, updater)}
          tournament={tournament}
          onSave={() => handleSaveMatch(liveMatch.id)}
          onCancel={() => handleCancelMatch(liveMatch.id)}
          isEditing={false}
          timerState={liveMatch.timer}
          onTimerChange={(newTimer) => handleTimerChange(liveMatch.id, newTimer)}
          onEmpezar={() => empezarAhora(liveMatch.id)}
          onProgramar={() => programarDesdeForm(liveMatch.id)}
        />
      ))}

      {/* El formulario de programar: equipos, cancha y hora, sin resultado. */}
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

      {/* PRÓXIMOS — lo que todavía no se jugó. Para el que viene a jugar es la
          respuesta a "¿contra quién y en qué cancha?"; para el organizador, la
          lista de la que va cargando resultados. */}
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
            {programados.map((sm) => (
              <ScheduledCard
                key={sm.id}
                match={sm}
                tournament={tournament}
                isOwner={canEdit}
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

      {sorted.length === 0 ? (
        <div className="text-center text-dim py-10 px-5 font-sans leading-loose">
          {programados.length > 0
            ? <>Todavía no se jugó ninguno de los partidos programados.</>
            : <>No hay partidos registrados todavía.<br />¡Jugá el primero!</>}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sorted.map((m, i) =>
            editId === m.id && editForm ? (
              <MatchForm
                key={m.id}
                form={editForm} setForm={setEditForm}
                tournament={tournament}
                onSave={handleSaveEdit}
                onCancel={() => { setEditId(null); setEditForm(null); }}
                isEditing={true}
                timerState={EMPTY_TIMER}
                onTimerChange={() => {}}
              />
            ) : (
              <MatchCard key={m.id} match={m} tournament={tournament} isOwner={canEdit}
                onEdit={() => handleEdit(m)} onDelete={() => handleDelete(m.id)}
                matchNum={sorted.length - i} />
            )
          )}
        </div>
      )}
    </div>
  );
}
