import { useMemo, useState } from 'react';
import CategoryRow from '../shared/CategoryRow';
import { ROLES, roleWords, countByRole } from '../../utils/homePanel';

// Las mismas filas de la portada. Antes el perfil dibujaba tarjetas propias y
// sólo listaba lo que la persona organiza: en un perfil de jugador eso dejaba
// la parte más importante afuera. Las favoritas no entran: son una preferencia
// privada y hoy no se publican en ningún lado.
const PROFILE_ROLES = ROLES.filter((r) => r !== 'fav');

export default function ProfileCategories({ merged = [], isOwnProfile = false, onOpen }) {
  const [filter, setFilter] = useState('all');
  const counts = useMemo(() => countByRole(merged), [merged]);

  if (merged.length === 0) {
    return (
      <div className="border border-dashed border-border-strong rounded-xl p-8 text-center">
        <p className="text-muted text-sm font-sans m-0">
          {isOwnProfile
            ? 'Todavía no creaste ninguna categoría ni jugaste en una.'
            : 'Este usuario no tiene categorías públicas.'}
        </p>
      </div>
    );
  }

  // Un chip por rol presente. Con un solo rol no hay nada que filtrar.
  // En un perfil ajeno los roles se cuentan de otra persona: JUEGA, no JUEGO.
  const third = !isOwnProfile;
  const chips = [
    { key: 'all', label: 'Todas', n: merged.length },
    ...PROFILE_ROLES.filter((r) => counts[r] > 0).map((r) => ({
      key: r, label: roleWords(r, third).chip, n: counts[r],
    })),
  ];
  const visible = filter === 'all' ? merged : merged.filter((g) => g.role === filter);

  return (
    <>
      {chips.length > 2 && (
        <div className="flex flex-wrap gap-2 mb-3.5">
          {chips.map(({ key, label, n }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-sans cursor-pointer transition-colors border ${
                filter === key
                  ? 'bg-white border-white text-base font-semibold'
                  : 'bg-transparent border-border-strong text-muted hover:text-soft hover:border-soft'
              }`}
            >
              {label} <span className="opacity-55 font-semibold">{n}</span>
            </button>
          ))}
        </div>
      )}

      <div className="border border-border-mid rounded-xl overflow-hidden mb-4 sm:mb-6">
        {visible.map((g, i) => (
          <CategoryRow key={g.id} g={g} eager={i < 6} third={third} onClick={() => onOpen(g.id)} />
        ))}
      </div>
    </>
  );
}
