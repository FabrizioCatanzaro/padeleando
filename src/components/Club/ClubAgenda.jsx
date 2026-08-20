import { useMemo, useState } from 'react';
import SectionRule from '../shared/SectionRule';
import ClubActivity from './ClubActivity';
import ClubEventRow from './ClubEventRow';
import { monthBuckets, eventMonthKey } from '../../utils/clubPage';

const BUCKETS = [
  { key: 'ongoing',  titulo: 'EN CURSO',       chip: 'En curso' },
  { key: 'upcoming', titulo: 'MÁS ADELANTE',   chip: 'Próximos' },
  { key: 'past',     titulo: 'YA SE JUGARON',  chip: 'Pasados' },
];

// Una sola línea de tiempo con separadores, en vez de tres solapas que obligan
// a adivinar dónde está lo que buscás. Los chips son un filtro, no un cambio de
// pantalla: con "Todos" se ve el club entero en orden.
export default function ClubAgenda({ events, todos }) {
  const [filtro, setFiltro] = useState('all');
  const [mes,    setMes]    = useState(null);

  const months = useMemo(() => monthBuckets(todos), [todos]);

  const grupos = BUCKETS
    .filter((b) => filtro === 'all' || filtro === b.key)
    .map((b) => ({ ...b, items: (events[b.key] ?? []).filter((ev) => !mes || eventMonthKey(ev) === mes) }))
    .filter((b) => b.items.length > 0);

  const chips = [
    { key: 'all', label: 'Todos', n: todos.length },
    ...BUCKETS.map((b) => ({ key: b.key, label: b.chip, n: (events[b.key] ?? []).length })),
  ].filter((c) => c.key === 'all' || c.n > 0);

  const mesElegido = months.find((m) => m.key === mes);

  return (
    <>
      {todos.length > 0 && <ClubActivity months={months} value={mes} onChange={setMes} />}

      {mesElegido && (
        <div className="text-[11.5px] text-dim mt-2.5">
          Mostrando <span className="text-white font-semibold">{mesElegido.full}</span>
          <span className="opacity-40"> · </span>
          <button
            type="button"
            onClick={() => setMes(null)}
            className="bg-transparent border-0 p-0 text-brand underline cursor-pointer text-[11.5px] font-sans"
          >
            ver todos los meses
          </button>
        </div>
      )}

      <SectionRule>EVENTOS</SectionRule>

      {todos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setFiltro(c.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-sans cursor-pointer transition-colors border ${
                filtro === c.key
                  ? 'bg-white border-white text-base font-semibold'
                  : 'bg-transparent border-border-strong text-muted hover:text-soft hover:border-soft'
              }`}
            >
              {c.label} <span className="opacity-55 font-semibold">{c.n}</span>
            </button>
          ))}
        </div>
      )}

      {grupos.length > 0 ? (
        grupos.map((g) => (
          <div key={g.key}>
            <div className="flex items-center gap-2.5 mt-4 first:mt-0 mb-2.5">
              <span className="shrink-0 font-condensed font-bold text-[10.5px] tracking-[0.14em] text-muted">{g.titulo}</span>
              <span className="flex-1 h-px bg-border" />
            </div>
            <div className="border border-border-mid rounded-xl overflow-hidden">
              {g.items.map((ev) => <ClubEventRow key={ev.id} ev={ev} estado={g.key} />)}
            </div>
          </div>
        ))
      ) : (
        <div className="border border-dashed border-border-strong rounded-xl p-7 text-center">
          <div className="font-condensed font-bold text-[14.5px] text-white">
            {todos.length ? 'Nada por acá' : 'Todavía no se jugó nada en este club'}
          </div>
          <p className="text-[12.5px] text-muted mt-1.5 mb-0 leading-relaxed max-w-[44ch] mx-auto">
            {todos.length
              ? 'Probá con otro filtro o con otro mes.'
              : 'Cuando una categoría juegue una jornada acá, aparece sola en esta lista.'}
          </p>
        </div>
      )}
    </>
  );
}
