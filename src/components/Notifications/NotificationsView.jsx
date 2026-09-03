import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { api } from '../../utils/api';
import { renderRichText } from '../../utils/richText';
import { notifSummary } from '../../utils/notifText';
import PlayerAvatar from '../shared/PlayerAvatar';
import Loader from '../Loader/Loader';

const PAGE_SIZE = 20;

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'ahora';
  if (m < 60)  return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5)   return `${w} sem`;
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function dayLabel(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const diffDays = Math.floor((today - d) / 86400000);
  if (d.toDateString() === today.toDateString()) return 'HOY';
  if (d.toDateString() === yesterday.toDateString()) return 'AYER';
  if (diffDays < 7) return 'ESTA SEMANA';
  if (diffDays < 30) return 'ESTE MES';
  return 'ANTERIORES';
}

export default function NotificationsView() {
  const navigate = useNavigate();
  const [notifs, setNotifs]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]     = useState(true);
  const [offset, setOffset]       = useState(0);

  const load = useCallback(async (off = 0, replace = true) => {
    if (off === 0) setLoading(true); else setLoadingMore(true);
    try {
      const data = await api.notifications.list(PAGE_SIZE, off);
      setNotifs(prev => replace ? data : [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      setOffset(off + data.length);
      if (off === 0) api.notifications.markAllRead().catch(() => {});
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { load(0); }, [load]);

  function updateItem(id, patch) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n));
  }

  async function handleFollow(n) {
    try {
      if (n.is_following_back) {
        await api.follows.unfollow(n.actor_username);
        updateItem(n.id, { is_following_back: false });
      } else {
        await api.follows.follow(n.actor_username);
        updateItem(n.id, { is_following_back: true });
      }
    } catch {
      //
    }
  }

  async function handleInvitation(n, action) {
    try {
      await api.invitations.respond(n.entity_id, action);
      updateItem(n.id, { invitation_status: action === 'accept' ? 'accepted' : 'rejected' });
    } catch {
      //
    }
  }

  async function handleJoinRequest(n, action, playerId) {
    try {
      if (action === 'accept') {
        await api.joinRequests.accept(n.entity_id, playerId);
      } else {
        await api.joinRequests.reject(n.entity_id);
      }
      updateItem(n.id, { request_status: action === 'accept' ? 'accepted' : 'rejected' });
    } catch {
      //
    }
  }

  async function handleCollabInvite(n, action) {
    try {
      await api.collaborators.respondInvite(n.entity_id, action);
      updateItem(n.id, { collab_status: action === 'accept' ? 'accepted' : 'rejected' });
    } catch {
      //
    }
  }

  async function handleTransfer(n, action) {
    try {
      await api.transfers.respond(n.entity_id, action);
      updateItem(n.id, { transfer_status: action === 'accept' ? 'accepted' : 'rejected' });
    } catch {
      //
    }
  }

  if (loading) return <Loader />;

  // Group by day label
  const groups = [];
  let lastLabel = null;
  for (const n of notifs) {
    const lbl = dayLabel(n.created_at);
    if (lbl !== lastLabel) {
      groups.push({ label: lbl, items: [] });
      lastLabel = lbl;
    }
    groups[groups.length - 1].items.push(n);
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-16">
      <div className="flex items-center justify-between mb-5">
        <div className="font-condensed font-bold text-[22px] tracking-[3px] text-white">NOTIFICACIONES</div>
        {notifs.some(n => !n.read) && (
          <button
            onClick={() => {
              api.notifications.markAllRead().catch(() => {});
              setNotifs(prev => prev.map(n => ({ ...n, read: true })));
            }}
            className="text-[11px] font-mono text-muted hover:text-white transition-colors cursor-pointer bg-transparent border-none"
          >
            Marcar todo leído
          </button>
        )}
      </div>

      {notifs.length === 0 && (
        <div className="text-center text-dim text-sm font-mono py-16">
          No tenés notificaciones todavía.
        </div>
      )}

      {groups.map(group => (
        <div key={group.label} className="mb-5">
          <div className="font-mono text-[10px] tracking-[3px] text-[#444] mb-2">{group.label}</div>
          <div className="flex flex-col gap-1.5">
            {group.items.map(n => (
              <NotifRow
                key={n.id}
                n={n}
                navigate={navigate}
                onFollow={() => handleFollow(n)}
                onInvitation={(action) => handleInvitation(n, action)}
                onJoinRequest={(action, playerId) => handleJoinRequest(n, action, playerId)}
                onCollabInvite={(action) => handleCollabInvite(n, action)}
                onTransfer={(action) => handleTransfer(n, action)}
              />
            ))}
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => load(offset, false)}
            disabled={loadingMore}
            className="text-[12px] font-mono text-muted hover:text-white transition-colors cursor-pointer bg-transparent border border-border-strong px-4 py-2 rounded disabled:opacity-40"
          >
            {loadingMore ? 'Cargando...' : 'Cargar más'}
          </button>
        </div>
      )}
    </div>
  );
}

function NotifRow({ n, navigate, onFollow, onInvitation, onJoinRequest, onCollabInvite, onTransfer }) {
  const unread = !n.read;
  const isAdmin = n.type === 'admin_message';
  const isOwnership = n.type === 'ownership_received';
  const isSystem = isAdmin || isOwnership;
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border transition-colors ${unread ? 'bg-surface border-brand/20' : 'bg-surface border-border-mid'}`}>
      {unread && <div className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full bg-brand" />}
      <div className={`shrink-0 ${unread ? '' : 'ml-[18px]'}`}>
        {isSystem ? (
          <div className="w-[38px] h-[38px] rounded-full bg-brand/15 border border-brand/30 flex items-center justify-center text-brand text-[16px]">{isOwnership ? '👑' : '📢'}</div>
        ) : (
          <div
            className="cursor-pointer"
            onClick={() => n.actor_username && navigate(`/u/${n.actor_username}`)}
          >
            <PlayerAvatar
              name={n.actor_name}
              src={n.actor_avatar_url}
              size={38}
              premium={n.actor_is_premium}
            />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <NotifText n={n} navigate={navigate} />
        <div className="text-[10px] font-mono text-dim mt-1">{timeAgo(n.created_at)}</div>
        <NotifActions n={n} onFollow={onFollow} onInvitation={onInvitation} onJoinRequest={onJoinRequest} onCollabInvite={onCollabInvite} onTransfer={onTransfer} />
      </div>
    </div>
  );
}

function NotifText({ n, navigate }) {
  const actorEl = (
    <span
      className="font-semibold text-white cursor-pointer hover:text-brand transition-colors"
      onClick={() => n.actor_username && navigate(`/u/${n.actor_username}`)}
    >
      @{n.actor_username ?? n.actor_name}
    </span>
  );

  if (n.type === 'admin_message') {
    return (
      <div>
        <div className="text-[13px] font-semibold text-white">{n.title}</div>
        <div className="text-[12px] text-secondary mt-0.5 whitespace-pre-wrap">{renderRichText(n.body)}</div>
      </div>
    );
  }
  if (n.type === 'follow') {
    return <div className="text-[13px] text-secondary">{actorEl} te empezó a seguir</div>;
  }
  if (n.type === 'invitation') {
    return (
      <div className="text-[13px] text-secondary">
        {actorEl} te invitó a unirte a{' '}
        {n.group_id ? (
          <span
            onClick={() => navigate(`/cat/${n.group_id}`)}
            className="text-white font-semibold cursor-pointer hover:text-brand transition-colors"
          >
            {n.group_name ?? 'una categoría'}
          </span>
        ) : (
          <span className="text-white font-semibold">{n.group_name ?? 'una categoría'}</span>
        )}
        {n.player_name ? <> como <span className="text-brand">{n.player_name}</span></> : null}
      </div>
    );
  }
  if (n.type === 'new_tournament') {
    return (
      <div className="text-[13px] text-secondary">
        {actorEl} creó el torneo{' '}
        {n.tournament_id && n.group_id ? (
          <span
            onClick={() => navigate(`/cat/${n.group_id}/torneo/${n.tournament_id}`)}
            className="text-white font-semibold cursor-pointer hover:text-brand transition-colors"
          >
            {n.tournament_name ?? 'un torneo'}
          </span>
        ) : (
          <span className="text-white font-semibold">{n.tournament_name ?? 'un torneo'}</span>
        )}
        {' '}en{' '}
        {n.group_id ? (
          <span
            onClick={() => navigate(`/cat/${n.group_id}`)}
            className="text-white font-semibold cursor-pointer hover:text-brand transition-colors"
          >
            {n.group_name ?? 'una categoría'}
          </span>
        ) : (
          <span className="text-white font-semibold">{n.group_name ?? 'una categoría'}</span>
        )}
      </div>
    );
  }
  if (n.type === 'join_request') {
    return (
      <div className="text-[13px] text-secondary">
        {actorEl} solicitó unirse al torneo{' '}
        <span className="text-white font-semibold">{n.tournament_name ?? 'un torneo'}</span>
        {n.requested_player_name ? <> como <span className="text-brand">{n.requested_player_name}</span></> : null}
      </div>
    );
  }
  if (n.type === 'collab_invite') {
    return (
      <div className="text-[13px] text-secondary">
        {actorEl} te invitó a co-organizar{' '}
        {n.group_id ? (
          <span
            onClick={() => navigate(`/cat/${n.group_id}`)}
            className="text-white font-semibold cursor-pointer hover:text-brand transition-colors"
          >
            {n.group_name ?? 'una categoría'}
          </span>
        ) : (
          <span className="text-white font-semibold">{n.group_name ?? 'una categoría'}</span>
        )}
      </div>
    );
  }
  if (n.type === 'ownership_transfer') {
    return (
      <div className="text-[13px] text-secondary">
        {actorEl} quiere transferirte la propiedad de{' '}
        <span className="text-white font-semibold">{n.group_name ?? 'una categoría'}</span>
      </div>
    );
  }
  if (n.type === 'ownership_received') {
    return (
      <div className="text-[13px] text-secondary">
        Ahora sos dueño de{' '}
        {n.group_id ? (
          <span
            onClick={() => navigate(`/cat/${n.group_id}`)}
            className="text-white font-semibold cursor-pointer hover:text-brand transition-colors"
          >
            {n.group_name ?? 'una categoría'}
          </span>
        ) : (
          <span className="text-white font-semibold">{n.group_name ?? 'una categoría'}</span>
        )}{' '}
        porque su organizador eliminó su cuenta.
      </div>
    );
  }
  if (n.type === 'player_unlinked') {
    return (
      <div className="text-[13px] text-secondary">
        {n.body}{' '}
        {n.group_id && (
          <span
            onClick={() => navigate(`/cat/${n.group_id}`)}
            className="text-brand cursor-pointer hover:underline font-mono text-[12px]"
          >
            Ver categoría →
          </span>
        )}
      </div>
    );
  }
  if (n.type === 'club_request') {
    return (
      <div className="text-[13px] text-secondary">
        {actorEl} {n.body}{' '}
        <button
          onClick={() => navigate('/admin/clubs/requests')}
          className="text-brand hover:underline bg-transparent border-none cursor-pointer p-0 font-mono text-[12px]"
        >
          Ver →
        </button>
      </div>
    );
  }
  if (n.type === 'premium_claim') {
    return (
      <div className="text-[13px] text-secondary">
        {actorEl} {n.body}{' '}
        <button
          onClick={() => navigate('/admin/users')}
          className="text-brand hover:underline bg-transparent border-none cursor-pointer p-0 font-mono text-[12px]"
        >
          Ir a usuarios →
        </button>
      </div>
    );
  }
  // Un tipo sin rama propia se leía como una notificación en blanco.
  return <div className="text-[13px] text-secondary">{notifSummary(n)}</div>;
}

function NotifActions({ n, onFollow, onInvitation, onJoinRequest, onCollabInvite, onTransfer }) {
  const [busy, setBusy] = useState(false);
  const [acceptModal, setAcceptModal] = useState(null); // { players: [], selectedId: '' } | null

  async function wrap(fn) {
    if (busy) return;
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  async function openAcceptModal() {
    if (busy) return;
    setBusy(true);
    try {
      const data = await api.joinRequests.get(n.entity_id);
      const players = data.unlinked_players ?? [];
      // Preseleccionar el jugador que pidió el solicitante, si sigue disponible.
      const requested = data.requested_player_id && players.some((p) => p.id === data.requested_player_id)
        ? data.requested_player_id
        : (players[0]?.id ?? '');
      setAcceptModal({ players, selectedId: requested });
    } catch {
      //
    } finally {
      setBusy(false);
    }
  }

  async function confirmAccept() {
    if (!acceptModal?.selectedId) return;
    await wrap(() => onJoinRequest('accept', acceptModal.selectedId));
    setAcceptModal(null);
  }

  if (n.type === 'follow') {
    if (!n.actor_username) return null;
    return (
      <div className="mt-2">
        <button
          onClick={() => wrap(onFollow)}
          disabled={busy}
          className={`text-[11px] font-mono px-3 py-1 rounded border cursor-pointer transition-colors disabled:opacity-40 ${
            n.is_following_back
              ? 'border-border-strong text-muted hover:border-danger hover:text-danger'
              : 'border-brand text-brand hover:bg-brand hover:text-base'
          }`}
        >
          {n.is_following_back ? 'Siguiendo' : 'Seguir'}
        </button>
      </div>
    );
  }

  if (n.type === 'invitation') {
    if (n.invitation_status === 'accepted') {
      return <div className="mt-2 text-[11px] font-mono text-green flex items-center gap-1"><Check size={12} strokeWidth={3} /> Aceptada</div>;
    }
    if (n.invitation_status === 'rejected') {
      return <div className="mt-2 text-[11px] font-mono text-dim">Rechazada</div>;
    }
    if (n.invitation_status === 'pending') {
      return (
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => wrap(() => onInvitation('accept'))}
            disabled={busy}
            className="text-[11px] font-mono px-3 py-1 rounded border border-brand text-brand hover:bg-brand hover:text-base cursor-pointer transition-colors disabled:opacity-40"
          >
            Aceptar
          </button>
          <button
            onClick={() => wrap(() => onInvitation('reject'))}
            disabled={busy}
            className="text-[11px] font-mono px-3 py-1 rounded border border-border-strong text-muted hover:border-danger hover:text-danger cursor-pointer transition-colors disabled:opacity-40"
          >
            Rechazar
          </button>
        </div>
      );
    }
  }

  if (n.type === 'join_request') {
    if (n.request_status === 'accepted') {
      return <div className="mt-2 text-[11px] font-mono text-green flex items-center gap-1"><Check size={12} strokeWidth={3} /> Aceptada</div>;
    }
    if (n.request_status === 'rejected') {
      return <div className="mt-2 text-[11px] font-mono text-dim">Rechazada</div>;
    }
    if (n.request_status === 'pending') {
      return (
        <div className="mt-2">
          {acceptModal ? (
            <div className="flex flex-col gap-2 bg-base border border-border-strong rounded p-3">
              <div className="text-[11px] font-mono text-muted">Vincular a jugador:</div>
              {acceptModal.players.length === 0 ? (
                <div className="text-[11px] font-mono text-dim">No hay jugadores sin vincular en este torneo.</div>
              ) : (
                <select
                  value={acceptModal.selectedId}
                  onChange={(e) => setAcceptModal(m => ({ ...m, selectedId: e.target.value }))}
                  className="bg-surface border border-border-strong text-white text-[12px] font-mono rounded px-2 py-1.5 cursor-pointer"
                >
                  {acceptModal.players.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
              <div className="flex gap-2">
                <button
                  onClick={confirmAccept}
                  disabled={busy || !acceptModal.selectedId}
                  className="text-[11px] font-mono px-3 py-1 rounded border border-brand text-brand hover:bg-brand hover:text-base cursor-pointer transition-colors disabled:opacity-40"
                >
                  {busy ? 'Guardando...' : 'Confirmar'}
                </button>
                <button
                  onClick={() => setAcceptModal(null)}
                  disabled={busy}
                  className="text-[11px] font-mono px-3 py-1 rounded border border-border-strong text-muted hover:text-white cursor-pointer transition-colors disabled:opacity-40"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={openAcceptModal}
                disabled={busy}
                className="text-[11px] font-mono px-3 py-1 rounded border border-brand text-brand hover:bg-brand hover:text-base cursor-pointer transition-colors disabled:opacity-40"
              >
                {busy ? 'Cargando...' : 'Aceptar'}
              </button>
              <button
                onClick={() => wrap(() => onJoinRequest('reject'))}
                disabled={busy}
                className="text-[11px] font-mono px-3 py-1 rounded border border-border-strong text-muted hover:border-danger hover:text-danger cursor-pointer transition-colors disabled:opacity-40"
              >
                Rechazar
              </button>
            </div>
          )}
        </div>
      );
    }
  }

  if (n.type === 'collab_invite') {
    if (n.collab_status === 'accepted') return <div className="mt-2 text-[11px] font-mono text-green flex items-center gap-1"><Check size={12} strokeWidth={3} /> Aceptada</div>;
    if (n.collab_status === 'rejected') return <div className="mt-2 text-[11px] font-mono text-dim">Rechazada</div>;
    if (n.collab_status === 'pending') {
      return (
        <div className="mt-2 flex gap-2">
          <button onClick={() => wrap(() => onCollabInvite('accept'))} disabled={busy}
            className="text-[11px] font-mono px-3 py-1 rounded border border-brand text-brand hover:bg-brand hover:text-base cursor-pointer transition-colors disabled:opacity-40">
            Aceptar
          </button>
          <button onClick={() => wrap(() => onCollabInvite('reject'))} disabled={busy}
            className="text-[11px] font-mono px-3 py-1 rounded border border-border-strong text-muted hover:border-danger hover:text-danger cursor-pointer transition-colors disabled:opacity-40">
            Rechazar
          </button>
        </div>
      );
    }
  }

  if (n.type === 'ownership_transfer') {
    if (n.transfer_status === 'accepted') return <div className="mt-2 text-[11px] font-mono text-green flex items-center gap-1"><Check size={12} strokeWidth={3} /> Aceptada</div>;
    if (n.transfer_status === 'rejected') return <div className="mt-2 text-[11px] font-mono text-dim">Rechazada</div>;
    if (n.transfer_status === 'pending') {
      return (
        <div className="mt-2 flex flex-col gap-1.5">
          <div className="text-[11px] font-mono text-danger/80">Esta acción es irreversible.</div>
          <div className="flex gap-2">
            <button onClick={() => wrap(() => onTransfer('accept'))} disabled={busy}
              className="text-[11px] font-mono px-3 py-1 rounded border border-brand text-brand hover:bg-brand hover:text-base cursor-pointer transition-colors disabled:opacity-40">
              Aceptar
            </button>
            <button onClick={() => wrap(() => onTransfer('reject'))} disabled={busy}
              className="text-[11px] font-mono px-3 py-1 rounded border border-border-strong text-muted hover:border-danger hover:text-danger cursor-pointer transition-colors disabled:opacity-40">
              Rechazar
            </button>
          </div>
        </div>
      );
    }
  }

  return null;
}
