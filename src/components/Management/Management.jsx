import { useState } from "react";
import Modal from "../shared/Modal";
import FinishTournamentModal from "../shared/FinishTournamentModal";
import PlayerManager from "./PlayerManager";
import PairManager from "./PairManager";
import ClubSelector from "../shared/ClubSelector";
import SignupEditor from "../shared/SignupEditor";
import { profileContacts } from "../../utils/signup";
import Btn from "../shared/Btn";
import LigaOpciones from "../shared/LigaOpciones";
import FlyerCard from "./FlyerCard";
import { clubCourts, entityClub, fmtHora, isSaneEventDate } from "../../utils/helpers";
import { Play, RotateCcw, TicketCheck, Trash2, Check, ChevronDown } from "lucide-react";

const fechaDe = (t) => (t.event_date ? String(t.event_date).slice(0, 10) : '');

function signupDe(t) {
  return {
    open:     t.signup_open ?? (t.group_signup_open ?? false),
    price:    t.signup_price ?? null,
    unit:     t.signup_price_unit ?? (t.group_signup_price_unit ?? 'player'),
    contacts: t.signup_contacts ?? [],
    level:    t.level ?? null,
    capacity: t.signup_capacity ?? null,
    capacity_unit: t.signup_capacity_unit ?? null,
    closes_at: t.signup_closes_at ?? null,
    rules:    t.rules ?? null,
  };
}

/**
 * Datos del torneo: club, fecha e inscripción con UN botón (auditoría UI).
 * Antes eran dos bloques con su propio GUARDAR y no quedaba claro qué se
 * había guardado. Se manda sólo lo que cambió, en una sola llamada.
 */
function DatosDelTorneo({ tournament, onSave }) {
  const [club, setClub] = useState(() => entityClub(tournament));
  const [date, setDate] = useState(() => fechaDe(tournament));
  const [time, setTime] = useState(() => fmtHora(tournament.event_time));
  const [signup, setSignup] = useState(() => signupDe(tournament));
  // Lo guardado: contra esto se mide si hay cambios.
  const [base, setBase] = useState(() => ({ signup: JSON.stringify(signupDe(tournament)) }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const inherited = {
    open:     tournament.group_signup_open ?? false,
    price:    tournament.group_signup_price ?? null,
    unit:     tournament.group_signup_price_unit ?? 'player',
    contacts: tournament.group_signup_contacts ?? [],
    level:    tournament.group_level ?? null,
    capacity: tournament.group_signup_capacity ?? null,
    capacity_unit: tournament.group_signup_capacity_unit ?? null,
    rules:    tournament.group_rules ?? null,
  };

  const clubId      = club?.pending ? null : (club?.id ?? null);
  const requestId   = club?.pending ? club.request_id : null;
  const clubChanged = clubId !== (tournament.club_id ?? null)
    || requestId !== (tournament.pending_club_request_id ?? null);
  const clubDirty = clubChanged
    || (date || null) !== (fechaDe(tournament) || null)
    || (time || null) !== (fmtHora(tournament.event_time) || null);
  const signupDirty = JSON.stringify(signup) !== base.signup;
  const dirty = clubDirty || signupDirty;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        club: clubDirty ? {
          club_id: clubId, pending_club_request_id: requestId,
          event_date: date || null, event_time: time || null,
          // Al cambiar de club, las canchas del torneo pasan a ser las del nuevo club.
          ...(clubChanged ? { number_of_courts: clubCourts(club) } : {}),
        } : null,
        signup: signupDirty ? signup : null,
      });
      setBase({ signup: JSON.stringify(signup) });
    } catch (e) {
      setError(e.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="py-4 border-b border-border">
        <h4 className="m-0 mb-3 text-[14px] font-bold text-white">Club y fecha</h4>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-[12px] font-semibold text-soft mb-1.5">Club</label>
            <ClubSelector value={club} onChange={setClub} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              <label className="block text-[12px] font-semibold text-soft mb-1.5">Fecha</label>
              <input
                type="date"
                value={date}
                min="1900-01-01"
                max="2100-12-31"
                onChange={(e) => { if (isSaneEventDate(e.target.value)) setDate(e.target.value); }}
                className="w-full bg-surface border border-border-mid text-white px-3 py-2 rounded-sm text-sm outline-none font-sans"
              />
            </div>
            <div className="w-28 shrink-0">
              <label className="block text-[12px] font-semibold text-soft mb-1.5">Hora</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-surface border border-border-mid text-white px-3 py-2 rounded-sm text-sm outline-none font-sans"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <h4 className="m-0 mb-3 text-[14px] font-bold text-white">Inscripción</h4>
        <SignupEditor
          value={signup}
          onChange={setSignup}
          inherited={inherited}
          profile={profileContacts(tournament.owner_social_links)}
        />
      </div>

      {/* Un solo botón, pegado abajo mientras haya cambios sin guardar. */}
      <div className={`mt-5 flex items-center justify-between gap-3 flex-wrap ${dirty ? 'sticky bottom-20 sm:bottom-4 z-10 bg-surface border border-brand/40 rounded-xl px-3.5 py-3 shadow-xl' : ''}`}>
        <span className={`text-[13px] ${dirty ? 'text-white font-semibold' : 'text-secondary'}`}>
          {error ? <span className="text-danger">{error}</span>
            : dirty ? 'Tenés cambios sin guardar.' : 'Todo guardado.'}
        </span>
        <Btn variant="primary" size="sm" icon={Check} onClick={save} loading={saving} disabled={!dirty}>
          Guardar cambios
        </Btn>
      </div>
    </div>
  );
}

const ligaDe = (t) => ({
  liga_mode: t.liga_mode ?? 'jornada', allow_rematch: !!t.allow_rematch,
  winner_format: t.winner_format ?? 'tabla', playoff_size: t.playoff_size ?? null,
  points_win: t.points_win ?? 3, points_loss: t.points_loss ?? 0,
});

function resumenLiga(t) {
  const l = ligaDe(t);
  return [
    l.liga_mode === 'temporada' ? 'Varios días' : 'Un solo día',
    ...(l.liga_mode === 'temporada' ? [l.allow_rematch ? 'Con cruces repetidos' : 'Sin cruces repetidos'] : []),
    `Victoria ${l.points_win}${l.points_loss > 0 ? `, derrota ${l.points_loss}` : ''}`,
    l.winner_format === 'playoffs' ? `Playoffs a ${l.playoff_size}` : 'Gana la tabla',
  ].join(' · ');
}

// Opciones de la liga: se guardan con un botón, solo si cambiaron.
function OpcionesDeLiga({ tournament, onSave }) {
  const [liga, setLiga] = useState(() => ligaDe(tournament));
  const [saving, setSaving] = useState(false);
  const cambio = JSON.stringify(liga) !== JSON.stringify(ligaDe(tournament));
  return (
    <>
      <LigaOpciones value={liga} onChange={setLiga} modoBloqueado={(tournament.fechas?.length ?? 0) > 0} />
      <Btn
        variant="primary" full className="mt-4" disabled={!cambio || saving} loading={saving}
        onClick={async () => { setSaving(true); await onSave(liga); setSaving(false); }}
      >
        Guardar opciones
      </Btn>
    </>
  );
}

export default function Management({
  tournament, isOwner,
  onAddPlayer, onEditPlayer, onDeletePlayer,
  onAddPair, onEditPair, onDeletePair, onWithdrawPair,
  onResetScores, onDeleteTournament, onToggleStatus, onUpdateMode, onUpdateDatos, onUpdateLiga, onGeneratePlayoffs,
  onUploadFlyer, onDeleteFlyer, onRefresh,
}) {
  const [resetModal, setResetModal]   = useState(false);
  const [resetInput, setResetInput]   = useState('');
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [finishModal, setFinishModal] = useState(false);
  const [playoffsModal, setPlayoffsModal] = useState(false);

  const activePlayers = tournament.players.filter((p) => !p.removed).length;
  const showModeToggle = tournament.format === 'liga' && tournament.liga_mode !== 'temporada' && activePlayers >= 4;
  const canPickPairs   = activePlayers % 2 === 0;

  const hasMatches = (tournament.matches?.length ?? 0) > 0;
  // Liga con playoffs: primero se arman los playoffs; se finaliza con la final jugada.
  const conPlayoffs = tournament.format === 'liga' && tournament.winner_format === 'playoffs';
  const playoffsPendientes = conPlayoffs && tournament.status === 'active' && !tournament.bracket;
  const playoffsEnJuego = conPlayoffs && tournament.status === 'active' && !!tournament.bracket && !tournament.bracket.final?.winner_id;
  const sinJugar = (tournament.scheduled_matches ?? []).length;
  // Resumen de una línea de "Datos del torneo", para no abrirlo de gusto.
  const resumen = [
    tournament.club_name ?? 'Sin club',
    tournament.event_date
      ? `${String(tournament.event_date).slice(8, 10)}/${String(tournament.event_date).slice(5, 7)}${tournament.event_time ? ` ${fmtHora(tournament.event_time)}` : ''}`
      : 'Fecha a confirmar',
    (tournament.signup_open ?? tournament.group_signup_open) ? 'Inscripción abierta' : 'Inscripción cerrada',
  ].join(' · ');

  return (
    <div>
      <h2 className="m-0 mb-4 font-condensed font-semibold text-[15px] text-white">Gestión</h2>

      {/* Cerrar el torneo es la acción principal cuando ya hay partidos; antes
          estaba en la zona de peligro, al lado de Eliminar (auditoría UI). */}
      {isOwner && playoffsPendientes && hasMatches && (
        <div className="flex items-center justify-between gap-3 flex-wrap bg-surface border border-border-mid rounded-xl px-4 py-3 mb-5">
          <span className="text-[14px] text-content">
            Cuando termine la tabla, armá los playoffs con las primeras {tournament.playoff_size} parejas.
          </span>
          <Btn variant="primary" size="sm" icon={TicketCheck} onClick={() => setPlayoffsModal(true)}>
            Armar playoffs
          </Btn>
        </div>
      )}
      {isOwner && playoffsEnJuego && (
        <div className="bg-surface border border-border-mid rounded-xl px-4 py-3 mb-5 text-[14px] text-content">
          Los playoffs están en juego. Cuando se juegue la final, vas a poder finalizar el torneo.
        </div>
      )}
      {isOwner && !playoffsPendientes && !playoffsEnJuego && (hasMatches || tournament.status === 'finished') && (
        <div className="flex items-center justify-between gap-3 flex-wrap bg-surface border border-border-mid rounded-xl px-4 py-3 mb-5">
          <span className="text-[14px] text-content">
            {tournament.status === 'active' ? 'Cuando se jueguen todos los partidos, cerrá el torneo.' : 'El torneo está terminado.'}
          </span>
          <Btn
            variant={tournament.status === 'active' ? 'primary' : 'secondary'}
            size="sm"
            icon={tournament.status === 'active' ? TicketCheck : Play}
            onClick={() => tournament.status === 'active' ? setFinishModal(true) : onToggleStatus()}
          >
            {tournament.status === 'active' ? 'Finalizar torneo' : 'Reanudar torneo'}
          </Btn>
        </div>
      )}

      <PlayerManager
        tournament={tournament}
        isOwner={isOwner}
        onAdd={onAddPlayer}
        onEdit={onEditPlayer}
        onDelete={onDeletePlayer}
        onRefresh={onRefresh}
      />

      {showModeToggle && isOwner && (
        <div className="bg-surface border border-border-mid rounded-xl p-4 mt-6">
          <h3 className="m-0 mb-3 text-[14px] font-bold text-white">Modo de juego</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => tournament.mode !== 'free' && onUpdateMode('free')}
              className={`flex-1 py-2.5 text-[14px] font-semibold rounded-sm border transition cursor-pointer ${tournament.mode === 'free' ? 'bg-brand/15 border-brand text-brand' : 'bg-surface-alt border-border-mid text-content hover:border-border-strong'}`}
            >
              Equipos libres
            </button>
            <button
              type="button"
              onClick={() => { if (canPickPairs && tournament.mode !== 'pairs') onUpdateMode('pairs'); }}
              disabled={!canPickPairs}
              className={`flex-1 py-2.5 text-[14px] font-semibold rounded-sm border transition ${
                !canPickPairs
                  ? 'border-border-mid text-muted cursor-not-allowed opacity-50'
                  : tournament.mode === 'pairs'
                    ? 'bg-brand/15 border-brand text-brand cursor-pointer'
                    : 'bg-surface-alt border-border-mid text-content hover:border-border-strong cursor-pointer'
              }`}
            >
              Parejas fijas
            </button>
          </div>
          {!canPickPairs && (
            <p className="m-0 text-[12px] text-secondary mt-2">Con un número impar de jugadores no se pueden armar parejas fijas.</p>
          )}
        </div>
      )}

      {tournament.mode === "pairs" && (
        <PairManager
          tournament={tournament}
          isOwner={isOwner}
          onAdd={onAddPair}
          onEdit={onEditPair}
          onDelete={onDeletePair}
          onWithdraw={onWithdrawPair}
        />
      )}

      {isOwner && tournament.format === 'liga' && (
        <details className="group bg-surface border border-border-mid rounded-xl mt-6">
          <summary className="flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <span className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[15px] font-bold text-white">Opciones de la liga</span>
              <span className="text-[13px] text-secondary truncate">{resumenLiga(tournament)}</span>
            </span>
            <ChevronDown size={18} className="shrink-0 text-soft transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="px-4 pb-4">
            <OpcionesDeLiga key={resumenLiga(tournament)} tournament={tournament} onSave={onUpdateLiga} />
          </div>
        </details>
      )}

      {isOwner && <FlyerCard tournament={tournament} onUpload={onUploadFlyer} onDelete={onDeleteFlyer} />}

      {/* Datos del torneo: se configuran una vez. Plegados, con un resumen. */}
      {isOwner && (
        <details className="group bg-surface border border-border-mid rounded-xl mt-6">
          <summary className="flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <span className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[15px] font-bold text-white">Datos del torneo</span>
              <span className="text-[13px] text-secondary truncate">{resumen}</span>
            </span>
            <ChevronDown size={18} className="shrink-0 text-soft transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="px-4 pb-4 border-t border-border">
            <DatosDelTorneo tournament={tournament} onSave={onUpdateDatos} />
          </div>
        </details>
      )}

      {/* Zona roja: sólo lo que no se puede deshacer, al final y aparte. */}
      {isOwner && (
        <div className="border border-danger/30 rounded-xl p-4 mt-8">
          <h3 className="m-0 mb-1 text-[14px] font-bold text-danger">Zona de peligro</h3>
          <p className="m-0 mb-3 text-[13px] text-secondary">Estas acciones no se pueden deshacer.</p>
          <div className="flex gap-3 flex-wrap">
            <Btn variant="danger" icon={RotateCcw} onClick={() => { setResetModal(true); setResetInput(''); }}>
              Reiniciar puntos
            </Btn>
            <Btn variant="danger" icon={Trash2} onClick={() => { setDeleteModal(true); setDeleteInput(''); }}>
              Eliminar torneo
            </Btn>
          </div>
        </div>
      )}

      {playoffsModal && (
        <Modal
          title="¿Armar los playoffs?"
          confirmText="Armar playoffs"
          onConfirm={() => { setPlayoffsModal(false); onGeneratePlayoffs?.(); }}
          onCancel={() => setPlayoffsModal(false)}
        >
          <p className="m-0 mb-2">
            El cuadro se arma con las primeras {tournament.playoff_size} parejas de la tabla de hoy.
          </p>
          {sinJugar > 0 && (
            <p className="m-0 text-premium">
              Quedan {sinJugar} {sinJugar === 1 ? 'partido sin jugar' : 'partidos sin jugar'}. No van a sumar a la tabla.
            </p>
          )}
        </Modal>
      )}

      {finishModal && (
        <FinishTournamentModal
          tournament={tournament}
          onConfirm={() => { onToggleStatus(); setFinishModal(false); }}
          onCancel={() => setFinishModal(false)}
        />
      )}

      {resetModal && (
        <Modal
          title="¿Reiniciar puntos?"
          confirmText="Reiniciar"
          confirmDanger
          confirmDisabled={resetInput !== 'REINICIAR'}
          onConfirm={() => { onResetScores(); setResetModal(false); setResetInput(''); }}
          onCancel={() => { setResetModal(false); setResetInput(''); }}
        >
          <p className="text-secondary text-sm leading-relaxed mb-4">
            Se eliminarán <strong className="text-white">todos los partidos registrados</strong>. Los jugadores y parejas se mantienen. Esta acción no se puede deshacer.
          </p>
          <label className="block text-[11px] font-mono tracking-widest text-muted mb-2">
            ESCRIBÍ <span className="text-danger font-bold">REINICIAR</span> PARA CONFIRMAR
          </label>
          <input
            className="w-full bg-base border border-border-strong text-white px-3 py-2 rounded text-sm font-mono outline-none focus:border-danger/60 transition-colors"
            placeholder="REINICIAR"
            value={resetInput}
            onChange={e => setResetInput(e.target.value)}
            autoFocus
          />
        </Modal>
      )}

      {deleteModal && (
        <Modal
          title="¿Eliminar torneo?"
          confirmText="Eliminar para siempre"
          confirmDanger
          confirmDisabled={deleteInput !== tournament.name}
          onConfirm={() => { onDeleteTournament(); setDeleteModal(false); setDeleteInput(''); }}
          onCancel={() => { setDeleteModal(false); setDeleteInput(''); }}
        >
          <p className="text-secondary text-sm leading-relaxed mb-4">
            Se eliminará el torneo por completo. Los jugadores quedan en la base de datos para estadísticas históricas. <strong className="text-white">Esta acción no se puede deshacer.</strong>
          </p>
          <label className="block text-[11px] font-mono tracking-widest text-muted mb-2">
            ESCRIBÍ <span className="text-danger font-bold">{tournament.name}</span> PARA CONFIRMAR
          </label>
          <input
            className="w-full bg-base border border-border-strong text-white px-3 py-2 rounded text-sm font-sans outline-none focus:border-danger/60 transition-colors"
            placeholder={tournament.name}
            value={deleteInput}
            onChange={e => setDeleteInput(e.target.value)}
            autoFocus
          />
        </Modal>
      )}
    </div>
  );
}
