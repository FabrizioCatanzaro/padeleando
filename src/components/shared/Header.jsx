import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { User, CircleHelp, Bell, Download, Volume2, VolumeX, UserPlus, LayoutGrid, CreditCard, Shield, LogOut } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import useHideOnScroll from '../../hooks/useHideOnScroll'
import { openInstallPrompt } from '../../utils/pwa'
import { api } from '../../utils/api'
import { renderRichText } from '../../utils/richText'
import logoUrl from '../../assets/padeleando-logo.webp'
import logoTxtUrl from '../../assets/padeleando-txt.webp'
import PlayerAvatar from './PlayerAvatar'
import { useAlerts } from '../../context/useAlerts'
import { playTone, TONES } from '../../utils/sound'
import { notifTitle, notifSummary } from '../../utils/notifText'
import ShareAppModal from './ShareAppModal'

// Preferencia de sonido de la campana, apagada por defecto.
const SOUND_KEY = 'notif_sound'

const MENU_ITEM = 'w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm font-sans bg-transparent border-0 cursor-pointer transition-colors hover:bg-border-mid'
const MENU_ITEM_ICON = 16


function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d`;
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function NotifItemText({ n, onNavigate }) {
  if (n.type === 'admin_message') return (
    <div>
      <div className="font-semibold text-white text-[12px]">{n.title}</div>
      <div className="text-dim text-[11px] mt-0.5 line-clamp-2">{renderRichText(n.body)}</div>
    </div>
  );
  const actor = <span className="font-semibold text-white">@{n.actor_username ?? n.actor_name}</span>;
  if (n.type === 'follow') return <>{actor} te empezó a seguir</>;
  if (n.type === 'invitation') return (
    <>{actor} te invitó a{' '}
      {n.group_id ? (
        <span
          onClick={(e) => { e.stopPropagation(); onNavigate(`/cat/${n.group_id}`); }}
          className="text-white font-semibold cursor-pointer hover:text-brand transition-colors"
        >{n.group_name ?? 'una categoría'}</span>
      ) : (
        <span className="text-white font-semibold">{n.group_name ?? 'una categoría'}</span>
      )}
      {n.player_name ? <> como <span className="text-brand">{n.player_name}</span></> : null}</>
  );
  if (n.type === 'join_request') return (
    <>{actor} solicitó unirse al torneo{' '}
      <span className="text-white font-semibold">{n.tournament_name ?? 'un torneo'}</span>
      {n.requested_player_name ? <> como <span className="text-brand">{n.requested_player_name}</span></> : null}</>
  );
  if (n.type === 'new_tournament') return (
    <>{actor} creó{' '}
      {n.tournament_id && n.group_id ? (
        <span
          onClick={(e) => { e.stopPropagation(); onNavigate(`/cat/${n.group_id}/torneo/${n.tournament_id}`); }}
          className="text-white font-semibold cursor-pointer hover:text-brand transition-colors"
        >{n.tournament_name ?? 'un torneo'}</span>
      ) : (
        <span className="text-white font-semibold">{n.tournament_name ?? 'un torneo'}</span>
      )}{' '}en{' '}
      {n.group_id ? (
        <span
          onClick={(e) => { e.stopPropagation(); onNavigate(`/cat/${n.group_id}`); }}
          className="text-white font-semibold cursor-pointer hover:text-brand transition-colors"
        >{n.group_name ?? 'una categoría'}</span>
      ) : (
        <span className="text-white font-semibold">{n.group_name ?? 'una categoría'}</span>
      )}</>
  );
  if (n.type === 'collab_invite') return (
    <>{actor} te invitó a co-organizar{' '}
      {n.group_id ? (
        <span
          onClick={(e) => { e.stopPropagation(); onNavigate(`/cat/${n.group_id}`); }}
          className="text-white font-semibold cursor-pointer hover:text-brand transition-colors"
        >{n.group_name ?? 'una categoría'}</span>
      ) : (
        <span className="text-white font-semibold">{n.group_name ?? 'una categoría'}</span>
      )}</>
  );
  if (n.type === 'ownership_transfer') return (
    <>{actor} quiere transferirte la propiedad de{' '}
      <span className="text-white font-semibold">{n.group_name ?? 'una categoría'}</span></>
  );
  if (n.type === 'ownership_received') return (
    <>Ahora sos dueño de{' '}
      {n.group_id ? (
        <span
          onClick={(e) => { e.stopPropagation(); onNavigate(`/cat/${n.group_id}`); }}
          className="text-white font-semibold cursor-pointer hover:text-brand transition-colors"
        >{n.group_name ?? 'una categoría'}</span>
      ) : (
        <span className="text-white font-semibold">{n.group_name ?? 'una categoría'}</span>
      )}{' '}
      porque su organizador eliminó su cuenta.</>
  );
  if (n.type === 'player_unlinked') return (
    <>{n.body}{' '}
      {n.group_id && (
        <span
          onClick={(e) => { e.stopPropagation(); onNavigate(`/cat/${n.group_id}`); }}
          className="text-brand cursor-pointer hover:underline"
        >Ver categoría →</span>
      )}</>
  );
  if (n.type === 'club_request') return <>{actor} {n.body}</>;
  if (n.type === 'premium_claim') return <>{actor} {n.body}</>;
  // Un tipo sin rama propia se leía como una notificación en blanco.
  return <>{notifSummary(n)}</>;
}

export default function Header() {
  const [menuOpen,      setMenuOpen]      = useState(false)
  const [notifOpen,     setNotifOpen]     = useState(false)
  const [notifCount,    setNotifCount]    = useState(0)
  const [notifs,        setNotifs]        = useState([])
  const [notifLoading,  setNotifLoading]  = useState(false)
  const [notifSound,    setNotifSound]    = useState(() => localStorage.getItem(SOUND_KEY) === '1')
  const [shareAppOpen,  setShareAppOpen]  = useState(false)

  const { user, isLoggedIn, logout } = useAuth()
  const { pushAlert } = useAlerts()
  // El intervalo lee el toggle por ref: no queremos reiniciarlo al cambiarlo.
  const soundOnRef  = useRef(notifSound)
  soundOnRef.current = notifSound
  // Contador del ciclo anterior; null hasta la primera respuesta.
  const lastCountRef = useRef(null)
  const { available: canInstallApp } = usePwaInstall()
  const navigate  = useNavigate()
  const location  = useLocation()
  const menuRef   = useRef(null)
  const notifRef  = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current  && !menuRef.current.contains(e.target))  setMenuOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cada 45 s y sólo con la pestaña visible.
  useEffect(() => {
    if (!isLoggedIn) { setNotifCount(0); lastCountRef.current = null; return; }

    const fetchCount = () => {
      if (document.hidden) return;
      api.notifications.count()
        .then(d => {
          const count = d.count ?? 0;
          const prev  = lastCountRef.current;
          lastCountRef.current = count;
          setNotifCount(count);
          // Sólo cuando sube: si no, cada recarga repetiría la última pendiente.
          if (prev == null || count <= prev || !d.latest) return;
          if (soundOnRef.current) playTone(TONES.notification);
          pushAlert({
            kind: 'notification',
            title: notifTitle(d.latest),
            body: notifSummary(d.latest),
            onClick: () => navigate('/notifications'),
          });
        })
        .catch(() => {});
    };

    fetchCount();
    const id = setInterval(fetchCount, 45_000);
    // Al volver a la pestaña, ponerse al día sin esperar al próximo intervalo.
    document.addEventListener('visibilitychange', fetchCount);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', fetchCount);
    };
  }, [isLoggedIn, pushAlert, navigate])

  function toggleNotifSound() {
    setNotifSound(v => {
      const next = !v;
      localStorage.setItem(SOUND_KEY, next ? '1' : '0');
      if (next) playTone(TONES.confirm); // el gesto habilita el audio del navegador
      return next;
    });
  }

  const openNotifications = useCallback(async () => {
    if (notifOpen) { setNotifOpen(false); return; }
    setMenuOpen(false);
    setNotifOpen(true);
    setNotifLoading(true);
    try {
      const data = await api.notifications.list(8);
      setNotifs(data);
      if (notifCount > 0) {
        api.notifications.markAllRead().catch(() => {});
        setNotifCount(0);
      }
    } catch { /* ignore */ }
    finally { setNotifLoading(false); }
  }, [notifOpen, notifCount])

  function updateNotif(id, patch) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n));
  }

  async function handleFollow(n) {
    try {
      if (n.is_following_back) {
        await api.follows.unfollow(n.actor_username);
        updateNotif(n.id, { is_following_back: false });
      } else {
        await api.follows.follow(n.actor_username);
        updateNotif(n.id, { is_following_back: true });
      }
    } catch { /* ignore */ }
  }

  async function handleInvitation(n, action) {
    try {
      await api.invitations.respond(n.entity_id, action);
      updateNotif(n.id, { invitation_status: action === 'accept' ? 'accepted' : 'rejected' });
    } catch { /* ignore */ }
  }

  async function handleJoinRequest(n, action, playerId) {
    try {
      if (action === 'accept') {
        await api.joinRequests.accept(n.entity_id, playerId);
      } else {
        await api.joinRequests.reject(n.entity_id);
      }
      updateNotif(n.id, { request_status: action === 'accept' ? 'accepted' : 'rejected' });
    } catch { /* ignore */ }
  }

  async function handleCollabInvite(n, action) {
    try {
      await api.collaborators.respondInvite(n.entity_id, action);
      updateNotif(n.id, { collab_status: action === 'accept' ? 'accepted' : 'rejected' });
    } catch { /* ignore */ }
  }

  async function handleTransfer(n, action) {
    try {
      await api.transfers.respond(n.entity_id, action);
      updateNotif(n.id, { transfer_status: action === 'accept' ? 'accepted' : 'rejected' });
    } catch { /* ignore */ }
  }

  // Con un desplegable abierto el header se queda quieto: si se ocultara, se
  // llevaría el menú o las notificaciones con él.
  const hideHeader = useHideOnScroll({ disabled: menuOpen || notifOpen || shareAppOpen });

  function go(path) {
    setMenuOpen(false);
    navigate(path);
  }

  // Salida permanente para quien cerró el cartel automático sin querer.
  const installItem = canInstallApp && (
    <button
      onClick={() => { setMenuOpen(false); openInstallPrompt(); }}
      className={`${MENU_ITEM} text-content hover:text-white`}
    >
      <Download size={MENU_ITEM_ICON} className="shrink-0" />
      Instalar app
    </button>
  );

  return (
    <div
      className={`sticky top-0 z-40 px-5 py-3 flex justify-between items-center border-b border-border bg-base transition-transform duration-300 ${
        hideHeader ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      {/* Logo */}
      <div
        className="flex flex-row gap-2 items-center cursor-pointer"
        onClick={() => location.pathname === '/' ? navigate(0) : navigate('/')}
      >
        {/* width/height explícitos: sin ellos el navegador no reserva espacio
            hasta que la imagen carga, y el layout salta. Lighthouse lo midió
            como un CLS de 0,685 originado en este <img>. */}
        <img className="w-8 hidden md:block" src={logoUrl} width="32" height="32" alt="" />
        <img className="h-9" src={logoTxtUrl} width="174" height="36" alt="Padeleando" />
      </div>

      <div className="flex items-center gap-2">
        {/* Bell — notificaciones */}
        {isLoggedIn && (
          <div className="relative" ref={notifRef}>
            <button
              onClick={openNotifications}
              className="relative bg-transparent border border-border-strong p-2 rounded-lg cursor-pointer text-muted hover:text-soft hover:border-border-mid transition-colors"
              aria-label="Notificaciones"
            >
              <Bell size={18} />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand text-base text-[9px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none animate-pulse">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 bg-surface border border-border-strong rounded-xl z-50 overflow-hidden shadow-2xl" style={{ width: 340 }}>
                <div className="px-4 py-3 flex items-center justify-between border-b border-border-mid">
                  <span className="text-[10px] font-mono tracking-widest text-muted">NOTIFICACIONES</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={toggleNotifSound}
                      title={notifSound ? 'Silenciar avisos' : 'Avisar con sonido'}
                      aria-label={notifSound ? 'Silenciar avisos' : 'Avisar con sonido'}
                      className={`bg-transparent border-none cursor-pointer transition-colors ${notifSound ? 'text-brand' : 'text-dim hover:text-soft'}`}
                    >
                      {notifSound ? <Volume2 size={14} /> : <VolumeX size={14} />}
                    </button>
                    <Link
                      to="/notifications"
                      onClick={() => setNotifOpen(false)}
                      className="text-[10px] font-mono text-dim hover:text-soft transition-colors"
                    >
                      Ver todas
                    </Link>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifLoading ? (
                    <div className="px-4 py-6 text-center text-dim text-xs font-mono">Cargando...</div>
                  ) : notifs.length === 0 ? (
                    <div className="px-4 py-8 text-center text-dim text-xs font-mono">Sin notificaciones</div>
                  ) : (
                    notifs.map(n => (
                      <DropdownNotifItem
                        key={n.id}
                        n={n}
                        onNavigate={(path) => { setNotifOpen(false); navigate(path); }}
                        onFollow={() => handleFollow(n)}
                        onInvitation={(action) => handleInvitation(n, action)}
                        onJoinRequest={(action, playerId) => handleJoinRequest(n, action, playerId)}
                        onCollabInvite={(action) => handleCollabInvite(n, action)}
                        onTransfer={(action) => handleTransfer(n, action)}
                      />
                    ))
                  )}
                </div>

                <div className="border-t border-border-mid px-4 py-3">
                  <Link
                    to="/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="text-[11px] font-mono text-brand hover:brightness-110 transition-colors"
                  >
                    Ver historial completo →
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => { setNotifOpen(false); setMenuOpen(o => !o); }}
            aria-label={isLoggedIn ? 'Abrir menú de tu cuenta' : 'Iniciar sesión'}
            aria-expanded={menuOpen}
            className={`relative flex items-center bg-transparent rounded-full cursor-pointer transition-opacity hover:opacity-80 ${isLoggedIn ? 'p-0 border-0' : 'p-2 border border-border-strong text-muted hover:text-soft rounded-lg'}`}
          >
            {isLoggedIn
              ? <PlayerAvatar name={user?.name} src={user?.avatar_url ?? null} size={46} premium={user?.subscription?.plan === 'premium'} />
              : <User size={18} />}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 bg-surface-alt border border-border-strong rounded-xl min-w-56 z-50 overflow-hidden shadow-2xl">
              {isLoggedIn ? (
                <>
                  {/* Header del menú — avatar + nombre */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 border-b border-border-mid cursor-pointer hover:bg-border-mid transition-colors"
                    onClick={() => go(`/u/${user?.username}`)}
                  >
                    <PlayerAvatar name={user?.name} src={user?.avatar_url ?? null} size={38} premium={user?.subscription?.plan === 'premium'} />
                    <div className="min-w-0">
                      <div className="text-sm text-white font-sans font-semibold truncate">{user?.name}</div>
                      <div className="text-[11px] font-mono text-dim truncate">@{user?.username}</div>
                    </div>
                  </div>

                  <div className="py-1">
                    <button onClick={() => go('/')}
                      className={`${MENU_ITEM} text-content hover:text-white`}>
                      <LayoutGrid size={MENU_ITEM_ICON} className="shrink-0" />
                      Mis categorías
                    </button>
                    <button onClick={() => go('/subscription/manage')}
                      className={`${MENU_ITEM} text-content hover:text-white`}>
                      <CreditCard size={MENU_ITEM_ICON} className="shrink-0" />
                      Mi plan
                    </button>
                    <button onClick={() => { setMenuOpen(false); setShareAppOpen(true); }}
                      className={`${MENU_ITEM} text-content hover:text-white`}>
                      <UserPlus size={MENU_ITEM_ICON} className="shrink-0" />
                      Invitar amigos
                    </button>
                    <Link
                      to="/tutorial"
                      onClick={() => setMenuOpen(false)}
                      className={`${MENU_ITEM} text-content hover:text-white`}
                    >
                      <CircleHelp size={MENU_ITEM_ICON} className="shrink-0" />
                      Ayuda
                    </Link>
                    {installItem}
                    {user?.role === 'admin' && (
                      <button onClick={() => go('/admin')}
                        className={`${MENU_ITEM} text-content hover:text-white`}>
                        <Shield size={MENU_ITEM_ICON} className="shrink-0" />
                        Admin
                      </button>
                    )}
                  </div>

                  <div className="border-t border-border-mid py-1">
                    <button
                      onClick={() => { setMenuOpen(false); logout(); navigate('/'); }}
                      className={`${MENU_ITEM} text-danger`}
                    >
                      <LogOut size={MENU_ITEM_ICON} className="shrink-0" />
                      Cerrar sesión
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-1">
                  <button onClick={() => go('/login')}
                    className={`${MENU_ITEM} text-content hover:text-white`}>
                    <User size={MENU_ITEM_ICON} className="shrink-0" />
                    Iniciar sesión
                  </button>
                  <Link
                    to="/tutorial"
                    onClick={() => setMenuOpen(false)}
                    className={`${MENU_ITEM} text-content hover:text-white`}
                  >
                    <CircleHelp size={MENU_ITEM_ICON} className="shrink-0" />
                    Ayuda
                  </Link>
                  {installItem}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {shareAppOpen && <ShareAppModal onClose={() => setShareAppOpen(false)} />}
    </div>
  )
}

function DropdownNotifItem({ n, onNavigate, onFollow, onInvitation, onJoinRequest, onCollabInvite, onTransfer }) {
  const [busy, setBusy] = useState(false);
  const [acceptModal, setAcceptModal] = useState(null); // { players: [], selectedId: '' } | null
  const unread = !n.read;

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
      setAcceptModal({ players: data.unlinked_players ?? [], selectedId: data.unlinked_players?.[0]?.id ?? '' });
    } catch { /* ignore */ } finally { setBusy(false); }
  }

  async function confirmAccept() {
    if (!acceptModal?.selectedId) return;
    await wrap(() => onJoinRequest('accept', acceptModal.selectedId));
    setAcceptModal(null);
  }

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-b border-border-mid last:border-b-0 transition-colors ${unread ? 'bg-brand/5' : ''} ${(n.type === 'admin_message' || n.type === 'club_request' || n.type === 'premium_claim') ? 'cursor-pointer hover:bg-white/5' : ''}`}
      onClick={
        n.type === 'admin_message' ? () => onNavigate('/notifications')
          : n.type === 'club_request' ? () => onNavigate('/admin/clubs/requests')
          : n.type === 'premium_claim' ? () => onNavigate('/admin/users')
          : undefined
      }
    >
      {unread && <div className="shrink-0 mt-2.5 w-1.5 h-1.5 rounded-full bg-brand flex-none" />}
      <div className={`shrink-0 ${unread ? '' : 'ml-[18px]'}`}>
        {(n.type === 'admin_message' || n.type === 'ownership_received') ? (
          <div className="w-8 h-8 rounded-full bg-brand/15 border border-brand/30 flex items-center justify-center text-[14px]">{n.type === 'ownership_received' ? '👑' : '📢'}</div>
        ) : (
          <div
            className="cursor-pointer"
            onClick={() => n.actor_username && onNavigate(`/u/${n.actor_username}`)}
          >
            <PlayerAvatar name={n.actor_name} src={n.actor_avatar_url} size={32} premium={n.actor_is_premium} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-secondary leading-snug">
          <NotifItemText n={n} onNavigate={onNavigate} />
        </div>
        <div className="text-[10px] font-mono text-dim mt-0.5">{timeAgo(n.created_at)}</div>

        {/* Actions */}
        {n.type === 'follow' && n.actor_username && (
          <button
            onClick={() => wrap(onFollow)}
            disabled={busy}
            className={`mt-1.5 text-[10px] font-mono px-2.5 py-0.5 rounded border cursor-pointer transition-colors disabled:opacity-40 ${
              n.is_following_back
                ? 'border-border-strong text-dim hover:border-danger hover:text-danger'
                : 'border-brand/60 text-brand hover:bg-brand hover:text-base'
            }`}
          >
            {n.is_following_back ? 'Siguiendo' : 'Seguir'}
          </button>
        )}

        {n.type === 'invitation' && (
          n.invitation_status === 'accepted' ? (
            <div className="mt-1.5 text-[10px] font-mono text-green">✓ Aceptada</div>
          ) : n.invitation_status === 'rejected' ? (
            <div className="mt-1.5 text-[10px] font-mono text-dim">Rechazada</div>
          ) : n.invitation_status === 'pending' ? (
            <div className="mt-1.5 flex gap-1.5">
              <button onClick={() => wrap(() => onInvitation('accept'))} disabled={busy}
                className="text-[10px] font-mono px-2.5 py-0.5 rounded border border-brand/60 text-brand hover:bg-brand hover:text-base cursor-pointer transition-colors disabled:opacity-40">
                Aceptar
              </button>
              <button onClick={() => wrap(() => onInvitation('reject'))} disabled={busy}
                className="text-[10px] font-mono px-2.5 py-0.5 rounded border border-border-strong text-dim hover:border-danger hover:text-danger cursor-pointer transition-colors disabled:opacity-40">
                Rechazar
              </button>
            </div>
          ) : null
        )}

        {n.type === 'join_request' && (
          n.request_status === 'accepted' ? (
            <div className="mt-1.5 text-[10px] font-mono text-green">✓ Aceptada</div>
          ) : n.request_status === 'rejected' ? (
            <div className="mt-1.5 text-[10px] font-mono text-dim">Rechazada</div>
          ) : n.request_status === 'pending' ? (
            acceptModal ? (
              <div className="mt-1.5 flex flex-col gap-1.5">
                {acceptModal.players.length === 0 ? (
                  <div className="text-[10px] font-mono text-dim">Sin jugadores sin vincular.</div>
                ) : (
                  <select
                    value={acceptModal.selectedId}
                    onChange={(e) => setAcceptModal(m => ({ ...m, selectedId: e.target.value }))}
                    className="bg-surface border border-border-strong text-white text-[11px] font-mono rounded px-1.5 py-1 cursor-pointer w-full"
                  >
                    {acceptModal.players.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
                <div className="flex gap-1.5">
                  <button onClick={confirmAccept} disabled={busy || !acceptModal.selectedId}
                    className="text-[10px] font-mono px-2.5 py-0.5 rounded border border-brand/60 text-brand hover:bg-brand hover:text-base cursor-pointer transition-colors disabled:opacity-40">
                    {busy ? '...' : 'Confirmar'}
                  </button>
                  <button onClick={() => setAcceptModal(null)} disabled={busy}
                    className="text-[10px] font-mono px-2.5 py-0.5 rounded border border-border-strong text-dim hover:text-white cursor-pointer transition-colors disabled:opacity-40">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-1.5 flex gap-1.5">
                <button onClick={openAcceptModal} disabled={busy}
                  className="text-[10px] font-mono px-2.5 py-0.5 rounded border border-brand/60 text-brand hover:bg-brand hover:text-base cursor-pointer transition-colors disabled:opacity-40">
                  {busy ? '...' : 'Aceptar'}
                </button>
                <button onClick={() => wrap(() => onJoinRequest('reject'))} disabled={busy}
                  className="text-[10px] font-mono px-2.5 py-0.5 rounded border border-border-strong text-dim hover:border-danger hover:text-danger cursor-pointer transition-colors disabled:opacity-40">
                  Rechazar
                </button>
              </div>
            )
          ) : null
        )}

        {n.type === 'collab_invite' && (
          n.collab_status === 'accepted' ? (
            <div className="mt-1.5 text-[10px] font-mono text-green">✓ Aceptada</div>
          ) : n.collab_status === 'rejected' ? (
            <div className="mt-1.5 text-[10px] font-mono text-dim">Rechazada</div>
          ) : n.collab_status === 'pending' ? (
            <div className="mt-1.5 flex gap-1.5">
              <button onClick={() => wrap(() => onCollabInvite('accept'))} disabled={busy}
                className="text-[10px] font-mono px-2.5 py-0.5 rounded border border-brand/60 text-brand hover:bg-brand hover:text-base cursor-pointer transition-colors disabled:opacity-40">
                Aceptar
              </button>
              <button onClick={() => wrap(() => onCollabInvite('reject'))} disabled={busy}
                className="text-[10px] font-mono px-2.5 py-0.5 rounded border border-border-strong text-dim hover:border-danger hover:text-danger cursor-pointer transition-colors disabled:opacity-40">
                Rechazar
              </button>
            </div>
          ) : null
        )}

        {n.type === 'ownership_transfer' && (
          n.transfer_status === 'accepted' ? (
            <div className="mt-1.5 text-[10px] font-mono text-green">✓ Aceptada</div>
          ) : n.transfer_status === 'rejected' ? (
            <div className="mt-1.5 text-[10px] font-mono text-dim">Rechazada</div>
          ) : n.transfer_status === 'pending' ? (
            <div className="mt-1.5 flex flex-col gap-1">
              <div className="text-[10px] font-mono text-danger/80">Acción irreversible</div>
              <div className="flex gap-1.5">
                <button onClick={() => wrap(() => onTransfer('accept'))} disabled={busy}
                  className="text-[10px] font-mono px-2.5 py-0.5 rounded border border-brand/60 text-brand hover:bg-brand hover:text-base cursor-pointer transition-colors disabled:opacity-40">
                  Aceptar
                </button>
                <button onClick={() => wrap(() => onTransfer('reject'))} disabled={busy}
                  className="text-[10px] font-mono px-2.5 py-0.5 rounded border border-border-strong text-dim hover:border-danger hover:text-danger cursor-pointer transition-colors disabled:opacity-40">
                  Rechazar
                </button>
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
