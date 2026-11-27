/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useMemo } from 'react';
import { api } from '../../utils/api';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import { useAuth }     from '../../context/useAuth'
import { Globe, Lock, X, Search, MapPin, Smile, Check, Building2, ChevronLeft } from 'lucide-react';
import FadeInCard from '../shared/FadeInCard'
import CategoryTile from '../shared/category/CategoryTile'
import { Skeleton } from '../shared/Skeleton';
import ClubSelector from '../shared/ClubSelector';
import PlayerAvatar from '../shared/PlayerAvatar';
import { fmt } from '../../utils/helpers';
import SignupEditor from '../shared/SignupEditor';
import StepBar from '../shared/StepBar';
import { profileContacts } from '../../utils/signup';
import PremiumModal from '../shared/PremiumModal';
import { FREE_MAX_GROUPS, isPlanLimit, userHasRole } from '../../utils/plan';
import { useToast } from '../../context/useToast';
import Btn from '../shared/Btn';
import RolePicker from './RolePicker';
import FirstSteps from './FirstSteps';
import { buildSteps, isRoleDismissed, isFirstStepsDismissed, dismissFirstSteps, isLevelDismissed, dismissLevel } from '../../utils/onboarding';
import SearchPalette from './SearchPalette';
import ParaSumarte from './Inicio/ParaSumarte';
import { StatRail, LiveBand } from './PanelBands';
import Pendientes from './Inicio/Pendientes';
import Agenda from './Inicio/Agenda';
import ResumenCard from './Inicio/ResumenCard';
import ClubesCerca from './Inicio/ClubesCerca';
import AdBanner from '../shared/AdBanner';
import AdInline from '../shared/AdInline';
import { useSummary } from '../../hooks/useSummary';
import { dayKey, addDaysKey } from '../../utils/agenda';
import useHomeSearch from '../../hooks/useHomeSearch';

const EMPTY_SIGNUP = { open: false, price: null, unit: 'player', contacts: [] };

const NEW_GROUP_STEPS = [
  { id: 'datos',       label: 'DATOS' },
  { id: 'visibilidad', label: 'VISIBILIDAD' },
  { id: 'inscripcion', label: 'INSCRIPCIÓN' },
];

const EMOJI_LIST =['🔥','⚡','🚻','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🎲','🔝','🚨','🌹','🌼','🥑','🍺','🍷','🧉','🍕','❄️','❤️‍🩹','💫','☢️','💸','🗿','♂️','♀️','🪄','🎉','👑']

const NEARBY_CACHE_KEY = 'nearby_clubs_v1';
const NEARBY_TTL       = 10 * 60 * 1000; // 10 min

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
  // petición para pintar sus categorías. Arrancando en true, el primer render
  // devolvía el esqueleto de la vista con sesión y al apagarse se insertaba el
  // hero completo, empujando el resto ~480 px. Ese era el CLS de 0,685.
  const [loading,      setLoading]      = useState(isLoggedIn);
  const [levelDismissed, setLevelDismissed] = useState(isLevelDismissed);
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
  const [error,             setError]             = useState(null)
  const [showPremiumModal,  setShowPremiumModal]  = useState(false)
  const [premiumReason,     setPremiumReason]     = useState(null)
  const [creating,          setCreating]          = useState(false)

  const [nearbyClubs,    setNearbyClubs]    = useState([]);
  const [nearbyStatus,   setNearbyStatus]   = useState('idle'); // idle | loading | done | denied | error | unsupported

  // Onboarding. `pickedRole` sólo existe para que la tarjeta cambie en el mismo
  // render en que el usuario elige, sin esperar al PATCH ni al refresco de /me.
  const [pickedRole,    setPickedRole]    = useState(null);
  const [roleDismissed, setRoleDismissed] = useState(isRoleDismissed);
  const [stepsDismissed, setStepsDismissed] = useState(isFirstStepsDismissed);

  const [homeData, setHomeData] = useState(null);

  // Listado unificado y vitrina de descubrimiento (sólo con sesión).
  const [paletteOpen,  setPaletteOpen]  = useState(false);
  const [agenda,       setAgenda]       = useState(null);
  const summary = useSummary();

  const search = useHomeSearch();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // El listado de categorías ahora vive en Torneos › Organizar.
  useEffect(() => {
    if (hash === '#categorias' && isLoggedIn) navigate('/torneos/organizar', { replace: true });
  }, [hash, isLoggedIn, navigate]);

  // Atajos del botón Crear de la navegación: ?nueva=categoria y ?cerca=1.
  useEffect(() => {
    if (loading || !isLoggedIn) return;
    const nueva = searchParams.get('nueva');
    const cerca = searchParams.get('cerca');
    if (!nueva && !cerca) return;
    setSearchParams({}, { replace: true });
    if (nueva === 'categoria') openNewModal();
    else if (cerca) navigate('/padeleros/clubes');
  }, [loading, isLoggedIn, searchParams]);

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
    api.me.agenda()
      .then(setAgenda)
      .catch(() => setAgenda({ items: [], pending: { friendlies: [], registrations: [] } }));
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

  // Portada pública: en vivo, próximas, inscripciones y categorías activas en una
  // petición. Antes se saltaba con sesión, así que el único que veía las jornadas
  // abiertas era justamente quien no tenía cuenta para anotarse.
  useEffect(() => {
    api.home.get()
      .then(setHomeData)
      .catch(() => setHomeData(null));
  }, []);

  // Atajo del buscador. Sin sesión la barra ya está en pantalla y no hace falta.
  useEffect(() => {
    if (!isLoggedIn) return;
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isLoggedIn]);

  function toggleEmoji(e) {
    setSelectedEmojis(prev =>
      prev.includes(e) ? prev.filter(x => x !== e) : prev.length < 2 ? [...prev, e] : prev
    )
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
        ...(signup.rules?.trim() ? { rules: signup.rules } : {}),
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
    if (!userHasRole(user, 'organizador') && groups.length >= FREE_MAX_GROUPS) {
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

  // ── Derivados del panel ──────────────────────────────────────────────────
  const homeLive     = homeData?.live ?? [];
  const homeSignup   = homeData?.signup ?? [];

  const myGroupIds = useMemo(
    () => new Set([...groups, ...coorgGroups, ...partGroups, ...favGroups].map((g) => g.id)),
    [groups, coorgGroups, partGroups, favGroups],
  );
  // Ofrecerle a alguien anotarse a una jornada que él mismo organiza no tiene
  // sentido; una de una categoría donde sólo juega, sí.
  const managedIds = useMemo(
    () => new Set([...groups, ...coorgGroups].map((g) => g.id)),
    [groups, coorgGroups],
  );

  const liveMine     = useMemo(() => homeLive.filter((t) => myGroupIds.has(t.group_id)), [homeLive, myGroupIds]);

  const discoverSignup = useMemo(
    () => homeSignup.filter((t) => !managedIds.has(t.group_id)),
    [homeSignup, managedIds],
  );

  const weekCount = useMemo(() => {
    const limit = addDaysKey(dayKey(), 6);
    return (agenda?.items ?? []).filter((it) => it.kind !== 'torneo' && it.date <= limit).length;
  }, [agenda]);
  const pendingCount = (summary?.pending?.friendlies ?? 0) + (summary?.pending?.registrations ?? 0);
  const inicioRail = [
    { n: liveMine.length, label: 'En juego', brand: liveMine.length > 0 },
    { n: weekCount, label: 'Esta semana' },
    { n: pendingCount, label: 'Pendientes', brand: pendingCount > 0 },
    { n: summary?.tournaments_active ?? 0, label: 'Torneos activos' },
  ];
  const inicioSubtitle = [
    liveMine.length > 0 && `${liveMine.length} ${liveMine.length === 1 ? 'torneo en vivo' : 'torneos en vivo'}`,
    weekCount > 0 && `${weekCount} ${weekCount === 1 ? 'partido' : 'partidos'} esta semana`,
  ].filter(Boolean).join(' · ') || 'Todo tranquilo por acá';

  if (loading) return (
    <div className="text-content font-sans pb-16">
      <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-5">
          <Skeleton className="h-9 w-52 rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
        <Skeleton className="h-[86px] w-full rounded-xl mb-4" />
        <Skeleton className="h-[92px] w-full rounded-xl mb-6" />
        <div className="flex gap-2 mb-4">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <Skeleton className="h-[280px] w-full rounded-xl" />
      </div>
    </div>
  );

  const committedQ = search.committedQ;
  const { users: committedUsers, groups: committedGroups, clubs: committedClubs, tours: committedTours } = search.committed;

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

  const firstName = (user?.name ?? '').trim().split(' ')[0];

  return (
    <div className="text-content font-sans pb-16">
      <div className={`px-4 sm:px-6 py-6 mx-auto ${isLoggedIn ? 'max-w-5xl xl:max-w-[1180px]' : 'max-w-5xl'}`}>

        {/* ── Resultados de búsqueda ── */}
        {committedQ && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="font-condensed font-bold text-sm tracking-widest text-muted">
                RESULTADOS PARA &quot;{committedQ}&quot;
              </div>
              <button onClick={search.clear} className="text-dim hover:text-soft transition-colors cursor-pointer bg-transparent border-none">
                <X size={16} />
              </button>
            </div>
            {search.committing && <div className="font-mono text-xs text-muted py-4">Buscando...</div>}
            {!search.committing && committedUsers.length === 0 && committedGroups.length === 0 && committedClubs.length === 0 && committedTours.length === 0 && (
              <div className="font-mono text-xs text-muted py-4">Sin resultados.</div>
            )}
            {!search.committing && committedUsers.length > 0 && (
              <>
                <div className="font-mono text-[10px] text-dim tracking-widest mb-3">PERFILES</div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 mb-8">
                  {committedUsers.map((u) => (
                    <FadeInCard key={u.id}
                      className="border border-border-mid rounded-lg cursor-pointer overflow-hidden p-4 card-link flex items-center gap-3"
                      style={{ background: 'linear-gradient(145deg, var(--color-surface) 0%, var(--color-border-mid) 100%)' }}
                      onClick={() => navigate(`/u/${u.username}`)}>
                      <PlayerAvatar name={u.name} src={u.avatar_url} size={44} />
                      <div className="min-w-0">
                        <div className="font-condensed font-bold text-xl text-white truncate">{u.name}</div>
                        <div className="font-mono text-xs text-dim mt-1 truncate">@{u.username}</div>
                      </div>
                    </FadeInCard>
                  ))}
                </div>
              </>
            )}
            {!search.committing && committedGroups.length > 0 && (
              <>
                <div className="font-mono text-[10px] text-dim tracking-widest mb-3">CATEGORÍAS</div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-3 mb-8">
                  {committedGroups.map((g) => <CategoryTile key={g.id} g={g} to={`/cat/${g.id}`} />)}
                </div>
              </>
            )}
            {!search.committing && committedTours.length > 0 && (
              <>
                <div className="font-mono text-[10px] text-dim tracking-widest mb-3">TORNEOS</div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 mb-8">
                  {committedTours.map((t, i) => (
                    <FadeInCard
                      key={t.id}
                      delay={Math.min(i, 5) * 50}
                      className="border border-border-mid rounded-lg cursor-pointer overflow-hidden p-4 card-link"
                      style={{ background: 'linear-gradient(145deg, var(--color-surface) 0%, var(--color-border) 100%)' }}
                      onClick={() => navigate(`/view/${t.id}`)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-condensed font-bold text-xl text-white leading-tight truncate">{t.name}</div>
                        {t.status === 'finished' && (
                          <span className="font-mono text-[10px] text-dim border border-border-mid rounded px-1.5 py-0.5 shrink-0">FINALIZADO</span>
                        )}
                      </div>
                      <div className="font-mono text-xs text-secondary mt-1.5 truncate">
                        {t.group_emojis?.length > 0 && <span className="mr-1">{t.group_emojis.join(' ')}</span>}
                        {t.group_name}
                      </div>
                      <div className="font-mono text-[11px] text-dim mt-1 truncate">
                        {fmt(t.day)}{t.club_name && <span> · {t.club_name}</span>}
                      </div>
                    </FadeInCard>
                  ))}
                </div>
              </>
            )}
            {!search.committing && committedClubs.length > 0 && (
              <>
                <div className="font-mono text-[10px] text-dim tracking-widest mb-3">CLUBES</div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 mb-8">
                  {committedClubs.map((c, i) => (
                    <FadeInCard
                      key={c.id}
                      delay={Math.min(i, 5) * 50}
                      className="border border-border-mid rounded-lg cursor-pointer overflow-hidden card-link flex items-center gap-3 p-3"
                      style={{ background: 'linear-gradient(145deg, var(--color-surface) 0%, var(--color-border) 100%)' }}
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

        {/* ══ Panel del usuario con sesión ══ */}
        {!committedQ && isLoggedIn && (
          <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-10 xl:items-start">
            <div className="min-w-0">
              <div className="flex items-end justify-between gap-4 mb-5">
                <div className="min-w-0">
                  <h1 className="font-condensed font-bold text-[22px] sm:text-[26px] text-white leading-tight m-0">
                    Buenas{firstName && <>, <span className="text-brand">{firstName}</span></>}
                  </h1>
                  <p className="font-sans text-[12.5px] text-muted mt-1.5 m-0">{inicioSubtitle}</p>
                </div>
                <button
                  onClick={() => setPaletteOpen(true)}
                  aria-label="Buscar"
                  className="h-10 px-3 inline-flex items-center gap-2 bg-surface border border-border-mid rounded-lg text-secondary hover:text-white hover:border-border-strong transition-colors cursor-pointer shrink-0"
                >
                  <Search size={16} />
                  <kbd className="hidden sm:inline font-mono text-[9.5px] tracking-wider border border-border-strong rounded px-1.5 py-0.5 text-dim">⌘K</kbd>
                </button>
              </div>

              <StatRail stats={inicioRail} />
              <LiveBand tournaments={liveMine} onOpen={(id) => navigate(`/view/${id}`)} />
              <div className="mb-4" />

                {/* ── Categoría: mientras el perfil no la tenga y no la haya pospuesto ── */}
                {!loading && !user?.category && !levelDismissed && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-surface border border-brand/30 rounded-lg p-4 mb-6">
                    <div className="flex-1 min-w-0">
                      <div className="font-condensed font-bold text-[13px] tracking-[2px] text-brand mb-1">TU CATEGORÍA</div>
                      <p className="text-soft font-sans text-[13px] m-0">
                        Respondé 6 preguntas y te recomendamos una. La ven los organizadores cuando te inscribís.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Btn variant="ghost" size="sm" onClick={() => { dismissLevel(); setLevelDismissed(true); }}>Después</Btn>
                      <Btn variant="primary" size="sm" onClick={() => navigate('/nivel')}>CALCULAR</Btn>
                    </div>
                  </div>
                )}

                {/* ── Onboarding: una pregunta, después el checklist ── */}
                {!loading && (
                  showRolePicker
                    ? <RolePicker onPick={(r) => { setPickedRole(r); setRoleDismissed(r == null); }} />
                    : firstSteps && <FirstSteps steps={firstSteps} onDismiss={handleDismissSteps} />
                )}

              <Pendientes friendlies={agenda?.pending?.friendlies} registrations={agenda?.pending?.registrations} />
              <Agenda items={agenda?.items ?? null} />

                <ParaSumarte signup={discoverSignup} />
            </div>

            <aside className="hidden xl:flex flex-col gap-7 sticky top-24" aria-label="Tu resumen">
              <ResumenCard user={user} stats={summary?.stats} />
              <ClubesCerca
                clubs={nearbyClubs}
                status={nearbyStatus}
                onFetch={fetchNearbyClubs}
                onOpen={(id) => navigate(`/club/${id}`)}
              />
              <AdBanner />
            </aside>
            <AdInline />
          </div>
        )}

      </div>

      {isLoggedIn && (
        <SearchPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          search={search}
          onNavigate={(to) => { navigate(to); search.clear(); }}
        />
      )}

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
                  profile={profileContacts(user)}
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
        <PremiumModal focus="organizador" reason={premiumReason} onClose={() => { setShowPremiumModal(false); setPremiumReason(null); }} />
      )}
    </div>
  );
}
