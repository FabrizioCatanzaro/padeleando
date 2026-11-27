import { useState } from 'react';
import { Plus, X, Link2 } from 'lucide-react';
import { quote, priceForNet, rateLabel } from '../../utils/commission';
import { CONTACT_META, CONTACT_TYPES, formatPrice } from '../../utils/signup';
import { levelLabel } from '../../utils/category';
import LevelPicker from './LevelPicker';
import RulesEditor from './RulesEditor';
import { ayudaReglamento } from '../../utils/rules';

const INPUT = 'h-10 bg-surface border border-border-mid text-white px-3 font-sans text-[14px] rounded-lg outline-none focus:border-brand';

// ISO → valor de <input type="datetime-local"> en la hora del navegador.
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Bloque({ titulo, ayuda, children }) {
  return (
    <section className="flex flex-col gap-2.5 py-4 border-t border-border first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-0.5">
        <h5 className="m-0 text-[14px] font-bold text-white">{titulo}</h5>
        {ayuda && <p className="m-0 text-[12px] text-secondary leading-snug">{ayuda}</p>}
      </div>
      {children}
    </section>
  );
}

function Segmentos({ label, opciones, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="inline-flex p-1 gap-1 rounded-lg border border-border-mid bg-surface shrink-0">
      {opciones.map(([v, texto]) => (
        <button
          key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
          className={`min-h-[32px] px-3 rounded-md border-0 font-sans text-[13px] cursor-pointer transition-colors ${
            value === v ? 'bg-brand text-base font-bold' : 'bg-transparent text-soft hover:text-white'
          }`}
        >
          {texto}
        </button>
      ))}
    </div>
  );
}

const pesos = (n) => `$${Math.round(n).toLocaleString('es-AR')}`;

function Linea({ label, valor, fuerte = false }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[13px]">
      <span className="text-secondary">{label}</span>
      <span className={fuerte ? 'text-white font-bold' : 'text-soft'}>{valor}</span>
    </div>
  );
}

// Cobro por la app: sólo en un torneo. El Mercado Pago es siempre el del dueño de la categoría.
function CobroOnline({ value, set, cobro, price, unit }) {
  const [neto, setNeto] = useState('');
  const payer = value.fee_payer ?? 'player';
  const perPlayer = price == null ? null : (unit === 'pair' ? price / 2 : price);
  const q = perPlayer > 0 ? quote({ price: perPlayer, payer, organizerPlan: cobro.organizerPlan }) : null;

  if (!cobro.connected) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border-strong px-3 py-3">
        <span className="text-[13px] text-soft leading-snug">
          {!cobro.isOwner
            ? 'Para cobrar por la app, el dueño de la categoría tiene que vincular su Mercado Pago.'
            : cobro.onConnect
              ? 'Vinculá tu Mercado Pago y cobrá la inscripción por la app: el jugador paga al anotarse y la plata entra a tu cuenta.'
              : 'Para cobrar por la app, vinculá tu Mercado Pago en Torneos › Organizar. Después lo activás desde Gestión del torneo.'}
        </span>
        {cobro.isOwner && cobro.onConnect && (
          <button type="button" onClick={cobro.onConnect}
            className="self-start inline-flex items-center gap-2 min-h-[36px] px-3 rounded-lg bg-brand text-base border-0 font-sans font-bold text-[13px] cursor-pointer">
            <Link2 size={14} /> Vincular Mercado Pago
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center justify-between gap-3 rounded-lg border border-border-mid px-3 py-2.5 cursor-pointer">
        <span className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[14px] font-semibold text-white">{value.online ? 'Se cobra por la app' : 'No se cobra por la app'}</span>
          <span className="text-[12px] text-secondary leading-snug">
            {value.online ? 'El jugador paga al anotarse con Mercado Pago.' : 'El pago se coordina con vos, por fuera de la app.'}
          </span>
        </span>
        <input type="checkbox" role="switch" checked={!!value.online} onChange={(e) => set({ online: e.target.checked })}
          aria-label="Cobrar por la app" className="w-5 h-5 shrink-0 accent-brand cursor-pointer" />
      </label>

      {value.online && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] text-secondary">El cargo de servicio lo paga</span>
            <Segmentos label="El cargo de servicio lo paga" value={payer} onChange={(v) => set({ fee_payer: v })}
              opciones={[['player', 'El jugador'], ['organizer', 'Vos']]} />
          </div>

          {q ? (
            <div className="flex flex-col gap-1.5 rounded-lg bg-surface-alt border border-border px-3 py-3">
              <span className="text-[11px] font-mono tracking-widest text-dim uppercase mb-1">Por jugador</span>
              <Linea label="Precio" valor={pesos(q.base)} />
              <Linea label={`Cargo de servicio (${rateLabel(cobro.organizerPlan)})`} valor={pesos(q.fee)} />
              <Linea label="El jugador paga" valor={pesos(q.total)} fuerte />
              <Linea label="Vos recibís" valor={q.net > 0 ? pesos(q.net) : 'Nada: subí el precio'} fuerte />
              <p className="m-0 mt-1 text-[11.5px] text-dim leading-snug">
                Mercado Pago descuenta además su propia comisión de lo que recibís, según el medio de pago y el plazo de acreditación de tu cuenta.
              </p>
            </div>
          ) : (
            <span className="text-[12px] text-danger">Cargá un precio mayor a 0 para cobrar por la app.</span>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] text-secondary">¿Querés recibir un monto justo?</span>
            <div className="relative w-32">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-secondary" aria-hidden="true">$</span>
              <input type="number" min="1" inputMode="numeric" aria-label="Lo que querés recibir por jugador"
                value={neto} onChange={(e) => setNeto(e.target.value)} placeholder="Por jugador" className={`${INPUT} w-full pl-7`} />
            </div>
            <button type="button" disabled={!(Number(neto) > 0)}
              onClick={() => {
                const p = priceForNet(Number(neto), { payer, organizerPlan: cobro.organizerPlan });
                if (p) set({ price: unit === 'pair' ? p * 2 : p, unit });
              }}
              className="min-h-[40px] px-3 rounded-lg border border-border-strong bg-transparent text-[13px] text-soft hover:text-white disabled:opacity-50 cursor-pointer">
              Calcular precio
            </button>
          </div>

          <p className="m-0 text-[12px] text-secondary leading-snug">
            Si rechazás una inscripción, si el jugador cancela antes del cierre o si reintegrás todo, la app le devuelve el pago completo desde tu cuenta de Mercado Pago.
          </p>
        </>
      )}
    </div>
  );
}

// Inscripción de un torneo o de una categoría. `inherited` es lo de la categoría; null en un campo = heredarlo.
// `cobro` sólo llega en un torneo: { connected, organizerPlan, isOwner, onConnect }.
export default function SignupEditor({ value, onChange, inherited = null, profile = [], conReglamento = true, cobro = null }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const contacts = value.contacts ?? [];
  const usedTypes = new Set(contacts.map((c) => c.type));
  // Un contacto nuevo arranca en un canal que no esté cargado ni venga del perfil.
  const profileTypes = new Set(profile.map((p) => p.type));
  const freeType  = CONTACT_TYPES.find((t) => !usedTypes.has(t) && !profileTypes.has(t));
  // Los del perfil se muestran solos; cargar el mismo canal a mano los reemplaza.
  const fromProfile = profile.filter((p) => !usedTypes.has(p.type));

  const setContact = (i, patch) =>
    set({ contacts: contacts.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });

  const inheritedPrice = inherited && inherited.price != null ? formatPrice(inherited.price, inherited.unit) : null;
  const inheritedLevel = inherited?.level ? levelLabel(inherited.level) : null;
  const capacityUnit = value.capacity_unit ?? inherited?.capacity_unit ?? 'pair';

  return (
    <div className="flex flex-col">
      <Bloque titulo="Estado">
        <label className="flex items-center justify-between gap-3 rounded-lg border border-border-mid px-3 py-2.5 cursor-pointer">
          <span className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[14px] font-semibold text-white">{value.open ? 'Inscripción abierta' : 'Inscripción cerrada'}</span>
            <span className="text-[12px] text-secondary leading-snug">
              {value.open ? 'Los jugadores se anotan desde la app y vos aprobás cada inscripción.' : 'Nadie puede anotarse desde la app.'}
            </span>
          </span>
          <input
            type="checkbox" role="switch" checked={!!value.open} onChange={(e) => set({ open: e.target.checked })}
            aria-label="Abrir inscripción" className="w-5 h-5 shrink-0 accent-brand cursor-pointer"
          />
        </label>
      </Bloque>

      <Bloque titulo="Categoría" ayuda="La inscripción marca a quien excede el nivel. Vos decidís si lo aceptás.">
        <LevelPicker
          value={value.level ?? null}
          onChange={(level) => set({ level })}
          emptyLabel={inheritedLevel ? `De la categoría: ${inheritedLevel}` : 'Sin categoría'}
        />
      </Bloque>

      {value.open && (
        <>
          <Bloque titulo="Cupo" ayuda="Al llenarse, las inscripciones nuevas quedan en lista de espera. Vacío: sin cupo.">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="number" min="1" inputMode="numeric" aria-label="Cupo"
                value={value.capacity ?? ''}
                onChange={(e) => set({ capacity: e.target.value === '' ? null : Number(e.target.value) })}
                placeholder={inherited?.capacity ? 'Categoría' : 'Sin cupo'}
                className={`${INPUT} w-28`}
              />
              <Segmentos
                label="El cupo cuenta" value={capacityUnit} onChange={(v) => set({ capacity_unit: v })}
                opciones={[['pair', 'Parejas'], ['player', 'Jugadores']]}
              />
            </div>
            {inherited?.capacity && value.capacity == null && (
              <span className="text-[12px] text-secondary">Usa el cupo de la categoría: {inherited.capacity}.</span>
            )}
          </Bloque>

          <Bloque titulo="Cierre" ayuda="A esa hora deja de aceptar inscripciones y cancelaciones. Sin fecha, la cerrás vos a mano.">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                id="signup-cierre" type="datetime-local" aria-label="Cierre de la inscripción"
                value={toLocalInput(value.closes_at)}
                onChange={(e) => set({ closes_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className={INPUT}
              />
              {value.closes_at && (
                <button type="button" onClick={() => set({ closes_at: null })}
                  className="min-h-[40px] px-2 bg-transparent border-0 text-[13px] text-soft hover:text-white cursor-pointer">
                  Quitar cierre
                </button>
              )}
            </div>
          </Bloque>

          <Bloque titulo="Precio" ayuda="Se muestra en la inscripción. El pago se coordina con vos. 0 es gratis.">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-36">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-secondary" aria-hidden="true">$</span>
                <input
                  type="number" min="0" inputMode="numeric" aria-label="Precio"
                  value={value.price ?? ''}
                  onChange={(e) => set({ price: e.target.value === '' ? null : Number(e.target.value) })}
                  placeholder={inheritedPrice ? 'Categoría' : 'Sin precio'}
                  className={`${INPUT} w-full pl-7`}
                />
              </div>
              {value.price != null && (
                <Segmentos
                  label="El precio es" value={value.unit ?? 'player'} onChange={(v) => set({ unit: v })}
                  opciones={[['player', 'Por jugador'], ['pair', 'Por pareja']]}
                />
              )}
            </div>
            {inheritedPrice && value.price == null && (
              <span className="text-[12px] text-secondary">Usa el precio de la categoría: {inheritedPrice}.</span>
            )}
          </Bloque>

          {cobro && (
            <Bloque titulo="Cobro por la app" ayuda="Opcional. Si no cobrás por la app, el jugador te paga como acuerden.">
              <CobroOnline
                value={value} set={set} cobro={cobro}
                price={value.price ?? inherited?.price ?? null}
                unit={value.price != null ? (value.unit ?? 'player') : (inherited?.unit ?? 'player')}
              />
            </Bloque>
          )}

          {cobro && (
            <Bloque titulo="Otros medios de pago" ayuda="Se muestra en la inscripción. Por ejemplo: transferencia o efectivo el día del torneo.">
              <textarea
                value={value.payment_note ?? ''} maxLength={200} rows={2} aria-label="Otros medios de pago"
                onChange={(e) => set({ payment_note: e.target.value })}
                placeholder="Transferencia al alias padeleando.torneo"
                className="bg-surface border border-border-mid text-white px-3 py-2 font-sans text-[14px] rounded-lg outline-none focus:border-brand resize-y"
              />
            </Bloque>
          )}

          <Bloque titulo="Contacto" ayuda="Para consultas antes de inscribirse. Las redes de tu perfil se suman solas.">
            <div className="flex flex-col gap-2">
              {fromProfile.map((p) => {
                const meta = CONTACT_META[p.type] ?? {};
                const Icon = meta.icon;
                return (
                  <div key={`profile-${p.type}`} className="flex items-center gap-2 h-10 px-3 rounded-lg border border-dashed border-border-strong">
                    {Icon && <Icon size={14} className="text-brand shrink-0" />}
                    <span className="text-[13px] text-content font-sans truncate flex-1 min-w-0">{p.value}</span>
                    <span className="text-[12px] text-secondary shrink-0">de tu perfil</span>
                  </div>
                );
              })}

              {contacts.map((c, i) => {
                const meta = CONTACT_META[c.type] ?? {};
                return (
                  <div key={i} className="flex gap-2 items-center">
                    <select
                      value={c.type} aria-label="Canal"
                      onChange={(e) => setContact(i, { type: e.target.value })}
                      className={`${INPUT} px-2 cursor-pointer shrink-0`}
                    >
                      {CONTACT_TYPES.map((t) => (
                        <option key={t} value={t} disabled={t !== c.type && usedTypes.has(t)}>
                          {CONTACT_META[t].label}{t !== c.type && profileTypes.has(t) && !usedTypes.has(t) ? ' (reemplaza el de tu perfil)' : ''}
                        </option>
                      ))}
                    </select>
                    <input
                      value={c.value} aria-label={meta.label}
                      onChange={(e) => setContact(i, { value: e.target.value })}
                      placeholder={meta.placeholder} maxLength={80}
                      className={`${INPUT} flex-1 min-w-0`}
                    />
                    <button
                      type="button" onClick={() => set({ contacts: contacts.filter((_, idx) => idx !== i) })}
                      aria-label="Quitar contacto"
                      className="w-10 h-10 flex items-center justify-center bg-transparent border-0 text-muted hover:text-danger cursor-pointer shrink-0 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}

              {freeType && (
                <button
                  type="button" onClick={() => set({ contacts: [...contacts, { type: freeType, value: '' }] })}
                  className="flex items-center gap-1.5 self-start min-h-[36px] text-[13px] text-brand font-semibold hover:text-white cursor-pointer bg-transparent border-0 p-0 transition-colors"
                >
                  <Plus size={14} /> Agregar contacto
                </button>
              )}

              {contacts.length === 0 && inherited?.contacts?.length > 0 && (
                <span className="text-[12px] text-secondary">Sin contactos propios se usan los de la categoría.</span>
              )}
              {contacts.length === 0 && !inherited?.contacts?.length && fromProfile.length === 0 && (
                <span className="text-[12px] text-secondary">Cargá tus redes en el perfil y aparecen acá solas.</span>
              )}
            </div>
          </Bloque>
        </>
      )}

      {conReglamento && (
        <Bloque titulo="Reglamento" ayuda={ayudaReglamento(value.rules, inherited?.rules)}>
          <RulesEditor value={value.rules} onChange={(rules) => set({ rules })} heredado={inherited?.rules} />
        </Bloque>
      )}
    </div>
  );
}
