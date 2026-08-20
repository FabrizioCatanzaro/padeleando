import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { api } from '../../utils/api';
import { fmt, calcNivel } from '../../utils/helpers';
import { mergeGroups } from '../../utils/homePanel';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Badge, BadgeCheck, Camera, Check, ChevronDown, ChevronUp, Copy, Eye, EyeOff, Gem, Globe, Link, Lock, MapPin, Pencil, Share2, Trash2, UserCheck, UserPlus, Users, X } from 'lucide-react';
// Recharts sólo lo necesita este bloque, que además casi nunca se muestra.
const AdvancedStats = lazy(() => import('./AdvancedStats'));
import { siInstagram, siX, siFacebook, siWhatsapp } from 'simple-icons';
import FadeInCard from '../shared/FadeInCard';
import PremiumModal from '../shared/PremiumModal';
import ClaimPremiumRequest from '../shared/ClaimPremiumRequest';
import Modal from '../shared/Modal';
import statsPreview from '../../assets/advanced-stats-preview.svg';
import Loader from '../Loader/Loader';
import LazyNotFound from '../NotFound/LazyNotFound';
import MatchRow from './MatchRow';
import ProfileMatches from './ProfileMatches';
import ProfileHero, { PlanBand } from './ProfileHero';
import SectionRule from '../shared/SectionRule';
import ProfileStats from './ProfileStats';
import ProfileCategories from './ProfileCategories';
import PremiumChip from '../shared/PremiumChip';
import PlayerAvatar from '../shared/PlayerAvatar';
import AvatarCropper from '../shared/AvatarCropper';
import ShareProfileModal from '../shared/ShareProfileModal';
import SnapshotModal from '../Snapshot/SnapshotModal';
import ProfileStory from '../Snapshot/ProfileStory';
import useHideOnScroll from '../../hooks/useHideOnScroll';

const MAX_AVATAR_BYTES   = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function SiIcon({ icon, size = 14 }) {
  return (
    <svg role="img" viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d={icon.path} />
    </svg>
  );
}

const NETWORKS = [
  { id: 'instagram', label: 'Instagram',  prefix: 'https://www.instagram.com/', color: `#${siInstagram.hex}`, Icon: ({ size }) => <SiIcon icon={siInstagram} size={size} /> },
  // El color de marca de X es negro puro: sobre el fondo oscuro no se veía ni
  // el icono ni el handle. Se usa el color de texto del tema, que en claro
  // vuelve a ser prácticamente el negro original.
  { id: 'twitter',   label: 'Twitter / X', prefix: 'https://x.com/',            color: 'var(--color-content)', Icon: ({ size }) => <SiIcon icon={siX}         size={size} /> },
  { id: 'facebook',  label: 'Facebook',   prefix: 'https://www.facebook.com/',  color: `#${siFacebook.hex}`,  Icon: ({ size }) => <SiIcon icon={siFacebook}  size={size} /> },
  { id: 'whatsapp',  label: 'WhatsApp',   prefix: 'https://wa.me/54',             color: `#${siWhatsapp.hex}`,  Icon: ({ size }) => <SiIcon icon={siWhatsapp}  size={size} /> },
  { id: 'other',     label: 'Otro',       prefix: '',                           color: '#888',                Icon: ({ size }) => <Link size={size} /> },
];

const EMPTY_LINK = { network: '', url: '' };

const PROFILE_TABS = [
  { id: 'resumen',  label: 'RESUMEN' },
  { id: 'partidos', label: 'PARTIDOS' },
  { id: 'stats',    label: 'ESTADÍSTICAS' },
];

// El avatar se guarda a 512 px: pedirlo transformado sólo cambia el formato y la compresión.
function avatarZoomUrl(src) {
  if (!src?.includes('/upload/')) return src;
  return src.replace('/upload/', '/upload/f_auto,q_auto,w_512,c_limit/');
}

// La cabecera nunca dibuja el avatar a más de 128 px, así que pedir los 512
// originales era traer 4× de píxeles. Se pide al doble del tamaño de render
// para que se vea nítido en pantallas 2x.
function avatarThumbUrl(src, px) {
  if (!src?.includes('/upload/')) return src;
  return src.replace('/upload/', `/upload/f_auto,q_auto,w_${px * 2},c_limit/`);
}

function ensureTrailingEmpty(links) {
  const last = links[links.length - 1];
  if (!last || last.network !== '' || last.url !== '') return [...links, { ...EMPTY_LINK }];
  return links;
}

function NetworkPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const net = NETWORKS.find(n => n.id === value);

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        title={net?.label ?? 'Elegir red'}
        className="w-9 h-9 flex items-center justify-center bg-surface border border-border-mid rounded-sm cursor-pointer hover:border-border-strong transition-colors"
        style={{ color: net?.color ?? '#555' }}
      >
        {net ? <net.Icon size={15} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-[#111827] border border-border-mid rounded-sm p-1.5 flex gap-1 shadow-lg">
          {NETWORKS.map(n => (
            <button
              key={n.id}
              type="button"
              title={n.label}
              onClick={() => { onChange(n.id); setOpen(false); }}
              className="w-8 h-8 flex items-center justify-center rounded-sm cursor-pointer border transition-colors"
              style={{
                color: n.color,
                borderColor: value === n.id ? n.color : 'transparent',
                background: value === n.id ? `${n.color}18` : 'transparent',
              }}
            >
              <n.Icon size={14} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SocialLinksEditor({ value, onChange }) {
  function updateLink(i, field, val) {
    const next = value.map((l, idx) => idx === i ? { ...l, [field]: val } : l);
    if (field === 'network') {
      const net = NETWORKS.find(n => n.id === val);
      const old = NETWORKS.find(n => n.id === value[i].network);
      const curUrl = value[i].url;
      if (!curUrl || curUrl === (old?.prefix ?? '')) {
        next[i].url = net?.prefix ?? '';
      }
    }
    onChange(ensureTrailingEmpty(next.filter((l, idx) => {
      if (idx === next.length - 1) return true;
      return l.network !== '' || l.url !== '';
    })));
  }

  function removeLink(i) {
    onChange(ensureTrailingEmpty(value.filter((_, idx) => idx !== i)));
  }

  return (
    <div className="flex flex-col gap-2">
      {value.map((link, i) => {
        const net = NETWORKS.find(n => n.id === link.network);
        const isLast = i === value.length - 1;
        return (
          <div key={i} className="flex items-center gap-2">
            <NetworkPicker value={link.network} onChange={val => updateLink(i, 'network', val)} />
            <input
              className="flex-1 bg-surface border border-border-mid text-white px-3 py-2 text-xs font-mono rounded-sm outline-none min-w-0"
              placeholder={net?.prefix ? `${net.prefix}usuario` : 'https://...'}
              value={link.url}
              onChange={e => updateLink(i, 'url', e.target.value)}
              type="url"
              name={`social-link-${i}`}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore=""
              data-form-type="other"
            />
            {!isLast && (
              <button type="button" onClick={() => removeLink(i)}
                className="shrink-0 text-[#555] hover:text-danger transition-colors bg-transparent border-none cursor-pointer">
                <X size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// En mobile la columna es demasiado angosta para píldoras con texto: cuatro
// redes se apilaban en cuatro filas y mostraban cosas como un teléfono suelto o
// una URL cortada a la mitad. Ahí van sólo los iconos, en una fila. En desktop
// sobra ancho, así que se conserva el handle visible.
function SocialLinksDisplay({ links }) {
  if (!links?.length) return null;
  const filtered = links.filter(l => l.url?.trim());
  if (!filtered.length) return null;

  const items = filtered.map((l, i) => {
    const net = NETWORKS.find(n => n.id === l.network);
    const prefix = net?.prefix ?? '';
    const display = prefix && l.url.startsWith(prefix) ? l.url.slice(prefix.length) : l.url;
    const title = `${net?.label ?? 'Enlace'}${display ? `: ${display}` : ''}`;
    return { key: i, url: l.url, net, display, title };
  });

  return (
    <>
      <div className="flex sm:hidden flex-wrap justify-center gap-2 mt-3">
        {items.map(({ key, url, net, title }) => (
          <a key={key} href={url} target="_blank" rel="noopener noreferrer"
            title={title} aria-label={title}
            className="w-9 h-9 flex items-center justify-center bg-surface border border-border-mid rounded-full hover:border-border-strong transition-colors"
            style={{ color: net?.color ?? '#888' }}>
            {net ? <net.Icon size={15} /> : <Link size={15} />}
          </a>
        ))}
      </div>
      <div className="hidden sm:flex flex-wrap gap-2 mt-3">
        {items.map(({ key, url, net, display, title }) => (
          <a key={key} href={url} target="_blank" rel="noopener noreferrer" title={title}
            className="inline-flex items-center gap-1.5 bg-surface border border-border-mid rounded-full px-3 py-1 text-xs font-mono hover:border-border-strong transition-colors max-w-[200px] overflow-hidden"
            style={{ color: net?.color ?? '#888', textDecoration: 'none' }}>
            {net && <net.Icon size={12} className="shrink-0" />}
            <span className="truncate">{display || url}</span>
          </a>
        ))}
      </div>
    </>
  );
}

const ROUND_LABEL = {
  octavos: 'Octavos',
  cuartos: 'Cuartos',
  semis:   'Semifinal',
  final:   'Final',
};

function PasswordInput({ value, onChange, placeholder = '* * * * * * *', autoComplete = 'off' }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full bg-surface border border-border-mid text-white px-3.5 py-2.5 rounded text-sm outline-none pr-10 font-mono"
      />
      <button type="button" onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#aaa] transition-colors bg-transparent border-0 cursor-pointer">
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

function validatePassword(p) {
  if (p.length < 8)       return 'Mínimo 8 caracteres';
  if (!/[A-Z]/.test(p))   return 'Al menos una mayúscula';
  if (!/[a-z]/.test(p))   return 'Al menos una minúscula';
  if (!/[0-9]/.test(p))   return 'Al menos un número';
  return null;
}

function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    { ok: password.length >= 8,    label: '8+ chars' },
    { ok: /[A-Z]/.test(password),  label: 'Mayúscula' },
    { ok: /[a-z]/.test(password),  label: 'Minúscula' },
    { ok: /[0-9]/.test(password),  label: 'Número' },
  ];
  return (
    <div className="flex gap-1.5 flex-wrap mt-2">
      {checks.map(({ ok, label }) => (
        <span key={label} className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors
          ${ok ? 'text-green bg-[#1a2e1a] border-[#4af07a44]' : 'text-[#555] bg-[#111] border-border-strong'}`}>
          {ok ? '✓' : '○'} {label}
        </span>
      ))}
    </div>
  );
}


export default function ProfileView() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const { username } = useParams();
  const navigate = useNavigate();
  const { user, login, logout } = useAuth();

  const [isFollowing,      setIsFollowing]      = useState(false);
  const [followBusy,       setFollowBusy]       = useState(false);
  const [followHover,      setFollowHover]       = useState(false);
  const [followersCount,   setFollowersCount]    = useState(0);
  const [followingCount,   setFollowingCount]    = useState(0);
  const [followModal,      setFollowModal]       = useState(null); // 'followers' | 'following' | null
  const [showInviteModal,  setShowInviteModal]   = useState(false);
  const [followList,       setFollowList]        = useState([]);
  const [followListLoading, setFollowListLoading] = useState(false);

  const [editOpen,     setEditOpen]     = useState(false);
  const [editName,     setEditName]     = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio,      setEditBio]      = useState('');
  const [socialLinks,  setSocialLinks]  = useState([{ ...EMPTY_LINK }]);
  const [tab,            setTab]            = useState('resumen');
  const [currentPass,  setCurrentPass]  = useState('');
  const [newPass,      setNewPass]      = useState('');
  const [newPass2,     setNewPass2]     = useState('');
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState(null);
  const [saveOk,       setSaveOk]       = useState(false);
  const [copied,       setCopied]       = useState(false);

  const fileInputRef = useRef(null);
  const [avatarUrl,   setAvatarUrl]   = useState(null);
  const [avatarBusy,  setAvatarBusy]  = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const [cropFile,    setCropFile]    = useState(null);
  const [avatarZoom,  setAvatarZoom]  = useState(false);
  const [confirmAvatarDelete, setConfirmAvatarDelete] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showClaimHelp,    setShowClaimHelp]    = useState(false);

  const [advancedPublic, setAdvancedPublic] = useState(false);
  const [advancedBusy,   setAdvancedBusy]   = useState(false);
  const [advancedError,  setAdvancedError]  = useState(null);


  // El avatar necesita dos tamaños reales (no sólo CSS) porque PlayerAvatar
  // deriva de `size` el cuerpo de las iniciales y el borde premium. El valor
  // inicial sale de matchMedia, así que en el primer pintado ya es el correcto
  // y no hay salto de layout.
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const onChange = e => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Mini cabecera pegajosa: aparece cuando la cabecera real ya salió de
  // pantalla. El observador se engancha con un ref de callback porque el
  // centinela no existe durante el estado de carga.
  const [pastHeader, setPastHeader] = useState(false);
  const sentinelObs = useRef(null);
  const setSentinel = useCallback(node => {
    sentinelObs.current?.disconnect();
    sentinelObs.current = null;
    if (!node) return;
    const io = new IntersectionObserver(([entry]) => setPastHeader(!entry.isIntersecting));
    io.observe(node);
    sentinelObs.current = io;
  }, []);
  useEffect(() => () => sentinelObs.current?.disconnect(), []);

  // La cabecera global usa el mismo gesto para esconderse: al bajar se va ella
  // y entra ésta, al subir vuelve ella y ésta se va. Nunca se pisan.
  const scrolledDown = useHideOnScroll();

  const [showShare,       setShowShare]       = useState(false);
  const [showStory,       setShowStory]       = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword,  setDeletePassword]  = useState('');
  const [deleteBusy,      setDeleteBusy]      = useState(false);
  const [deleteError,     setDeleteError]     = useState(null);

  useEffect(() => {
    api.groups.byUsername(username)
      .then((d) => {
        setData(d);
        setEditName(d.owner.name);
        setEditUsername(d.owner.username);
        setEditBio(d.owner.bio ?? '');
        const existing = Array.isArray(d.owner.social_links) ? d.owner.social_links : [];
        setSocialLinks(ensureTrailingEmpty(existing));
        setAvatarUrl(d.owner.avatar_url ?? null);
        setAdvancedPublic(d.owner.advanced_stats_public === true);
        setIsFollowing(d.is_following ?? false);
        setFollowersCount(d.owner.followers_count ?? 0);
        setFollowingCount(d.owner.following_count ?? 0);
      })
      .catch((e) => setError(e.status === 404 ? 'notfound' : e.message))
      .finally(() => setLoading(false));
  }, [username]);

  useDocumentTitle(error === 'notfound' ? 'Perfil no encontrado' : data?.owner?.name);

  useEffect(() => {
    if (!avatarZoom) return;
    function onKey(e) { if (e.key === 'Escape') setAvatarZoom(false); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [avatarZoom]);

  // El perfil siempre rinde más alto que la pantalla, así que el hueco de carga
  // debe empujar el pie fuera del viewport en vez de dejarlo asomar.
  if (loading) return <Loader minHeight="100vh" />;
  if (error === 'notfound') return <LazyNotFound subject="profile" />;
  if (error)   return <div className="text-danger p-10">{error}</div>;

  const { owner, groups, played_groups, coorg_groups, stats, recent_matches, frequent_partners, monthly_stats, club_stats, follow_ranking } = data;
  const isOwnProfile  = user?.username === owner.username;
  const displayAvatar = avatarUrl ?? (isOwnProfile ? user?.avatar_url : null) ?? null;

  const avatarSize  = isDesktop ? 128 : 104;
  const headerPct   = stats?.partidos > 0 ? Math.round((stats.victorias / stats.partidos) * 100) : null;
  const headerNivel = calcNivel(stats?.partidos ?? 0, headerPct ?? 0);

  // El plan manda: sin premium no hay avanzadas ni para el dueño. Publicarlas
  // las abre a cualquier visitante, incluida la captura del perfil.
  const canSeeAdvanced = !!owner.is_premium && (isOwnProfile || advancedPublic);

  // Una sola fila de acciones para los dos tamaños: antes había un bloque
  // duplicado para desktop y otro para mobile que había que mantener a la par.
  const heroActions = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setShowShare(true)}
        title="Compartir perfil"
        aria-label="Compartir perfil"
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-border-strong text-muted hover:border-brand hover:text-brand bg-transparent transition-colors cursor-pointer shrink-0"
      >
        <Share2 size={14} />
      </button>
      {isOwnProfile ? (
        <button
          onClick={() => setEditOpen(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans text-[13px] border border-border-strong text-content bg-transparent hover:bg-border-mid hover:text-white transition-colors cursor-pointer"
        >
          <Pencil size={14} />Editar perfil
        </button>
      ) : (
        <button
          onClick={user ? handleFollowToggle : () => setShowInviteModal(true)}
          onMouseEnter={() => setFollowHover(true)}
          onMouseLeave={() => setFollowHover(false)}
          disabled={followBusy}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-condensed font-bold text-[12px] tracking-widest border transition-colors cursor-pointer disabled:opacity-40 ${
            isFollowing
              ? followHover
                ? 'border-danger text-danger bg-transparent'
                : 'border-border-strong text-muted bg-transparent'
              : 'bg-brand text-base border-brand hover:brightness-110'
          }`}
        >
          {isFollowing
            ? followHover
              ? <><UserPlus size={14} /> DEJAR DE SEGUIR</>
              : <><UserCheck size={14} /> SIGUIENDO</>
            : <><UserPlus size={14} /> SEGUIR</>}
        </button>
      )}
    </div>
  );

  // Una categoría puede ser propia, jugada y co-organizada a la vez: la lista
  // unificada se arma una sola vez para que el riel y la sección cuenten igual.
  const mergedGroups = mergeGroups({
    groups,
    coorgGroups: coorg_groups ?? [],
    partGroups:  played_groups ?? [],
    favGroups:   [],
  });

  // Riel del perfil: sólo lo deportivo, y todo derivado de lo que ya llegó.
  const railStats = stats ? [
    { value: stats.partidos ?? 0, label: 'Partidos' },
    { value: stats.torneos ?? 0,  label: 'Torneos' },
    { value: stats.titulos ?? 0,  label: 'Títulos', tone: (stats.titulos ?? 0) > 0 ? 'gold' : 'off' },
    { value: stats.racha ?? 0,    label: 'Racha',   tone: (stats.racha ?? 0) > 0 ? 'brand' : 'off' },
    { value: mergedGroups.length, label: 'Categorías' },
    { value: club_stats?.length ?? 0, label: 'Clubes' },
  ] : [];

  const savedLinks    = Array.isArray(owner.social_links) ? owner.social_links.filter(l => l.url?.trim()) : [];
  const filledLinks   = socialLinks.filter(l => {
    const url = l.url?.trim();
    if (!url) return false;
    const prefix = NETWORKS.find(n => n.id === l.network)?.prefix ?? '';
    return url !== prefix;
  });

  const hasChanges =
    editName.trim() !== owner.name ||
    editUsername.trim() !== owner.username ||
    editBio.trim() !== (owner.bio ?? '') ||
    newPass !== '' || currentPass !== '' ||
    JSON.stringify(filledLinks) !== JSON.stringify(savedLinks);

  function handleCancel() {
    setEditName(owner.name);
    setEditUsername(owner.username);
    setEditBio(owner.bio ?? '');
    setSocialLinks(ensureTrailingEmpty(savedLinks));
    setCurrentPass(''); setNewPass(''); setNewPass2('');
    setSaveError(null); setSaveOk(false);
  }

  function handleCopyUsername() {
    navigator.clipboard.writeText(editUsername);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function pickAvatar() {
    if (avatarBusy) return;
    setAvatarError(null);
    fileInputRef.current?.click();
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_MIME_TYPES.includes(file.type)) { setAvatarError('Formato no soportado. Usá jpeg, png o webp'); return; }
    if (file.size > MAX_AVATAR_BYTES) { setAvatarError('La imagen excede el tamaño máximo (5 MB)'); return; }
    setAvatarError(null);
    setCropFile(file);
  }

  async function handleCropSave(blob) {
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      const cropped = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      const updated = await api.auth.uploadAvatar(cropped);
      setAvatarUrl(updated.avatar_url);
      if (isOwnProfile) login({ ...user, avatar_url: updated.avatar_url });
      setCropFile(null);
    } catch (err) {
      setAvatarError(err.message);
      throw err;
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleAvatarDelete() {
    if (avatarBusy) return;
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      await api.auth.deleteAvatar();
      setAvatarUrl(null);
      setAvatarZoom(false);
      if (isOwnProfile) login({ ...user, avatar_url: null });
      setConfirmAvatarDelete(false);
    } catch (err) {
      setAvatarError(err.message);
      setConfirmAvatarDelete(false);
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleToggleAdvancedPublic() {
    const next = !advancedPublic;
    setAdvancedBusy(true);
    setAdvancedError(null);
    setAdvancedPublic(next);
    try {
      await api.auth.updateMe({ advanced_stats_public: next });
    } catch (err) {
      setAdvancedPublic(!next);
      setAdvancedError(err.message);
    } finally {
      setAdvancedBusy(false);
    }
  }

  async function handleSave() {
    setSaveError(null); setSaveOk(false);
    const body = {};

    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== owner.name) body.name = trimmedName;

    const trimmedUsername = editUsername.trim();
    if (trimmedUsername && trimmedUsername !== owner.username) body.username = trimmedUsername;

    const trimmedBio = editBio.trim();
    if (trimmedBio !== (owner.bio ?? '')) body.bio = trimmedBio;

    if (newPass) {
      const pwErr = validatePassword(newPass);
      if (pwErr) { setSaveError(pwErr); return; }
      if (newPass !== newPass2) { setSaveError('Las contraseñas no coinciden'); return; }
      if (!currentPass) { setSaveError('Ingresá tu contraseña actual'); return; }
      body.current_password = currentPass;
      body.new_password = newPass;
    }

    if (JSON.stringify(filledLinks) !== JSON.stringify(savedLinks)) {
      body.social_links = filledLinks;
    }

    if (Object.keys(body).length === 0) return;

    setSaving(true);
    try {
      const updated = await api.auth.updateMe(body);
      const newUsername = updated.username ?? user.username;
      login({ ...user, name: updated.name ?? user.name, username: newUsername });
      setData(d => ({
        ...d,
        owner: {
          ...d.owner,
          name: updated.name ?? d.owner.name,
          username: newUsername,
          bio: updated.bio ?? d.owner.bio,
          social_links: updated.social_links ?? d.owner.social_links,
        },
      }));
      setSocialLinks(ensureTrailingEmpty(updated.social_links ?? filledLinks));
      setSaveOk(true);
      setCurrentPass(''); setNewPass(''); setNewPass2('');
      setTimeout(() => {
        setSaveOk(false);
        if (newUsername !== username) navigate(`/u/${newUsername}`, { replace: true });
      }, 1200);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await api.auth.deleteMe(deletePassword);
      await logout();
      navigate('/', { replace: true });
    } catch (e) {
      setDeleteError(e.message);
      setDeleteBusy(false);
    }
  }

  async function handleFollowToggle() {
    if (followBusy) return;
    setFollowBusy(true);
    try {
      if (isFollowing) {
        await api.follows.unfollow(owner.username);
        setIsFollowing(false);
        setFollowersCount(c => c - 1);
      } else {
        await api.follows.follow(owner.username);
        setIsFollowing(true);
        setFollowersCount(c => c + 1);
      }
    } catch { /* ignore */ }
    finally { setFollowBusy(false); }
  }

  async function openFollowModal(type) {
    setFollowModal(type);
    setFollowList([]);
    setFollowListLoading(true);
    try {
      const list = type === 'followers'
        ? await api.follows.followers(owner.username)
        : await api.follows.following(owner.username);
      setFollowList(list);
    } catch { /* ignore */ }
    finally { setFollowListLoading(false); }
  }

  const label = { display: 'block', fontSize: 11, letterSpacing: 2, color: '#555',
                  fontFamily: "'Albert Sans',monospace", marginBottom: 6, marginTop: 16 };

  return (
    <div className="bg-base text-content font-sans pb-15">

      {/* Mini cabecera pegajosa. El contenedor tiene alto 0 a propósito: si
          ocupara lugar en el flujo dejaría un hueco permanente arriba de la
          página, esté la barra visible o no. Así no aporta ni un píxel de CLS.
          Aparece con el mismo gesto con el que la cabecera global se esconde,
          de modo que siempre hay exactamente una de las dos en pantalla. */}
      <div className="sticky top-0 z-30 h-0">
        <div className={`flex items-center gap-3 px-4 py-2 border-b border-border bg-base transition-all duration-200 ${
          scrolledDown && pastHeader ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0 pointer-events-none'
        }`}>
          <PlayerAvatar
            name={owner.name}
            src={avatarThumbUrl(displayAvatar, 28)}
            size={28}
            premium={isOwnProfile ? user?.subscription?.plan === 'premium' : owner.is_premium}
          />
          <div className="min-w-0 flex-1">
            <div className="font-condensed font-bold text-[13px] text-white leading-tight truncate">{owner.name}</div>
            <div className="text-[10px] text-muted font-mono truncate">@{owner.username}</div>
          </div>
          {!isOwnProfile && (
            <button
              onClick={user ? handleFollowToggle : () => setShowInviteModal(true)}
              disabled={followBusy}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded font-condensed font-bold text-[11px] tracking-widest border transition-colors cursor-pointer disabled:opacity-40 ${
                isFollowing
                  ? 'border-border-strong text-muted bg-transparent'
                  : 'bg-brand text-base border-brand'
              }`}
            >
              {isFollowing ? <UserCheck size={12} /> : <UserPlus size={12} />}
              {isFollowing ? 'SIGUIENDO' : 'SEGUIR'}
            </button>
          )}
          <button
            onClick={() => setShowShare(true)}
            aria-label="Compartir perfil"
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded border border-border-strong text-muted hover:border-brand hover:text-brand bg-transparent transition-colors cursor-pointer"
          >
            <Share2 size={13} />
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6">

        <ProfileHero
          owner={owner}
          isOwnProfile={isOwnProfile}
          avatarSrc={avatarThumbUrl(displayAvatar, avatarSize)}
          avatarSize={avatarSize}
          nivel={headerNivel}
          isPremium={isOwnProfile ? user?.subscription?.plan === 'premium' : owner.is_premium}
          joinedAt={fmt(owner.created_at)}
          onAvatarOpen={() => displayAvatar && setAvatarZoom(true)}
          onPickAvatar={pickAvatar}
          onDeleteAvatar={() => setConfirmAvatarDelete(true)}
          avatarBusy={avatarBusy}
          avatarError={avatarError}
          fileInputRef={fileInputRef}
          onFileChange={handleAvatarChange}
          socials={<SocialLinksDisplay links={savedLinks} />}
          followersCount={followersCount}
          followingCount={followingCount}
          onOpenFollowers={() => openFollowModal('followers')}
          onOpenFollowing={() => openFollowModal('following')}
          winPct={headerPct}
          wins={stats?.victorias ?? 0}
          played={stats?.partidos ?? 0}
          railStats={railStats}
          actions={heroActions}
          planChip={isOwnProfile ? (
            <PlanBand
              premium={user?.subscription?.plan === 'premium'}
              subscription={user?.subscription}
              onManage={() => navigate('/subscription/manage')}
              onSeePlans={() => setShowPremiumModal(true)}
            />
          ) : null}
        />

        {/* Centinela de la mini cabecera: cuando sale de pantalla, entra la barra. */}
        <div ref={setSentinel} aria-hidden="true" className="h-px mb-5" />

        {/* Editar perfil (colapsable) */}
        {isOwnProfile && (
          <div className="bg-surface border border-border-mid rounded-lg mb-4 sm:mb-6 overflow-hidden">
            <button
              type="button"
              onClick={() => setEditOpen(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 cursor-pointer bg-transparent border-none text-left"
            >
              <span className="font-condensed font-bold text-sm tracking-[3px] text-[#555]">EDITAR PERFIL</span>
              {editOpen ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
            </button>

            {editOpen && (
              <div className="px-5 pb-5">
                <label style={label}>NOMBRE</label>
                <input
                  className="w-full bg-surface border border-border-mid text-white px-3.5 py-2.5 rounded text-sm outline-none font-sans"
                  value={editName} onChange={e => setEditName(e.target.value)} minLength={3} maxLength={50}
                  autoComplete="off" name="profile-name"
                />

                <label style={label}>NOMBRE DE USUARIO</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555] text-sm font-mono select-none">@</span>
                  <input
                    className="w-full bg-surface border border-border-mid text-white pl-7 pr-10 py-2.5 rounded text-sm outline-none font-mono"
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    minLength={3} maxLength={20}
                    autoComplete="off" name="profile-username"
                  />
                  <button type="button" onClick={handleCopyUsername}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#aaa] transition-colors bg-transparent border-0 cursor-pointer">
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </div>

                <label style={label}>BIO</label>
                <div className="relative">
                  <textarea
                    className="w-full bg-surface border border-border-mid text-white px-3.5 py-2.5 rounded text-sm outline-none font-sans resize-none"
                    rows={2}
                    maxLength={200}
                    placeholder="Contá algo sobre vos..."
                    value={editBio}
                    onChange={e => setEditBio(e.target.value)}
                  />
                  <span className="absolute bottom-2 right-3 text-[10px] text-dim font-mono">{editBio.length}/200</span>
                </div>

                <label style={label}>MAIL</label>
                <div className="w-full bg-surface border border-border-mid text-muted px-3.5 py-2.5 rounded text-sm font-sans">
                  {user?.email}
                </div>

                <label style={label}>REDES SOCIALES</label>
                <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />

                {user?.subscription?.plan !== 'premium' && (
                  <div className="mt-5 pt-4 border-t border-border-mid">
                    <button
                      type="button"
                      onClick={() => setShowClaimHelp(true)}
                      className="text-[12px] text-dim hover:text-secondary transition-colors bg-transparent border-0 p-0 cursor-pointer underline underline-offset-2"
                    >
                      ¿Pagaste y no se activó tu Premium?
                    </button>
                  </div>
                )}

                <div style={{ borderTop: '1px solid #222', marginTop: 20, paddingTop: 4 }}>
                  <div style={{ fontSize: 11, color: '#444', fontFamily: "'Albert Sans',monospace", marginBottom: 4 }}>
                    Dejá en blanco si no querés cambiar la contraseña
                  </div>
                  <label style={label}>CONTRASEÑA ACTUAL</label>
                  <PasswordInput value={currentPass} onChange={e => setCurrentPass(e.target.value)} autoComplete="current-password" />

                  <label style={label}>NUEVA CONTRASEÑA</label>
                  <PasswordInput value={newPass} onChange={e => setNewPass(e.target.value)} autoComplete="new-password" />
                  {newPass && <PasswordStrength password={newPass} />}

                  <label style={label}>REPETIR NUEVA CONTRASEÑA</label>
                  <PasswordInput value={newPass2} onChange={e => setNewPass2(e.target.value)} autoComplete="new-password" />
                  {newPass2 && newPass !== newPass2 && (
                    <div style={{ fontSize: 11, color: '#e05252', fontFamily: "'Albert Sans',monospace", marginTop: 4 }}>
                      Las contraseñas no coinciden
                    </div>
                  )}
                </div>

                {saveError && (
                  <div style={{ fontSize: 12, color: '#e05252', fontFamily: "'Albert Sans',monospace", marginTop: 12 }}>
                    {saveError}
                  </div>
                )}
                {saveOk && (
                  <div style={{ fontSize: 12, color: '#4af07a', fontFamily: "'Albert Sans',monospace", marginTop: 12 }}>
                    ✓ Guardado
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                  <button onClick={handleSave} disabled={saving || !hasChanges}
                    style={{ flex: 1, background: '#e8f04a', color: '#0a0e1a', border: 'none', padding: '10px',
                             fontFamily: "'Unbounded',sans-serif", fontWeight: 900, fontSize: 14,
                             letterSpacing: 2, borderRadius: 4, cursor: saving || !hasChanges ? 'default' : 'pointer',
                             opacity: saving || !hasChanges ? 0.4 : 1 }}>
                    {saving ? 'GUARDANDO...' : 'GUARDAR'}
                  </button>
                  <button onClick={handleCancel}
                    className="bg-transparent border border-border-strong text-[#555] px-4 py-2 text-xs rounded cursor-pointer hover:text-white transition-colors">
                    Cancelar
                  </button>
                </div>

                {/* Zona de peligro */}
                <div style={{ borderTop: '1px solid #3a1a1a', marginTop: 24, paddingTop: 16 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Trash2 size={13} className="text-danger" />
                    <span className="font-condensed font-bold text-sm tracking-[3px] text-danger">ELIMINAR CUENTA</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#777', fontFamily: "'Albert Sans',monospace", marginBottom: 12 }}>
                    Se borra tu cuenta de forma permanente. Tus categorías y torneos se conservan bajo una cuenta anónima
                    y tus partidos en categorías de otros quedan sin vincular. No se puede deshacer.
                  </div>
                  <button
                    type="button"
                    onClick={() => { setDeletePassword(''); setDeleteError(null); setShowDeleteModal(true); }}
                    className="bg-transparent border border-danger/50 text-danger px-4 py-2 text-xs rounded cursor-pointer hover:bg-danger/10 transition-colors font-condensed font-bold tracking-widest"
                  >
                    ELIMINAR MI CUENTA
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pestañas. Antes eran diez bloques apilados en una sola columna: con
            cuatro partidos era scroll vacío y con doscientos, un muro. */}
        <div className="flex border-b border-border -mx-4 sm:-mx-6 px-2 mb-5 overflow-x-auto">
          {PROFILE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`bg-transparent border-0 px-3.5 py-3.5 font-condensed font-bold text-[12.5px] tracking-wide cursor-pointer border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                tab === t.id ? 'text-brand border-b-brand' : 'text-muted border-b-transparent hover:text-brand'
              }`}
            >
              {t.label}
              {t.id === 'partidos' && recent_matches?.length > 0 && (
                <span className={`font-mono text-[9.5px] rounded px-1.5 py-0.5 ${
                  tab === t.id ? 'bg-brand text-base' : 'bg-border-mid text-secondary'
                }`}>{recent_matches.length}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'stats' && (<>
        {/* El interruptor de privacidad va arriba de todo: decide sobre la
            pestaña entera, no sólo sobre el bloque premium del fondo. */}
        {isOwnProfile && owner.is_premium && (
          <div
            className="flex items-center justify-between flex-wrap gap-3.5 rounded-xl px-3.5 py-3 mb-4"
            style={{
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'color-mix(in srgb, var(--color-premium) 30%, transparent)',
              background:  'color-mix(in srgb, var(--color-premium) 6%, transparent)',
            }}
          >
            <div className="flex flex-col min-w-0">
              <span className="font-condensed font-bold text-[13px] text-white">
                {advancedPublic ? 'Estadísticas avanzadas públicas' : 'Estadísticas avanzadas privadas'}
              </span>
              <span className="text-[11.5px] text-dim mt-[3px]">
                {advancedPublic
                  ? 'Cualquiera que visite tu perfil las ve'
                  : 'Sólo vos las ves, acá y en la captura'}
              </span>
              {advancedError && <span className="text-[11.5px] text-danger mt-1">{advancedError}</span>}
            </div>
            {/* El riel deja ver que hay dos posiciones, que un botón con el
                estado escrito no comunicaba. */}
            <button
              type="button"
              onClick={handleToggleAdvancedPublic}
              disabled={advancedBusy}
              role="switch"
              aria-checked={advancedPublic}
              aria-label="Estadísticas avanzadas públicas"
              title={advancedPublic ? 'Hacerlas privadas' : 'Hacerlas públicas'}
              className="shrink-0 inline-flex items-center gap-2.5 bg-transparent border-0 p-0 cursor-pointer disabled:opacity-50 disabled:cursor-default"
            >
              <span className={`inline-flex items-center gap-1.5 font-condensed font-bold text-[10.5px] tracking-[0.1em] transition-colors ${
                advancedPublic ? 'text-premium-hi' : 'text-muted'
              }`}>
                {advancedPublic ? <Globe size={12} /> : <Lock size={12} />}
                {advancedPublic ? 'PÚBLICAS' : 'PRIVADAS'}
              </span>
              <span className={`relative w-[46px] h-[26px] rounded-full border transition-colors ${
                advancedPublic ? 'bg-premium border-premium' : 'bg-base border-border-strong'
              }`}>
                <span
                  className={`absolute top-[2px] left-[2px] w-5 h-5 rounded-full transition-transform duration-200 ${
                    advancedPublic ? 'translate-x-5' : 'translate-x-0 bg-dim'
                  }`}
                  style={advancedPublic ? { background: 'var(--color-premium-ink)' } : undefined}
                />
              </span>
            </button>
          </div>
        )}

        <ProfileStats
          stats={stats}
          clubStats={club_stats ?? []}
          partners={frequent_partners ?? []}
        />

        {/* Estadísticas avanzadas — al fondo para no interrumpir el flujo.
            Un visitante sólo las ve si el premium las publicó; el servidor ya
            manda los campos vacíos cuando no corresponde. */}
        {stats?.partidos > 0 && (canSeeAdvanced ? (
          <>
            <SectionRule action={<PremiumChip />}>ESTADÍSTICAS AVANZADAS</SectionRule>
            {/* Iguala al alto del bloque completo (con sets y palizas) para que el chunk no desplace nada. */}
            <Suspense fallback={<div className="mb-6 rounded-lg bg-surface border border-border-mid" style={{ height: 1370 }} />}>
              <AdvancedStats
                stats={stats}
                monthlyStats={monthly_stats ?? []}
                dailyActivity={data.daily_activity ?? []}
                weekdayStats={data.weekday_stats ?? []}
              />
            </Suspense>
          </>
        ) : isOwnProfile ? (
          <>
            <SectionRule>ESTADÍSTICAS AVANZADAS</SectionRule>
            <div className="relative mb-6 rounded-xl overflow-hidden select-none mx-auto border border-border-mid">
              <img
                src={statsPreview}
                alt=""
                aria-hidden="true"
                draggable="false"
                // Sin blur: lo de atrás ya es un dibujo, no datos. Difuminar el
                // contenido real sería teatro —se saca desde el inspector—, y
                // sobre un asset falso el desenfoque sólo lo hace ver sucio.
                className="w-full block"
                style={{ transform: 'scale(1.01)' }}
              />
              <div
                className="absolute inset-0 grid place-items-center"
                style={{ background: 'linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--color-base) 55%, transparent) 55%, var(--color-base) 100%)' }}
              >
                <div
                  className="text-center bg-surface rounded-2xl px-6 py-5 max-w-[min(92%,420px)] shadow-2xl"
                  style={{ borderWidth: 1, borderStyle: 'solid', borderColor: 'color-mix(in srgb, var(--color-premium) 35%, transparent)' }}
                >
                  <PremiumChip className="mb-2.5" />
                  <div className="font-condensed font-bold text-[15.5px] text-white">Tu juego, en detalle</div>
                  <p className="text-[12.5px] text-secondary mt-1.5 mb-0 leading-relaxed max-w-[36ch] mx-auto">
                    En qué días jugás mejor, tu mejor racha, games a favor, remontadas y palizas.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowPremiumModal(true)}
                    className="inline-flex items-center gap-2 bg-brand text-base border-0 px-5 py-2.5 mt-3.5 font-condensed font-bold text-sm tracking-wide cursor-pointer rounded-lg"
                  >
                    <Gem size={14} /> DESBLOQUEAR CON PREMIUM
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : owner.is_premium ? (
          <>
            <SectionRule>ESTADÍSTICAS AVANZADAS</SectionRule>
            <div className="border border-dashed border-border-strong rounded-xl p-8 text-center mb-6">
              <div className="font-condensed font-bold text-[15px] text-white">Este perfil las mantiene privadas</div>
              <p className="text-[13px] text-muted mt-2 mb-0 leading-relaxed max-w-[46ch] mx-auto">
                Su dueño eligió que sus estadísticas avanzadas no sean públicas. Las de arriba se ven siempre.
              </p>
            </div>
          </>
        ) : null)}
        </>)}

        {tab === 'resumen' && (<>
        {/* Últimos partidos */}
        {recent_matches?.length > 0 && (
          <>
          <SectionRule action={
            recent_matches.length > 5 ? (
              <button
                type="button"
                onClick={() => setTab('partidos')}
                className="shrink-0 font-mono text-[11px] text-muted hover:text-brand transition-colors bg-transparent border-0 cursor-pointer"
              >
                Ver los {recent_matches.length}
              </button>
            ) : null
          }>ÚLTIMOS PARTIDOS</SectionRule>
          <div className="border border-border-mid rounded-xl overflow-hidden">
            {recent_matches.slice(0, 5).map((m) => (
              <MatchRow
                key={m.id}
                m={m}
                onOpen={() => navigate(`/cat/${m.group_id}/torneo/${m.tournament_id}`)}
              />
            ))}
          </div>
        </>
        )}

        {/* Compañeros frecuentes */}
        {frequent_partners?.length > 0 && (
          <>
          <SectionRule>COMPAÑEROS FRECUENTES</SectionRule>
            
            <div className="rounded-lg overflow-hidden border border-border-strong">
              {frequent_partners.map((p, i) => (
                <div key={i}
                  onClick={() => p.username && navigate(`/u/${p.username}`)}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-border-strong last:border-b-0 transition-colors ${p.username ? 'cursor-pointer hover:bg-surface' : ''}`}
                  style={{ background: '#0d0d0d' }}>
                  <div className="shrink-0 font-condensed font-black text-[13px] w-4 text-center" style={{ color: '#333' }}>
                    {i + 1}
                  </div>
                  <PlayerAvatar name={p.name} src={p.avatar_url} size={32} premium={p.is_premium} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-mono truncate ${p.username ? 'text-white' : 'text-muted'}`}>
                      {p.name}
                    </div>
                    {p.username && (
                      <div className="text-[10px] font-mono text-dim">@{p.username}</div>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <div className="text-right">
                      <div className="font-condensed font-black text-[18px] text-white leading-none">{p.partidos_juntos}</div>
                      <div className="text-[10px] font-mono text-dim">{p.partidos_juntos === 1 ? 'partido' : 'partidos'}</div>
                    </div>
                    {p.username && (
                      <ChevronUp size={13} className="text-dim rotate-90 shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          
        </>
        )}

        {/* Ranking entre la gente que sigue. Sólo lo ve el dueño del perfil. */}
        {isOwnProfile && follow_ranking?.length > 1 && (
          <>
          <SectionRule>ENTRE TUS SEGUIDOS</SectionRule>
            
            <div className="rounded-lg overflow-hidden border border-border-strong">
              {follow_ranking.map((r, i) => (
                <div key={r.id}
                  onClick={() => !r.is_me && r.username && navigate(`/u/${r.username}`)}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-border-strong last:border-b-0 transition-colors ${!r.is_me && r.username ? 'cursor-pointer hover:bg-surface' : ''}`}
                  style={{ background: r.is_me ? '#e8f04a0d' : '#0d0d0d' }}>
                  <div className="shrink-0 font-condensed font-black text-[13px] w-4 text-center"
                    style={{ color: i === 0 ? '#f0d04a' : '#333' }}>
                    {i + 1}
                  </div>
                  <PlayerAvatar name={r.name} src={r.avatar_url} size={32} premium={r.is_premium} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-mono truncate ${r.is_me ? 'text-brand' : 'text-white'}`}>
                      {r.name}{r.is_me && ' (vos)'}
                    </div>
                    <div className="text-[10px] font-mono text-dim">{r.partidos} PJ · {r.victorias}V</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-condensed font-black text-[18px] leading-none"
                      style={{ color: r.win_rate >= 60 ? '#4af07a' : r.win_rate >= 40 ? '#e8f04a' : '#f07a4a' }}>
                      {r.win_rate}%
                    </div>
                    <div className="text-[10px] font-mono text-dim">victorias</div>
                  </div>
                </div>
              ))}
            </div>
          
        </>
        )}

        {/* Categorías */}
        <SectionRule>CATEGORÍAS</SectionRule>
        <ProfileCategories
          merged={mergedGroups}
          isOwnProfile={isOwnProfile}
          onOpen={(id) => navigate(`/cat/${id}`)}
        />

        </>)}


        {tab === 'partidos' && <ProfileMatches matches={recent_matches ?? []} stats={stats} />}
      </div>

      {cropFile && (
        <AvatarCropper
          file={cropFile}
          onCancel={() => { if (!avatarBusy) setCropFile(null); }}
          onSave={handleCropSave}
        />
      )}

      {showPremiumModal && <PremiumModal onClose={() => setShowPremiumModal(false)} />}

      {showClaimHelp && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[1000] p-4"
          onClick={() => setShowClaimHelp(false)}
        >
          <div
            className="bg-surface border border-border-strong rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-condensed font-bold text-xl text-white tracking-wide">
                ¿Pagaste y no se activó?
              </h3>
              <button
                type="button"
                onClick={() => setShowClaimHelp(false)}
                className="text-muted hover:text-white transition p-1"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-secondary leading-relaxed">
              Para activar tu Premium, al terminar el pago en Mercado Pago tenés que tocar el botón{' '}
              <span className="text-soft font-semibold">"Volver al sitio del vendedor"</span>. Eso confirma tu pago y activa tu cuenta al instante.
            </p>
            <p className="text-sm text-secondary leading-relaxed">
              Si ya pagaste y no volviste al sitio, dejanos el email de tu cuenta de Mercado Pago y lo activamos:
            </p>

            <ClaimPremiumRequest compact />

            <button
              type="button"
              onClick={() => setShowClaimHelp(false)}
              className="w-full py-2.5 rounded-xl bg-surface-alt border border-border-strong text-white font-semibold text-sm hover:bg-surface transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {showShare && (
        <ShareProfileModal
          name={owner.name}
          username={owner.username}
          url={window.location.href}
          isOwnProfile={isOwnProfile}
          // Sin partidos ni torneos la historia queda vacía: mejor no ofrecerla.
          onCreateImage={(stats?.partidos > 0 || stats?.torneos > 0)
            ? () => { setShowShare(false); setShowStory(true); }
            : undefined}
          onClose={() => setShowShare(false)}
        />
      )}

      {showStory && (
        <SnapshotModal
          filename={`perfil-${owner.username}.png`}
          onClose={() => setShowStory(false)}
          story={(
            <ProfileStory
              owner={owner}
              stats={stats ?? {}}
              avatar={displayAvatar}
              // La captura con avanzadas es del dueño premium; un visitante la
              // consigue sólo si el dueño las publicó.
              advanced={canSeeAdvanced}
              monthlyStats={monthly_stats ?? []}
              weekdayStats={data.weekday_stats ?? []}
            />
          )}
        />
      )}

      {showDeleteModal && (
        <Modal
          title="Eliminar cuenta"
          confirmText={deleteBusy ? 'Eliminando...' : 'Eliminar cuenta'}
          confirmDisabled={deleteBusy || !deletePassword.trim()}
          confirmDanger
          onConfirm={handleDeleteAccount}
          onCancel={() => { if (!deleteBusy) setShowDeleteModal(false); }}
        >
          <p className="mb-3">
            Esta acción es permanente y no se puede deshacer. Tus categorías y torneos se conservan bajo una
            cuenta anónima; tus partidos en categorías de otros quedan sin vincular.
          </p>
          <label className="block text-[11px] tracking-widest text-muted font-mono mb-1.5">
            CONTRASEÑA
          </label>
          <PasswordInput
            value={deletePassword}
            onChange={e => setDeletePassword(e.target.value)}
            placeholder="Tu contraseña (o escribí BORRAR si usás Google)"
          />
          {deleteError && <p className="text-danger text-xs font-mono mt-3">{deleteError}</p>}
        </Modal>
      )}

      {showInviteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-5"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowInviteModal(false); }}
        >
          <div className="bg-surface border border-border-strong rounded-xl w-full max-w-sm p-6 relative">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 text-muted hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            >
              <X size={16} />
            </button>
            <div className="flex flex-col items-center text-center gap-3">
              <PlayerAvatar name={owner.name} src={displayAvatar} size={64} premium={owner.is_premium} />
              <div>
                <div className="font-condensed font-bold text-[22px] text-white">{owner.name}</div>
                <div className="text-xs font-mono text-muted">@{owner.username}</div>
              </div>
              <p className="text-sm text-secondary leading-relaxed">
                Seguí a <span className="text-white font-semibold">{owner.name}</span>, llevá tus estadítisticas de pádel y competí en torneos con tus amigos.
              </p>
              <button
                onClick={() => navigate('/register')}
                className="w-full bg-brand text-base border-0 py-3 font-condensed font-bold text-[15px] tracking-widest rounded-lg cursor-pointer hover:brightness-110 transition"
              >
                CREAR CUENTA GRATIS
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-transparent border border-border-strong text-muted py-2.5 font-condensed font-bold text-[13px] tracking-widest rounded-lg cursor-pointer hover:text-white hover:border-border-mid transition"
              >
                Ya tengo cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {avatarZoom && displayAvatar && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-1000 p-5"
          onClick={() => setAvatarZoom(false)}
        >
          <button
            type="button"
            onClick={() => setAvatarZoom(false)}
            className="absolute top-4 right-4 bg-surface text-white border border-border-strong rounded-full w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-border-mid transition"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
          <div className="flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
            <img
              src={avatarZoomUrl(displayAvatar)}
              alt={owner.name}
              width={512}
              height={512}
              className="w-full max-w-[min(512px,80vw)] aspect-square object-cover rounded-full border border-border-strong"
            />
            <div className="text-sm font-mono text-muted">@{owner.username}</div>
          </div>
        </div>
      )}

      {confirmAvatarDelete && (
        <Modal
          title="Eliminar foto de perfil"
          message="Se va a quitar tu foto de perfil y volvés a las iniciales. Podés subir otra cuando quieras."
          confirmText={avatarBusy ? 'Eliminando...' : 'Eliminar foto'}
          confirmDisabled={avatarBusy}
          confirmDanger
          onConfirm={handleAvatarDelete}
          onCancel={() => { if (!avatarBusy) setConfirmAvatarDelete(false); }}
        />
      )}

      {followModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-5">
          <div className="bg-surface border border-border-strong rounded-lg w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-mid">
              <span className="font-condensed font-bold text-sm tracking-[3px] text-muted">
                {followModal === 'followers' ? 'SEGUIDORES' : 'SEGUIDOS'}
              </span>
              <button
                onClick={() => setFollowModal(null)}
                className="text-muted hover:text-white transition-colors cursor-pointer bg-transparent border-none"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto px-4 py-3">
              {followListLoading ? (
                <div className="py-8 text-center text-dim text-xs font-mono">Cargando...</div>
              ) : followList.length === 0 ? (
                <div className="py-8 text-center text-dim text-xs font-mono">
                  {followModal === 'followers' ? 'Nadie sigue a este usuario todavía.' : 'Este usuario no sigue a nadie todavía.'}
                </div>
              ) : (
                <div className="flex flex-col">
                  {followList.map(u => (
                    <div
                      key={u.id}
                      onClick={() => { setFollowModal(null); navigate(`/u/${u.username}`); }}
                      className="flex items-center gap-3 py-2.5 border-b border-border-strong last:border-b-0 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <PlayerAvatar name={u.name} src={u.avatar_url} size={36} premium={u.is_premium} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-white truncate">{u.name}</div>
                        <div className="text-[11px] font-mono text-dim">@{u.username}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
