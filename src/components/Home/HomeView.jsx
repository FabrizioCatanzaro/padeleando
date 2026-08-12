/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useNavigate, Link } from 'react-router-dom'
import { useAuth }     from '../../context/useAuth'
import { Globe, Lock, Plus, X, Search, MapPin, Smile, Check, Loader2, Trophy, BarChart3, Radio, UserRound, Building2, Navigation, ChevronLeft } from 'lucide-react';
import logoUrl from '../../assets/padeleando-logo.webp'
import FadeInCard from '../shared/FadeInCard'
import GroupCard from '../shared/GroupCard'
import VisitorShowcase from './VisitorShowcase';
import AppPreview from './AppPreview';
import { Skeleton, CardSkeleton } from '../shared/Skeleton';
import ClubSelector from '../shared/ClubSelector';
import SignupEditor from '../shared/SignupEditor';
import StepBar from '../shared/StepBar';
import { profileContacts } from '../../utils/signup';
import PremiumModal from '../shared/PremiumModal';
import { FREE_MAX_GROUPS, isPlanLimit } from '../../utils/plan';
import { useToast } from '../../context/useToast';
import Btn from '../shared/Btn';
import RolePicker from './RolePicker';
import FirstSteps from './FirstSteps';
import { buildSteps, isRoleDismissed, isFirstStepsDismissed, dismissFirstSteps } from '../../utils/onboarding';

const EMPTY_SIGNUP = { open: false, price: null, unit: 'player', contacts: [] };

const NEW_GROUP_STEPS = [
  { id: 'datos',       label: 'DATOS' },
  { id: 'visibilidad', label: 'VISIBILIDAD' },
  { id: 'inscripcion', label: 'INSCRIPCIÓN' },
];

const EMOJI_LIST =['🔥','⚡','🚻','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🎲','🔝','🚨','🌹','🌼','🥑','🍺','🍷','🧉','🍕','❄️','❤️‍🩹','💫','☢️','💸','🗿','♂️','♀️','🪄','🎉','👑']

const FEATURES = [
  { icon: Trophy,     title: 'Torneos Americanos o Ligas', desc: 'Elegí el formato, con parejas fijas o jugadores libres, y armá el fixture en minutos.' },
  { icon: Radio,      title: 'Partidos en vivo',         desc: 'Cargá los resultados al toque, llevá el tiempo del partido y compartí el torneo con un link público.' },
  { icon: BarChart3,  title: 'Tablas de posiciones y estadísticas', desc: 'Posiciones, estadísticas de rendimiento y mucho más.' },
  { icon: UserRound,  title: 'Tu perfil de padelero',    desc: 'Historial, rachas, estadísticas personales y tus compañeros más frecuentes.' },
]

const NEARBY_CACHE_KEY = 'nearby_clubs_v1';
const NEARBY_TTL       = 10 * 60 * 1000; // 10 min
const NEARBY_INITIAL   = 4;
const NEARBY_PAGE_SIZE = 6;

function readNearbyCache() {
  try {
    const raw = localStorage.getItem(NEARBY_CACHE_KEY);
    if (!raw) return null;
    const { items, ts } = JSON.parse(raw);
    if (Date.now() - ts > NEARBY_TTL) { localStorage.removeItem(NEARBY_CACHE_KEY); return null; }
    return items;
  } catch { return null; }
}

function writeNearbyCache(items) {
  try { localStorage.setItem(NEARBY_CACHE_KEY, JSON.stringify({ items, ts: Date.now() })); } catch {
    /* */
  }
}


export default function HomeView() {
  // Se lee antes que el resto del estado porque la vitrina de "se está jugando"
  // necesita saber, ya en el primer render, si va a mostrarse.
  const { isLoggedIn, user } = useAuth();

  const [groups,       setGroups]       = useState([]);
  const [partGroups,   setPartGroups]   = useState([]);
  const [coorgGroups,  setCoorgGroups]  = useState([]);
  const [favGroups,    setFavGroups]    = useState([]);
  // Sólo hay algo que esperar si hay sesión: un visitante no dispara ninguna
  // petición para pintar la portada. Arrancando en true, el primer render
  // devolvía el esqueleto de la vista con sesión y al apagarse se insertaba el
  // hero completo, empujando el resto ~480 px. Ese era el CLS de 0,685.
  const [loading,      setLoading]      = useState(isLoggedIn);
  const [name,         setName]         = useState('');
  const [desc,         setDesc]         = useState('');
  const [isPublic,     setIsPublic]     = useState(true);
  const [showNew,      setShowNew]      = useState(false);
  const [selectedEmojis, setSelectedEmojis] = useState([]);
  // Alta de categoría por pasos, igual que la de torneo: datos → visibilidad →
  // inscripción. El tercero es opcional y se puede saltear.
  const [newStep, setNewStep] = useState(0);
  const [signup,  setSignup]  = useState(EMPTY_SIGNUP);
  const [showEmojiModal, setShowEmojiModal] = useState(false);
  const [club,           setClub]           = useState(null);
  const [searchQ,        setSearchQ]        = useState('');
  const [searchUsers,    setSearchUsers]    = useState([]);
  const [searchGroups,   setSearchGroups]   = useState([]);
  const [searchClubs,    setSearchClubs]    = useState([]);
  const [searching,      setSearching]      = useState(false);
  const [committedQ,     setCommittedQ]     = useState('');
  const [committedUsers, setCommittedUsers] = useState([]);
  const [committedGroups,setCommittedGroups]= useState([]);
  const [committedClubs, setCommittedClubs] = useState([]);
  const [committing,     setCommitting]     = useState(false);
  const [error,             setError]             = useState(null)
  const [showPremiumModal,  setShowPremiumModal]  = useState(false)
  const [premiumReason,     setPremiumReason]     = useState(null)
  const [creating,          setCreating]          = useState(false)

  const [nearbyClubs,    setNearbyClubs]    = useState([]);
  const [nearbyStatus,   setNearbyStatus]   = useState('idle'); // idle | loading | done | denied | error | unsupported
  const [nearbyPage,     setNearbyPage]     = useState(NEARBY_INITIAL);

  // Onboarding. `pickedRole` sólo existe para que la tarjeta cambie en el mismo
  // render en que el usuario elige, sin esperar al PATCH ni al refresco de /me.
  const [pickedRole,    setPickedRole]    = useState(null);
  const [roleDismissed, setRoleDismissed] = useState(isRoleDismissed);
  const [stepsDismissed, setStepsDismissed] = useState(isFirstStepsDismissed);

  const [homeData, setHomeData] = useState(null);
  // Arranca en true para visitantes: si empezara en false, la sección entera no
  // existiría en el primer render y se insertaría al arrancar la carga,
  // empujando todo lo de abajo. Ese salto era un CLS de 0,685 —el elemento que
  // Lighthouse marcaba como desplazado— y no lo causaba el logo.
  const [homeLoading, setHomeLoading] = useState(!isLoggedIn);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const valsPrivacy = [
    { val: true, label: 'Público', icon: Globe },
    { val: false, label: 'Privado', icon: Lock }
  ]

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    Promise.all([api.groups.list(), api.groups.participating(), api.groups.collaborating(), api.groups.favorites()])
      .then(([owned, part, coorg, favs]) => {
        setGroups(owned); setPartGroups(part); setCoorgGroups(coorg); setFavGroups(favs);
      })
      .catch(() => { navigate('/login'); })
      .finally(() => setLoading(false));
  }, []);

  // Clubes cercanos: usa cache, o auto-carga si el permiso de ubicación ya está concedido.
  // Escucha cambios de permiso para reaccionar si el usuario lo habilita desde ajustes.
  useEffect(() => {
    const cached = readNearbyCache();
    if (cached) { setNearbyClubs(cached); setNearbyStatus('done'); return; }
    if (!navigator.geolocation) { setNearbyStatus('unsupported'); return; }
    if (!navigator.permissions?.query) return;

    let permStatus;
    navigator.permissions.query({ name: 'geolocation' })
      .then((res) => {
        permStatus = res;
        const apply = () => {
          if (res.state === 'granted') fetchNearbyClubs();
          else if (res.state === 'denied') setNearbyStatus('denied');
          else setNearbyStatus('idle'); // 'prompt' → el botón puede mostrar el cartel nativo
        };
        apply();
        res.onchange = apply;
      })
      .catch(() => {});

    return () => { if (permStatus) permStatus.onchange = null; };
  }, []);

  // Portada del visitante: en vivo, próximas, inscripciones y categorías activas en una petición
  useEffect(() => {
    if (isLoggedIn) return;
    setHomeLoading(true);
    api.home.get()
      .then(setHomeData)
      .catch(() => setHomeData(null))
      .finally(() => setHomeLoading(false));
  }, [isLoggedIn]);

  // Búsqueda de perfiles, categorías y clubes con debounce
  useEffect(() => {
    if (!searchQ.trim() || searchQ.length < 2) { setSearchUsers([]); setSearchGroups([]); setSearchClubs([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const [users, groups, clubs] = await Promise.all([
          api.auth.search(searchQ),
          api.groups.search(searchQ),
          api.clubs.list(searchQ),
        ]);
        setSearchUsers(users);
        setSearchGroups(groups);
        setSearchClubs(clubs);
      } catch {
        setSearchUsers([]);
        setSearchGroups([]);
        setSearchClubs([]);
      } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  function toggleEmoji(e) {
    setSelectedEmojis(prev =>
      prev.includes(e) ? prev.filter(x => x !== e) : prev.length < 2 ? [...prev, e] : prev
    )
  }

  async function handleSearch() {
    const q = searchQ.trim();
    if (q.length < 2) return;
    setCommitting(true);
    try {
      const [users, groups, clubs] = await Promise.all([
        api.auth.search(q),
        api.groups.search(q),
        api.clubs.list(q),
      ]);
      setCommittedQ(q);
      setCommittedUsers(users);
      setCommittedGroups(groups);
      setCommittedClubs(clubs);
      setSearchUsers([]);
      setSearchGroups([]);
      setSearchClubs([]);
    } catch {
      setCommittedUsers([]);
      setCommittedGroups([]);
      setCommittedClubs([]);
    } finally { setCommitting(false); }
  }

  function clearSearch() {
    setSearchQ('');
    setCommittedQ('');
    setCommittedUsers([]);
    setCommittedGroups([]);
    setCommittedClubs([]);
    setSearchUsers([]);
    setSearchGroups([]);
    setSearchClubs([]);
  }

  function fetchNearbyClubs() {
    if (!navigator.geolocation) { setNearbyStatus('unsupported'); return; }
    setNearbyStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const data = await api.clubs.nearby(coords.latitude, coords.longitude);
          writeNearbyCache(data);
          setNearbyClubs(data);
          setNearbyStatus('done');
          setNearbyPage(NEARBY_INITIAL);
        } catch {
          setNearbyStatus('error');
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          // Distinguir descarte temporal (se puede volver a pedir) de bloqueo real.
          if (navigator.permissions?.query) {
            navigator.permissions.query({ name: 'geolocation' })
              .then((res) => {
                if (res.state === 'denied') {
                  setNearbyStatus('denied');
                  showToast('La ubicación está bloqueada. Habilitala desde los ajustes del sitio en tu navegador.');
                } else {
                  setNearbyStatus('idle'); // solo lo cerró → el botón vuelve a pedir permiso
                }
              })
              .catch(() => setNearbyStatus('denied'));
          } else {
            setNearbyStatus('denied');
          }
        } else {
          setNearbyStatus('error');
        }
      },
      { timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }

  async function handleCreate() {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const g = await api.groups.create({
        name: name.trim(),
        description: desc,
        is_public: isPublic,
        emojis: selectedEmojis,
        club_id: club?.pending ? null : (club?.id ?? null),
        pending_club_request_id: club?.pending ? club.request_id : null,
        // Con la inscripción cerrada no se manda nada: la categoría queda con
        // los campos en NULL, igual que antes de que el alta los ofreciera.
        ...(signup.open
          ? {
              signup_open:       true,
              signup_price:      signup.price,
              signup_price_unit: signup.unit,
              signup_contacts:   signup.contacts.filter((c) => c.value.trim()),
            }
          : {}),
      });
      showToast('Categoría creada');
      navigate(`/cat/${g.id}`);
    } catch (e) {
      // El cupo puede llenarse acá aunque la UI lo haya dejado pasar: el plan del
      // usuario en localStorage puede haber vencido desde el último login.
      if (isPlanLimit(e)) {
        setShowNew(false);
        setPremiumReason(e.message);
        setShowPremiumModal(true);
      } else {
        setError(e.message);
      }
      setCreating(false);
    }
  }

  // Un ex-premium conserva las categorías que creó de más: el cupo sólo frena
  // crear una nueva, y por eso se compara contra el total y no contra un excedente.
  function quotaReason() {
    if (groups.length <= FREE_MAX_GROUPS) return null;
    return `Tenés ${groups.length} categorías y el plan Básico permite ${FREE_MAX_GROUPS}. Las conservás todas y siguen funcionando igual, pero para crear otra necesitás Premium.`;
  }

  function openNewModal() {
    if (user?.subscription?.plan !== 'premium' && groups.length >= FREE_MAX_GROUPS) {
      setPremiumReason(quotaReason());
      setShowPremiumModal(true);
      return;
    }
    setName('');
    setDesc('');
    setIsPublic(true);
    setSelectedEmojis([]);
    setClub(null);
    setSignup(EMPTY_SIGNUP);
    setNewStep(0);
    setError(null);
    setShowNew(true);
  }

  if (loading) return (
    <div className="text-content font-sans pb-16">
      <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
        <Skeleton className="h-11 w-full rounded-lg mb-8" />
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-7 w-20" />
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
          <CardSkeleton lines={3} />
          <CardSkeleton lines={3} />
          <CardSkeleton lines={2} />
        </div>
      </div>
    </div>
  );

  const nearbyVisible = nearbyClubs;

  // Onboarding. El rol viene del servidor; `pickedRole` sólo cubre el instante
  // entre que el usuario toca y que /me se refresca.
  const role = pickedRole ?? user?.onboarding_role ?? null;
  const showRolePicker = isLoggedIn && !role && !roleDismissed;

  // Los pasos se derivan de los datos ya cargados, así que no hay nada que
  // guardar: si hizo algo desde otro lado, aparece tildado igual. Quien esquivó
  // la pregunta de rol tampoco ve el checklist — pidió que lo dejen tranquilo.
  const allSteps = role ? buildSteps({ role, groups, partGroups, favGroups, user }) : null;
  const firstSteps =
    allSteps && !stepsDismissed && allSteps.some((s) => !s.done) ? allSteps : null;

  function handleDismissSteps() {
    dismissFirstSteps();
    setStepsDismissed(true);
  }

  return (
    <div className="text-content font-sans pb-16">
      <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">

        {/* ── Hero (visitante no logueado) ── */}
        {!isLoggedIn && !committedQ && (
          <div className="text-center pt-6 pb-12 sm:pt-12 sm:pb-16">
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-border-mid">
              <img src={logoUrl} className="w-4 h-4" width="16" height="16" alt="" />
              <span className="font-mono text-[11px] tracking-widest text-secondary">PADELEANDO</span>
            </div>
            <h1 className="font-condensed font-bold text-3xl sm:text-5xl leading-[1.1] text-white max-w-2xl mx-auto">
              Organizá y llevá las estadísticas de tus<br className="hidden sm:block" /> torneos de <span className="text-brand">pádel</span>
            </h1>
            <p className="text-secondary text-sm font-sans mt-5 max-w-md mx-auto leading-relaxed">
              Creá torneos Americanos o Ligas, cargá partidos en vivo y llevá estadísticas automáticas. <span className="text-brand">Gratis.</span>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <Btn variant="primary" size="lg" icon={Trophy} onClick={() => navigate('/register')}>
                CREAR TORNEO GRATIS
              </Btn>
              <Btn variant="secondary" size="lg" onClick={() => navigate('/tutorial')}>
                Ver cómo funciona
              </Btn>
            </div>
            {/* Altura fija: los totales llegan con la petición y sin reservarla empujarían el resto. */}
            <div className="h-11 mt-8 flex items-center justify-center">
              {homeData?.totals && (
                <div className="flex items-center gap-5 sm:gap-7 font-mono text-[11px] text-dim">
                  {[
                    [homeData.totals.tournaments, 'torneos'],
                    [homeData.totals.matches,     'partidos'],
                    [homeData.totals.players,     'jugadores'],
                    [homeData.totals.clubs,       'clubes'],
                  ].filter(([n]) => n > 0).map(([n, label]) => (
                    <div key={label} className="flex flex-col items-center gap-0.5">
                      <span className="font-condensed font-bold text-lg text-soft leading-none">{n.toLocaleString('es-AR')}</span>
                      <span className="tracking-widest">{label.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="font-mono text-[11px] text-dim mt-4">
              ¿Ya tenés cuenta?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-secondary hover:text-brand transition-colors underline underline-offset-2 bg-transparent border-none cursor-pointer p-0"
              >
                Iniciá sesión
              </button>
            </p>
          </div>
        )}

        {/* ── Buscador ── */}
        <div className="relative mb-8">
          {!committedQ && (
            <h2 className="font-condensed font-bold text-sm tracking-widest text-muted mb-2.5">
              {isLoggedIn ? 'BUSCADOR' : 'ENCONTRÁ JUGADORES, CATEGORÍAS Y CLUBES'}
            </h2>
          )}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                className="w-full bg-surface border border-border-mid text-white pl-10 pr-4 py-3 rounded-lg text-sm outline-none font-sans placeholder:text-muted focus:border-border-strong transition-colors"
                placeholder="Buscar jugadores, categorías o clubes..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searchQ.trim().length < 2 || committing}
              aria-label="Buscar"
              className="bg-surface border border-border-mid text-white px-4 py-3 rounded-lg cursor-pointer hover:border-border-strong transition-colors disabled:opacity-30"
            >
              {committing ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            </button>
          </div>

          {/* Dropdown de sugerencias */}
          {searchQ.trim().length >= 2 && (searching || searchUsers.length > 0 || searchGroups.length > 0 || searchClubs.length > 0) && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-surface-alt border border-border-strong rounded-lg overflow-hidden shadow-xl max-h-72 overflow-y-auto">
              {searching && (
                <div className="px-4 py-3 text-xs font-mono text-muted">Buscando...</div>
              )}
              {!searching && searchUsers.length === 0 && searchGroups.length === 0 && searchClubs.length === 0 && (
                <div className="px-4 py-3 text-xs font-mono text-muted">Sin resultados</div>
              )}
              {!searching && searchUsers.length > 0 && (
                <>
                  <div className="px-4 pt-3 pb-1 text-[10px] font-mono text-dim tracking-widest border-b border-border-mid">PERFILES</div>
                  {searchUsers.map((u) => (
                    <div key={u.id}
                      onClick={() => { navigate(`/u/${u.username}`); setSearchQ(''); setSearchUsers([]); setSearchGroups([]); setSearchClubs([]); }}
                      className="flex flex-col px-4 py-2.5 cursor-pointer border-b border-border-mid last:border-0 hover:bg-surface transition-colors"
                    >
                      <span className="font-condensed font-bold text-base text-white">{u.name}</span>
                      <span className="text-[11px] font-mono text-dim">@{u.username}</span>
                    </div>
                  ))}
                </>
              )}
              {!searching && searchGroups.length > 0 && (
                <>
                  <div className="px-4 pt-3 pb-1 text-[10px] font-mono text-dim tracking-widest border-b border-border-mid">CATEGORÍAS</div>
                  {searchGroups.map((g) => (
                    <div key={g.id}
                      onClick={() => { navigate(`/cat/${g.id}`); setSearchQ(''); setSearchUsers([]); setSearchGroups([]); setSearchClubs([]); }}
                      className="flex flex-col px-4 py-2.5 cursor-pointer border-b border-border-mid last:border-0 hover:bg-surface transition-colors"
                    >
                      <span className="font-condensed font-bold text-base text-white">
                        {g.emojis?.length > 0 && <span className="mr-1">{g.emojis.join(' ')}</span>}{g.name}
                      </span>
                      <span className="text-[11px] font-mono text-dim">@{g.owner_username}</span>
                    </div>
                  ))}
                </>
              )}
              {!searching && searchClubs.length > 0 && (
                <>
                  <div className="px-4 pt-3 pb-1 text-[10px] font-mono text-dim tracking-widest border-b border-border-mid">CLUBES</div>
                  {searchClubs.map((c) => (
                    <div key={c.id}
                      onClick={() => { navigate(`/club/${c.id}`); setSearchQ(''); setSearchUsers([]); setSearchGroups([]); setSearchClubs([]); }}
                      className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer border-b border-border-mid last:border-0 hover:bg-surface transition-colors"
                    >
                      {c.photo_url
                        ? <img src={c.photo_url} alt="" className="w-8 h-8 rounded-md object-cover border border-border-mid shrink-0" />
                        : <span className="w-8 h-8 rounded-md bg-surface border border-border-mid flex items-center justify-center shrink-0"><Building2 size={15} className="text-muted" /></span>}
                      <div className="min-w-0">
                        <div className="font-condensed font-bold text-white truncate">{c.name}</div>
                        {c.location_name && <div className="text-[11px] font-mono text-dim truncate">{c.location_name}</div>}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Vitrinas del visitante: en vivo, próximas, inscripciones y categorías activas ── */}
        {!isLoggedIn && !committedQ && (
          <VisitorShowcase data={homeData} loading={homeLoading} />
        )}

        {/* ── Clubes cerca tuyo ── */}
        {!committedQ && nearbyStatus !== 'unsupported' && (
          <div className="mb-10">
            {/* Estados previos a los resultados: misma altura para evitar saltos de layout */}
            {nearbyStatus !== 'done' && nearbyStatus !== 'unsupported' && (
              <div className="border border-border-mid rounded-lg p-6 sm:p-8 text-center bg-surface/40 min-h-[168px] flex flex-col items-center justify-center">
                {nearbyStatus === 'loading' ? (
                  <>
                    <div className="w-11 h-11 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-3">
                      <Loader2 size={20} className="animate-spin" />
                    </div>
                    <p className="text-secondary text-sm font-sans">Buscando clubes cercanos...</p>
                  </>
                ) : (
                  <>
                    <div className="w-11 h-11 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-3">
                      <MapPin size={20} />
                    </div>
                    <p className="text-secondary text-sm font-sans mb-4 max-w-xs leading-relaxed">
                      {nearbyStatus === 'denied'
                        ? 'La ubicación está bloqueada. Habilitala desde el ícono de candado en la barra del navegador.'
                        : nearbyStatus === 'error'
                          ? 'No pudimos obtener tu ubicación. Probá de nuevo.'
                          : 'Activá tu ubicación para descubrir clubes de pádel cerca tuyo.'}
                    </p>
                    <Btn variant="primary" size="md" icon={MapPin} onClick={fetchNearbyClubs}>
                      {nearbyStatus === 'idle' ? 'VER CLUBES CERCA' : 'REINTENTAR'}
                    </Btn>
                  </>
                )}
              </div>
            )}
            {nearbyStatus === 'done' && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 font-condensed font-bold text-sm tracking-widest text-muted">
                    <MapPin size={13} />
                    CLUBES CERCA TUYO
                  </div>
                  <button
                    onClick={() => { setNearbyStatus('idle'); setNearbyClubs([]); }}
                    className="text-dim hover:text-soft transition-colors cursor-pointer bg-transparent border-none"
                  >
                    <X size={15} />
                  </button>
                </div>
                {nearbyVisible.length === 0 ? (
                  <div className="font-mono text-xs text-dim">No hay clubes en un radio de 20 km.</div>
                ) : (
                  <>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
                      {nearbyVisible.slice(0, nearbyPage).map((c, i) => (
                        <FadeInCard
                          key={c.id}
                          delay={i * 60}
                          className="border border-border-mid rounded-lg cursor-pointer overflow-hidden card-link flex items-center gap-3 p-3"
                          style={{ background: 'linear-gradient(145deg, #0d0d0d 0%, #1c1c1c 100%)' }}
                          onClick={() => navigate(`/club/${c.id}`)}
                        >
                          {c.photo_url ? (
                            <img
                              src={c.photo_url}
                              alt=""
                              className="w-14 h-14 rounded-lg object-cover border border-border-mid shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-surface border border-border-mid flex items-center justify-center shrink-0">
                              <Building2 size={20} className="text-muted" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-condensed font-bold text-[16px] text-white leading-tight truncate">{c.name}</div>
                            {c.location_name && (
                              <div className="flex items-center gap-1 font-mono text-[11px] text-secondary mt-0.5">
                                <MapPin size={10} className="shrink-0" />
                                <span className="truncate">{c.location_name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-3 mt-1">
                              {c.courts != null && (
                                <span className="font-mono text-[11px] text-muted">{c.courts} {c.courts === 1 ? 'cancha' : 'canchas'}</span>
                              )}
                              {c.distance_km != null && (
                                <span className="flex items-center gap-1 font-mono text-[11px] text-brand">
                                  <Navigation size={10} />{c.distance_km} km
                                </span>
                              )}
                            </div>
                          </div>
                        </FadeInCard>
                      ))}
                    </div>
                    {nearbyVisible.length > nearbyPage && (
                      <button
                        onClick={() => setNearbyPage(p => p + NEARBY_PAGE_SIZE)}
                        className="mt-3 flex items-center gap-2 bg-transparent border border-border-mid text-muted px-3.5 py-2 rounded-lg text-xs font-mono cursor-pointer hover:border-border-strong hover:text-soft transition-colors"
                      >
                        VER MÁS · {nearbyVisible.length - nearbyPage} restantes
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ── ¿Qué podés hacer? (visitantes) ── */}
        {!isLoggedIn && !committedQ && (
          <div className="mt-14 mb-6">
            <h2 className="font-condensed font-bold text-sm tracking-widest text-muted text-center mb-6">¿QUÉ PODÉS HACER?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="border border-border-mid rounded-lg p-4 bg-surface/40 flex flex-col gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
                    <f.icon size={18} />
                  </div>
                  <h3 className="font-condensed font-bold text-[15px] text-white leading-tight">{f.title}</h3>
                  <p className="font-sans text-[13px] text-secondary leading-snug">{f.desc}</p>
                </div>
              ))}
            </div>
            <AppPreview />
            <div className="flex justify-center mt-12">
              <Btn variant="primary" size="lg" icon={Trophy} onClick={() => navigate('/register')}>
                EMPEZÁ GRATIS
              </Btn>
            </div>
          </div>
        )}

        {/* ── Resultados de búsqueda ── */}
        {committedQ && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="font-condensed font-bold text-sm tracking-widest text-muted">
                RESULTADOS PARA &quot;{committedQ}&quot;
              </div>
              <button onClick={clearSearch} className="text-dim hover:text-soft transition-colors cursor-pointer bg-transparent border-none">
                <X size={16} />
              </button>
            </div>
            {committing && <div className="font-mono text-xs text-muted py-4">Buscando...</div>}
            {!committing && committedUsers.length === 0 && committedGroups.length === 0 && committedClubs.length === 0 && (
              <div className="font-mono text-xs text-muted py-4">Sin resultados.</div>
            )}
            {!committing && committedUsers.length > 0 && (
              <>
                <div className="font-mono text-[10px] text-dim tracking-widest mb-3">PERFILES</div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 mb-8">
                  {committedUsers.map((u) => (
                    <FadeInCard key={u.id}
                      className="border border-border-mid rounded-lg cursor-pointer overflow-hidden p-4 card-link"
                      style={{ background: 'linear-gradient(145deg, #0d0d0d 0%, #222222 100%)' }}
                      onClick={() => navigate(`/u/${u.username}`)}>
                      <div className="font-condensed font-bold text-xl text-white">{u.name}</div>
                      <div className="font-mono text-xs text-dim mt-1">@{u.username}</div>
                    </FadeInCard>
                  ))}
                </div>
              </>
            )}
            {!committing && committedGroups.length > 0 && (
              <>
                <div className="font-mono text-[10px] text-dim tracking-widest mb-3">CATEGORÍAS</div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 mb-8">
                  {committedGroups.map((g) => (
                    <GroupCard key={g.id} g={g} onClick={() => navigate(`/cat/${g.id}`)} />
                  ))}
                </div>
              </>
            )}
            {!committing && committedClubs.length > 0 && (
              <>
                <div className="font-mono text-[10px] text-dim tracking-widest mb-3">CLUBES</div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 mb-8">
                  {committedClubs.map((c, i) => (
                    <FadeInCard
                      key={c.id}
                      delay={i * 60}
                      className="border border-border-mid rounded-lg cursor-pointer overflow-hidden card-link flex items-center gap-3 p-3"
                      style={{ background: 'linear-gradient(145deg, #0d0d0d 0%, #1c1c1c 100%)' }}
                      onClick={() => navigate(`/club/${c.id}`)}
                    >
                      {c.photo_url ? (
                        <img src={c.photo_url} alt="" className="w-14 h-14 rounded-lg object-cover border border-border-mid shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-surface border border-border-mid flex items-center justify-center shrink-0">
                          <Building2 size={20} className="text-muted" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-condensed font-bold text-[16px] text-white leading-tight truncate">{c.name}</div>
                        {c.location_name && (
                          <div className="flex items-center gap-1 font-mono text-[11px] text-secondary mt-0.5">
                            <MapPin size={10} className="shrink-0" />
                            <span className="truncate">{c.location_name}</span>
                          </div>
                        )}
                        {c.courts != null && (
                          <span className="font-mono text-[11px] text-muted mt-1 inline-block">{c.courts} {c.courts === 1 ? 'cancha' : 'canchas'}</span>
                        )}
                      </div>
                    </FadeInCard>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Onboarding: una pregunta, después el checklist ── */}
        {!committedQ && isLoggedIn && !loading && (
          showRolePicker
            ? <RolePicker onPick={(r) => { setPickedRole(r); setRoleDismissed(r == null); }} />
            : firstSteps && <FirstSteps steps={firstSteps} onDismiss={handleDismissSteps} />
        )}

        {/* ── Mis categorías ── */}
        {!committedQ && isLoggedIn && (
          <>
            {/* Header sección + botón nueva categoría */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-condensed font-bold text-sm tracking-widest text-muted">MIS CATEGORÍAS</h2>
              <Btn variant="primary" size="sm" icon={Plus} onClick={openNewModal}>NUEVA</Btn>
            </div>

            {groups.length === 0 ? (
              <div className="border border-dashed border-border-strong rounded-lg p-8 text-center mb-8">
                <p className="text-muted text-sm font-sans mb-1">Todavía no tenés categorías creadas.</p>
                <p className="text-dim text-[12px] font-mono mb-4">
                  Una categoría agrupa a la gente que juega junta; los torneos van adentro.
                </p>
                <Btn variant="primary" icon={Plus} onClick={openNewModal}>CREAR PRIMERA CATEGORÍA</Btn>
                <div className="mt-3">
                  <Link to="/tutorial#crear-categoria" className="text-[12px] font-mono text-muted hover:text-brand transition-colors">
                    Ver cómo funciona
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 mb-10">
                {groups.map((g, i) => (
                  <GroupCard key={g.id} g={g} delay={i * 60} onClick={() => navigate(`/cat/${g.id}`)} />
                ))}
              </div>
            )}

            {/* Categorías que co-organizo */}
            {coorgGroups.length > 0 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-condensed font-bold text-sm tracking-widest text-muted">CO-ORGANIZANDO</h2>
                  <span className="font-mono text-xs text-secondary border border-dim px-2 py-0.5 rounded-full">{coorgGroups.length}</span>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 mb-10">
                  {coorgGroups.map((g, i) => (
                    <GroupCard key={g.id} g={g} delay={i * 60} badge="co-org" onClick={() => navigate(`/cat/${g.id}`)} />
                  ))}
                </div>
              </>
            )}

            {/* Grupos en los que participo */}
            {partGroups.length > 0 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-condensed font-bold text-sm tracking-widest text-muted">PARTICIPANDO EN</h2>
                  <span className="font-mono text-xs text-secondary border border-dim px-2 py-0.5 rounded-full">{partGroups.length}</span>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 mb-10">
                  {partGroups.map((g, i) => (
                    <GroupCard key={g.id} g={g} delay={i * 60} badge="jugador" onClick={() => navigate(`/cat/${g.id}`)} />
                  ))}
                </div>

              </>
            )}

            {/* Categorías favoritas */}
            {favGroups.length > 0 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-condensed font-bold text-sm tracking-widest text-muted">FAVORITAS</h2>
                  <span className="font-mono text-xs text-secondary border border-dim px-2 py-0.5 rounded-full">{favGroups.length}</span>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
                  {favGroups.map((g, i) => (
                    <GroupCard key={g.id} g={g} delay={i * 60} badge="favorita" onClick={() => navigate(`/cat/${g.id}`)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

      </div>

      {/* ── Modal nueva categoría ── */}
      {showNew && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75"
          onClick={(e) => { if (e.target === e.currentTarget) setShowNew(false); }}
        >
          <div className="bg-surface border border-border-mid rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="sticky top-0 bg-surface border-b border-border-mid px-6 py-4 flex items-center justify-between">
              <h2 className="font-condensed font-bold text-lg text-white tracking-wide">NUEVA CATEGORÍA</h2>
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="bg-transparent border-none text-muted hover:text-soft cursor-pointer transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 pt-5">
              <StepBar steps={NEW_GROUP_STEPS} currentIdx={newStep} className="mb-1" />
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* ── Paso 1: datos ── */}
              {newStep === 0 && (<>
              {/* Nombre */}
              <div>
                <label className="block text-[11px] tracking-widest text-dim font-mono mb-2">NOMBRE DE LA CATEGORÍA</label>
                <input
                  className="w-full bg-surface-alt border border-border-mid text-white px-3.5 py-2.5 rounded-lg text-sm outline-none font-sans focus:border-border-strong transition-colors"
                  placeholder="ej: C7/C8"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={30}
                  minLength={2}
                  autoFocus
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-[11px] tracking-widest text-dim font-mono mb-2">DESCRIPCIÓN <span className="text-muted normal-case tracking-normal">(opcional)</span></label>
                <input
                  className="w-full bg-surface-alt border border-border-mid text-white px-3.5 py-2.5 rounded-lg text-sm outline-none font-sans focus:border-border-strong transition-colors"
                  placeholder="ej: Todos los martes a las 17..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  maxLength={50}
                />
              </div>

              {/* Íconos */}
              <div>
                <label className="block text-[11px] tracking-widest text-dim font-mono mb-2">ÍCONOS <span className="text-muted normal-case tracking-normal">(opcional, máx. 2)</span></label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEmojiModal(true)}
                    className="flex items-center gap-2 bg-transparent border border-border-mid text-secondary hover:border-border-strong hover:text-soft transition-colors px-3 py-2 rounded-lg text-xs font-mono cursor-pointer"
                  >
                    <Smile size={14} />
                    ELEGIR ÍCONOS
                    {selectedEmojis.length > 0 && (
                      <span className="text-brand font-bold">({selectedEmojis.length}/2)</span>
                    )}
                  </button>
                  {selectedEmojis.length > 0 && (
                    <div className="flex gap-1.5 items-center">
                      {selectedEmojis.map(e => (
                        <span key={e} className="text-xl leading-none">{e}</span>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSelectedEmojis([])}
                        className="ml-1 text-dim hover:text-soft transition-colors bg-transparent border-none cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Club */}
              <div>
                <label className="block text-[11px] tracking-widest text-dim font-mono mb-2">CLUB <span className="text-muted normal-case tracking-normal">(opcional)</span></label>
                <ClubSelector value={club} onChange={setClub} />
                <p className="text-[11px] text-dim font-mono mt-2">
                  Se usará por defecto en los torneos de esta categoría (podés cambiarlo en cada uno).
                </p>
              </div>
              </>)}

              {/* ── Paso 2: visibilidad ── */}
              {newStep === 1 && (
              <div>
                <label className="block text-[11px] tracking-widest text-dim font-mono mb-2">VISIBILIDAD</label>
                <div className="flex gap-2">
                  {valsPrivacy.map((v) => (
                    <button
                      key={String(v.val)}
                      type="button"
                      onClick={() => setIsPublic(v.val)}
                      className={`flex items-center gap-2 bg-transparent border px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors ${
                        isPublic === v.val
                          ? (v.val ? 'border-cyan text-cyan' : 'border-yellow-400 text-yellow-400')
                          : 'border-border-strong text-muted hover:border-border-mid'
                      }`}
                    >
                      <v.icon size={14} />{v.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-dim font-mono mt-2">
                  {isPublic
                    ? 'Cualquiera puede ver esta categoría en tu perfil.'
                    : 'Solo vos podés ver esta categoría.'}
                </p>
              </div>
              )}

              {/* ── Paso 3: inscripción (opcional) ── */}
              {newStep === 2 && (
              <div>
                <label className="block text-[11px] tracking-widest text-dim font-mono mb-2">
                  INSCRIPCIÓN <span className="text-muted normal-case tracking-normal">(opcional)</span>
                </label>
                <SignupEditor
                  value={signup}
                  onChange={setSignup}
                  profile={profileContacts(user?.social_links)}
                />
                <p className="text-[11px] text-dim font-mono mt-2">
                  Se muestra en la vista pública para que se anoten. Cada torneo lo hereda y puede cambiarlo.
                </p>
              </div>
              )}

              {error && <p className="text-danger text-xs font-mono">{error}</p>}
            </div>

            {/* Footer del modal */}
            <div className="sticky bottom-0 bg-surface border-t border-border-mid px-6 py-4 flex items-center gap-3">
              {newStep > 0 && (
                <Btn variant="secondary" size="lg" icon={ChevronLeft} onClick={() => setNewStep((s) => s - 1)}>
                  ATRÁS
                </Btn>
              )}
              {newStep < NEW_GROUP_STEPS.length - 1 ? (
                <Btn
                  variant="primary"
                  full
                  size="lg"
                  onClick={() => { if (name.trim()) { setError(null); setNewStep((s) => s + 1); } else setError('Poné un nombre para la categoría.'); }}
                  disabled={newStep === 0 && !name.trim()}
                >
                  SIGUIENTE
                </Btn>
              ) : (
                <Btn variant="primary" full size="lg" onClick={handleCreate} disabled={!name.trim()} loading={creating}>
                  CREAR CATEGORÍA
                </Btn>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de selección de íconos */}
      {showEmojiModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/75"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEmojiModal(false); }}
        >
          <div className="bg-surface border border-border-mid rounded-t-2xl sm:rounded-xl w-full sm:max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-mono text-[11px] text-dim tracking-widest">ÍCONOS · máx. 2</div>
              <button
                type="button"
                onClick={() => setShowEmojiModal(false)}
                className="bg-transparent border-none text-dim hover:text-soft cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-5">
              {EMOJI_LIST.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => toggleEmoji(e)}
                  className={`relative text-xl p-2 rounded border transition-all cursor-pointer bg-transparent ${
                    selectedEmojis.includes(e)
                      ? 'border-brand scale-110'
                      : selectedEmojis.length >= 2
                        ? 'border-transparent opacity-30 cursor-not-allowed'
                        : 'border-transparent opacity-60 hover:opacity-100 hover:border-border-strong'
                  }`}
                >
                  {e}
                  {selectedEmojis.includes(e) && (
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

      {showPremiumModal && (
        <PremiumModal reason={premiumReason} onClose={() => { setShowPremiumModal(false); setPremiumReason(null); }} />
      )}
    </div>
  );
}
