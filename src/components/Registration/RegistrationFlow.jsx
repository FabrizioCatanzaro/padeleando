import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowLeft, Users, User, Search, Check, Bell, AlertTriangle } from 'lucide-react';
import RulesModal from '../shared/RulesModal';
import { api } from '../../utils/api';
import { useAuth } from '../../context/useAuth';
import { formatPrice } from '../../utils/signup';
import { levelLabel, checkRegistrationLevel } from '../../utils/category';
import PlayerAvatar from '../shared/PlayerAvatar';
import Btn from '../shared/Btn';
import { fmtCierre } from './format';

const OPTION = 'w-full text-left rounded-xl p-4 flex gap-3.5 items-start cursor-pointer font-sans transition-colors';
const INPUT  = 'h-12 w-full box-border bg-surface border border-border-strong rounded-lg px-3.5 text-white font-sans text-[15px] outline-none focus:border-brand';
const LABEL  = 'text-[11px] tracking-wide text-dim font-semibold';

// Formulario de inscripción en tres pasos: tipo → compañero → resumen.
// Pantalla completa en el teléfono, ventana centrada en escritorio.
export default function RegistrationFlow({ tournament, groupName = null, signup, contactos = [], onClose, onDone }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep]       = useState(1);
  const [kind, setKind]       = useState('pair');
  const [hasAccount, setHasAccount] = useState(true);
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [partner, setPartner] = useState(null);       // usuario elegido
  const [guest, setGuest]     = useState({ name: '', phone: '' });
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState(null);
  const [acepto, setAcepto]   = useState(false);
  const [verReglamento, setVerReglamento] = useState(false);

  // Búsqueda del compañero: espera 250 ms después de la última tecla.
  useEffect(() => {
    if (!hasAccount || query.trim().replace(/^@/, '').length < 2) return undefined;
    const t = setTimeout(() => {
      api.auth.search(query.trim().replace(/^@/, ''))
        .then((r) => setResults((r ?? []).filter((u) => u.id !== user?.id)))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query, hasAccount, user?.id]);

  const sinCategoria = !user?.category;
  const pasos = kind === 'pair' ? ['Tipo', 'Compañero', 'Resumen'] : ['Tipo', 'Resumen'];
  const pasoActual = kind === 'pair' ? step : (step === 1 ? 1 : 2);
  const companeroListo = kind === 'solo' || (hasAccount ? !!partner : guest.name.trim().length >= 2 && guest.phone.trim().length >= 6);

  const categorias = kind === 'pair' ? [user?.category ?? null, hasAccount ? (partner?.category ?? null) : null] : [user?.category ?? null];
  const check = signup.level ? checkRegistrationLevel(categorias, signup.level, { solo: kind === 'solo' }) : { issues: [] };
  const precio = formatPrice(signup.price, signup.price_unit ?? signup.unit);
  const cierre = fmtCierre(signup.closes_at);

  function siguiente() {
    setError(null);
    if (step === 1) setStep(kind === 'pair' ? 2 : 3);
    else if (step === 2) setStep(3);
  }
  function atras() {
    setError(null);
    if (step === 3) setStep(kind === 'pair' ? 2 : 1);
    else if (step === 2) setStep(1);
  }

  async function enviar() {
    setSending(true);
    setError(null);
    try {
      const reg = await api.registrations.create({
        tournamentId: tournament.id,
        kind,
        ...(signup.rules ? { accept_rules: acepto } : {}),
        partner: kind === 'solo' ? undefined
          : hasAccount ? { username: partner.username } : { name: guest.name, phone: guest.phone },
      });
      onDone?.(reg);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="reg-titulo">
      <div className="bg-base w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl sm:border sm:border-border-mid flex flex-col overflow-hidden">
        <header className="h-14 px-2 flex items-center justify-between border-b border-border shrink-0">
          {step > 1 ? (
            <button type="button" onClick={atras} aria-label="Volver" className="w-11 h-11 flex items-center justify-center bg-transparent border-0 text-soft cursor-pointer"><ArrowLeft size={20} /></button>
          ) : <span className="w-11" />}
          <div className="text-center min-w-0">
            <div className="text-[11px] tracking-wide text-dim font-semibold">INSCRIPCIÓN</div>
            <div className="text-[14px] text-white font-semibold truncate">
              {tournament.name}{groupName ? ` (${groupName})` : ''}{signup.level ? ` · ${levelLabel(signup.level)}` : ''}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="w-11 h-11 flex items-center justify-center bg-transparent border-0 text-soft cursor-pointer"><X size={20} /></button>
        </header>

        <nav aria-label="Pasos" className="px-4 pt-3.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}>
          {pasos.map((p, i) => (
            <div key={p} className="flex flex-col gap-1.5">
              <span className={`h-1 rounded-full ${i < pasoActual ? 'bg-brand' : 'bg-border-strong'}`} />
              <span className={`text-[11px] font-semibold ${i + 1 === pasoActual ? 'text-brand' : 'text-dim'}`}>{i + 1} · {p}</span>
            </div>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4">
          {sinCategoria && (
            <div className="flex gap-2 items-start bg-amber-500/10 border border-amber-500/40 rounded-lg p-3 text-[13px] text-amber-200">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>
                Para inscribirte necesitás tu categoría en el perfil.{' '}
                <button type="button" onClick={() => navigate(`/nivel?next=${encodeURIComponent(window.location.pathname)}`)}
                  className="bg-transparent border-0 p-0 text-brand underline cursor-pointer font-sans text-[13px]">Completala acá</button>.
              </span>
            </div>
          )}

          {step === 1 && (
            <>
              <h1 id="reg-titulo" className="m-0 font-condensed font-bold text-[22px] text-white">¿Cómo te inscribís?</h1>
              <button type="button" aria-pressed={kind === 'pair'} onClick={() => setKind('pair')}
                className={`${OPTION} ${kind === 'pair' ? 'bg-brand/8 border-2 border-brand' : 'bg-surface border border-border-strong'}`}>
                <span className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${kind === 'pair' ? 'bg-brand text-black' : 'bg-surface-alt text-content'}`}><Users size={20} /></span>
                <span className="flex flex-col gap-1">
                  <span className="text-[16px] text-white font-bold">Con pareja</span>
                  <span className="text-[13px] text-soft leading-snug">Cargás a tu compañero. Pagás las 2 inscripciones.</span>
                </span>
              </button>
              <button type="button" aria-pressed={kind === 'solo'} onClick={() => setKind('solo')}
                className={`${OPTION} ${kind === 'solo' ? 'bg-brand/8 border-2 border-brand' : 'bg-surface border border-border-strong'}`}>
                <span className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${kind === 'solo' ? 'bg-brand text-black' : 'bg-surface-alt text-content'}`}><User size={20} /></span>
                <span className="flex flex-col gap-1">
                  <span className="text-[16px] text-white font-bold">Solo, busco pareja</span>
                  <span className="text-[13px] text-soft leading-snug">El organizador te arma la pareja con otro jugador inscripto solo.</span>
                </span>
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h1 id="reg-titulo" className="m-0 font-condensed font-bold text-[22px] text-white">¿Quién es tu compañero?</h1>
              <div role="group" aria-label="Tipo de compañero" className="grid grid-cols-2 gap-1 p-1 bg-surface border border-border-strong rounded-lg">
                {[{ v: true, l: 'Tiene cuenta' }, { v: false, l: 'No tiene cuenta' }].map((o) => (
                  <button key={o.l} type="button" aria-pressed={hasAccount === o.v} onClick={() => setHasAccount(o.v)}
                    className={`h-10 rounded-md border-0 font-sans text-[13px] cursor-pointer ${hasAccount === o.v ? 'bg-brand text-black font-bold' : 'bg-transparent text-soft font-semibold'}`}>
                    {o.l}
                  </button>
                ))}
              </div>

              {hasAccount ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reg-buscar" className={LABEL}>BUSCAR POR NOMBRE O @USUARIO</label>
                    <div className="flex items-center gap-2 h-12 bg-surface border border-border-strong rounded-lg px-3 focus-within:border-brand">
                      <Search size={18} className="text-dim shrink-0" />
                      <input id="reg-buscar" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off"
                        className="flex-1 min-w-0 bg-transparent border-0 outline-none text-white font-sans text-[15px]" placeholder="@usuario" />
                    </div>
                  </div>
                  <div role="listbox" aria-label="Resultados" className="flex flex-col gap-2">
                    {results.map((u) => {
                      const sel = partner?.id === u.id;
                      return (
                        <button key={u.id} type="button" role="option" aria-selected={sel} onClick={() => setPartner(u)}
                          className={`text-left flex items-center gap-3 p-3 rounded-xl cursor-pointer font-sans ${sel ? 'bg-brand/8 border-2 border-brand' : 'bg-surface border border-border'}`}>
                          <PlayerAvatar name={u.name} src={u.avatar_url} size={40} />
                          <span className="flex-1 min-w-0 flex flex-col">
                            <span className="text-[15px] text-white font-bold truncate">{u.name}</span>
                            <span className="text-[13px] text-secondary">@{u.username}{u.category ? ` · ${u.category}` : ''}</span>
                          </span>
                          {sel && <Check size={20} className="text-brand shrink-0" strokeWidth={2.5} />}
                        </button>
                      );
                    })}
                  </div>
                  {partner && (
                    <p className="m-0 text-[13px] text-secondary leading-snug flex gap-2">
                      <Bell size={16} className="text-cyan shrink-0 mt-0.5" />
                      {partner.name} recibe un aviso de que lo inscribiste. No tiene que confirmar.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reg-nombre" className={LABEL}>NOMBRE Y APELLIDO</label>
                    <input id="reg-nombre" className={INPUT} maxLength={40} value={guest.name} onChange={(e) => setGuest((g) => ({ ...g, name: e.target.value }))} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reg-tel" className={LABEL}>TELÉFONO</label>
                    <input id="reg-tel" type="tel" className={INPUT} maxLength={25} placeholder="+54 9 11 1234-5678" value={guest.phone} onChange={(e) => setGuest((g) => ({ ...g, phone: e.target.value }))} />
                    <span className="text-[12px] text-dim">Solo lo ve el organizador.</span>
                  </div>
                </>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <h1 id="reg-titulo" className="m-0 font-condensed font-bold text-[22px] text-white">Revisá y enviá</h1>
              <dl className="m-0 bg-surface border border-border rounded-xl px-4 py-1 flex flex-col">
                {[
                  ['Tipo', kind === 'pair' ? 'Con pareja' : 'Solo, busco pareja'],
                  ['Vos', `${user?.name ?? ''}${user?.category ? ` · ${user.category}` : ''}`],
                  ...(kind === 'pair' ? [['Compañero', hasAccount
                    ? `${partner?.name ?? ''}${partner?.category ? ` · ${partner.category}` : ''}`
                    : `${guest.name} · sin cuenta`]] : []),
                  ...(precio ? [['A pagar', `${precio}`]] : []),
                ].map(([k, v], i, arr) => (
                  <div key={k} className={`flex justify-between gap-3 py-3 ${i < arr.length - 1 ? 'border-b border-border' : ''}`}>
                    <dt className="text-[13px] text-secondary">{k}</dt>
                    <dd className="m-0 text-[14px] text-white font-semibold text-right">{v}</dd>
                  </div>
                ))}
              </dl>
              {check.issues.length > 0 && (
                <div className="flex gap-2 items-start bg-amber-500/10 border border-amber-500/40 rounded-lg p-3 text-[13px] text-amber-200">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{check.issues.join('. ')}. Podés enviarla igual: el organizador decide.</span>
                </div>
              )}
              <div className="bg-surface-alt rounded-xl p-3.5 flex flex-col gap-2.5">
                <p className="m-0 text-[13px] text-content leading-relaxed">
                  El organizador aprueba cada inscripción. Te avisamos cuando decida.
                  {precio ? ' El pago se coordina con el organizador.' : ''}
                  {cierre ? ` Podés cancelar hasta el ${cierre}.` : ''}
                </p>
                {contactos.length > 0 && <div className="flex gap-2 flex-wrap">{contactos}</div>}
              </div>
              {signup.rules && (
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border-strong bg-surface cursor-pointer">
                  <input
                    type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)}
                    className="w-5 h-5 mt-0.5 accent-brand cursor-pointer shrink-0"
                  />
                  <span className="text-[14px] text-content leading-snug">
                    Leí y acepto el{' '}
                    <button type="button" onClick={(e) => { e.preventDefault(); setVerReglamento(true); }}
                      className="bg-transparent border-0 p-0 text-brand underline cursor-pointer font-sans text-[14px]">reglamento del torneo</button>.
                  </span>
                </label>
              )}
            </>
          )}

          {error && <p className="m-0 text-[13px] text-danger">{error}</p>}
        </main>

        <footer className="p-4 border-t border-border shrink-0">
          {step < 3 ? (
            <Btn variant="primary" size="lg" full onClick={siguiente} disabled={step === 2 && !companeroListo}>SIGUIENTE</Btn>
          ) : (
            <Btn variant="primary" size="lg" full onClick={enviar} loading={sending} disabled={sinCategoria || (!!signup.rules && !acepto)}>ENVIAR INSCRIPCIÓN</Btn>
          )}
        </footer>
      </div>
      {verReglamento && <RulesModal rules={signup.rules} tournamentName={tournament.name} onClose={() => setVerReglamento(false)} />}
    </div>
  );
}
