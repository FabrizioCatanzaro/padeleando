import { Link } from 'react-router-dom';
import { ChevronRight, Radio } from 'lucide-react';
import { eventDate } from '../../utils/clubPage';

// Misma fila que un partido en el perfil o una categoría en la portada: azulejo
// a la izquierda, dos líneas de texto, marca de estado y chevron.
const PILL = {
  ongoing:  'text-green  border-green/40',
  upcoming: 'text-cyan   border-cyan/40',
  past:     'text-muted  border-border-strong',
};
const LABEL = { ongoing: 'EN CURSO', upcoming: 'PRÓXIMO', past: 'FINAL' };

export default function ClubEventRow({ ev, estado }) {
  const d = eventDate(ev);
  const dia = d ? String(d.getDate()).padStart(2, '0') : '--';
  const mes = d ? d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '').toUpperCase() : '';
  const live = estado === 'ongoing' && ev.has_live;

  return (
    <Link
      to={`/cat/${ev.group_id}/torneo/${ev.id}`}
      className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 bg-surface hover:bg-surface-alt transition-colors outline-none focus-visible:bg-surface-alt"
    >
      <span className="shrink-0 w-[34px] h-[34px] rounded-lg bg-surface-alt border border-border-mid flex flex-col items-center justify-center leading-none">
        <span className="font-condensed font-bold text-[13px] text-white">{dia}</span>
        <span className="font-condensed font-bold text-[8px] tracking-wide text-muted mt-0.5">{mes}</span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="block font-condensed font-bold text-[14.5px] text-white leading-tight truncate">{ev.name}</span>
        <span className="block text-[11.5px] text-muted mt-[3px] truncate">
          {ev.format === 'americano' ? 'AMERICANO' : 'LIGA'}
          {ev.group_name && <><span className="opacity-40"> · </span>{ev.group_name}</>}
          {ev.owner_username && <><span className="opacity-40"> · </span>@{ev.owner_username}</>}
          {ev.players_count > 0 && (
            <><span className="opacity-40"> · </span>{ev.players_count} {ev.players_count === 1 ? 'jugador' : 'jugadores'}</>
          )}
        </span>
      </span>

      <span className={`shrink-0 inline-flex items-center gap-1 font-condensed font-bold text-[9px] tracking-[0.12em] px-2 py-[3px] rounded-[5px] border ${PILL[estado]}`}>
        {live && <Radio size={9} />}
        {live ? 'EN VIVO' : LABEL[estado]}
      </span>
      <ChevronRight size={14} className="shrink-0 text-dim" />
    </Link>
  );
}
