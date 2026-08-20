import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Radio } from 'lucide-react';
import Btn from '../shared/Btn';
import TournamentFilters from './TournamentFilters';
import SortMenu from './SortMenu';
import TournamentCard from './TournamentCard';
import { isLive } from '../../utils/helpers';

// Listado de torneos de la categoría: la pestaña por defecto. Salió de GroupView
// cuando la pantalla pasó a tener pestañas, para que ese archivo no siguiera
// creciendo con el cuerpo de todas.
export default function GroupTournaments({
  group, groupId, canManage, filters, changeFilters, filtersOpen, setFiltersOpen,
  activeFilters, filtered, visibleCount, setVisibleCount, sort, setSort, onNewTournament,
}) {
  const navigate = useNavigate();
  const total = group.tournaments?.length ?? 0;

  // La jornada en vivo sube a su propia banda y sale de la lista, pero sólo con
  // la lista limpia: si el usuario está filtrando, esconderle un resultado que
  // coincide es peor que repetirlo.
  const live = activeFilters === 0 ? filtered.find(isLive) : null;
  const rest = live ? filtered.filter((t) => t.id !== live.id) : filtered;

  if (total === 0) {
    return canManage ? (
      <div className="border border-dashed border-border-strong rounded-xl p-8 text-center">
        <p className="text-muted text-sm font-sans mb-1">Todavía no hay torneos en esta categoría.</p>
        <p className="text-dim text-[12px] font-mono mb-4">Cada fecha que juegan es un torneo. Ahí elegís Liga o Americano.</p>
        <Btn variant="primary" icon={Plus} onClick={onNewTournament}>CREAR EL PRIMERO</Btn>
      </div>
    ) : (
      <div className="text-center text-dim py-10 px-5 font-sans leading-loose">
        No hay torneos todavía.<br />¡Creá el primero!
      </div>
    );
  }

  return (
    <>
      {live && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate(`/cat/${groupId}/torneo/${live.id}`)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/cat/${groupId}/torneo/${live.id}`); } }}
          className="border border-danger/35 rounded-xl px-4 py-4 mb-4 bg-surface cursor-pointer hover:border-danger/60 transition-colors flex items-center gap-4 flex-wrap outline-none"
        >
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-2 font-condensed font-bold text-[10px] tracking-widest text-danger">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-danger" />
              </span>
              SE ESTÁ JUGANDO AHORA
            </span>
            <div className="font-condensed font-bold text-[19px] text-white mt-2 leading-tight">{live.name}</div>
            <div className="font-mono text-[11.5px] text-secondary mt-1 truncate">
              {live.player_count > 0 && `${live.player_count} jugadores`}
              {live.club_name && ` · ${live.club_name}`}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Radio size={16} className="text-danger" />
            <ChevronRight size={16} className="text-dim" />
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 mb-3 flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <TournamentFilters
            filters={filters}
            onChange={changeFilters}
            open={filtersOpen}
            onToggle={() => setFiltersOpen((o) => !o)}
            total={total}
            shown={filtered.length}
          />
        </div>
        <SortMenu value={sort} onChange={setSort} />
        {canManage && (
          <Btn variant="primary" size="md" icon={Plus} onClick={onNewTournament} className="shrink-0">
            NUEVO TORNEO
          </Btn>
        )}
      </div>

      {activeFilters > 0 && filtered.length === 0 && (
        <div className="text-center text-dim py-10 px-5 font-sans leading-loose">
          Ningún torneo coincide con los filtros.
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {rest.slice(0, visibleCount).map((t, i) => (
          <TournamentCard
            key={t.id}
            t={t}
            group={group}
            delay={Math.min(i, 5) * 50}
            onClick={() => navigate(`/cat/${groupId}/torneo/${t.id}`)}
          />
        ))}
      </div>

      {visibleCount < rest.length && (
        <div className="flex justify-center mt-4">
          <Btn size="sm" onClick={() => setVisibleCount((c) => c + 10)}>
            CARGAR MÁS ({rest.length - visibleCount} restantes)
          </Btn>
        </div>
      )}
    </>
  );
}
