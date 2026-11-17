import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { uid, clubCourts, entityClub, isSaneEventDate, AMERICANO_MIN_PAIRS, AMERICANO_MAX_PAIRS, LIGA_MIN_PLAYERS } from "../../utils/helpers";
import { api } from "../../utils/api";
import { useTournament } from "../../hooks/useTournament";
import PairBuilder from "./PairBuilder";
import { CargaParejas, CargaJugadores } from "./CargaLista";
import ClubSelector from "../shared/ClubSelector";
import SignupEditor from "../shared/SignupEditor";
import { profileContacts } from "../../utils/signup";
import { useToast } from "../../context/useToast";
import { ChevronLeft, ChevronRight, Check, ListOrdered, Shuffle, Trophy } from "lucide-react";
import LigaOpciones from "../shared/LigaOpciones";
import CopaOpciones from "../Copa/CopaOpciones";
import { LIGA_SECCIONES } from "../../utils/fechas";
import { COPA_MAX_PAIRS, defaultCopaConfig, copaConfigBody, copaConfigError, copaMinPairs, premiosDePuestos, totalClasificados, copaSecciones } from "../../utils/copa";
import Btn from "../shared/Btn";
import StepBar from "../shared/StepBar";

// `img` es la base de /public/formatos/<id>-600.webp y -1200.webp; `pos` centra el motivo en la tarjeta alta.
const FORMATOS = [
  { id: 'liga', titulo: 'LIGA', bajada: 'Tabla de posiciones acumulada, en un día o en una temporada por fechas.', datos: ['Libres o parejas fijas', `Desde ${LIGA_MIN_PLAYERS} jugadores`], icono: ListOrdered, img: '/formatos/liga', pos: '56% center' },
  { id: 'americano', titulo: 'AMERICANO', bajada: 'Fase previa de 2 partidos por pareja y cuadro de eliminación directa.', datos: [`${AMERICANO_MIN_PAIRS} a ${AMERICANO_MAX_PAIRS} parejas`, 'Un solo día'], icono: Shuffle, img: '/formatos/americano', pos: '74% center' },
  { id: 'copa', titulo: 'COPA', bajada: 'Grupos y playoffs, o cuadro directo. Fixture con día, horario y cancha.', datos: [`Hasta ${COPA_MAX_PAIRS} parejas`, 'Premios por puesto'], icono: Trophy, img: '/formatos/copa', pos: '50% center' },
];

const INFO_SECCIONES = [
  { id: 'nombre', label: 'Nombre y fecha' },
  { id: 'club', label: 'Club' },
  { id: 'inscripcion', label: 'Inscripción' },
];

const LABEL = "block text-[11px] tracking-[2px] text-muted font-mono mb-2";
const INPUT = "w-full bg-surface border border-border-mid text-white px-3.5 py-2.5 font-sans text-[14px] rounded-sm outline-none focus:border-border-strong";

function TarjetaFormato({ f, activo, onClick }) {
  const Icono = f.icono;
  return (
    <button
      type="button" aria-pressed={activo} onClick={onClick}
      className={`group relative overflow-hidden text-left h-40 sm:h-80 rounded-xl border-2 cursor-pointer bg-photo-shade transition-[border-color,transform] duration-200 hover:-translate-y-0.5 ${activo ? 'border-brand' : 'border-border-mid hover:border-border-strong'}`}
    >
      {f.img ? (
        <img
          src={`${f.img}-600.webp`} srcSet={`${f.img}-600.webp 600w, ${f.img}-1200.webp 1200w`} sizes="(min-width: 640px) 570px, 100vw"
          width={1200} height={670} alt="" decoding="async" style={{ objectPosition: f.pos }}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${activo ? 'opacity-100' : 'opacity-70 group-hover:opacity-90'}`}
        />
      ) : (
        <>
          <div className={`absolute inset-0 bg-gradient-to-br from-brand/25 via-brand/5 to-transparent transition-opacity ${activo ? 'opacity-100' : 'opacity-50 group-hover:opacity-80'}`} />
          <Icono aria-hidden size={150} strokeWidth={1} className="absolute -right-6 -top-4 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 sm:top-8 text-brand/25" />
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-photo-shade from-10% via-photo-shade/55 via-40% to-transparent to-70%" />
      {activo && (
        <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-brand text-base inline-flex items-center justify-center"><Check size={16} strokeWidth={3} /></span>
      )}
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <div className="font-condensed font-bold text-[20px] sm:text-[22px] text-photo-ink tracking-wide">{f.titulo}</div>
        <p className="m-0 mt-1 text-[12px] sm:text-[13px] leading-snug text-photo-ink/80">{f.bajada}</p>
        <div className="hidden sm:flex flex-wrap gap-1.5 mt-3">
          {f.datos.map((d) => <span key={d} className="px-2 py-0.5 rounded-full border border-photo-ink/25 text-[11px] text-photo-ink/85">{d}</span>)}
        </div>
      </div>
    </button>
  );
}

function ResumenBloque({ titulo, onEditar, children }) {
  return (
    <div className="py-3.5 border-t border-border first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono tracking-[2px] text-dim">{titulo}</span>
        {onEditar && <button type="button" onClick={onEditar} className="bg-transparent border-0 p-0 text-[11px] text-muted hover:text-brand cursor-pointer">Editar</button>}
      </div>
      <div className="flex flex-col gap-0.5 text-[13px] text-content">{children}</div>
    </div>
  );
}

const fechaCorta = (d) => d ? new Date(`${d}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : null;

export default function Setup() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { handleCreate: createTournament } = useTournament(groupId, null);
  const { showToast } = useToast();
  const [format, setFormat]       = useState("liga");
  const [name, setName]           = useState("");
  const [playerNames, setPlayerNames] = useState([]);
  const [jugadorPendiente, setJugadorPendiente] = useState("");
  const [modoElegido, setModoElegido] = useState(null);
  const [pairs, setPairs]         = useState([]);
  const [step, setStep]           = useState("formato");
  const [sub, setSub]             = useState(0);
  const [error, setError]         = useState(false);
  const [club, setClub]           = useState(null);
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [group, setGroup]         = useState(null);
  // Vacío a propósito: lo que no se cargue queda en null y se hereda.
  const [signup, setSignup]       = useState({ open: false, price: null, unit: 'player', contacts: [] });
  const [creating, setCreating]   = useState(false);
  const [liga, setLiga] = useState({ liga_mode: 'jornada', allow_rematch: false, winner_format: 'tabla', playoff_size: null });
  const [copa, setCopa] = useState(() => ({ ...defaultCopaConfig('zonas'), points_win: 3, points_loss: 0, premio1: '', premio2: '', premio3: '' }));
  const [directPairs, setDirectPairs] = useState([]);
  const [parejaPendiente, setParejaPendiente] = useState({ p1Name: '', p2Name: '' });

  const esCopa = format === 'copa';
  const temporada = format === 'liga' && liga.liga_mode === 'temporada';
  const conParejas = format === 'americano' || temporada || esCopa;
  const pairsMin = format === 'americano' ? AMERICANO_MIN_PAIRS : esCopa ? copaMinPairs(copa) : 2;
  const pairsMax = format === 'americano' ? AMERICANO_MAX_PAIRS : esCopa ? COPA_MAX_PAIRS : 32;
  const configSecciones = format === 'liga' ? LIGA_SECCIONES : esCopa ? copaSecciones(copa.mode) : [];
  const seccion = step === 'config' ? configSecciones[sub] : step === 'info' ? INFO_SECCIONES[sub] : null;
  // Una liga nueva copia los puntos de la última liga de la categoría (lo hace la API).
  const ultimaLiga = (group?.tournaments ?? []).filter((t) => t.format === 'liga')
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
  const puntosHeredados = ultimaLiga ? { win: ultimaLiga.points_win ?? 3, loss: ultimaLiga.points_loss ?? 0 } : null;

  // El club se hereda de la categoría o, si no tiene, de la última jornada con club.
  useEffect(() => {
    api.groups.get(groupId).then((g) => {
      setGroup(g);
      const inherited = entityClub(g) ?? entityClub((g.tournaments ?? []).find((t) => t.club_id));
      if (inherited) setClub(inherited);
      // Sólo el interruptor; precio y contactos quedan vacíos para heredarse.
      setSignup((prev) => ({ ...prev, open: g.signup_open ?? false, unit: g.signup_price_unit ?? 'player' }));
    }).catch(() => {});
  }, [groupId]);

  // Lo que está escrito en la fila de carga cuenta como cargado.
  const filledNames = jugadorPendiente.trim() ? [...playerNames, jugadorPendiente.trim()] : playerNames;
  const isEven   = filledNames.length > 0 && filledNames.length % 2 === 0;
  const ligaMode = isEven ? (modoElegido ?? 'pairs') : 'free';
  const hasDupes = new Set(filledNames.map((n) => n.toLowerCase())).size !== filledNames.length;
  const playersValid = name.trim() && filledNames.length >= LIGA_MIN_PLAYERS && !hasDupes;
  const ligaIsDraft   = filledNames.length < LIGA_MIN_PLAYERS;
  const canCreateLiga = !!name.trim() && !hasDupes;
  const tituloValido = name?.length <= 30 && name?.length >= 2;
  const allPairsFilled = pairs.length === filledNames.length / 2 && pairs.every((p) => p.p1Name && p.p2Name);

  const pendA = parejaPendiente.p1Name.trim(), pendB = parejaPendiente.p2Name.trim();
  const directHasPartial = !!pendA !== !!pendB;
  const completeDirectPairs = pendA && pendB
    ? [...directPairs, { id: parejaPendiente.id ?? uid(), p1Name: pendA, p2Name: pendB }]
    : directPairs;
  const directPairNames = completeDirectPairs.flatMap((p) => [p.p1Name.toLowerCase(), p.p2Name.toLowerCase()]);
  const directHasDupes  = new Set(directPairNames).size !== directPairNames.length;
  const directIsDraft    = completeDirectPairs.length < pairsMin;
  const directPairsValid = !!name.trim() && !directHasPartial && !directHasDupes && completeDirectPairs.length <= pairsMax;

  const pasosCarga = conParejas
    ? [{ id: 'direct-pairs', label: 'PAREJAS' }]
    : (isEven && ligaMode === 'pairs') || step === 'pairs'
      ? [{ id: 'players', label: 'JUGADORES' }, { id: 'pairs', label: 'PAREJAS' }]
      : [{ id: 'players', label: 'JUGADORES' }];
  const flowSteps = [
    { id: 'formato', label: 'FORMATO' },
    ...(configSecciones.length ? [{ id: 'config', label: 'CONFIGURACIÓN', subs: configSecciones.length }] : []),
    { id: 'info', label: 'INFORMACIÓN', subs: INFO_SECCIONES.length },
    ...pasosCarga,
  ];
  const currentStepIdx = flowSteps.findIndex((s) => s.id === step);
  const alcanzado = (id) => flowSteps.findIndex((s) => s.id === id) <= currentStepIdx;

  function ir(id, s = 0) {
    setStep(id);
    setSub(s);
    window.scrollTo({ top: 0 });
  }

  function retroceder() {
    if (step === 'formato') navigate(`/cat/${groupId}`);
    else if (step === 'config') sub > 0 ? ir('config', sub - 1) : ir('formato');
    else if (step === 'info') sub > 0 ? ir('info', sub - 1) : configSecciones.length ? ir('config', configSecciones.length - 1) : ir('formato');
    else if (step === 'players' || step === 'direct-pairs') ir('info', INFO_SECCIONES.length - 1);
    else if (step === 'pairs') ir('players');
  }

  function avanzar() {
    if (step === 'formato') return ir(configSecciones.length ? 'config' : 'info');
    if (step === 'config') return sub < configSecciones.length - 1 ? ir('config', sub + 1) : ir('info');
    if (step === 'info') {
      if (sub === 0 && !tituloValido) return setError(true);
      return sub < INFO_SECCIONES.length - 1 ? ir('info', sub + 1) : ir(conParejas ? 'direct-pairs' : 'players');
    }
    if (step === 'players') return handleNext();
    if (step === 'pairs') return handleCreate();
    if (step === 'direct-pairs') return handleCreateDirect();
  }

  const copaError = esCopa && seccion?.id === 'playoffs' ? copaConfigError(copa) : null;
  const faltaPremio = esCopa && seccion?.id === 'premios' && !copa.premio1.trim();
  const siguienteBloqueado =
    (step === 'config' && (!!copaError || faltaPremio)) ||
    (step === 'info' && sub === 0 && !name.trim()) ||
    (step === 'players' && !canCreateLiga) ||
    (step === 'pairs' && !allPairsFilled) ||
    (step === 'direct-pairs' && !directPairsValid);
  const siguienteTexto =
    step === 'players' ? (playersValid && isEven && ligaMode === 'pairs' ? 'SIGUIENTE' : ligaIsDraft ? 'CREAR BORRADOR' : 'CREAR TORNEO')
    : step === 'pairs' ? 'CREAR TORNEO'
    : step === 'direct-pairs' ? (directIsDraft ? 'CREAR BORRADOR' : 'CREAR TORNEO')
    : 'SIGUIENTE';

  async function onCreate(tournamentName, players, pairsInput, fmt) {
    setCreating(true);
    try {
      const tId = await createTournament(tournamentName, players, pairsInput, fmt, clubCourts(club), {
        club_id: club?.pending ? null : (club?.id ?? null),
        event_date: eventDate || null,
        event_time: eventTime || null,
        pending_club_request_id: club?.pending ? club.request_id : null,
        signup_open:       signup.open,
        signup_price:      signup.price,
        signup_price_unit: signup.unit,
        signup_contacts:   signup.contacts.filter((c) => c.value.trim()),
        level:             signup.level ?? null,
        signup_capacity:      signup.capacity ?? null,
        signup_capacity_unit: signup.capacity_unit ?? null,
        signup_closes_at:     signup.closes_at ?? null,
        rules:                signup.rules ?? null,
        liga: fmt === 'liga' ? liga : null,
        copa: fmt === 'copa' ? {
          copa_config: copaConfigBody(copa),
          prizes: premiosDePuestos([copa.premio1, copa.premio2, copa.premio3]),
          ...(copa.mode === 'zonas' ? { points_win: copa.points_win, points_loss: copa.points_loss } : {}),
        } : null,
      });
      navigate(`/cat/${groupId}/torneo/${tId}`);
    } catch (e) {
      // El rechazo (cupo mensual lleno, club inexistente) se muestra; si no, el formulario queda mudo.
      showToast(e.message, 'error');
    } finally {
      setCreating(false);
    }
  }

  function handleNext() {
    if (!canCreateLiga) return;
    if (playersValid && isEven && ligaMode === 'pairs') {
      setPlayerNames(filledNames);
      setJugadorPendiente('');
      setPairs(Array.from({ length: filledNames.length / 2 }, () => ({ id: uid(), p1Name: "", p2Name: "" })));
      ir("pairs");
    } else {
      onCreate(name.trim(), filledNames, null, 'liga');
    }
  }

  function handleCreate() {
    if (!allPairsFilled) return;
    onCreate(name.trim(), filledNames, pairs, 'liga');
  }

  function handleCreateDirect() {
    if (!directPairsValid) return;
    const players = completeDirectPairs.flatMap((p) => [p.p1Name, p.p2Name]);
    onCreate(name.trim(), players, completeDirectPairs, format);
  }

  function infoBox() {
    if (filledNames.length === 0) {
      return `Sin jugadores todavía. Se crea como borrador: los sumás después desde GESTIÓN, pero no se cargan partidos hasta llegar a ${LIGA_MIN_PLAYERS}.`;
    }
    if (ligaIsDraft) {
      const missing = LIGA_MIN_PLAYERS - filledNames.length;
      return `Falta${missing === 1 ? '' : 'n'} ${missing} para el mínimo de ${LIGA_MIN_PLAYERS}. Se crea como borrador: los sumás después desde GESTIÓN.`;
    }
    if (!isEven) return 'Número impar: los equipos se arman partido a partido.';
    if (ligaMode === 'pairs') return `En el siguiente paso armás las ${filledNames.length / 2} parejas fijas.`;
    return 'Equipos libres: se arman partido a partido.';
  }

  const titulos = {
    formato: 'Elegí el formato',
    config: esCopa ? 'Configurá la copa' : 'Configurá la liga',
    info: 'Datos del torneo',
    players: 'Cargá los jugadores',
    pairs: 'Armá las parejas',
    'direct-pairs': 'Cargá las parejas',
  };
  const courts = club ? clubCourts(club) : null;
  const formatoActual = FORMATOS.find((f) => f.id === format);
  const conResumen = step !== 'formato';
  const cargadas = conParejas ? completeDirectPairs.length : filledNames.length;

  return (
    <div className="bg-base text-content font-sans">
      <div className={`mx-auto px-4 sm:px-7 pt-8 sm:pt-10 ${conResumen ? 'max-w-2xl lg:max-w-5xl' : 'max-w-5xl'}`}>
        <div className="mb-6">
          <p className="m-0 text-[11px] font-mono tracking-[2px] text-dim truncate">NUEVO TORNEO{group?.name ? ` · ${group.name.toUpperCase()}` : ''}</p>
          <h1 className="m-0 mt-1 font-condensed font-bold text-[22px] sm:text-[26px] text-white">{titulos[step]}</h1>
        </div>

        <StepBar steps={flowSteps} currentIdx={currentStepIdx} subIdx={sub} subLabel={seccion?.label} />

        <div className={conResumen ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10 lg:items-start' : ''}>
          <div className="min-w-0">
            <div className={step === 'formato' ? '' : 'min-h-[300px]'}>
            {step === "formato" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {FORMATOS.map((f) => <TarjetaFormato key={f.id} f={f} activo={format === f.id} onClick={() => setFormat(f.id)} />)}
              </div>
            )}

            {step === "config" && format === 'liga' && (
              <LigaOpciones value={liga} onChange={setLiga} heredado={puntosHeredados} seccion={seccion?.id} />
            )}
            {step === "config" && esCopa && (
              <>
                <CopaOpciones value={copa} onChange={setCopa} seccion={seccion?.id} />
                {faltaPremio && <p className="text-secondary text-[12px] mt-3 mb-0">Cargá el premio del campeón para seguir.</p>}
              </>
            )}

            {step === "info" && seccion?.id === 'nombre' && (
              <div className="flex flex-col gap-5">
                <div>
                  <label htmlFor="setup-nombre" className={LABEL}>NOMBRE DEL TORNEO</label>
                  <input
                    id="setup-nombre" className={INPUT}
                    placeholder={temporada || esCopa ? "ej: 1ERA EDICIÓN 2026" : "ej: Fecha 1 - 24/03"}
                    value={name} maxLength={30} minLength={2} autoFocus
                    onChange={(e) => { setName(e.target.value); setError(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) avanzar(); }}
                  />
                  {error && <p className="text-danger text-xs font-mono mt-2 mb-0">El nombre del torneo debe tener entre 2 y 30 caracteres.</p>}
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    <label htmlFor="setup-fecha" className={LABEL}>FECHA (opcional)</label>
                    <input
                      id="setup-fecha" type="date" value={eventDate} min="1900-01-01" max="2100-12-31" className={INPUT}
                      onChange={(e) => { if (isSaneEventDate(e.target.value)) setEventDate(e.target.value); }}
                    />
                  </div>
                  <div className="w-32 shrink-0">
                    <label htmlFor="setup-hora" className={LABEL}>HORA</label>
                    <input id="setup-hora" type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} className={INPUT} />
                  </div>
                </div>
              </div>
            )}

            {step === "info" && seccion?.id === 'club' && (
              <div>
                <label className={LABEL}>CLUB (opcional)</label>
                <ClubSelector value={club} onChange={setClub} />
                {club && (
                  <p className="text-[12px] mt-2 mb-0 text-secondary">
                    {courts > 0
                      ? <>Este club tiene <span className="text-brand">{courts} {courts === 1 ? 'cancha' : 'canchas'}</span>. Vas a poder asignar la cancha en cada partido.</>
                      : <>Este club no tiene canchas cargadas. Las definís después en Gestión.</>}
                  </p>
                )}
              </div>
            )}

            {step === "info" && seccion?.id === 'inscripcion' && (
              <div>
                <label className={LABEL}>INSCRIPCIÓN (opcional)</label>
                <SignupEditor
                  value={signup} onChange={setSignup}
                  inherited={{
                    open:     group?.signup_open ?? false,
                    price:    group?.signup_price ?? null,
                    unit:     group?.signup_price_unit ?? 'player',
                    contacts: group?.signup_contacts ?? [],
                    level:    group?.level ?? null,
                    capacity: group?.signup_capacity ?? null,
                    capacity_unit: group?.signup_capacity_unit ?? null,
                    rules:    group?.rules ?? null,
                  }}
                  profile={profileContacts(group?.owner_social_links)}
                />
                <p className="text-[12px] mt-2 mb-0 text-secondary">Lo que cargues vale sólo para este torneo. Lo que dejes vacío se hereda de la categoría.</p>
              </div>
            )}

            {step === "players" && (
              <>
                <p className="m-0 mb-3 text-[13px] text-secondary">
                  <span className="text-white font-semibold">{filledNames.length}</span> {filledNames.length === 1 ? 'jugador' : 'jugadores'} · mínimo {LIGA_MIN_PLAYERS} para jugar. Podés sumar más después.
                </p>
                <CargaJugadores value={playerNames} onChange={setPlayerNames} pendiente={jugadorPendiente} onPendiente={setJugadorPendiente} />
                {hasDupes && <p className="text-danger text-[12px] mt-2 mb-0">Ese jugador ya está cargado.</p>}

                {filledNames.length >= LIGA_MIN_PLAYERS && (
                  <div className="mt-5">
                    <label className={LABEL}>MODO DE JUEGO</label>
                    <div className="flex gap-2">
                      <button
                        type="button" aria-pressed={ligaMode === 'free'} onClick={() => setModoElegido('free')}
                        className={`flex-1 min-h-11 text-[12px] font-condensed font-bold tracking-wide rounded-sm border transition cursor-pointer ${ligaMode === 'free' ? 'bg-brand/15 border-brand text-brand' : 'bg-surface border-border-mid text-muted hover:border-border-strong'}`}
                      >
                        EQUIPOS LIBRES
                      </button>
                      <button
                        type="button" aria-pressed={ligaMode === 'pairs'} onClick={() => setModoElegido('pairs')} disabled={!isEven}
                        className={`flex-1 min-h-11 text-[12px] font-condensed font-bold tracking-wide rounded-sm border transition ${
                          !isEven ? 'border-border-mid text-dim cursor-not-allowed opacity-40'
                            : ligaMode === 'pairs' ? 'bg-brand/15 border-brand text-brand cursor-pointer'
                              : 'bg-surface border-border-mid text-muted hover:border-border-strong cursor-pointer'
                        }`}
                      >
                        PAREJAS FIJAS
                      </button>
                    </div>
                  </div>
                )}
                <p className="m-0 mt-4 text-[12px] text-secondary">{infoBox()}</p>
              </>
            )}

            {step === "direct-pairs" && (
              <>
                <p className="m-0 mb-3 text-[13px] text-secondary">
                  <span className="text-white font-semibold">{completeDirectPairs.length}</span> {completeDirectPairs.length === 1 ? 'pareja' : 'parejas'} · {pairsMin} para jugar, máximo {pairsMax}.
                  {esCopa ? ' La copa se puede crear sin parejas: se suman por inscripción o desde Gestión.' : ''}
                </p>
                <CargaParejas value={directPairs} onChange={setDirectPairs} pendiente={parejaPendiente} onPendiente={setParejaPendiente} max={pairsMax} />
                {directHasDupes && <p className="text-danger text-[12px] mt-2 mb-0">Ese jugador ya está cargado en otra pareja.</p>}
                {directHasPartial && <p className="text-danger text-[12px] mt-2 mb-0">La pareja en carga está incompleta. Completala o vaciá la fila.</p>}
                {directIsDraft && (
                  <p className="m-0 mt-4 text-[12px] text-secondary">
                    Faltan {pairsMin - completeDirectPairs.length} para el mínimo de {pairsMin}. Se crea como <span className="text-brand">borrador</span>: las sumás después desde Gestión.
                    {esCopa && copa.mode === 'zonas' ? ' Los grupos se sortean con las parejas confirmadas.' : ''}
                  </p>
                )}
              </>
            )}

            {step === "pairs" && (
              <>
                <p className="m-0 mb-4 text-[13px] text-secondary">{name} · {filledNames.length} jugadores · LIGA</p>
                <PairBuilder players={filledNames} pairs={pairs} onChange={setPairs} />
              </>
            )}
            </div>

            <div className="sticky bottom-0 z-30 -mx-4 sm:-mx-7 lg:mx-0 mt-8 px-4 sm:px-7 lg:px-0 py-3 bg-base/95 backdrop-blur border-t border-border flex gap-3">
              <Btn size="lg" icon={ChevronLeft} onClick={retroceder}>{step === 'formato' ? 'VOLVER' : 'ATRÁS'}</Btn>
              <Btn variant="primary" size="lg" full onClick={avanzar} disabled={siguienteBloqueado} loading={creating}>
                {siguienteTexto}{siguienteTexto === 'SIGUIENTE' && <ChevronRight size={17} />}
              </Btn>
            </div>
          </div>

          {conResumen && (
            <aside className="hidden lg:block sticky top-6 bg-surface border border-border-mid rounded-xl p-5" aria-label="Resumen del torneo">
              <p className="m-0 mb-4 font-condensed font-bold text-[13px] tracking-widest text-white">RESUMEN</p>
              <ResumenBloque titulo="FORMATO" onEditar={() => ir('formato')}>
                <span className="font-semibold text-white">{formatoActual.titulo}{esCopa ? (copa.mode === 'zonas' ? ' con grupos' : ' de cuadro') : ''}</span>
              </ResumenBloque>
              {format === 'liga' && (
                <ResumenBloque titulo="CONFIGURACIÓN" onEditar={alcanzado('config') ? () => ir('config') : null}>
                  <span>{temporada ? `Varios días${liga.allow_rematch ? ', con cruces repetidos' : ''}` : 'Un solo día'}</span>
                  <span>Victoria {liga.points_win ?? puntosHeredados?.win ?? 3} · Derrota {liga.points_loss ?? puntosHeredados?.loss ?? 0}</span>
                  <span>{liga.winner_format === 'playoffs' ? `Playoffs de ${liga.playoff_size} parejas` : 'Campeón: primero de la tabla'}</span>
                </ResumenBloque>
              )}
              {esCopa && (
                <ResumenBloque titulo="CONFIGURACIÓN" onEditar={alcanzado('config') ? () => ir('config') : null}>
                  {copa.mode === 'zonas' && <span>{copa.zonas} grupos · {copa.ruedas === 2 ? 'dos ruedas' : 'una rueda'}</span>}
                  {copa.mode === 'zonas' && <span>{totalClasificados(copa)} parejas a playoffs</span>}
                  {copa.mode === 'zonas' && copa.plata && <span>Con copa de plata</span>}
                  <span>Tercer puesto {copa.tercer_puesto ? 'se juega' : 'compartido'}</span>
                  {copa.premio1.trim() && <span className="truncate">Campeón: {copa.premio1.trim()}</span>}
                </ResumenBloque>
              )}
              <ResumenBloque titulo="INFORMACIÓN" onEditar={alcanzado('info') ? () => ir('info') : null}>
                <span className={name.trim() ? 'font-semibold text-white truncate' : 'text-dim'}>{name.trim() || 'Sin nombre'}</span>
                {eventDate && <span>{fechaCorta(eventDate)}{eventTime ? ` · ${eventTime} h` : ''}</span>}
                <span className="truncate">{club?.name ?? 'Sin club'}</span>
                <span>Inscripción {signup.open ? 'abierta' : 'cerrada'}</span>
              </ResumenBloque>
              <ResumenBloque titulo={conParejas ? 'PAREJAS' : 'JUGADORES'}>
                <span>{cargadas} {conParejas ? (cargadas === 1 ? 'pareja' : 'parejas') : (cargadas === 1 ? 'jugador' : 'jugadores')}</span>
              </ResumenBloque>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
