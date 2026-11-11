import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, AlertTriangle, Ticket, ChevronDown, FileText, Clock } from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import { formatPrice, contactHref, CONTACT_META } from '../../utils/signup';
import { levelLabel, checkRegistrationLevel } from '../../utils/category';
import Btn from '../shared/Btn';
import RegistrationFlow from './RegistrationFlow';
import RulesModal from '../shared/RulesModal';
import EditAvailability from './EditAvailability';
import { resumenDisponibilidad } from '../../utils/disponibilidad';
import { esTemporada } from '../../utils/fechas';
import { fmtCierre, DISPONIBILIDAD, ESTADO_META } from './format';

// Tarjeta de inscripción en la página del torneo, para quien no lo organiza.
// Sin sesión muestra precio y contactos e invita a entrar; con sesión trae el
// estado de su inscripción (GET /registrations/mine) y abre el formulario.
export default function RegistrationCard({ tournament, groupName = null, signup: signupBase, onEstado }) {
  const { isLoggedIn, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [flowOpen, setFlowOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);
  const [abierta, setAbierta] = useState(true);
  const [verReglamento, setVerReglamento] = useState(false);
  const [editarHorarios, setEditarHorarios] = useState(false);

  const load = useCallback(() => {
    if (!isLoggedIn) return;
    api.registrations.mine(tournament.id).then((d) => {
      setData(d);
      // El encabezado muestra un chip con el estado (auditoría UI).
      onEstado?.({ status: d?.registration?.status ?? null, inTournament: !!d?.in_tournament });
    }).catch(() => {});
  }, [isLoggedIn, tournament.id, onEstado]);

  useEffect(() => { load(); }, [load]);

  const signup = data?.signup ?? { ...signupBase, open: !!signupBase?.open };
  const reg = data?.registration ?? null;
  const activo = reg && ['pending', 'approved', 'waitlist'].includes(reg.status);

  // Sin inscripción abierta y sin una inscripción propia que mostrar: nada.
  if (!signup.open && !activo && !reg) return null;
  if (data?.can_manage) return null;

  const cierre = fmtCierre(signup.closes_at);
  const disp = DISPONIBILIDAD[signup.availability] ?? null;
  const precio = formatPrice(signup.price, signup.price_unit ?? signup.unit);
  const nivel = levelLabel(signup.level);
  const check = signup.level ? checkRegistrationLevel([user?.category ?? null], signup.level, { solo: true }) : null;
  const rules = signup.rules ?? signupBase?.rules ?? null;

  async function cancelar() {
    if (!reg) return;
    setCancelling(true);
    setError(null);
    try { await api.registrations.cancel(reg.id); load(); }
    catch (e) { setError(e.message); }
    finally { setCancelling(false); }
  }

  const contactos = (signupBase?.contacts ?? []).map((c) => {
    const meta = CONTACT_META[c.type];
    const href = contactHref(c, tournament.name);
    if (!meta || !href) return null;
    const Icon = meta.icon;
    return (
      <a key={c.type} href={href} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-border-strong text-content text-[13px] no-underline hover:border-soft">
        <Icon size={14} className="shrink-0" />{meta.label}
      </a>
    );
  }).filter(Boolean);

  // ── Ya tiene una inscripción: su estado ───────────────────────────────────
  const flow = flowOpen && (
    <RegistrationFlow
      tournament={tournament}
      groupName={groupName}
      signup={{ ...signup, rules }}
      contactos={contactos}
      onClose={() => setFlowOpen(false)}
      onDone={(reg) => {
        setFlowOpen(false);
        // Estado PENDIENTE al instante; la recarga trae el nombre del compañero.
        if (reg) setData((d) => ({ ...(d ?? {}), signup: d?.signup ?? signup, registration: reg }));
        showToast('Inscripción enviada. Te avisamos cuando el organizador decida.');
        load();
      }}
    />
  );

  if (reg && reg.status !== 'cancelled') {
    const meta = ESTADO_META[reg.status];
    const pareja = reg.kind === 'pair'
      ? `${user?.name ?? 'Vos'} & ${reg.p2_user_name ?? reg.p2_name ?? 'tu compañero'}`
      : `${user?.name ?? 'Vos'} · busca pareja`;
    // Una línea plegada: el detalle y cancelar se abren al tocarla.
    return (
      <details aria-label="Tu inscripción" className="group mx-5 sm:mx-auto my-3 max-w-xl bg-surface border border-border-mid rounded-xl">
        <summary className="flex items-center gap-2.5 px-4 min-h-[48px] cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <Ticket size={15} className="shrink-0 text-soft" aria-hidden="true" />
          <span className="text-[14px] font-semibold text-white whitespace-nowrap">Tu inscripción</span>
          <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${meta.color}`}>{meta.label}</span>
          <span className="flex-1" />
          <span className="hidden sm:inline text-[13px] text-soft whitespace-nowrap group-open:hidden">Ver detalle</span>
          <ChevronDown size={16} className="shrink-0 text-soft transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="px-4 pb-4 pt-3 flex flex-col gap-3 border-t border-border">
          <div className="text-[15px] text-white font-bold">{pareja}</div>
          <p className="m-0 text-[13px] text-soft leading-relaxed">
            {reg.status === 'pending' && 'El organizador todavía no decidió. Te avisamos por la app.'}
            {reg.status === 'approved' && 'Ya tenés un lugar en el torneo.'}
            {reg.status === 'waitlist' && 'El cupo está lleno. Si se libera un lugar, el organizador puede sumarlos.'}
            {reg.status === 'rejected' && (reg.reject_reason?.trim() || 'Por motivos que definió el organizador.')}
          </p>
          {activo && esTemporada(tournament) && tournament.status !== 'finished' && (
            <div className="flex items-start gap-2.5 rounded-lg bg-surface-alt px-3 py-2.5">
              <Clock size={15} className="shrink-0 mt-0.5 text-soft" aria-hidden="true" />
              <span className="flex-1 min-w-0 text-[13px] text-content leading-snug">
                <span className="text-secondary">Horarios: </span>
                {resumenDisponibilidad(reg.availability) || 'sin cargar'}
                {reg.availability?.note && <span className="block text-secondary">{reg.availability.note}</span>}
              </span>
              <button type="button" onClick={() => setEditarHorarios(true)}
                className="shrink-0 min-h-[32px] bg-transparent border-0 p-0 text-[13px] text-brand font-semibold cursor-pointer hover:underline">
                {reg.availability ? 'Editar' : 'Cargar'}
              </button>
            </div>
          )}
          {editarHorarios && (
            <EditAvailability
              registration={reg}
              onClose={() => setEditarHorarios(false)}
              onSaved={(availability) => {
                setEditarHorarios(false);
                setData((d) => ({ ...d, registration: { ...d.registration, availability } }));
                showToast('Horarios guardados');
              }}
            />
          )}
          {activo && signup.open && (
            <>
              <Btn variant="danger" full onClick={cancelar} loading={cancelling}>Cancelar inscripción</Btn>
              {cierre && <span className="text-[12px] text-dim text-center">Podés cancelar hasta el {cierre}.</span>}
            </>
          )}
          {reg.status === 'rejected' && signup.open && (
            <Btn full onClick={() => setFlowOpen(true)}>Inscribirme de nuevo</Btn>
          )}
          {error && <p className="m-0 text-[12px] text-danger">{error}</p>}
          {flow}
        </div>
      </details>
    );
  }

  // ── Inscripción abierta ───────────────────────────────────────────────────
  // Empieza desplegada; plegada queda en una línea con el cupo.
  return (
    <details
      aria-label="Inscripción" open={abierta} onToggle={(e) => setAbierta(e.currentTarget.open)}
      className="group mx-5 sm:mx-auto my-3 max-w-xl bg-surface border border-brand/35 rounded-xl"
    >
      <summary className="flex items-center gap-2.5 px-4 min-h-[48px] cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <Ticket size={15} className="shrink-0 text-brand" aria-hidden="true" />
        <span className="text-[14px] font-semibold text-brand whitespace-nowrap">Inscripción abierta</span>
        {disp && (
          <span className={`text-[11px] font-bold tracking-wide px-2.5 py-0.5 rounded-full border whitespace-nowrap ${disp.color}`}>{disp.label}</span>
        )}
        <span className="flex-1" />
        <span className="hidden sm:inline text-[13px] text-soft whitespace-nowrap group-open:hidden">Ver detalle</span>
        <ChevronDown size={16} className="shrink-0 text-soft transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="px-4 pb-4 pt-3 flex flex-col gap-3.5 border-t border-border">
        {(cierre || signup.availability === 'full') && (
          <div className="flex flex-col gap-1">
            {cierre && <span className="text-[12px] text-secondary">Cierra {cierre}</span>}
            {signup.availability === 'full' && <span className="text-[12px] text-cyan">Tu inscripción queda en lista de espera.</span>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          {precio && (
            <div className="bg-surface-alt rounded-lg px-3 py-2.5">
              <div className="text-[11px] tracking-wide text-dim font-semibold">PRECIO</div>
              <div className="text-[15px] text-white font-bold mt-0.5">{precio}</div>
            </div>
          )}
          {nivel && (
            <div className="bg-surface-alt rounded-lg px-3 py-2.5">
              <div className="text-[11px] tracking-wide text-dim font-semibold">CATEGORÍA</div>
              <div className="text-[15px] text-white font-bold mt-0.5">{nivel}</div>
              {isLoggedIn && check && (
                check.issues.length === 0 && user?.category
                  ? <div className="text-[12px] text-green inline-flex items-center gap-1"><Check size={12} strokeWidth={3} /> Tu categoría: {user.category}</div>
                  : check.issues.length > 0
                    ? <div className="text-[12px] text-amber-300 inline-flex items-start gap-1"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> {check.issues[0]}</div>
                    : null
              )}
            </div>
          )}
        </div>

        {isLoggedIn ? (
          <Btn variant="primary" size="lg" full onClick={() => setFlowOpen(true)}>INSCRIBIRME</Btn>
        ) : (
          <Btn variant="primary" size="lg" full onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`)}>
            ENTRÁ PARA INSCRIBIRTE
          </Btn>
        )}
        <p className="m-0 text-[12px] text-secondary text-center">El organizador aprueba cada inscripción.</p>
        {contactos.length > 0 && <div className="flex gap-2 flex-wrap justify-center">{contactos}</div>}
        {rules && (
          <button
            type="button" onClick={() => setVerReglamento(true)}
            className="self-center inline-flex items-center gap-1.5 min-h-[40px] px-3 bg-transparent border-0 text-[13px] text-brand font-semibold cursor-pointer hover:underline"
          >
            <FileText size={14} aria-hidden="true" /> Ver reglamento
          </button>
        )}
        {verReglamento && <RulesModal rules={rules} tournamentName={tournament.name} onClose={() => setVerReglamento(false)} />}

        {flow}
      </div>
    </details>
  );
}
