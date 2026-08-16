import { useState } from "react";
import Modal from "../shared/Modal";
import FinishTournamentModal from "../shared/FinishTournamentModal";
import PlayerManager from "./PlayerManager";
import PairManager from "./PairManager";
import ClubSelector from "../shared/ClubSelector";
import SignupEditor from "../shared/SignupEditor";
import { profileContacts } from "../../utils/signup";
import Btn from "../shared/Btn";
import { clubCourts, entityClub, fmtHora } from "../../utils/helpers";
import { Play, RotateCcw, TicketCheck, Trash2, Check } from "lucide-react";

function ClubEventEditor({ tournament, onSave }) {
  const [club, setClub]   = useState(() => entityClub(tournament));
  const [date, setDate]   = useState(tournament.event_date ? String(tournament.event_date).slice(0, 10) : "");
  const [time, setTime]   = useState(fmtHora(tournament.event_time));
  const [saving, setSaving] = useState(false);

  const clubId      = club?.pending ? null : (club?.id ?? null);
  const requestId   = club?.pending ? club.request_id : null;
  const clubChanged = clubId !== (tournament.club_id ?? null)
    || requestId !== (tournament.pending_club_request_id ?? null);
  const dirty = clubChanged
    || (date || null) !== (tournament.event_date ? String(tournament.event_date).slice(0, 10) : null)
    || (time || null) !== (fmtHora(tournament.event_time) || null);

  async function save() {
    setSaving(true);
    try {
      const payload = { club_id: clubId, pending_club_request_id: requestId, event_date: date || null, event_time: time || null };
      // Al cambiar de club, las canchas del torneo pasan a ser las del nuevo club.
      if (clubChanged) payload.number_of_courts = clubCourts(club);
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-surface border border-border-mid rounded-lg p-4 mb-4">
      <div className="font-condensed font-bold text-[11px] tracking-[2px] text-muted mb-3">CLUB Y FECHA</div>
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-[10px] font-mono tracking-widest text-muted mb-1.5">CLUB</label>
          <ClubSelector value={club} onChange={setClub} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-mono tracking-widest text-muted mb-1.5">FECHA DEL EVENTO</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-surface border border-border-mid text-white px-3 py-2 rounded-sm text-sm outline-none font-sans"
            />
          </div>
          <div className="w-28 shrink-0">
            <label className="block text-[10px] font-mono tracking-widest text-muted mb-1.5">HORA</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-surface border border-border-mid text-white px-3 py-2 rounded-sm text-sm outline-none font-sans"
            />
          </div>
        </div>
        <Btn variant="primary" size="sm" icon={Check} onClick={save} loading={saving} disabled={!dirty}>GUARDAR</Btn>
      </div>
    </div>
  );
}

// Precio y contacto de esta jornada. Lo que quede vacío lo hereda de la categoría.
function SignupSection({ tournament, onSave }) {
  const inherited = {
    open:     tournament.group_signup_open ?? false,
    price:    tournament.group_signup_price ?? null,
    unit:     tournament.group_signup_price_unit ?? 'player',
    contacts: tournament.group_signup_contacts ?? [],
  };
  // Sólo lo propio: precargar lo heredado lo copiaría al guardar.
  const [value, setValue] = useState(() => ({
    open:     tournament.signup_open ?? inherited.open,
    price:    tournament.signup_price ?? null,
    unit:     tournament.signup_price_unit ?? inherited.unit,
    contacts: tournament.signup_contacts ?? [],
  }));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try { await onSave(value); } finally { setSaving(false); }
  }

  return (
    <div className="bg-surface border border-border-mid rounded-lg p-4 mb-4">
      <div className="font-condensed font-bold text-[11px] tracking-[2px] text-muted mb-3">INSCRIPCIÓN</div>
      <SignupEditor
        value={value}
        onChange={setValue}
        inherited={inherited}
        profile={profileContacts(tournament.owner_social_links)}
      />
      <Btn variant="primary" size="sm" icon={Check} onClick={save} loading={saving} className="mt-4">GUARDAR</Btn>
    </div>
  );
}

export default function Management({
  tournament, isOwner,
  onAddPlayer, onEditPlayer, onDeletePlayer,
  onAddPair, onEditPair, onDeletePair,
  onResetScores, onDeleteTournament, onToggleStatus, onUpdateMode, onUpdateClubEvent, onUpdateSignup,
  onRefresh,
}) {
  const [resetModal, setResetModal]   = useState(false);
  const [resetInput, setResetInput]   = useState('');
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [finishModal, setFinishModal] = useState(false);

  const activePlayers = tournament.players.filter((p) => !p.removed).length;
  const showModeToggle = tournament.format === 'liga' && activePlayers >= 4;
  const canPickPairs   = activePlayers % 2 === 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="font-condensed font-bold text-[16px] tracking-[3px] text-muted">GESTIÓN DEL TORNEO</div>
      </div>

      {isOwner && <ClubEventEditor tournament={tournament} onSave={onUpdateClubEvent} />}
      {isOwner && <SignupSection tournament={tournament} onSave={onUpdateSignup} />}

      <PlayerManager
        tournament={tournament}
        isOwner={isOwner}
        onAdd={onAddPlayer}
        onEdit={onEditPlayer}
        onDelete={onDeletePlayer}
        onRefresh={onRefresh}
      />

      {showModeToggle && isOwner && (
        <div className="bg-surface border border-border-mid rounded-lg p-4 mt-6">
          <div className="font-condensed font-bold text-[11px] tracking-[2px] text-muted mb-3">MODO DE JUEGO</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => tournament.mode !== 'free' && onUpdateMode('free')}
              className={`flex-1 py-2.5 text-[12px] font-condensed font-bold tracking-wide rounded-sm border transition cursor-pointer ${tournament.mode === 'free' ? 'bg-brand/15 border-brand text-brand' : 'bg-surface-alt border-border-mid text-muted hover:border-border-strong'}`}
            >
              EQUIPOS LIBRES
            </button>
            <button
              type="button"
              onClick={() => { if (canPickPairs && tournament.mode !== 'pairs') onUpdateMode('pairs'); }}
              disabled={!canPickPairs}
              className={`flex-1 py-2.5 text-[12px] font-condensed font-bold tracking-wide rounded-sm border transition ${
                !canPickPairs
                  ? 'border-border-mid text-dim cursor-not-allowed opacity-40'
                  : tournament.mode === 'pairs'
                    ? 'bg-brand/15 border-brand text-brand cursor-pointer'
                    : 'bg-surface-alt border-border-mid text-muted hover:border-border-strong cursor-pointer'
              }`}
            >
              PAREJAS FIJAS
            </button>
          </div>
          {!canPickPairs && (
            <p className="text-[10px] text-dim font-mono mt-1.5">Número impar de jugadores — parejas fijas no disponible.</p>
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
        />
      )}

      {isOwner && (
        <div className="bg-[#0d0a0a] border border-danger/13 rounded-lg p-4 mt-6">
          <div className="font-condensed font-bold text-[13px] tracking-[3px] text-danger/40 mb-4">
            ZONA DE PELIGRO
          </div>
          <div className="flex gap-3 flex-wrap">
            <Btn variant="danger" icon={RotateCcw} onClick={() => { setResetModal(true); setResetInput(''); }}>
              Reiniciar puntos
            </Btn>
            <Btn variant="danger" icon={Trash2} onClick={() => { setDeleteModal(true); setDeleteInput(''); }}>
              Eliminar torneo
            </Btn>
            <Btn
              icon={tournament.status === 'active' ? TicketCheck : Play}
              onClick={() => tournament.status === 'active' ? setFinishModal(true) : onToggleStatus()}
              className={tournament.status === 'active' ? 'text-brand border-brand/40' : 'text-green border-green/40'}
            >
              {tournament.status === 'active' ? 'Finalizar torneo' : 'Reanudar torneo'}
            </Btn>
          </div>
        </div>
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
