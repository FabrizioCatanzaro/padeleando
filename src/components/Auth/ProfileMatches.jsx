import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import MatchRow from './MatchRow';
import SortMenu from '../shared/SortMenu';
import StatTile, { StatTiles } from '../shared/StatTile';

const PAGE = 15;

const FILTERS = [
  { id: 'all',  label: 'Todos' },
  { id: 'win',  label: 'Ganados' },
  { id: 'loss', label: 'Perdidos' },
];

const SORTS = [
  { id: 'date-desc', short: 'Fecha ↓', label: 'Fecha · más nuevo primero' },
  { id: 'date-asc',  short: 'Fecha ↑', label: 'Fecha · más viejo primero' },
];

const day = (m) => String(m.played_at ?? '').slice(0, 10);

// Historial completo. Los contadores de los chips salen de la lista entera, no
// de la filtrada: si dijeran lo mismo que el filtro activo no servirían para
// elegir. Los azulejos, en cambio, describen el filtro puesto.
export default function ProfileMatches({ matches = [], stats }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [group,  setGroup]  = useState('all');
  const [sort,   setSort]   = useState('date-desc');
  const [shown,  setShown]  = useState(PAGE);

  const counts = useMemo(() => ({
    all:  matches.length,
    win:  matches.filter((m) => m.result === 'win').length,
    loss: matches.filter((m) => m.result === 'loss').length,
  }), [matches]);

  // Una categoría privada llega sin nombre ni id: no puede ser una opción del
  // menú, pero sus partidos siguen contando en "todas".
  const groupOptions = useMemo(() => {
    const seen = new Map();
    for (const m of matches) {
      if (m.group_id && m.group_name && !seen.has(String(m.group_id))) {
        seen.set(String(m.group_id), { id: String(m.group_id), short: m.group_name, label: m.group_name });
      }
    }
    return [{ id: 'all', short: 'Categoría', label: 'Todas las categorías' }, ...seen.values()];
  }, [matches]);

  const list = useMemo(() => {
    const out = matches.filter((m) =>
      (filter === 'all' || m.result === filter) &&
      (group  === 'all' || String(m.group_id) === group));
    return out.sort((a, b) => (sort === 'date-asc' ? 1 : -1) * (day(a) > day(b) ? 1 : day(a) < day(b) ? -1 : 0));
  }, [matches, filter, group, sort]);

  const reset = (fn) => (v) => { fn(v); setShown(PAGE); };

  if (matches.length === 0) {
    return (
      <div className="border border-dashed border-border-strong rounded-xl p-8 text-center">
        <p className="text-muted text-sm font-sans m-0">Todavía no hay partidos cargados.</p>
      </div>
    );
  }

  const pct = stats?.partidos > 0 ? Math.round((stats.victorias / stats.partidos) * 100) : 0;
  // games_favor y games_contra son campos premium: el servidor no los manda si
  // las avanzadas no corresponden. Sin ellos el tercer azulejo dice otra cosa
  // antes que un número inventado.
  const gf = stats?.games_favor, gc = stats?.games_contra;
  const hasGames = Number.isFinite(gf) && Number.isFinite(gc);
  const diff = hasGames ? gf - gc : 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => reset(setFilter)(f.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-sans cursor-pointer transition-colors border ${
              filter === f.id
                ? 'bg-white border-white text-base font-semibold'
                : 'bg-transparent border-border-strong text-muted hover:text-soft hover:border-soft'
            }`}
          >
            {f.label} <span className="opacity-55 font-semibold">{counts[f.id]}</span>
          </button>
        ))}
        <span className="flex-1 min-w-0" />
        {groupOptions.length > 1 && (
          <SortMenu
            value={group}
            onChange={reset(setGroup)}
            options={groupOptions}
            icon={LayoutGrid}
            heading="CATEGORÍA"
            title="Filtrar por categoría"
            variant="chip"
          />
        )}
        <SortMenu
          value={sort}
          onChange={reset(setSort)}
          options={SORTS}
          heading="ORDENAR POR"
          title="Ordenar partidos"
          variant="chip"
        />
      </div>

      <StatTiles className="mb-3.5">
        <StatTile value={list.length} label="Partidos" sub="en este filtro" />
        <StatTile value={`${pct}%`} label="Victorias" sub="sobre el total" tone={stats?.partidos > 0 ? 'brand' : 'off'} />
        {hasGames ? (
          <StatTile
            value={diff >= 0 ? `+${diff}` : String(diff)}
            label="Diferencia de games"
            sub={`${gf} a favor · ${gc} en contra`}
            tone={diff >= 0 ? 'green' : 'danger'}
          />
        ) : (
          <StatTile
            value={`${counts.win}-${counts.loss}`}
            label="Ganados / perdidos"
            sub="en este historial"
          />
        )}
      </StatTiles>

      {list.length === 0 ? (
        <div className="border border-dashed border-border-strong rounded-xl p-8 text-center">
          <p className="text-muted text-sm font-sans m-0">Ningún partido coincide con este filtro.</p>
        </div>
      ) : (
        <div className="border border-border-mid rounded-xl overflow-hidden">
          {list.slice(0, shown).map((m) => (
            <MatchRow
              key={m.id}
              m={m}
              onOpen={() => navigate(`/cat/${m.group_id}/torneo/${m.tournament_id}`)}
            />
          ))}
        </div>
      )}

      {list.length > shown && (
        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={() => setShown((s) => s + PAGE)}
            className="bg-transparent border border-border-mid text-muted px-3.5 py-2 rounded-lg text-xs font-mono cursor-pointer hover:border-border-strong hover:text-soft transition-colors"
          >
            VER MÁS ({list.length - shown} restantes)
          </button>
        </div>
      )}
    </>
  );
}
