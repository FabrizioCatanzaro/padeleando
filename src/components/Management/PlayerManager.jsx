import { useState } from "react";
import { Link } from "react-router-dom";
import PlayerInput from "../Setup/PlayerInput";
import Modal from "../shared/Modal";
import PlayerAvatar from "../shared/PlayerAvatar";
import ActionMenu from "../shared/ActionMenu";
import CollapsibleSection from "../shared/CollapsibleSection";
import { Pencil, Trash2, UserPlus, X, Clock, Check, Unlink, Link2, Copy } from "lucide-react";
import { api } from "../../utils/api";
import { useAuth } from "../../context/useAuth";

export default function PlayerManager({ tournament, isOwner, onAdd, onEdit, onDelete, onRefresh }) {
  const [newName, setNewName]           = useState("");
  const [editId, setEditId]             = useState(null);
  const [editName, setEditName]         = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showAdd, setShowAdd]           = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState(null);
  const [unlinkBusy, setUnlinkBusy]     = useState(false);

  // Estado de invitaciones por jugador: { [playerId]: { open, identifier, sending, error } }
  const [inviteState, setInviteState] = useState({});
  const [linkFor, setLinkFor] = useState(null); // { playerId, url }
  const [copied,  setCopied]  = useState(false);
  const { isLoggedIn } = useAuth();

  function handleAdd() {
    if (!newName.trim()) return;
    onAdd(newName.trim());
    setNewName("");
    setShowAdd(false);
  }

  function startEdit(p) { setEditId(p.id); setEditName(p.name); }

  function confirmEdit() {
    if (!editName.trim()) return;
    onEdit(editId, editName.trim());
    setEditId(null);
    setEditName("");
  }

  const hasMatches = (playerId) =>
    tournament.matches.some((m) => [...m.team1, ...m.team2].includes(playerId));

  function openInvite(playerId) {
    setInviteState(s => ({ ...s, [playerId]: { open: true, identifier: '', sending: false, error: null } }));
  }

  function closeInvite(playerId) {
    setInviteState(s => ({ ...s, [playerId]: { open: false, identifier: '', sending: false, error: null } }));
  }

  async function sendInvite(player) {
    const state = inviteState[player.id];
    if (!state?.identifier?.trim()) return;
    setInviteState(s => ({ ...s, [player.id]: { ...s[player.id], sending: true, error: null } }));
    try {
      await api.invitations.send(player.id, tournament.group_id, state.identifier.trim());
      closeInvite(player.id);
      // Refrescar el torneo (sin recargar la página) para ver el estado de la invitación
      await onRefresh?.();
    } catch (e) {
      setInviteState(s => ({ ...s, [player.id]: { ...s[player.id], sending: false, error: e.message } }));
    }
  }

  // Para quien no tiene cuenta: en vez de una invitación que nadie recibe, un
  // link que puede abrir, registrarse y quedar vinculado de una.
  async function createLink(player) {
    const state = inviteState[player.id];
    if (state?.sending) return;
    setInviteState(s => ({ ...s, [player.id]: { ...s[player.id], sending: true, error: null } }));
    try {
      const { url } = await api.invitations.createLink(player.id, tournament.group_id);
      setLinkFor({ playerId: player.id, url });
      closeInvite(player.id);
      await onRefresh?.();
    } catch (e) {
      // El panel se abre para que el error se vea también cuando el link se pidió desde el menú.
      setInviteState(s => ({ ...s, [player.id]: { ...s[player.id], open: true, sending: false, error: e.message } }));
    }
  }

  async function copyLink(url) {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* sin portapapeles: el input queda para copiar a mano */ }
  }

  // Desvincula la cuenta del slot sin borrar al jugador: el nombre y los partidos
  // se quedan en la categoría, sólo dejan de contar en el perfil de esa cuenta.
  async function confirmUnlink() {
    if (!unlinkTarget || unlinkBusy) return;
    setUnlinkBusy(true);
    try {
      await api.players.unlink(unlinkTarget.id, tournament.group_id);
      setUnlinkTarget(null);
      await onRefresh?.();
    } catch {
      // intentionally ignored
    } finally {
      setUnlinkBusy(false);
    }
  }

  async function cancelInvite(player) {
    if (!player.invitation_id) return;
    try {
      await api.invitations.cancel(player.invitation_id);
      await onRefresh?.();
    } catch {
      // intentionally ignored
    }
  }

  function playerActions(p) {
    const items = [];
    if (isLoggedIn && !p.user_id && !p.invitation_status) {
      items.push({ label: "Vincular usuario", icon: <UserPlus size={15} />, onClick: () => openInvite(p.id) });
      items.push({ label: "Generar link de invitación", icon: <Link2 size={15} />, onClick: () => createLink(p) });
    }
    if (p.user_id) {
      items.push({ label: "Desvincular cuenta", icon: <Unlink size={15} />, onClick: () => setUnlinkTarget(p) });
    }
    if (p.invitation_status === 'pending') {
      items.push({ label: "Cancelar invitación", icon: <X size={15} />, onClick: () => cancelInvite(p) });
    }
    items.push({ label: "Editar jugador", icon: <Pencil size={15} />, onClick: () => startEdit(p) });
    items.push({ label: "Eliminar jugador", icon: <Trash2 size={15} />, danger: true, onClick: () => setDeleteTarget(p) });
    return items;
  }

  return (
    <>
    <CollapsibleSection
      storageKey="pd:mgmt:players"
      title="JUGADORES"
      count={tournament.players.filter((p) => !p.removed).length}
      className="mb-4"
      actions={isOwner ? (expand) => (
        <button
          onClick={() => { expand(); setShowAdd(!showAdd); }}
          className="bg-brand text-base border-0 px-5 py-2.5 font-condensed font-bold text-[13px] tracking-wide cursor-pointer rounded-sm whitespace-nowrap"
        >
          {showAdd ? "Cancelar" : "+ Agregar"}
        </button>
      ) : null}
    >
      {showAdd && (
        <div className="flex gap-2 mb-3">
          <PlayerInput
            value={newName}
            onChange={setNewName}
            placeholder="Nombre del jugador"
            groupId={tournament.group_id}
          />
          <button onClick={handleAdd} className="bg-brand text-base border-0 px-5 py-2.5 font-condensed font-bold text-[13px] tracking-wide cursor-pointer rounded-sm whitespace-nowrap">
            Agregar
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {tournament.players.filter((p) => !p.removed).map((p, i) => (
          <div key={p.id} className="flex flex-col bg-base border border-border-mid rounded-md px-3 py-2 gap-1.5">
            {editId === p.id ? (
              <div className="flex items-center gap-2">
                <input
                  className="w-full bg-surface border border-border-mid text-white px-3.5 py-2.5 font-sans text-[13px] rounded-sm outline-none flex-1"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmEdit()}
                  autoFocus
                />
                <div onClick={confirmEdit} className="bg-brand text-base border-0 px-1.5 py-1.5 font-condensed font-bold text-[12px] tracking-wide cursor-pointer rounded-sm"><Check size={14} /></div>
                <div onClick={() => setEditId(null)} className="bg-transparent text-muted border border-border-strong px-1.5 py-1.5 text-[12px] cursor-pointer rounded-sm font-sans"><X size={14} /></div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-dim text-[11px] font-mono w-4 shrink-0 text-right tabular-nums">{i + 1}</span>
                <PlayerAvatar name={p.name} src={p.linked_avatar_url ?? null} size={28} premium={p.is_premium ?? false} />
                {p.linked_username ? (
                  <Link
                    to={`/u/${p.linked_username}`}
                    className="flex-1 min-w-0 truncate text-content font-sans no-underline hover:text-brand transition-colors"
                  >
                    {p.name}
                  </Link>
                ) : (
                  <span className="flex-1 min-w-0 truncate text-content font-sans">{p.name}</span>
                )}

                {/* Badge de vinculación */}
                {p.user_id && (
                  <span className="flex items-center gap-1 shrink-0 text-[10px] font-mono text-green bg-[#1a2e1a] border border-[#4af07a44] px-1.5 py-0.5 rounded">
                    <Check size={10} /> @{p.linked_username}
                  </span>
                )}
                {!p.user_id && p.invitation_status === 'pending' && (
                  <span className="text-[10px] font-mono text-brand/70 flex items-center gap-1">
                    <Clock size={10} /> pendiente
                  </span>
                )}

                {hasMatches(p.id) && (
                  <span className="text-[10px] text-muted font-mono">
                    {tournament.matches.filter(m => [...m.team1, ...m.team2].includes(p.id)).length}P
                  </span>
                )}

                {isOwner && (
                  <>
                    {/* Desktop: acciones sueltas. Mobile: colapsadas en el menú de elipsis. */}
                    <div className="hidden sm:flex items-center">
                      {/* Botón invitar: solo si no está vinculado y no hay invitación pendiente */}
                      {isLoggedIn && !p.user_id && !p.invitation_status && (
                        <>
                          <div
                            onClick={() => openInvite(p.id)}
                            title="Invitar usuario registrado"
                            className="bg-transparent border-0 text-muted cursor-pointer px-1.5 py-0.5 hover:text-brand transition-colors"
                          >
                            <UserPlus size={14} />
                          </div>
                          <div
                            onClick={() => createLink(p)}
                            title="Generar link de invitación"
                            className="bg-transparent border-0 text-muted cursor-pointer px-1.5 py-0.5 hover:text-brand transition-colors"
                          >
                            <Link2 size={14} />
                          </div>
                        </>
                      )}
                      {/* Desvincular la cuenta del slot (el jugador y su historial quedan) */}
                      {p.user_id && (
                        <div
                          onClick={() => setUnlinkTarget(p)}
                          title="Desvincular cuenta"
                          className="bg-transparent border-0 text-muted cursor-pointer px-1.5 py-0.5 hover:text-danger transition-colors"
                        >
                          <Unlink size={14} />
                        </div>
                      )}
                      {/* Cancelar invitación pendiente */}
                      {p.invitation_status === 'pending' && (
                        <div
                          onClick={() => cancelInvite(p)}
                          title="Cancelar invitación"
                          className="bg-transparent border-0 text-muted cursor-pointer px-1.5 py-0.5 hover:text-danger transition-colors"
                        >
                          <X size={14} />
                        </div>
                      )}
                      <div onClick={() => startEdit(p)} className="bg-transparent border-0 text-muted cursor-pointer text-[12px] font-sans px-1.5 py-0.5">
                        <Pencil size={15} />
                      </div>
                      <div onClick={() => setDeleteTarget(p)} className="bg-transparent border-0 text-danger cursor-pointer text-[12px] font-sans px-1.5 py-0.5">
                        <Trash2 size={15} />
                      </div>
                    </div>

                    <div className="sm:hidden">
                      <ActionMenu label={`Acciones de ${p.name}`} items={playerActions(p)} />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Panel de envío de invitación */}
            {inviteState[p.id]?.open && (
              <div className="flex flex-col gap-2 pt-1 border-t border-border-mid mt-1">
                <div className="text-[11px] text-muted font-mono">
                  Invitar a @usuario o email a reclamar el slot de <span className="text-content">{p.name}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-surface border border-border-mid text-white px-3 py-2 font-sans text-[13px] rounded-sm outline-none"
                    placeholder="@usuario o email"
                    value={inviteState[p.id]?.identifier ?? ''}
                    onChange={e => setInviteState(s => ({ ...s, [p.id]: { ...s[p.id], identifier: e.target.value } }))}
                    onKeyDown={e => e.key === 'Enter' && sendInvite(p)}
                    autoFocus
                  />
                  <button
                    onClick={() => sendInvite(p)}
                    disabled={inviteState[p.id]?.sending}
                    className="bg-brand text-base border-0 px-4 py-2 font-condensed font-bold text-[12px] tracking-wide cursor-pointer rounded-sm disabled:opacity-50"
                  >
                    Invitar
                  </button>
                  <div
                    onClick={() => closeInvite(p.id)}
                    className="flex items-center bg-transparent border border-border-strong text-muted px-2 py-2 text-[12px] cursor-pointer rounded-sm"
                  >
                    <X size={14} />
                  </div>
                </div>
                {inviteState[p.id]?.error && (
                  <div className="text-[11px] text-danger font-mono">{inviteState[p.id].error}</div>
                )}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[10px] text-dim font-mono">
                    Al aceptar, sus partidos en toda la categoría cuentan en su perfil.
                  </span>
                  <button
                    onClick={() => createLink(p)}
                    disabled={inviteState[p.id]?.sending}
                    className="flex items-center gap-1.5 bg-transparent text-muted border border-border-strong px-2.5 py-1.5 text-[11px] font-mono cursor-pointer rounded-sm hover:text-brand hover:border-brand transition disabled:opacity-50"
                  >
                    <Link2 size={12} /> ¿No tiene cuenta?
                  </button>
                </div>
              </div>
            )}

            {/* Link de invitación generado */}
            {linkFor?.playerId === p.id && (
              <div className="flex flex-col gap-2 pt-1 border-t border-border-mid mt-1">
                <div className="text-[11px] text-brand font-mono">
                  Link de invitación de <span className="text-content">{p.name}</span> · se acepta una sola vez
                </div>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={linkFor.url}
                    onFocus={(e) => e.target.select()}
                    className="flex-1 min-w-0 bg-surface border border-border-mid text-content px-3 py-2 font-mono text-[12px] rounded-sm outline-none"
                  />
                  <button
                    onClick={() => copyLink(linkFor.url)}
                    className="flex items-center gap-1.5 bg-brand text-base border-0 px-4 py-2 font-condensed font-bold text-[12px] tracking-wide cursor-pointer rounded-sm whitespace-nowrap"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copiado' : 'Copiar'}
                  </button>
                  <div
                    onClick={() => setLinkFor(null)}
                    className="flex items-center bg-transparent border border-border-strong text-muted px-2 py-2 text-[12px] cursor-pointer rounded-sm"
                  >
                    <X size={14} />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {tournament.players.some((p) => p.removed) && (
        <div className="mt-4">
          <div className="font-condensed font-bold text-[11px] tracking-[3px] text-muted mb-2 opacity-70">ELIMINADOS DEL TORNEO</div>
          <div className="flex flex-col gap-1.5">
            {tournament.players.filter((p) => p.removed).map((p) => (
              <div key={p.id} className="flex items-center gap-2 bg-base border border-dashed border-border-mid rounded-md px-3 py-2 opacity-60">
                <PlayerAvatar name={p.name} src={p.linked_avatar_url ?? null} size={24} premium={p.is_premium ?? false} />
                <span className="flex-1 text-muted font-sans line-through">{p.name}</span>
                {hasMatches(p.id) && (
                  <span className="text-[10px] text-muted font-mono">
                    {tournament.matches.filter(m => [...m.team1, ...m.team2].includes(p.id)).length}P
                  </span>
                )}
                <span className="text-[10px] font-mono text-muted border border-border-strong px-1.5 py-0.5 rounded">
                  eliminado
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      </CollapsibleSection>

      {deleteTarget && (
        <Modal
          title={`¿Eliminar a ${deleteTarget.name}?`}
          message={
            hasMatches(deleteTarget.id)
              ? `${deleteTarget.name} tiene partidos registrados. Al eliminarlo esos partidos quedarán con datos incompletos.`
              : `Se eliminará ${deleteTarget.name} del torneo. Sus estadísticas históricas se conservan.`
          }
          confirmText="Eliminar"
          confirmDanger
          onConfirm={() => { onDelete(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {unlinkTarget && (
        <Modal
          title={`¿Desvincular a @${unlinkTarget.linked_username}?`}
          message={`${unlinkTarget.name} y todos sus partidos quedan en la categoría, pero dejan de estar asociados a esa cuenta y de contar en las estadísticas de su perfil. Vas a poder invitar a alguien a ese slot de nuevo.`}
          confirmText="Desvincular"
          confirmDanger
          confirmDisabled={unlinkBusy}
          onConfirm={confirmUnlink}
          onCancel={() => setUnlinkTarget(null)}
        />
      )}
    </>
  );
}
