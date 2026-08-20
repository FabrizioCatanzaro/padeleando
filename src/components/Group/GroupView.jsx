/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import Modal from '../shared/Modal';
import { api } from '../../utils/api';
import { adaptTournament, isDeletedAccount, entityClub, isLive } from '../../utils/helpers';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useParams } from 'react-router-dom';
import { Trash2, Pencil, Globe, Lock, ChevronLeft, Plus, Smile, Check, X, Users, User, User2, Building2, Share2, UserPlus, Star, ArrowLeftRight, Link2, LogOut, Copy, Unlink, BarChart3, MapPin, CalendarDays } from 'lucide-react';
import Btn from '../shared/Btn';
import { Skeleton, CardSkeleton } from '../shared/Skeleton';
// Recharts son 111 KB: nunca debe entrar en el bundle inicial. Ahora además
// vive detrás de una pestaña, así que sólo se descarga si la abren.
const HistoricalStats = lazy(() => import('../Stats/Stats').then(m => ({ default: m.HistoricalStats })));
import GroupTournaments from './GroupTournaments';
import GroupPlayers from './GroupPlayers';
import GroupClubs from './GroupClubs';
import { EMPTY_FILTERS, filterTournaments, countActiveFilters, sortTournaments, DEFAULT_SORT } from '../../utils/tournamentFilters';
import GroupHero from './GroupHero';
import ClubSelector from '../shared/ClubSelector';
import PremiumModal from '../shared/PremiumModal';
import { FREE_TOURNAMENTS_PER_MONTH } from '../../utils/plan';
import ActionMenu from '../shared/ActionMenu';
import SignupPricePill from '../shared/SignupPricePill';
import ShareCategoryModal from '../shared/ShareCategoryModal';
import SignupEditor from '../shared/SignupEditor';
import { profileContacts } from '../../utils/signup';
import PlayerAvatar from '../shared/PlayerAvatar';
import LazyNotFound from '../NotFound/LazyNotFound';

const EMOJI_LIST = ['🔥','⚡','🚻','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🎲','🔝','🚨','🌹','🌼','🥑','🍺','🍷','🧉','🍕','❄️','❤️‍🩹','💫','☢️','💸','🗿','♂️','♀️','🪄','🎉','👑']

const TABS = [
  { id: 'torneos',      label: 'TORNEOS',      icon: CalendarDays },
  { id: 'estadisticas', label: 'ESTADÍSTICAS', icon: BarChart3 },
  { id: 'jugadores',    label: 'JUGADORES',    icon: Users },
  { id: 'canchas',      label: 'CANCHAS',      icon: MapPin },
];

export default function GroupView() {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [deleteModal,      setDeleteModal]      = useState(false);
  const [deleteInput,      setDeleteInput]      = useState('');
  const [editingGroup,     setEditingGroup]     = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumReason,    setPremiumReason]    = useState(null);
  const [allTournaments, setAllTournaments] = useState([]);
  const [histLoaded,     setHistLoaded]     = useState(false);
  const [tab,            setTab]            = useState('torneos');
  const [showShareModal,   setShowShareModal]   = useState(false);
  const [favBusy,          setFavBusy]          = useState(false);
  const [visibleCount,     setVisibleCount]     = useState(5);
  const [filters,          setFilters]          = useState(EMPTY_FILTERS);
  const [filtersOpen,      setFiltersOpen]      = useState(false);
  const [sort,             setSort]             = useState(DEFAULT_SORT);

  // edit fields
  const [editName,     setEditName]     = useState('');
  const [editDesc,     setEditDesc]     = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editEmojis,   setEditEmojis]   = useState([]);
  const [editClub,     setEditClub]     = useState(null);
  const [editSignup,   setEditSignup]   = useState({ open: false, price: null, unit: 'player', contacts: [] });

  // modals
  const [showEmojiModal, setShowEmojiModal] = useState(false);

  // co-organizadores + transferencia
  const [showCollabModal,   setShowCollabModal]   = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [collabIdentifier,  setCollabIdentifier]  = useState('');
  const [transferIdentifier, setTransferIdentifier] = useState('');
  const [collabLink,        setCollabLink]        = useState('');
  const [transferLink,      setTransferLink]      = useState('');
  const [transferConfirm,   setTransferConfirm]   = useState(false);
  const [collabBusy,        setCollabBusy]        = useState(false);
  const [transferBusy,      setTransferBusy]      = useState(false);
  const [removeCollabTarget, setRemoveCollabTarget] = useState(null); // { user_id, name, username } | null
  const [leaveConfirm,      setLeaveConfirm]      = useState(false);

  // invitación de jugador pendiente para quien mira (viene en GET /groups/:id)
  const [invitationBusy,    setInvitationBusy]    = useState(false);

  // Reclamar un lugar en la categoría
  const [claimPick,      setClaimPick]      = useState('');
  const [claimBusy,      setClaimBusy]      = useState(false);
  const [claimRequested, setClaimRequested] = useState(false);
  const [unlinkConfirm,     setUnlinkConfirm]     = useState(false);
  const [unlinkBusy,        setUnlinkBusy]        = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  // El histórico trae TODOS los partidos de la categoría y sólo lo consumen las
  // pestañas de estadísticas y canchas. Antes se pedía siempre al entrar; ahora
  // se pide la primera vez que abren alguna de las dos.
  async function handleAllTournaments() {
    try {
      const data = await api.groups.history(groupId);
      setAllTournaments(data.map(adaptTournament));
    } catch {
      // El historial es accesorio: si falla, la categoría se muestra igual.
    } finally {
      setHistLoaded(true);
    }
  }

  function refreshGroup() {
    return api.groups.get(groupId).then(setGroup);
  }

  async function toggleFavorite() {
    if (favBusy || !group) return;
    const wasFavorite = !!group.is_favorite;
    setFavBusy(true);
    // Optimista: la estrella y el contador responden sin esperar el round-trip.
    setGroup(prev => ({
      ...prev,
      is_favorite: !wasFavorite,
      favorites_count: Math.max(0, (prev.favorites_count ?? 0) + (wasFavorite ? -1 : 1)),
    }));
    try {
      if (wasFavorite) await api.groups.unfavorite(groupId);
      else             await api.groups.favorite(groupId);
      showToast(wasFavorite ? 'Sacaste la categoría de favoritas.' : 'Categoría agregada a favoritas.');
    } catch (e) {
      setGroup(prev => ({
        ...prev,
        is_favorite: wasFavorite,
        favorites_count: Math.max(0, (prev.favorites_count ?? 0) + (wasFavorite ? 1 : -1)),
      }));
      showToast(e.message, 'error');
    } finally {
      setFavBusy(false);
    }
  }

  // Reclamar un lugar libre. La solicitud viaja contra una jornada concreta
  // (es lo que espera el endpoint), pero el vínculo que resulta vale para toda
  // la categoría: una cuenta ocupa un solo slot por categoría.
  async function requestClaim(target) {
    if (claimBusy || !target?.tournament_id) return;
    setClaimBusy(true);
    try {
      await api.joinRequests.send(target.tournament_id, target.id);
      setClaimRequested(true);
      showToast('Solicitud enviada al organizador.');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setClaimBusy(false);
    }
  }

  async function respondInvitation(action) {
    const inv = group?.my_invitation;
    if (invitationBusy || !inv) return;
    setInvitationBusy(true);
    try {
      await api.invitations.respond(inv.id, action);
      showToast(action === 'accept'
        ? `Te uniste a la categoría como ${inv.player_name}.`
        : 'Invitación rechazada.');
      await refreshGroup();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setInvitationBusy(false);
    }
  }

  useEffect(() => {
    setNotFound(false);
    // Sin este catch un id inexistente dejaba el esqueleto girando para siempre.
    api.groups.get(groupId)
      .then(setGroup)
      .catch((e) => { if (e.status === 404) setNotFound(true); else showToast(e.message, 'error'); });
    setAllTournaments([]);
    setHistLoaded(false);
    setTab('torneos');
    setVisibleCount(5);
    setFilters(EMPTY_FILTERS);
    setFiltersOpen(false);
  }, [groupId]);

  // Historial bajo demanda: sólo lo necesitan Estadísticas y Canchas.
  useEffect(() => {
    if ((tab === 'estadisticas' || tab === 'canchas') && !histLoaded) handleAllTournaments();
  }, [tab, histLoaded]);

  function toggleEmoji(e) {
    setEditEmojis(prev =>
      prev.includes(e) ? prev.filter(x => x !== e) : prev.length < 2 ? [...prev, e] : prev
    );
  }

  function startEdit() {
    setEditName(group.name);
    setEditDesc(group.description ?? '');
    setEditIsPublic(group.is_public);
    setEditEmojis(group.emojis ?? []);
    setEditClub(entityClub(group));
    setEditSignup({
      open:     group.signup_open ?? false,
      price:    group.signup_price ?? null,
      unit:     group.signup_price_unit ?? 'player',
      contacts: group.signup_contacts ?? [],
    });
    setEditingGroup(true);
  }

  async function handleSaveGroup() {
    setSaving(true);
    try {
      const updated = await api.groups.update(groupId, {
        name:          editName.trim(),
        description:   editDesc.trim(),
        is_public:     editIsPublic,
        emojis:        editEmojis,
        club_id:       editClub?.pending ? null : (editClub?.id ?? null),
        pending_club_request_id: editClub?.pending ? editClub.request_id : null,
        signup_open:       editSignup.open,
        signup_price:      editSignup.price,
        signup_price_unit: editSignup.unit,
        // Los vacíos no viajan: el backend rechaza un contacto sin valor.
        signup_contacts:   editSignup.contacts.filter((c) => c.value.trim()),
      });
      // El PUT devuelve sólo las columnas de groups: los datos del club los
      // aporta el que ya está elegido, así se evita releer la categoría.
      setGroup(prev => ({
        ...prev, ...updated,
        club_name:          editClub?.pending ? null : (editClub?.name ?? null),
        club_location_name: editClub?.pending ? null : (editClub?.location_name ?? null),
        club_courts:        editClub?.pending ? null : (editClub?.courts ?? null),
        club_photo_url:     editClub?.pending ? null : (editClub?.photo_url ?? null),
        pending_club_name:  editClub?.pending ? editClub.name : null,
      }));
      setEditingGroup(false);
      showToast('Categoría guardada');
    } finally {
      setSaving(false);
    }
  }

  // ── Co-organizadores ──────────────────────────────────────────────────
  async function handleInviteCollab() {
    if (!collabIdentifier.trim()) return;
    setCollabBusy(true);
    try {
      const res = await api.collaborators.invite(groupId, { identifier: collabIdentifier.trim() });
      setCollabIdentifier('');
      showToast(`Invitación enviada a @${res.invited?.username ?? ''}`);
      await refreshGroup();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setCollabBusy(false);
    }
  }

  async function handleCollabLink() {
    setCollabBusy(true);
    try {
      const res = await api.collaborators.invite(groupId, { link: true });
      setCollabLink(res.url);
      await navigator.clipboard.writeText(res.url).catch(() => {});
      showToast('Link de invitación copiado');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setCollabBusy(false);
    }
  }

  async function handleRemoveCollab(userId) {
    try {
      await api.collaborators.remove(groupId, userId);
      showToast('Co-organizador eliminado', 'error');
      await refreshGroup();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setRemoveCollabTarget(null);
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Link copiado');
    } catch {
      showToast('No se pudo copiar', 'error');
    }
  }

  // Desvincular mi cuenta del slot de jugador en esta categoría. El slot y sus
  // partidos quedan; sólo dejan de contar en mi perfil.
  async function handleUnlinkSelf() {
    const player = group?.my_player;
    if (unlinkBusy || !player) return;
    setUnlinkBusy(true);
    try {
      await api.players.unlink(player.id, groupId);
      setUnlinkConfirm(false);
      showToast(`Te desvinculaste de ${player.name}`, 'info');
      await refreshGroup();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setUnlinkBusy(false);
    }
  }

  async function handleLeaveCollab() {
    try {
      await api.collaborators.leave(groupId);
      showToast('Saliste como co-organizador', 'info');
      navigate('/');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  // ── Transferencia de propiedad ────────────────────────────────────────
  async function handleTransfer() {
    if (!transferIdentifier.trim() || !transferConfirm) return;
    setTransferBusy(true);
    try {
      const res = await api.transfers.start(groupId, { identifier: transferIdentifier.trim() });
      setTransferIdentifier('');
      setTransferConfirm(false);
      showToast(`Transferencia enviada a @${res.target?.username ?? ''}`);
      await refreshGroup();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setTransferBusy(false);
    }
  }

  async function handleTransferLink() {
    if (!transferConfirm) return;
    setTransferBusy(true);
    try {
      const res = await api.transfers.start(groupId, { link: true });
      setTransferLink(res.url);
      await navigator.clipboard.writeText(res.url).catch(() => {});
      showToast('Link de transferencia copiado');
      await refreshGroup();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setTransferBusy(false);
    }
  }

  async function handleCancelTransfer() {
    try {
      await api.transfers.cancel(groupId);
      setTransferLink('');
      showToast('Transferencia cancelada', 'info');
      await refreshGroup();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  useDocumentTitle(notFound ? 'Categoría no encontrada' : group?.name);

  const allT = group?.tournaments;
  const filtered = useMemo(
    () => sortTournaments(filterTournaments(allT ?? [], filters), sort),
    [allT, filters, sort],
  );
  const activeFilters = countActiveFilters(filters);

  function changeFilters(next) {
    setFilters(next);
    setVisibleCount(5);
  }

  // min-h-screen no es decorativo: el esqueleto reservaba 406 px para una lista
  // que rinde 1547, así que el pie quedaba visible en y=760 y el contenido real
  // lo expulsaba de la pantalla. Ese salto solo valía 0,75 de CLS. Reservando
  // el alto de la pantalla el pie arranca bajo el pliegue y no se mueve.
  if (notFound) return <LazyNotFound subject="category" />;

  if (!group) return (
    <div className="bg-base text-content font-sans pb-15 min-h-screen">
      <div className="px-6 pt-6 pb-5 border-b border-border flex flex-col gap-3">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-32" />
        </div>
        <div className="flex flex-col gap-3">
          <CardSkeleton lines={3} />
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
        </div>
      </div>
    </div>
  );

  // is_owner: exclusivo del dueño (editar/borrar categoría, transferir, gestionar co-orgs).
  // can_manage: dueño O co-organizador (crear/gestionar jornadas).
  const isOwner   = group.is_owner ?? (!!user && String(group.user_id) === String(user.id));
  const canManage = group.can_manage ?? isOwner;

  // Slots libres que el visitante podría reclamar. El seleccionado es su
  // elección mientras siga estando disponible; si no, el primero de la lista.
  const claimable = group.claimable_players ?? [];
  const claimId   = claimable.some((p) => p.id === claimPick) ? claimPick : (claimable[0]?.id ?? '');
  const isCollaborator = canManage && !isOwner;

  if (!group.is_public && !canManage) {
    return (
      <div className="bg-base text-content font-sans min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <Lock size={36} className="text-yellow-400" />
        <div className="text-center">
          <div className="font-condensed font-bold text-2xl text-white tracking-wide mb-1">Categoría privada</div>
          <div className="text-muted text-sm">Solo el dueño puede ver esta categoría.</div>
        </div>
        <Btn size="sm" icon={ChevronLeft} onClick={() => navigate('/')} className="mt-2">Volver al inicio</Btn>
      </div>
    );
  }

  async function handleDelete() {
    await api.groups.delete(groupId);
    navigate('/');
  }

  // El dueño y los co-organizadores ven el número, pero no la marcan.
  const canFavorite = !!user && !isOwner && !isCollaborator && group.is_public;
  const favCount    = group.favorites_count ?? 0;
  const favoriteControl = !group.is_public ? null : canFavorite ? (
    <button
      onClick={toggleFavorite}
      disabled={favBusy}
      title={group.is_favorite ? 'Sacar de favoritas' : 'Agregar a favoritas'}
      className={`flex items-center gap-1.5 border rounded-sm px-2.5 py-1.5 text-xs font-mono transition-colors ${favBusy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${
        group.is_favorite
          ? 'text-brand border-brand/40 hover:bg-brand/10'
          : 'text-content border-border-strong hover:bg-border-mid hover:text-white'
      }`}
    >
      <Star size={14} className="shrink-0" fill={group.is_favorite ? 'currentColor' : 'none'} />
      {favCount > 0 && favCount}
    </button>
  ) : favCount > 0 ? (
    <span
      title={`${favCount} ${favCount === 1 ? 'persona la tiene' : 'personas la tienen'} en favoritas`}
      className="flex items-center gap-1.5 border border-border-strong rounded-sm px-2.5 py-1.5 text-xs font-mono text-content"
    >
      <Star size={14} className="shrink-0 text-brand" fill="currentColor" />
      {favCount}
    </span>
  ) : null;

  const collabCount = group.collaborators?.length ?? 0;
  const ownerActions = [
    {
      label: collabCount ? `Co-organizadores (${collabCount})` : 'Co-organizadores',
      icon: <Users size={15} />,
      onClick: () => setShowCollabModal(true),
    },
    { label: 'Transferir propiedad', icon: <ArrowLeftRight size={15} />, onClick: () => setShowTransferModal(true) },
    { label: 'Editar categoría',     icon: <Pencil size={15} />,        onClick: startEdit },
    {
      label: 'Eliminar categoría',
      icon: <Trash2 size={15} />,
      danger: true,
      onClick: () => { setDeleteModal(true); setDeleteInput(''); },
    },
  ];

  // Riel del hero. Todo sale de las jornadas que la vista ya tiene cargadas;
  // player_count lo agrega la consulta del grupo (jugadores distintos, no la
  // suma por jornada, que cuenta dos veces a quien juega en varias).
  const tours      = group.tournaments ?? [];
  const liveCount  = tours.filter(isLive).length;
  const matchCount = tours.reduce((n, t) => n + (t.match_count ?? 0), 0);
  const firstDay   = tours.reduce((min, t) => {
    const d = String(t.event_date ?? t.created_at ?? '').slice(0, 10);
    return d && (!min || d < min) ? d : min;
  }, '');
  // Año completo: "jul 26" se leía como el 26 de julio y no como julio de 2026.
  const sinceLabel = firstDay
    ? new Date(`${firstDay}T00:00`).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' }).replace('.', '')
    : null;

  const heroStats = [
    ...(liveCount > 0 ? [{ value: liveCount, label: 'En vivo', brand: true }] : []),
    { value: tours.length,            label: tours.length === 1 ? 'Torneo' : 'Torneos' },
    { value: group.player_count ?? 0, label: 'Jugadores' },
    { value: matchCount,              label: 'Partidos' },
    ...(sinceLabel ? [{ value: sinceLabel, label: 'Desde' }] : []),
  ];

  // El cupo mensual del plan free se evalúa contra el DUEÑO de la categoría, no
  // contra quien crea: un co-organizador premium no evade el límite del dueño.
  function handleNewTournament() {
    if (!group.owner_is_premium) {
      const now = new Date();
      const thisMonthCount = tours.filter((t) => {
        const d = new Date(t.created_at);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }).length;
      if (thisMonthCount >= FREE_TOURNAMENTS_PER_MONTH) {
        setPremiumReason(`Esta categoría ya usó sus ${FREE_TOURNAMENTS_PER_MONTH} torneos del mes. El cupo se renueva el 1°; los torneos ya creados quedan intactos.`);
        setShowPremiumModal(true);
        return;
      }
    }
    navigate(`/cat/${groupId}/torneo/new`);
  }

  const backBtn = <Btn size="sm" icon={ChevronLeft} onClick={() => navigate('/')}>Volver</Btn>;

  const headerActions = isOwner ? (
    <div className="flex items-center gap-1.5 flex-wrap justify-end">
      {favoriteControl}
      {group.is_public && <Btn size="sm" icon={Share2} onClick={() => setShowShareModal(true)} title="Compartir" />}
      <ActionMenu label="Acciones de la categoría" items={ownerActions} />
    </div>
  ) : (
    <div className="flex items-center gap-2">
      {favoriteControl}
      <Btn size="sm" icon={Share2} onClick={() => setShowShareModal(true)} />
      {isDeletedAccount(group.owner_username) ? (
        <span className="flex gap-2 items-center border border-border-strong rounded-full pl-1 pr-3 py-1">
          <User2 className="text-content" size={13} /><span className="text-sm text-content font-mono">Cuenta eliminada</span>
        </span>
      ) : (
        <span
          className="flex gap-2 items-center bg-surface border border-border-strong rounded-full pl-1 pr-3 py-1 hover:bg-border-mid hover:text-white cursor-pointer transition-colors"
          onClick={() => navigate(`/u/${group.owner_username}`)}
        >
          <PlayerAvatar
            name={group.owner_name ?? group.owner_username ?? '?'}
            src={group.owner_avatar_url}
            size={24}
            premium={!!group.owner_is_premium}
          />
          <span className="text-sm text-content font-mono">@{group.owner_username ?? '—'}</span>
        </span>
      )}
    </div>
  );

  return (
    <div className="bg-base text-content font-sans pb-24 sm:pb-15">
      {editingGroup ? (
        <div className="px-4 sm:px-6 pt-6 pb-5 flex flex-col gap-3 border-b border-border">
          <div className="flex justify-between items-center">{backBtn}</div>
          <div className="min-w-0">

            <div className="flex flex-col gap-4">
              {/* Nombre */}
              <div>
                <label className="block text-[10px] font-mono tracking-widest text-dim mb-1.5">NOMBRE</label>
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={30}
                  className="w-full bg-surface border border-border-mid text-white px-2.5 py-1.5 font-condensed font-bold text-[22px] tracking-wide rounded-sm outline-none"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-[10px] font-mono tracking-widest text-dim mb-1.5">DESCRIPCIÓN (opcional)</label>
                <input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Descripción (opcional)"
                  maxLength={50}
                  className="w-full bg-surface border border-border-mid text-white px-2.5 py-1.5 font-sans text-[13px] rounded-sm outline-none"
                />
              </div>

              {/* Privacidad */}
              <div>
                <label className="block text-[10px] font-mono tracking-widest text-dim mb-1.5">PRIVACIDAD</label>
                <div className="flex gap-2">
                  {[{ val: true, label: 'Público', icon: Globe }, { val: false, label: 'Privado', icon: Lock }].map(v => (
                    <div key={String(v.val)} onClick={() => setEditIsPublic(v.val)}
                      className={`flex items-center gap-2 px-3 py-2 text-xs rounded cursor-pointer border transition-colors bg-transparent ${
                        editIsPublic === v.val
                          ? v.val ? 'border-cyan text-cyan' : 'border-yellow-400 text-yellow-400'
                          : 'border-border-strong text-muted'
                      }`}>
                      <v.icon size={13} />{v.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Club */}
              <div>
                <label className="block text-[10px] font-mono tracking-widest text-dim mb-1.5">CLUB (opcional)</label>
                <ClubSelector value={editClub} onChange={setEditClub} />
                <p className="text-[10px] text-dim font-mono mt-1.5">Se usa como club por defecto en los torneos nuevos.</p>
              </div>

              <div className="border-t border-border-mid pt-4">
                <label className="block text-[10px] font-mono tracking-widest text-dim mb-2.5">INSCRIPCIÓN</label>
                <SignupEditor
                  value={editSignup}
                  onChange={setEditSignup}
                  profile={profileContacts(group.owner_social_links)}
                />
                <p className="text-[10px] text-dim font-mono mt-2">Cada torneo lo hereda y puede cambiarlo.</p>
              </div>

              {/* Íconos */}
              <div>
                <label className="block text-[10px] font-mono tracking-widest text-dim mb-1.5">ÍCONOS (opcional · máx. 2)</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setShowEmojiModal(true)}
                    className="flex items-center gap-2 bg-transparent border border-border-mid text-secondary hover:border-border-strong hover:text-white transition-colors px-3 py-2 rounded text-xs font-mono cursor-pointer">
                    <Smile size={13} />
                    ÍCONOS
                    {editEmojis.length > 0 && <span className="text-brand font-bold">({editEmojis.length}/2)</span>}
                  </button>
                  {editEmojis.length > 0 && (
                    <div className="flex gap-1.5 items-center">
                      {editEmojis.map(e => <span key={e} className="text-xl leading-none">{e}</span>)}
                      <button type="button" onClick={() => setEditEmojis([])}
                        className="ml-1 text-dim hover:text-white transition-colors bg-transparent border-none cursor-pointer">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-1">
                <Btn variant="primary" size="sm" icon={Check} onClick={handleSaveGroup} loading={saving}>GUARDAR</Btn>
                <Btn size="sm" icon={X} onClick={() => setEditingGroup(false)}>CANCELAR</Btn>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <GroupHero
          group={group}
          stats={heroStats}
          isOwner={isOwner}
          back={backBtn}
          actions={headerActions}
        />
      )}

      {/* Carteles contextuales. Van fuera del hero: son transitorios y antes
          empujaban los torneos debajo del pliegue cuando caían varios juntos. */}
      <div className="px-4 sm:px-6 pt-4 flex flex-col gap-2.5 empty:hidden">
        {/* Cartel de co-organizador */}
        {isCollaborator && (
          <div className="flex items-center justify-between gap-2 bg-brand/5 border border-brand/25 rounded-md px-3 py-2">
            <span className="flex items-center gap-2 text-brand text-[12px] font-mono tracking-wide">
              <Users size={14} className="shrink-0" /> Sos co-organizador de esta categoría
            </span>
            <Btn variant="danger" size="sm" icon={LogOut} onClick={() => setLeaveConfirm(true)}>SALIR</Btn>
          </div>
        )}

        {/* Invitación pendiente a jugar en esta categoría. Antes sólo se podía
            responder desde la campana de notificaciones. */}
        {group.my_invitation && (
          <div className="flex items-center justify-between gap-2 flex-wrap bg-brand/5 border border-brand/25 rounded-md px-3 py-2">
            <span className="flex items-center gap-2 text-brand text-[12px] font-mono tracking-wide">
              <UserPlus size={14} className="shrink-0" />
              @{group.my_invitation.invited_by_username} te invitó a unirte como{' '}
              <span className="font-bold">{group.my_invitation.player_name}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <Btn variant="primary" size="sm" icon={Check} disabled={invitationBusy}
                   onClick={() => respondInvitation('accept')}>ACEPTAR</Btn>
              <Btn variant="danger" size="sm" icon={X} disabled={invitationBusy}
                   onClick={() => respondInvitation('reject')}>RECHAZAR</Btn>
            </div>
          </div>
        )}

        {/* Jugás en esta categoría con tu cuenta vinculada */}
        {group.my_player && (
          <div className="flex items-center justify-between gap-2 flex-wrap bg-surface border border-border-mid rounded-md px-3 py-2">
            <span className="flex items-center gap-2 text-content text-[12px] font-mono tracking-wide">
              <User size={14} className="shrink-0 text-green" />
              Jugás en esta categoría como{' '}
              <span className="text-white font-bold">{group.my_player.name}</span>
            </span>
            <Btn variant="danger" size="sm" icon={Unlink} onClick={() => setUnlinkConfirm(true)}>
              DESVINCULARME
            </Btn>
          </div>
        )}

        {/* Reclamar un lugar en la categoría. Antes sólo se podía desde el link
            público de un torneo, así que quien entraba por acá no tenía cómo. */}
        {!group.my_player && !group.my_invitation && claimable.length > 0 && (
          claimRequested ? (
            <div className="flex items-center gap-2 bg-surface border border-border-mid rounded-md px-3 py-2">
              <span className="text-[12px] font-mono text-muted">
                ⏳ Solicitud enviada. Te avisamos cuando el organizador la responda.
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 flex-wrap bg-brand/5 border border-brand/25 rounded-md px-3 py-2">
              <span className="flex items-center gap-2 text-brand text-[12px] font-mono tracking-wide">
                <UserPlus size={14} className="shrink-0" />
                ¿Jugás en esta categoría?
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <select
                  value={claimId}
                  onChange={(e) => setClaimPick(e.target.value)}
                  className="bg-surface border border-brand/40 text-white text-[12px] font-mono rounded px-2 py-1.5 cursor-pointer outline-none max-w-[45vw] sm:max-w-none"
                >
                  {claimable.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <Btn
                  variant="primary"
                  size="sm"
                  disabled={claimBusy}
                  onClick={() => requestClaim(claimable.find((p) => p.id === claimId))}
                >
                  {claimBusy ? 'ENVIANDO...' : 'SOLICITAR UNIRME'}
                </Btn>
              </div>
            </div>
          )
        )}
      </div>

      {/* Pestañas. Antes todo esto era una sola página larguísima: la lista de
          torneos, las estadísticas históricas y las canchas, una debajo de otra.
          Desktop arriba; en mobile van abajo fijas, como en el torneo, así no
          hay que arrastrar una tira horizontal para llegar a la última. */}
      <div className="hidden sm:flex border-b border-border px-2 items-center overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`bg-transparent border-0 px-3.5 py-3.5 font-condensed font-bold text-[13px] tracking-wide cursor-pointer border-b-2 whitespace-nowrap transition-all hover:text-brand flex items-center gap-1.5 ${
                tab === t.id ? 'text-brand border-b-brand' : 'text-muted border-b-transparent'
              }`}
            >
              <Icon size={13} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Barra inferior — sólo mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-base border-t border-border flex">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 border-0 cursor-pointer transition-colors ${
                tab === t.id ? 'text-brand bg-brand/10' : 'text-muted bg-transparent'
              }`}
            >
              <Icon size={20} />
              <span className="text-[9px] font-mono tracking-wide leading-none">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="px-4 sm:px-6 py-6">
        {tab === 'torneos' && (
          <GroupTournaments
            group={group} groupId={groupId} canManage={canManage}
            filters={filters} changeFilters={changeFilters}
            filtersOpen={filtersOpen} setFiltersOpen={setFiltersOpen}
            activeFilters={activeFilters} filtered={filtered}
            visibleCount={visibleCount} setVisibleCount={setVisibleCount}
            sort={sort} setSort={setSort}
            onNewTournament={handleNewTournament}
          />
        )}

        {/* Recharts pesa 111 KB: sigue entrando por lazy, ahora además sólo
            cuando el usuario abre la pestaña. */}
        {tab === 'estadisticas' && (
          <Suspense fallback={<div style={{ minHeight: 680 }} />}>
            <HistoricalStats
              tournaments={allTournaments}
              showTorneos={false}
              showClubs={false}
              ownerIsPremium={group.owner_is_premium ?? false}
              groupName={group.name}
              title="ESTADÍSTICAS HISTÓRICAS"
            />
          </Suspense>
        )}

        {tab === 'jugadores' && <GroupPlayers groupId={groupId} canManage={canManage} />}

        {tab === 'canchas' && <GroupClubs tournaments={allTournaments} loading={!histLoaded} />}
      </div>

      {/* Modal emojis */}
      {showEmojiModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEmojiModal(false); }}>
          <div className="bg-surface border border-border-mid rounded-t-2xl sm:rounded-xl w-full sm:max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-mono text-sm text-dim tracking-widest">ÍCONOS · máx. 2</div>
              <button type="button" onClick={() => setShowEmojiModal(false)}
                className="bg-transparent border-none text-dim hover:text-white cursor-pointer transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-5">
              {EMOJI_LIST.map(e => (
                <button key={e} type="button" onClick={() => toggleEmoji(e)}
                  className={`relative text-xl p-2 rounded border transition-all cursor-pointer bg-transparent ${
                    editEmojis.includes(e)
                      ? 'border-brand scale-110'
                      : editEmojis.length >= 2
                        ? 'border-transparent opacity-30 cursor-not-allowed'
                        : 'border-transparent opacity-60 hover:opacity-100 hover:border-border-strong'
                  }`}>
                  {e}
                  {editEmojis.includes(e) && (
                    <span className="absolute -top-1 -right-1 bg-brand rounded-full w-3.5 h-3.5 flex items-center justify-center">
                      <Check size={8} strokeWidth={3} className="text-base" />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <Btn variant="primary" full size="md" onClick={() => setShowEmojiModal(false)}>CONFIRMAR</Btn>
          </div>
        </div>
      )}

      {/* Modal co-organizadores (solo dueño) */}
      {showCollabModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCollabModal(false); }}>
          <div className="bg-surface border border-border-mid rounded-t-2xl sm:rounded-xl w-full sm:max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="font-condensed font-bold text-lg text-white tracking-wide">Co-organizadores</div>
              <button type="button" onClick={() => setShowCollabModal(false)}
                className="bg-transparent border-none text-dim hover:text-white cursor-pointer transition-colors">
                <X size={18} />
              </button>
            </div>
            <p className="text-secondary text-[13px] leading-relaxed mb-4">
              Pueden gestionar los torneos de esta categoría igual que vos, pero <strong className="text-white">no</strong> editar/borrar la categoría ni transferirla.
            </p>

            <div className="flex flex-col gap-2 mb-4">
              {group.collaborators?.length ? group.collaborators.map(c => (
                <div key={c.user_id} className="flex items-center justify-between gap-2 bg-base border border-border-mid rounded px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <User2 size={14} className="text-brand shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm text-white truncate">{c.name}</div>
                      {c.username && <div className="text-[11px] font-mono text-dim truncate">@{c.username}</div>}
                    </div>
                  </div>
                  <Btn variant="danger" size="sm" icon={X} onClick={() => setRemoveCollabTarget(c)} title="Quitar co-organizador" />
                </div>
              )) : (
                <div className="text-dim text-sm text-center py-2">Todavía no hay co-organizadores.</div>
              )}
            </div>

            <label className="block text-[10px] font-mono tracking-widest text-dim mb-1.5">INVITAR POR @USUARIO O EMAIL</label>
            <div className="flex gap-2 mb-3">
              <input
                value={collabIdentifier}
                onChange={(e) => setCollabIdentifier(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleInviteCollab(); }}
                placeholder="@usuario o email"
                className="flex-1 bg-base border border-border-strong text-white px-3 py-2 rounded text-sm font-sans outline-none focus:border-brand/60 transition-colors"
              />
              <Btn variant="primary" size="sm" icon={UserPlus} loading={collabBusy} onClick={handleInviteCollab}>INVITAR</Btn>
            </div>

            {collabLink ? (
              <div className="flex items-center gap-2 bg-base border border-border-mid rounded px-3 py-2">
                <span className="flex-1 text-[11px] font-mono text-dim break-all">{collabLink}</span>
                <Btn size="sm" icon={Copy} onClick={() => copyText(collabLink)} title="Copiar link">COPIAR</Btn>
              </div>
            ) : (
              <Btn size="sm" icon={Link2} full loading={collabBusy} onClick={handleCollabLink}>CREAR LINK DE INVITACIÓN</Btn>
            )}
          </div>
        </div>
      )}

      {/* Modal transferir propiedad (solo dueño) */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowTransferModal(false); }}>
          <div className="bg-surface border border-border-mid rounded-t-2xl sm:rounded-xl w-full sm:max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="font-condensed font-bold text-lg text-white tracking-wide">Transferir propiedad</div>
              <button type="button" onClick={() => setShowTransferModal(false)}
                className="bg-transparent border-none text-dim hover:text-white cursor-pointer transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="bg-danger/10 border border-danger/40 rounded px-3 py-2.5 mb-4">
              <p className="text-danger text-[13px] leading-relaxed">
                <strong>Esta acción es irreversible.</strong> El nuevo dueño tendrá el control total de la categoría y de todos sus torneos. Vos pasarás a ser co-organizador. La transferencia solo se completa si la otra persona la <strong>acepta</strong>.
              </p>
            </div>

            {group.pending_transfer ? (
              <div className="flex flex-col gap-3">
                <div className="bg-base border border-border-mid rounded px-3 py-2.5 text-sm text-secondary">
                  Transferencia pendiente
                  {group.pending_transfer.to_username
                    ? <> a <span className="text-brand font-mono">@{group.pending_transfer.to_username}</span></>
                    : <> por <span className="text-brand">link</span></>}
                  . Esperando que la acepte.
                </div>
                <Btn variant="danger" size="sm" icon={X} full onClick={handleCancelTransfer}>CANCELAR TRANSFERENCIA</Btn>
              </div>
            ) : (
              <>
                <label className="block text-[10px] font-mono tracking-widest text-dim mb-1.5">TRANSFERIR A @USUARIO O EMAIL</label>
                <input
                  value={transferIdentifier}
                  onChange={(e) => setTransferIdentifier(e.target.value)}
                  placeholder="@usuario o email"
                  className="w-full bg-base border border-border-strong text-white px-3 py-2 rounded text-sm font-sans outline-none focus:border-brand/60 transition-colors mb-3"
                />
                <label className="flex items-start gap-2 mb-4 cursor-pointer select-none">
                  <input type="checkbox" checked={transferConfirm} onChange={(e) => setTransferConfirm(e.target.checked)} className="mt-0.5" />
                  <span className="text-[12px] text-secondary leading-snug">Entiendo que esta acción es irreversible.</span>
                </label>
                <div className="flex flex-col gap-2">
                  <Btn variant="danger" size="sm" icon={ArrowLeftRight} full loading={transferBusy}
                    disabled={!transferIdentifier.trim() || !transferConfirm}
                    onClick={handleTransfer}>TRANSFERIR</Btn>
                  {transferLink ? (
                    <div className="flex items-center gap-2 bg-base border border-border-mid rounded px-3 py-2">
                      <span className="flex-1 text-[11px] font-mono text-dim break-all">{transferLink}</span>
                      <Btn size="sm" icon={Copy} onClick={() => copyText(transferLink)} title="Copiar link">COPIAR</Btn>
                    </div>
                  ) : (
                    <Btn size="sm" icon={Link2} full loading={transferBusy}
                      disabled={!transferConfirm}
                      onClick={handleTransferLink}>CREAR LINK DE TRANSFERENCIA</Btn>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirmar quitar co-organizador */}
      {removeCollabTarget && (
        <Modal
          title="¿Quitar co-organizador?"
          confirmText="Quitar"
          confirmDanger
          onConfirm={() => handleRemoveCollab(removeCollabTarget.user_id)}
          onCancel={() => setRemoveCollabTarget(null)}
        >
          <strong className="text-white">{removeCollabTarget.name}</strong>
          {removeCollabTarget.username ? ` (@${removeCollabTarget.username})` : ''} dejará de poder gestionar los torneos de esta categoría. Podés volver a invitarlo cuando quieras.
        </Modal>
      )}

      {/* Confirmar salir como co-organizador */}
      {leaveConfirm && (
        <Modal
          title="¿Salir como co-organizador?"
          confirmText="Salir"
          confirmDanger
          onConfirm={handleLeaveCollab}
          onCancel={() => setLeaveConfirm(false)}
        >
          Vas a perder el acceso para gestionar los torneos de <strong className="text-white">{group.name}</strong>. Solo el dueño podría volver a invitarte.
        </Modal>
      )}

      {/* Confirmar desvinculación propia */}
      {unlinkConfirm && group.my_player && (
        <Modal
          title="¿Desvincularte de esta categoría?"
          confirmText="Desvincularme"
          confirmDanger
          confirmDisabled={unlinkBusy}
          onConfirm={handleUnlinkSelf}
          onCancel={() => setUnlinkConfirm(false)}
        >
          <strong className="text-white">{group.my_player.name}</strong> y todos sus partidos se quedan en <strong className="text-white">{group.name}</strong>, pero dejan de estar asociados a tu cuenta y de contar en las estadísticas de tu perfil. El organizador puede volver a invitarte cuando quieras.
        </Modal>
      )}

      {showShareModal && (
        <ShareCategoryModal
          categoryName={group.name}
          clubName={group.club_id ? group.club_name : null}
          tournamentsCount={group.tournaments?.length ?? 0}
          url={`${window.location.origin}/cat/${groupId}`}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showPremiumModal && (
        <PremiumModal reason={premiumReason} onClose={() => { setShowPremiumModal(false); setPremiumReason(null); }} />
      )}

      {deleteModal && (
        <Modal
          title={`¿Eliminar "${group.name}"?`}
          confirmText="Eliminar para siempre"
          confirmDanger
          confirmDisabled={deleteInput !== group.name}
          onConfirm={handleDelete}
          onCancel={() => { setDeleteModal(false); setDeleteInput(''); }}
        >
          <p className="text-secondary text-sm leading-relaxed mb-4">
            Se eliminará la categoría y <strong className="text-white">todos sus torneos</strong>. Los jugadores quedan en la base de datos para estadísticas históricas. <strong className="text-white">Esta acción no se puede deshacer.</strong>
          </p>
          <label className="block text-[11px] font-mono tracking-widest text-muted mb-2">
            ESCRIBÍ <span className="text-danger font-bold">{group.name}</span> PARA CONFIRMAR
          </label>
          <input
            className="w-full bg-base border border-border-strong text-white px-3 py-2 rounded text-sm font-sans outline-none focus:border-danger/60 transition-colors"
            placeholder={group.name}
            value={deleteInput}
            onChange={e => setDeleteInput(e.target.value)}
            autoFocus
          />
        </Modal>
      )}
    </div>
  );
}
