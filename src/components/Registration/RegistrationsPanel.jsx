import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Settings, FileCheck } from 'lucide-react';
import { api } from '../../utils/api';
import { levelLabel } from '../../utils/category';
import PlayerAvatar from '../shared/PlayerAvatar';
import Btn from '../shared/Btn';
import { fmtCierre, cupoTexto, ESTADO_META } from './format';

const FILTROS = [
  { id: 'pending',  label: 'Pendientes' },
  { id: 'unpaired', label: 'Sin pareja' },
  { id: 'approved', label: 'Aprobadas' },
  { id: 'waitlist', label: 'Espera' },
  { id: 'closed',   label: 'Rechazadas y canceladas' },
];

const MOTIVOS = ['Excedido de nivel', 'Cupo completo', 'Falta la seña'];

function hace(iso) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `hace ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

function Jugador({ name, username, avatar, category, stats, guestPhone }) {
  const pct = stats?.pj > 0 ? Math.round((stats.pg / stats.pj) * 100) : null;
  return (
    <div className="flex items-center gap-2.5">
      <PlayerAvatar name={name} src={avatar} size={36} />
      <div className="flex-1 min-w-0">
        <div className="text-[15px] text-white font-bold truncate">
          {name} <span className="font-medium text-secondary text-[13px]">{username ? `@${username}` : 'sin cuenta'}</span>
        </div>
        <div className="text-[13px] text-secondary">
          {guestPhone
            ? `${guestPhone} · sin categoría`
            : `${category ?? 'Sin categoría'} · ${stats?.pj ? `${stats.pj} PJ · ${pct}% ganados` : 'sin partidos en la app'}`}
        </div>
      </div>
    </div>
  );
}

// Pestaña INSCRIPCIONES del organizador: aprobar, rechazar, lista de espera,
// armar parejas con los que se anotaron solos y marcar pagos.
export default function RegistrationsPanel({ tournament, onTournamentChanged, onAddPair, onConfigure, onPendingCount }) {
  const [data, setData]       = useState(null);
  const [error, setError]     = useState(null);
  const [filtro, setFiltro]   = useState('pending');
  const [busy, setBusy]       = useState(null);
  const [rechazo, setRechazo] = useState(null);       // inscripción a rechazar
  const [motivo, setMotivo]   = useState('');
  const [elegidos, setElegidos] = useState([]);       // ids de jugadores para armar pareja

  const load = useCallback(() => {
    api.registrations.list(tournament.id)
      .then((d) => { setData(d); setError(null); onPendingCount?.(d.summary.pending); })
      .catch((e) => setError(e.message));
  }, [tournament.id, onPendingCount]);

  useEffect(() => { load(); }, [load]);

  const regs = useMemo(() => data?.registrations ?? [], [data]);
  const grupos = useMemo(() => ({
    pending:  regs.filter((r) => r.status === 'pending'),
    unpaired: regs.filter((r) => r.solo_unpaired),
    approved: regs.filter((r) => r.status === 'approved'),
    waitlist: regs.filter((r) => r.status === 'waitlist'),
    closed:   regs.filter((r) => r.status === 'rejected' || r.status === 'cancelled'),
  }), [regs]);

  async function decidir(r, action, reason) {
    setBusy(r.id);
    try {
      const updated = await api.registrations.decide(r.id, action, reason);
      load();
      if (updated.status === 'approved') onTournamentChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function marcarPago(r, paid) {
    setData((d) => ({ ...d, registrations: d.registrations.map((x) => (x.id === r.id ? { ...x, paid } : x)) }));
    try { await api.registrations.paid(r.id, paid); load(); }
    catch (e) { setError(e.message); load(); }
  }

  async function armarPareja() {
    if (elegidos.length !== 2) return;
    setBusy('pareja');
    try {
      await onAddPair?.(elegidos[0], elegidos[1]);
      setElegidos([]);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  if (error && !data) return <p className="text-danger text-[13px]">{error}</p>;
  if (!data) return <div style={{ minHeight: 300 }} />;

  const { summary, signup } = data;
  const cupo = cupoTexto(signup);
  const cierre = fmtCierre(signup.closes_at);
  const lista = grupos[filtro];

  const tarjeta = (r) => {
    const issues = r.level_check?.issues ?? [];
    const meta = ESTADO_META[r.status];
    return (
      <article key={r.id} className="bg-surface border border-border-strong rounded-xl p-3.5 flex flex-col gap-3">
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <span className="text-[12px] font-semibold text-secondary">
            {r.kind === 'pair' ? 'Pareja' : 'Solo, busca pareja'} · {hace(r.created_at)}
          </span>
          {issues.length > 0 ? (
            <span className="text-[12px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/45 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <AlertTriangle size={12} /> Revisar categoría
            </span>
          ) : r.status !== 'pending' && (
            <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}>{meta.label}</span>
          )}
        </div>
        <Jugador name={r.p1_name} username={r.p1_username} avatar={r.p1_avatar_url} category={r.p1_category} stats={r.p1_stats} />
        {r.kind === 'pair' && (
          r.p2_user_id
            ? <Jugador name={r.p2_user_name} username={r.p2_username} avatar={r.p2_avatar_url} category={r.p2_category} stats={r.p2_stats} />
            : <Jugador name={r.p2_name} guestPhone={r.p2_phone} />
        )}
        {issues.length > 0 && (
          <p className="m-0 text-[13px] text-amber-200 bg-amber-500/8 rounded-lg px-2.5 py-2 leading-snug">
            {issues.join('. ')}{signup.level ? ` (${levelLabel(signup.level)})` : ''}.
          </p>
        )}
        {r.rules_accepted_at && (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-secondary">
            <FileCheck size={13} className="text-green" aria-hidden="true" /> Aceptó el reglamento
          </span>
        )}
        {r.status === 'rejected' && r.reject_reason && (
          <p className="m-0 text-[13px] text-secondary">Motivo: “{r.reject_reason}”</p>
        )}
        {(r.status === 'pending' || r.status === 'waitlist') && (
          <div className="grid grid-cols-2 gap-2">
            <Btn onClick={() => { setRechazo(r); setMotivo(''); }} disabled={busy === r.id}>Rechazar</Btn>
            <Btn variant="primary" onClick={() => decidir(r, 'approve')} loading={busy === r.id}>
              {r.status === 'waitlist' ? 'Sumar' : 'Aprobar'}
            </Btn>
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-xl mx-auto">
      <div className="bg-surface border border-border rounded-xl px-3.5 py-3 flex flex-col gap-2">
        <div className="flex justify-between gap-2 text-[13px] flex-wrap">
          <span className="text-white font-semibold">{cupo ? cupo.texto : 'Sin cupo'}{signup.level ? ` · ${levelLabel(signup.level)}` : ''} · {summary.paid} {summary.paid === 1 ? 'pagada' : 'pagadas'}</span>
          <span className="text-secondary">{signup.open ? (cierre ? `Cierra ${cierre}` : 'Abierta') : (signup.reason ?? 'Cerrada')}</span>
        </div>
        {cupo && (
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-brand" style={{ width: `${Math.min(100, (cupo.used / Math.max(1, cupo.cap)) * 100)}%` }} />
          </div>
        )}
        <button type="button" onClick={onConfigure} className="self-start inline-flex items-center gap-1.5 bg-transparent border-0 p-0 text-brand text-[13px] cursor-pointer font-sans">
          <Settings size={13} /> Configurar inscripción
        </button>
      </div>

      <div role="group" aria-label="Filtro" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
        {FILTROS.map((f) => {
          const n = grupos[f.id].length;
          const on = filtro === f.id;
          return (
            <button key={f.id} type="button" aria-pressed={on} onClick={() => setFiltro(f.id)}
              className={`shrink-0 h-9 px-3.5 rounded-full font-sans text-[13px] cursor-pointer ${on ? 'bg-brand text-black font-bold border-0' : 'bg-transparent text-content border border-border-strong'}`}>
              {f.label} · {n}
            </button>
          );
        })}
      </div>

      {error && <p className="m-0 text-[13px] text-danger">{error}</p>}

      {filtro === 'unpaired' ? (
        lista.length === 0 ? <p className="text-secondary text-[13px]">No hay jugadores aprobados sin pareja.</p> : (
          <div className="bg-surface border border-border rounded-xl px-3.5 pt-1.5 pb-3.5 flex flex-col">
            {lista.map((r) => {
              const on = elegidos.includes(r.p1_player_id);
              return (
                <label key={r.id} className="flex items-center gap-3 min-h-12 border-b border-border cursor-pointer">
                  <input type="checkbox" checked={on} disabled={!on && elegidos.length >= 2}
                    onChange={() => setElegidos((e) => (on ? e.filter((x) => x !== r.p1_player_id) : [...e, r.p1_player_id]))}
                    className="w-4.5 h-4.5 accent-brand" />
                  <span className="flex-1 text-[14px] text-white">{r.p1_name}</span>
                  <span className="text-[13px] text-secondary">{r.p1_category ?? '—'}</span>
                </label>
              );
            })}
            <Btn variant="primary" className="mt-2.5" onClick={armarPareja} disabled={elegidos.length !== 2} loading={busy === 'pareja'}>
              Armar pareja con los 2 elegidos
            </Btn>
          </div>
        )
      ) : filtro === 'approved' ? (
        lista.length === 0 ? <p className="text-secondary text-[13px]">Todavía no hay inscripciones aprobadas.</p> : (
          <div className="bg-surface border border-border rounded-xl px-3.5 py-1 flex flex-col">
            {lista.map((r) => (
              <div key={r.id} className="flex items-center gap-3 min-h-13 border-b border-border last:border-b-0">
                <span className="flex-1 text-[14px] text-white">
                  {r.p1_name}{r.kind === 'pair' ? ` & ${r.p2_user_name ?? r.p2_name}` : ' · solo'}
                </span>
                <label className={`flex items-center gap-1.5 text-[13px] cursor-pointer ${r.paid ? 'text-green' : 'text-secondary'}`}>
                  <input type="checkbox" checked={!!r.paid} onChange={(e) => marcarPago(r, e.target.checked)} className="w-4.5 h-4.5 accent-green" />
                  Pagada
                </label>
              </div>
            ))}
          </div>
        )
      ) : lista.length === 0 ? (
        <p className="text-secondary text-[13px]">No hay inscripciones en esta lista.</p>
      ) : (
        <div className="flex flex-col gap-3">{lista.map(tarjeta)}</div>
      )}

      {rechazo && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="rechazo-titulo">
          <div className="w-full sm:max-w-md bg-surface border-t sm:border border-border-strong rounded-t-2xl sm:rounded-2xl p-4 pb-6 flex flex-col gap-3.5">
            <h2 id="rechazo-titulo" className="m-0 font-condensed font-bold text-[18px] text-white">
              Rechazar a {rechazo.p1_name}{rechazo.kind === 'pair' ? ` y ${rechazo.p2_user_name ?? rechazo.p2_name}` : ''}
            </h2>
            <p className="m-0 text-[13px] text-soft">Les avisamos que no entraron. El motivo es opcional y lo ven ellos.</p>
            <div role="group" aria-label="Motivos rápidos" className="flex gap-2 flex-wrap">
              {MOTIVOS.map((m) => (
                <button key={m} type="button" aria-pressed={motivo === m} onClick={() => setMotivo(m)}
                  className={`h-9 px-3 rounded-full font-sans text-[13px] cursor-pointer ${motivo === m ? 'border border-brand bg-brand/10 text-brand' : 'border border-border-strong bg-transparent text-content'}`}>
                  {m}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="rechazo-motivo" className="text-[11px] tracking-wide text-dim font-semibold">MOTIVO</label>
              <textarea id="rechazo-motivo" rows={3} maxLength={200} value={motivo} onChange={(e) => setMotivo(e.target.value)}
                className="box-border bg-base border border-border-strong rounded-lg px-3.5 py-3 text-white font-sans text-[14px] resize-none outline-none focus:border-brand" />
              <span className="text-[12px] text-dim text-right">{motivo.length}/200</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Btn onClick={() => setRechazo(null)}>Volver</Btn>
              <Btn variant="danger" loading={busy === rechazo.id}
                onClick={async () => { await decidir(rechazo, 'reject', motivo); setRechazo(null); }}>
                Rechazar
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
