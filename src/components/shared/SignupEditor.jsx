import { Plus, X } from 'lucide-react';
import { MAX_RULES } from '../../utils/rules';
import { CONTACT_META, CONTACT_TYPES, formatPrice } from '../../utils/signup';
import { levelLabel } from '../../utils/category';
import LevelPicker from './LevelPicker';

// `inherited` es lo que trae la categoría; null en un campo = heredarlo.
// ISO → valor de <input type="datetime-local"> en la hora del navegador.
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function SignupEditor({ value, onChange, inherited = null, profile = [] }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const contacts = value.contacts ?? [];
  const usedTypes = new Set(contacts.map((c) => c.type));
  // Un contacto nuevo arranca en un canal que no esté cargado ni venga del
  // perfil: antes tomaba el primero libre, y si era uno del perfil lo pisaba.
  const profileTypes = new Set(profile.map((p) => p.type));
  const freeType  = CONTACT_TYPES.find((t) => !usedTypes.has(t) && !profileTypes.has(t));
  // Los del perfil se muestran solos; cargar el mismo canal a mano los reemplaza.
  const fromProfile = profile.filter((p) => !usedTypes.has(p.type));

  const setContact = (i, patch) =>
    set({ contacts: contacts.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });

  const inheritedPrice = inherited && inherited.price != null
    ? formatPrice(inherited.price, inherited.unit)
    : null;

  const inheritedLevel = inherited?.level ? levelLabel(inherited.level) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* La categoría del torneo marca a los inscriptos excedidos de nivel.
          Vacía en la jornada = la de la categoría del organizador. */}
      <div>
        <label className="block text-[12px] font-semibold text-soft mb-1.5">Categoría del torneo</label>
        <LevelPicker
          value={value.level ?? null}
          onChange={(level) => set({ level })}
          emptyLabel={inheritedLevel ? `De la categoría: ${inheritedLevel}` : 'Sin categoría'}
        />
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={!!value.open}
          onChange={(e) => set({ open: e.target.checked })}
          className="w-4 h-4 accent-brand cursor-pointer"
        />
        <span className="text-[13px] text-content font-sans">Abrir inscripción</span>
      </label>

      {value.open && (
        <>
          {/* Cupo y cierre: los usa la inscripción desde la app (lista de
              espera, cierre automático). Vacío = sin cupo / sin cierre. */}
          <div className="flex gap-2 items-end">
            <div className="w-24 shrink-0">
              <label className="block text-[12px] font-semibold text-soft mb-1.5">Cupo</label>
              <input
                type="number"
                min="1"
                inputMode="numeric"
                value={value.capacity ?? ''}
                onChange={(e) => set({ capacity: e.target.value === '' ? null : Number(e.target.value) })}
                placeholder={inherited?.capacity ? `De la categoría: ${inherited.capacity}` : 'Sin cupo'}
                className="w-full bg-surface border border-border-mid text-white px-2.5 py-1.5 font-sans text-[13px] rounded-sm outline-none"
              />
            </div>
            <div className="shrink-0">
              <label className="block text-[12px] font-semibold text-soft mb-1.5">El cupo cuenta</label>
              <select
                value={value.capacity_unit ?? inherited?.capacity_unit ?? 'pair'}
                onChange={(e) => set({ capacity_unit: e.target.value })}
                className="bg-surface border border-border-mid text-white px-2.5 py-[7px] font-sans text-[13px] rounded-sm outline-none cursor-pointer"
              >
                <option value="pair">Parejas</option>
                <option value="player">Jugadores</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="signup-cierre" className="block text-[12px] font-semibold text-soft mb-1.5">Cierre de la inscripción</label>
            <input
              id="signup-cierre"
              type="datetime-local"
              value={toLocalInput(value.closes_at)}
              onChange={(e) => set({ closes_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="bg-surface border border-border-mid text-white px-2.5 py-1.5 font-sans text-[13px] rounded-sm outline-none"
            />
            <span className="block text-[12px] font-sans text-secondary mt-1">
              A esa hora deja de aceptar inscripciones y cancelaciones. Sin fecha, la cerrás vos a mano.
            </span>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1 min-w-0">
              <label className="block text-[12px] font-semibold text-soft mb-1.5">Precio</label>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={value.price ?? ''}
                onChange={(e) => set({ price: e.target.value === '' ? null : Number(e.target.value) })}
                placeholder={inheritedPrice ? 'Igual que la categoría' : 'Sin precio'}
                className="w-full bg-surface border border-border-mid text-white px-2.5 py-1.5 font-sans text-[13px] rounded-sm outline-none"
              />
            </div>
            <div className="shrink-0">
              <label className="block text-[12px] font-semibold text-soft mb-1.5">Por</label>
              <select
                value={value.unit ?? 'player'}
                onChange={(e) => set({ unit: e.target.value })}
                className="bg-surface border border-border-mid text-white px-2.5 py-[7px] font-sans text-[13px] rounded-sm outline-none cursor-pointer"
              >
                <option value="player">Jugador</option>
                <option value="pair">Pareja</option>
              </select>
            </div>
          </div>
          {inheritedPrice && value.price == null && (
            <span className="block -mt-1 text-[12px] text-secondary">Precio de la categoría: {inheritedPrice}.</span>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-soft mb-1.5">Contacto</label>
            <div className="flex flex-col gap-2">
              {fromProfile.map((p) => {
                const meta = CONTACT_META[p.type] ?? {};
                const Icon = meta.icon;
                return (
                  <div key={`profile-${p.type}`} className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm border border-dashed border-border-strong">
                    {Icon && <Icon size={13} className="text-brand shrink-0" />}
                    <span className="text-[12px] text-content font-sans truncate flex-1 min-w-0">{p.value}</span>
                    <span className="text-[12px] text-secondary shrink-0">de tu perfil</span>
                  </div>
                );
              })}

              {contacts.map((c, i) => {
                const meta = CONTACT_META[c.type] ?? {};
                return (
                  <div key={i} className="flex gap-2 items-center">
                    <select
                      value={c.type}
                      onChange={(e) => setContact(i, { type: e.target.value })}
                      className="bg-surface border border-border-mid text-white px-2 py-[7px] font-sans text-[12px] rounded-sm outline-none cursor-pointer shrink-0"
                    >
                      {CONTACT_TYPES.map((t) => (
                        <option key={t} value={t} disabled={t !== c.type && usedTypes.has(t)}>
                          {CONTACT_META[t].label}{t !== c.type && profileTypes.has(t) && !usedTypes.has(t) ? ' (reemplaza el de tu perfil)' : ''}
                        </option>
                      ))}
                    </select>
                    <input
                      value={c.value}
                      onChange={(e) => setContact(i, { value: e.target.value })}
                      placeholder={meta.placeholder}
                      maxLength={80}
                      className="flex-1 min-w-0 bg-surface border border-border-mid text-white px-2.5 py-1.5 font-sans text-[13px] rounded-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => set({ contacts: contacts.filter((_, idx) => idx !== i) })}
                      aria-label="Quitar contacto"
                      className="bg-transparent border-0 text-muted hover:text-danger cursor-pointer p-1 shrink-0 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}

              {freeType && (
                <button
                  type="button"
                  onClick={() => set({ contacts: [...contacts, { type: freeType, value: '' }] })}
                  className="flex items-center gap-1.5 self-start text-[13px] text-brand hover:text-white cursor-pointer bg-transparent border-0 p-0 transition-colors"
                >
                  <Plus size={13} /> Agregar contacto
                </button>
              )}

              {contacts.length === 0 && inherited?.contacts?.length > 0 && (
                <span className="text-[12px] text-secondary">
                  Sin contactos propios se usan los de la categoría.
                </span>
              )}
              {contacts.length === 0 && !inherited?.contacts?.length && fromProfile.length === 0 && (
                <span className="text-[12px] text-secondary">
                  Cargá tus redes en el perfil y aparecen acá solas.
                </span>
              )}
            </div>
          </div>
        </>
      )}

      <div>
        <label htmlFor="signup-reglamento" className="block text-[12px] font-semibold text-soft mb-1.5">Reglamento</label>
        <textarea
          id="signup-reglamento"
          value={value.rules ?? ''}
          onChange={(e) => set({ rules: e.target.value === '' ? null : e.target.value })}
          maxLength={MAX_RULES}
          rows={5}
          placeholder={inherited?.rules ? 'Vacío usa el reglamento de la categoría' : 'Formato, puntos, W.O., horarios, pelotas…'}
          className="w-full bg-surface border border-border-mid text-white px-2.5 py-2 font-sans text-[13px] leading-relaxed rounded-sm outline-none resize-y"
        />
        <span className="flex justify-between gap-3 text-[12px] font-sans text-secondary mt-1">
          <span>
            {inherited?.rules && !value.rules
              ? 'Se usa el reglamento de la categoría.'
              : 'Si hay reglamento, el jugador lo tiene que aceptar para inscribirse.'}
          </span>
          <span className="shrink-0 tabular-nums">{(value.rules ?? '').length}/{MAX_RULES}</span>
        </span>
      </div>
    </div>
  );
}
