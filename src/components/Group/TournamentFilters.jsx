import { Search, X, SlidersHorizontal, Calendar } from 'lucide-react';
import { TOURNAMENT_STATUS_META } from '../../utils/helpers';
import { EMPTY_FILTERS, STATUS_ORDER, countActiveFilters } from '../../utils/tournamentFilters';
import Btn from '../shared/Btn';

const CHIP_COLORS = {
  brand:   'border-brand text-brand bg-brand/10',
  cyan:    'border-cyan text-cyan bg-cyan/10',
  green:   'border-green text-green bg-green/10',
  default: 'border-border-strong text-white bg-border-mid/40',
};

export default function TournamentFilters({ filters, onChange, open, onToggle, total, shown }) {
  const active = countActiveFilters(filters);
  // Los del panel: la búsqueda ya se ve en su propio campo.
  const panelActive = active - (filters.q.trim() ? 1 : 0);
  const set = (patch) => onChange({ ...filters, ...patch });

  const toggleIn = (key, val) => set({
    [key]: filters[key].includes(val)
      ? filters[key].filter((x) => x !== val)
      : [...filters[key], val],
  });

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim pointer-events-none" />
          <input
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Buscar por nombre o club"
            className="w-full bg-surface border border-border-mid text-white pl-8 pr-8 py-2 rounded text-sm font-sans outline-none focus:border-brand/60 transition-colors"
          />
          {filters.q && (
            <button type="button" onClick={() => set({ q: '' })} aria-label="Borrar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none text-dim hover:text-white cursor-pointer transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
        <Btn size="sm" icon={SlidersHorizontal} onClick={onToggle} title="Filtros"
          className={open || panelActive > 0 ? 'border-brand/60 text-brand' : ''}>
          {panelActive > 0 ? String(panelActive) : ''}
        </Btn>
      </div>

      {open && (
        <div className="bg-surface border border-border-mid rounded-lg p-3.5 flex flex-col gap-3.5">
          <div>
            <label className="block text-[10px] font-mono tracking-widest text-dim mb-1.5">ESTADO</label>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_ORDER.map((s) => {
                const on = filters.statuses.includes(s);
                return (
                  <button key={s} type="button" onClick={() => toggleIn('statuses', s)}
                    className={`px-2.5 py-1 rounded-full border text-[11px] font-mono tracking-wide cursor-pointer transition-colors ${
                      on ? CHIP_COLORS[TOURNAMENT_STATUS_META[s].color] : 'border-border-strong text-muted bg-transparent hover:text-white'
                    }`}>
                    {TOURNAMENT_STATUS_META[s].label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono tracking-widest text-dim mb-1.5">TIPO</label>
            <div className="flex flex-wrap gap-1.5">
              {[{ v: 'liga', label: 'LIGA', cls: 'border-cyan text-cyan bg-cyan/10' },
                { v: 'americano', label: 'AMERICANO', cls: 'border-brand text-brand bg-brand/10' }].map((o) => {
                const on = filters.formats.includes(o.v);
                return (
                  <button key={o.v} type="button" onClick={() => toggleIn('formats', o.v)}
                    className={`px-2.5 py-1 rounded-full border text-[11px] font-mono tracking-wide cursor-pointer transition-colors ${
                      on ? o.cls : 'border-border-strong text-muted bg-transparent hover:text-white'
                    }`}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono tracking-widest text-dim mb-1.5">FECHA</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dim pointer-events-none" />
                <input type="date" value={filters.from} max={filters.to || undefined}
                  onChange={(e) => set({ from: e.target.value })}
                  className="w-full bg-base border border-border-strong text-white pl-7 pr-2 py-1.5 rounded text-xs font-mono outline-none focus:border-brand/60 transition-colors" />
              </div>
              <span className="text-dim text-xs font-mono shrink-0">a</span>
              <div className="relative flex-1 min-w-0">
                <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dim pointer-events-none" />
                <input type="date" value={filters.to} min={filters.from || undefined}
                  onChange={(e) => set({ to: e.target.value })}
                  className="w-full bg-base border border-border-strong text-white pl-7 pr-2 py-1.5 rounded text-xs font-mono outline-none focus:border-brand/60 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      )}

      {active > 0 && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono text-dim">
            {shown} de {total} {total === 1 ? 'torneo' : 'torneos'}
          </span>
          <button type="button" onClick={() => onChange(EMPTY_FILTERS)}
            className="flex items-center gap-1 bg-transparent border-none text-[11px] font-mono text-muted hover:text-white cursor-pointer transition-colors">
            <X size={12} /> LIMPIAR FILTROS
          </button>
        </div>
      )}
    </div>
  );
}
