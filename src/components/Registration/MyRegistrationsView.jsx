import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Users, User } from 'lucide-react';
import { api } from '../../utils/api';
import { useToast } from '../../context/useToast';
import { levelLabel } from '../../utils/category';
import { formatPrice } from '../../utils/signup';
import { fmtDate } from '../../utils/bookings';
import Btn from '../shared/Btn';
import { fmtCierre, ESTADO_META } from './format';

const ACTIVAS = ['pending', 'approved', 'waitlist'];

const FILTERS = [
  { id: 'activas',   label: 'ACTIVAS' },
  { id: 'historial', label: 'HISTORIAL' },
];

const ESTADO_TEXTO = {
  pending:   'El organizador todavía no decidió.',
  approved:  'Ya tenés un lugar en el torneo.',
  waitlist:  'El cupo está lleno. Si se libera un lugar, el organizador puede sumarlos.',
  cancelled: 'Cancelaste esta inscripción.',
};

// "Mis inscripciones": solo en el perfil propio, como las reservas.
export default function MyRegistrationsView() {
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('activas');

  useEffect(() => {
    let cancelled = false;
    api.registrations.mineAll()
      .then((d) => { if (!cancelled) { setRows(d); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const byFilter = useMemo(() => ({
    activas:   rows.filter((r) => ACTIVAS.includes(r.status)),
    historial: rows.filter((r) => !ACTIVAS.includes(r.status)),
  }), [rows]);

  async function cancel(id) {
    const r = await api.registrations.cancel(id);
    setRows((rs) => rs.map((x) => (x.id === id ? { ...x, status: r.status, can_cancel: false } : x)));
    showToast('Inscripción cancelada');
  }

  if (loading) return <p className="text-xs font-mono text-dim">Cargando tus inscripciones...</p>;
  if (error)   return <p className="text-xs font-mono text-danger">{error}</p>;

  const list = byFilter[filter];

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-condensed font-bold tracking-wide border cursor-pointer transition-colors ${
              filter === f.id ? 'bg-brand text-base border-brand' : 'bg-transparent text-muted border-border-mid hover:text-white'
            }`}>
            {f.label}{byFilter[f.id].length > 0 ? ` (${byFilter[f.id].length})` : ''}
          </button>
        ))}
      </div>

      {list.length === 0 && (
        <p className="text-[12.5px] text-dim">
          {filter === 'activas' ? 'No tenés inscripciones activas.' : 'Todavía no tenés inscripciones anteriores.'}
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {list.map((r) => <MyRegistrationCard key={r.id} r={r} onCancel={cancel} />)}
      </div>
    </div>
  );
}

function MyRegistrationCard({ r, onCancel }) {
  const { showToast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const meta = ESTADO_META[r.status];
  const nivel = levelLabel(r.level);
  const precio = formatPrice(r.price, r.price_unit);
  const cierre = fmtCierre(r.closes_at);
  const fecha = r.event_date ? fmtDate(String(r.event_date).slice(0, 10)) : null;
  const hora = r.event_time ? String(r.event_time).slice(0, 5) : null;
  const texto = r.status === 'rejected'
    ? (r.reject_reason?.trim() || 'Por motivos que definió el organizador.')
    : ESTADO_TEXTO[r.status];

  async function confirmar() {
    setBusy(true);
    try { await onCancel(r.id); }
    catch (e) { showToast(e.message, 'error'); }
    finally { setBusy(false); setConfirming(false); }
  }

  return (
    <article className="bg-surface border border-border-mid rounded-xl p-3.5 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <Link to={`/cat/${r.group_id}/torneo/${r.tournament_id}`} className="min-w-0 no-underline group">
          <div className="font-condensed font-bold text-[15px] text-white leading-tight group-hover:text-brand transition-colors">
            {r.tournament_name}
          </div>
          <div className="text-[12px] text-secondary truncate">{r.group_name}</div>
        </Link>
        <span className={`shrink-0 text-[10.5px] font-bold tracking-wide px-2 py-0.5 rounded-full border ${meta.color}`}>{meta.label}</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap font-mono text-[11.5px] text-muted">
        {fecha && (
          <span className="inline-flex items-center gap-1"><CalendarDays size={11} className="shrink-0" />{fecha}{hora && ` · ${hora}`}</span>
        )}
        {nivel && <><span className="opacity-40">·</span><span>{nivel}</span></>}
        {precio && <><span className="opacity-40">·</span><span className="text-white">{precio}</span></>}
        <span className="opacity-40">·</span>
        <span className="inline-flex items-center gap-1">
          {r.kind === 'pair'
            ? <><Users size={11} className="shrink-0" />Con {r.partner_name ?? 'tu compañero'}</>
            : <><User size={11} className="shrink-0" />Solo, busca pareja</>}
        </span>
      </div>

      {texto && <p className="m-0 text-[12.5px] text-soft leading-relaxed">{texto}</p>}

      {r.can_cancel && (confirming ? (
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>Volver</Btn>
          <Btn variant="danger" onClick={confirmar} loading={busy}>Sí, cancelar</Btn>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {cierre && <span className="text-[11.5px] text-dim">Podés cancelar hasta el {cierre}.</span>}
          <Btn variant="danger" onClick={() => setConfirming(true)}>Cancelar inscripción</Btn>
        </div>
      ))}
    </article>
  );
}
