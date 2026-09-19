import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { uid, clubCourts, entityClub, isSaneEventDate, AMERICANO_MIN_PAIRS, AMERICANO_MAX_PAIRS } from "../../utils/helpers";
import { api } from "../../utils/api";
import { useTournament } from "../../hooks/useTournament";
import PlayerInput from "./PlayerInput";
import PairBuilder from "./PairBuilder";
import ClubSelector from "../shared/ClubSelector";
import SignupEditor from "../shared/SignupEditor";
import { profileContacts } from "../../utils/signup";
import { useToast } from "../../context/useToast";
import { ChevronLeft, Check } from "lucide-react";
import Btn from "../shared/Btn";
import StepBar from "../shared/StepBar";

function EventMeta({ club, setClub, eventDate, setEventDate, eventTime, setEventTime, signup, setSignup, inheritedSignup, profile }) {
  const courts = club ? clubCourts(club) : null;
  return (
    <div className="mt-5 flex flex-col gap-5">
      <div>
        <label className="block text-[11px] tracking-[2px] text-muted font-mono mb-2">CLUB (opcional)</label>
        <ClubSelector value={club} onChange={setClub} />
        {club && (
          <p className="text-[11px] font-mono mt-2 text-dim">
            {courts > 0
              ? <>Este club tiene <span className="text-brand">{courts} {courts === 1 ? 'cancha' : 'canchas'}</span> — vas a poder asignar la cancha en cada partido.</>
              : <>Este club no tiene canchas cargadas — los partidos quedarán con cancha <span className="text-brand">"-"</span>.</>}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          <label className="block text-[11px] tracking-[2px] text-muted font-mono mb-2">FECHA DEL EVENTO (opcional)</label>
          <input
            type="date"
            value={eventDate}
            min="1900-01-01"
            max="2100-12-31"
            onChange={(e) => { if (isSaneEventDate(e.target.value)) setEventDate(e.target.value); }}
            className="w-full bg-surface border border-border-mid text-white px-3.5 py-2.5 font-sans text-[14px] rounded-sm outline-none"
          />
        </div>
        <div className="w-32 shrink-0">
          <label className="block text-[11px] tracking-[2px] text-muted font-mono mb-2">HORA</label>
          <input
            type="time"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
            className="w-full bg-surface border border-border-mid text-white px-3.5 py-2.5 font-sans text-[14px] rounded-sm outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] tracking-[2px] text-muted font-mono mb-2">INSCRIPCIÓN (opcional)</label>
        <SignupEditor value={signup} onChange={setSignup} inherited={inheritedSignup} profile={profile} />
        <p className="text-[11px] font-mono mt-2 text-dim">
          Lo que cargues vale sólo para este torneo; lo que dejes vacío se hereda de la categoría.
        </p>
      </div>
    </div>
  );
}

export default function Setup() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { handleCreate: createTournament } = useTournament(groupId, null);
  const { showToast } = useToast();
  const [format, setFormat]       = useState("liga");
  const [name, setName]           = useState("");
  const [playerNames, setPlayerNames] = useState(["", "", "", ""]);
  const [ligaMode, setLigaMode]   = useState("free");
  const [pairs, setPairs]         = useState([]);
  const [step, setStep]           = useState("formato");
  const [error, setError]         = useState(false);
  const [club, setClub]           = useState(null);
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [group, setGroup]         = useState(null);
  // Vacío a propósito: lo que no se cargue queda en null y se hereda.
  const [signup, setSignup]       = useState({ open: false, price: null, unit: 'player', contacts: [] });
  const [creating, setCreating]   = useState(false);

  // Heredar el club de la categoría como default (editable por torneo).
  // Si la categoría no tiene club, se usa el de la última jornada que sí lo tenga.
  useEffect(() => {
    api.groups.get(groupId).then((g) => {
      setGroup(g);
      const inherited = entityClub(g) ?? entityClub((g.tournaments ?? []).find((t) => t.club_id));
      if (inherited) setClub(inherited);
      // Sólo el interruptor; precio y contactos quedan vacíos para heredarse.
      setSignup((prev) => ({ ...prev, open: g.signup_open ?? false, unit: g.signup_price_unit ?? 'player' }));
    }).catch(() => {});
  }, [groupId]);

  const [directPairs, setDirectPairs] = useState(() =>
    Array.from({ length: AMERICANO_MIN_PAIRS }, () => ({ id: uid(), p1Name: "", p2Name: "" }))
  );

  const filledNames = playerNames.filter((n) => n.trim());
  const isEven   = filledNames.length > 0 && filledNames.length % 2 === 0;
  const hasDupes = new Set(filledNames.map((n) => n.trim().toLowerCase())).size !== filledNames.length;
  const playersValid = name.trim() && filledNames.length >= 4 && !hasDupes;
  const tituloValido = name?.length <= 30 && name?.length >= 2;
  const allPairsFilled = pairs.length === filledNames.length / 2 && pairs.every((p) => p.p1Name && p.p2Name);

  const directPairNames = directPairs.flatMap(p => [p.p1Name.trim(), p.p2Name.trim()]).filter(Boolean);
  const directHasDupes  = new Set(directPairNames.map(n => n.toLowerCase())).size !== directPairNames.length;
  // Sólo cuentan las filas con los dos jugadores. Las vacías se descartan al crear;
  // las que quedaron a medio completar bloquean la creación.
  const completeDirectPairs = directPairs.filter(p => p.p1Name.trim() && p.p2Name.trim());
  const directHasPartial    = directPairs.some(p => !!p.p1Name.trim() !== !!p.p2Name.trim());
  // Menos parejas que el mínimo → se crea igual, pero como borrador (no se puede jugar).
  const directIsDraft    = completeDirectPairs.length < AMERICANO_MIN_PAIRS;
  const directPairsValid = !!name.trim() && !directHasPartial && !directHasDupes;

  // ── Barra de progreso ────────────────────────────────────────────────────
  const infoStep = { id: 'info', label: 'INFORMACIÓN' };
  const flowSteps = format === 'americano'
    ? [{ id: 'formato', label: 'FORMATO' }, infoStep, { id: 'direct-pairs', label: 'PAREJAS' }]
    : (isEven && ligaMode === 'pairs') || step === 'pairs'
      ? [{ id: 'formato', label: 'FORMATO' }, infoStep, { id: 'players', label: 'JUGADORES' }, { id: 'pairs', label: 'PAREJAS' }]
      : [{ id: 'formato', label: 'FORMATO' }, infoStep, { id: 'players', label: 'JUGADORES' }];

  const currentStepIdx = flowSteps.findIndex(s => s.id === step);

  // ── Navegación hacia atrás unificada ─────────────────────────────────────
  function handleBack() {
    if (step === 'formato') navigate(`/cat/${groupId}`);
    else if (step === 'info') setStep('formato');
    else if (step === 'players') setStep('info');
    else if (step === 'direct-pairs') setStep('info');
    else if (step === 'pairs') setStep('players');
  }

  function addPlayer()         { setPlayerNames([...playerNames, ""]); }
  function removePlayer(i)     {
    const updated = playerNames.filter((_, idx) => idx !== i);
    setPlayerNames(updated);
    const newFilled = updated.filter((n) => n.trim()).length;
    if (newFilled % 2 !== 0) setLigaMode('free');
    else if (newFilled > 0)  setLigaMode('pairs');
  }
  function updatePlayer(i, v)  {
    const p = [...playerNames];
    const wasEmpty = !p[i].trim();
    p[i] = v;
    setPlayerNames(p);
    const isNowFilled = !!v.trim();
    if (wasEmpty !== !isNowFilled) {
      const newFilled = p.filter((n) => n.trim()).length;
      if (newFilled > 0 && newFilled % 2 === 0) setLigaMode('pairs');
      else setLigaMode('free');
    }
  }

  function updateDirectPair(id, field, value) {
    setDirectPairs(directPairs.map(p => p.id === id ? { ...p, [field]: value } : p));
  }
  function addDirectPair() {
    if (directPairs.length < AMERICANO_MAX_PAIRS) setDirectPairs([...directPairs, { id: uid(), p1Name: "", p2Name: "" }]);
  }
  function removeDirectPair(id) {
    if (directPairs.length > 1) setDirectPairs(directPairs.filter(p => p.id !== id));
  }

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
      });
      navigate(`/cat/${groupId}/torneo/${tId}`);
    } catch (e) {
      // Sin esto el rechazo (cupo mensual lleno, club inexistente) sólo apagaba
      // el botón y el formulario quedaba mudo.
      showToast(e.message, 'error');
    } finally {
      setCreating(false);
    }
  }

  function handleNext() {
    if (!playersValid) return;
    if (isEven && ligaMode === 'pairs') {
      setPairs(Array.from({ length: filledNames.length / 2 }, () => ({ id: uid(), p1Name: "", p2Name: "" })));
      setStep("pairs");
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
    const players = completeDirectPairs.flatMap(p => [p.p1Name.trim(), p.p2Name.trim()]);
    const cleanPairs = completeDirectPairs.map(p => ({ ...p, p1Name: p.p1Name.trim(), p2Name: p.p2Name.trim() }));
    onCreate(name.trim(), players, cleanPairs, 'americano');
  }

  function infoBox() {
    if (filledNames.length < 4) return null;
    if (!isEven) return `✦ ${filledNames.length} jugadores — número impar, los equipos se armarán partido a partido.`;
    if (ligaMode === 'pairs') return `✦ ${filledNames.length} jugadores — en el siguiente paso armás las ${filledNames.length / 2} parejas fijas.`;
    return `✦ ${filledNames.length} jugadores — equipos libres, se armarán partido a partido.`;
  }

  return (
    <div className="bg-base text-content font-sans pb-15">
      <div className="max-w-125 mx-auto px-4 sm:px-7 py-8 sm:py-10">

        {/* Volver unificado */}
        <div className="mb-6">
          <Btn size="sm" icon={ChevronLeft} onClick={handleBack}>
            {step === 'formato' ? 'Volver' : 'Paso anterior'}
          </Btn>
        </div>

        {/* Barra de progreso */}
        <StepBar steps={flowSteps} currentIdx={currentStepIdx} />

        {/* ── STEP: formato ── */}
        {step === "formato" && (
          <>
            <label className="block text-[11px] tracking-[2px] text-muted font-mono mb-4">FORMATO DEL TORNEO</label>
            <div className="flex flex-col gap-3">
              <div
                onClick={() => setFormat('liga')}
                className={`bg-surface border rounded-lg p-4 cursor-pointer card-link ${format === 'liga' ? 'border-brand' : 'border-border-mid'}`}
              >
                <div className="font-condensed font-bold text-[16px] text-white mb-1">LIGA</div>
                <div className="text-[12px] text-muted font-sans">Partidos libres o por parejas fijas. Tabla de posiciones acumulada.</div>
              </div>
              <div
                onClick={() => setFormat('americano')}
                className={`bg-surface border rounded-lg p-4 cursor-pointer card-link ${format === 'americano' ? 'border-brand' : 'border-border-mid'}`}
              >
                <div className="font-condensed font-bold text-[16px] text-white mb-1">AMERICANO</div>
                <div className="text-[12px] text-muted font-sans">Fase previa (2 partidos por pareja) + cuadro de eliminación directa. Se juega con 8–16 parejas (16–32 jugadores); podés crearlo antes como borrador.</div>
              </div>
            </div>
            <Btn variant="primary" full size="lg" onClick={() => setStep('info')} className="mt-7">
              SIGUIENTE → INFORMACIÓN
            </Btn>
          </>
        )}

        {/* ── STEP: info (nombre + club + fecha) ── */}
        {step === "info" && (
          <>
            <label className="block text-[11px] tracking-[2px] text-muted font-mono mb-2">NOMBRE DEL TORNEO</label>
            <input
              className="w-full bg-surface border border-border-mid text-white px-3.5 py-2.5 font-sans text-[14px] rounded-sm outline-none mb-2"
              placeholder="ej: Fecha 1 - 24/03"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              minLength={2}
              autoFocus
            />

            <EventMeta
              club={club} setClub={setClub}
              eventDate={eventDate} setEventDate={setEventDate}
              eventTime={eventTime} setEventTime={setEventTime}
              signup={signup} setSignup={setSignup}
              inheritedSignup={{
                open:     group?.signup_open ?? false,
                price:    group?.signup_price ?? null,
                unit:     group?.signup_price_unit ?? 'player',
                contacts: group?.signup_contacts ?? [],
              }}
              profile={profileContacts(group?.owner_social_links)}
            />

            {error && <p className="text-danger text-xs font-mono mt-3">El nombre del torneo debe tener entre 2 y 30 caracteres</p>}
            <Btn
              variant="primary"
              full
              size="lg"
              onClick={() => tituloValido ? setStep(format === 'americano' ? 'direct-pairs' : 'players') : setError(true)}
              className="mt-7"
            >
              {format === 'americano' ? 'SIGUIENTE → PAREJAS' : 'SIGUIENTE → JUGADORES'}
            </Btn>
          </>
        )}

        {/* ── STEP: players (liga) ── */}
        {step === "players" && (
          <>
            <label className="block text-[11px] tracking-[2px] text-muted font-mono mb-1">
              JUGADORES <span className="text-muted">(mínimo 4)</span>
            </label>
            <p className="text-[11px] text-dim font-mono mb-2">Escribí un nombre o <span className="text-brand">@usuario</span> para invitar a alguien registrado.</p>
            <div className="flex flex-col gap-2.5">
              {playerNames.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <PlayerInput value={p} onChange={(v) => updatePlayer(i, v)} placeholder={`Jugador ${i + 1}`} searchMine />
                  {playerNames.length > 4 && (
                    <button onClick={() => removePlayer(i)} className="bg-surface border border-border-mid text-muted px-3 py-2.5 cursor-pointer rounded-sm text-[12px] shrink-0 hover:text-danger hover:border-danger/40 transition-colors">✕</button>
                  )}
                </div>
              ))}
            </div>

            {hasDupes && <p className="text-danger text-[11px] font-mono mt-2">Hay nombres duplicados.</p>}

            <button onClick={addPlayer} className="bg-transparent border border-dashed border-border-strong text-muted px-4 py-2 cursor-pointer font-condensed tracking-wide text-[13px] rounded-sm w-full mt-2">
              + Agregar jugador
            </button>

            {filledNames.length >= 4 && (
              <div className="mt-4">
                <label className="block text-[11px] tracking-[2px] text-muted font-mono mb-2">MODO DE JUEGO</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLigaMode('free')}
                    className={`flex-1 py-2.5 text-[12px] font-condensed font-bold tracking-wide rounded-sm border transition cursor-pointer ${ligaMode === 'free' ? 'bg-brand/15 border-brand text-brand' : 'bg-surface border-border-mid text-muted hover:border-border-strong'}`}
                  >
                    EQUIPOS LIBRES
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (isEven) setLigaMode('pairs'); }}
                    disabled={!isEven}
                    className={`flex-1 py-2.5 text-[12px] font-condensed font-bold tracking-wide rounded-sm border transition ${
                      !isEven
                        ? 'border-border-mid text-dim cursor-not-allowed opacity-40'
                        : ligaMode === 'pairs'
                          ? 'bg-brand/15 border-brand text-brand cursor-pointer'
                          : 'bg-surface border-border-mid text-muted hover:border-border-strong cursor-pointer'
                    }`}
                  >
                    PAREJAS FIJAS
                  </button>
                </div>
                {!isEven && <p className="text-[10px] text-dim font-mono mt-1.5">Número impar de jugadores — parejas fijas no disponible.</p>}
              </div>
            )}

            {infoBox() && (
              <div className="bg-surface-alt border border-border-strong rounded-md px-3.5 py-2.5 text-[12px] text-soft font-mono leading-relaxed mt-4">
                {infoBox()}
              </div>
            )}

            <Btn variant="primary" full size="lg" onClick={handleNext} disabled={!playersValid} loading={creating} className="mt-7">
              {isEven && ligaMode === 'pairs' ? "SIGUIENTE → PAREJAS" : "CREAR TORNEO"}
            </Btn>
          </>
        )}

        {/* ── STEP: direct-pairs (americano) ── */}
        {step === "direct-pairs" && (
          <>
            <label className="block text-[11px] tracking-[2px] text-muted font-mono mb-1">
              PAREJAS <span className="text-muted">(mínimo {AMERICANO_MIN_PAIRS} para jugar, máximo {AMERICANO_MAX_PAIRS})</span>
            </label>
            <p className="text-[11px] text-dim font-mono mb-2">Escribí un nombre o <span className="text-brand">@usuario</span> para invitar a alguien registrado. Podés dejar filas vacías y completarlas después.</p>

            <div className="flex flex-col gap-3">
              {directPairs.map((pair, i) => (
                <div key={pair.id} className="bg-surface border border-border-mid rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-dim text-[11px] font-mono w-5 shrink-0 text-right">{i + 1}</span>
                    <PlayerInput value={pair.p1Name} onChange={(v) => updateDirectPair(pair.id, 'p1Name', v)} placeholder="Jugador 1" searchMine />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted font-condensed font-bold text-[11px] w-5 shrink-0 text-center">&amp;</span>
                    <PlayerInput value={pair.p2Name} onChange={(v) => updateDirectPair(pair.id, 'p2Name', v)} placeholder="Jugador 2" searchMine />
                    {directPairs.length > 1 && (
                      <button onClick={() => removeDirectPair(pair.id)} className="bg-transparent border border-border-mid text-muted px-2.5 py-2.5 cursor-pointer rounded-sm text-[12px] shrink-0 hover:text-danger hover:border-danger/40 transition-colors">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {directHasDupes  && <p className="text-danger text-[11px] font-mono mt-2">Hay nombres duplicados.</p>}
            {directHasPartial && <p className="text-danger text-[11px] font-mono mt-2">Hay parejas incompletas — cargá los dos jugadores o dejá la fila vacía.</p>}

            {directPairs.length < AMERICANO_MAX_PAIRS && (
              <button onClick={addDirectPair} className="bg-transparent border border-dashed border-border-strong text-muted px-4 py-2 cursor-pointer font-condensed tracking-wide text-[13px] rounded-sm w-full mt-2">
                + Agregar pareja
              </button>
            )}

            <div className="bg-surface-alt border border-border-strong rounded-md px-3.5 py-2.5 text-[12px] text-soft font-mono leading-relaxed mt-4">
              ✦ {completeDirectPairs.length} {completeDirectPairs.length === 1 ? 'pareja completa' : 'parejas completas'} — {completeDirectPairs.length * 2} jugadores.
              {directIsDraft && (
                <span className="block text-brand mt-1">
                  Faltan {AMERICANO_MIN_PAIRS - completeDirectPairs.length} para el mínimo de {AMERICANO_MIN_PAIRS}. Se crea como <strong>borrador</strong>: vas a poder sumar las parejas que faltan desde GESTIÓN, pero no se pueden cargar partidos hasta llegar al mínimo.
                </span>
              )}
            </div>

            <Btn variant="primary" full size="lg" onClick={handleCreateDirect} disabled={!directPairsValid} loading={creating} className="mt-7">
              {directIsDraft ? 'CREAR BORRADOR' : 'CREAR TORNEO'}
            </Btn>
          </>
        )}

        {/* ── STEP: pairs (liga con número par de jugadores) ── */}
        {step === "pairs" && (
          <>
            <div className="text-[12px] text-muted font-mono mb-4">{name} · {filledNames.length} jugadores · LIGA</div>
            <PairBuilder players={filledNames} pairs={pairs} onChange={setPairs} />
            <Btn variant="primary" full size="lg" onClick={handleCreate} disabled={!allPairsFilled} loading={creating} className="mt-6">
              CREAR TORNEO
            </Btn>
          </>
        )}
      </div>
    </div>
  );
}
