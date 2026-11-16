import { Plus, X } from 'lucide-react';
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

// Inscripción de un torneo o de una categoría. `inherited` es lo de la categoría; null en un campo = heredarlo.
export default function SignupEditor({ value, onChange, inherited = null, profile = [], conReglamento = true }) {
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
