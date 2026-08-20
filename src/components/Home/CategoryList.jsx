import { Link } from 'react-router-dom';
import { Plus, Star } from 'lucide-react';
import Btn from '../shared/Btn';
import CategoryRow from '../shared/CategoryRow';
import { ROLES, ROLE_META } from '../../utils/homePanel';

// Las cuatro secciones de antes son ahora una sola lista con chips: con diez
// categorías, cuatro grillas idénticas separadas sólo por un pill no dejaban
// ver dónde tocar.
export default function CategoryList({
  merged, counts, liveGroupIds, nextMap, filter, onFilter, onOpen, onNew,
}) {
  if (merged.length === 0) {
    return (
      <div className="border border-dashed border-border-strong rounded-lg p-8 text-center">
        <p className="text-muted text-sm font-sans mb-1">Todavía no tenés categorías.</p>
        <p className="text-dim text-[12px] font-mono mb-4">
          Una categoría agrupa a la gente que juega junta; los torneos van adentro.
        </p>
        <Btn variant="primary" icon={Plus} onClick={onNew}>CREAR PRIMERA CATEGORÍA</Btn>
        <div className="mt-3">
          <Link to="/tutorial#crear-categoria" className="text-[12px] font-mono text-muted hover:text-brand transition-colors">
            Ver cómo funciona
          </Link>
        </div>
      </div>
    );
  }

  const visible = filter === 'all' ? merged : merged.filter((g) => g.role === filter);
  const chips = [
    { key: 'all', label: 'Todas', n: merged.length, Icon: null },
    ...ROLES.filter((r) => counts[r] > 0).map((r) => ({
      key: r, label: ROLE_META[r].chip, n: counts[r], Icon: r === 'fav' ? Star : null,
    })),
  ];

  return (
    <>
      {chips.length > 2 && (
        <div className="flex flex-wrap gap-2 mb-3.5">
          {chips.map(({ key, label, n, Icon }) => (
            <button
              key={key}
              onClick={() => onFilter(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-sans cursor-pointer transition-colors border ${
                filter === key
                  ? 'bg-white border-white text-base font-semibold'
                  : 'bg-transparent border-border-strong text-muted hover:text-soft hover:border-soft'
              }`}
            >
              {Icon && <Icon size={12} />}
              {label} <span className="opacity-55 font-semibold">{n}</span>
            </button>
          ))}
        </div>
      )}

      <div className="border border-border-mid rounded-xl overflow-hidden">
        {visible.map((g, i) => (
          <CategoryRow
            key={g.id}
            g={g}
            eager={i < 6}
            live={liveGroupIds.has(g.id)}
            next={nextMap.get(g.id) ?? null}
            onClick={() => onOpen(g.id)}
          />
        ))}
      </div>
    </>
  );
}
