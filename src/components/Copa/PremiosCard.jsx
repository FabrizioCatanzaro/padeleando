import { Trophy, ChevronDown } from "lucide-react";
import { getPairLabel } from "../../utils/helpers";
import { premioTitulo } from "../../utils/copa";

// Premios de la copa, para todos: plegados, con el del campeón a la vista.
export default function PremiosCard({ tournament }) {
  const premios = tournament.prizes ?? [];
  if (premios.length === 0) return null;
  const campeon = premios.find((p) => p.kind === 'puesto' && p.cup === 'oro' && p.place === 1);
  const ganador = (p) => {
    if (p.winner_pair_id) return getPairLabel(p.winner_pair_id, tournament.pairs ?? [], tournament.players ?? []);
    if (p.winner_player_id) return (tournament.players ?? []).find((x) => x.id === p.winner_player_id)?.name ?? null;
    return null;
  };
  return (
    <details className="group mx-5 sm:mx-6 mt-3 bg-surface border border-border-mid rounded-xl">
      <summary className="flex items-center gap-2.5 px-4 min-h-[48px] cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <Trophy size={15} className="shrink-0 text-brand" aria-hidden="true" />
        <span className="text-[14px] font-semibold text-white whitespace-nowrap">Premios</span>
        <span className="flex-1 min-w-0 text-[13px] text-secondary truncate">{campeon ? `Campeón: ${campeon.description}` : ''}</span>
        <ChevronDown size={16} className="shrink-0 text-soft transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <ul className="m-0 px-4 pb-3 pt-1 list-none flex flex-col gap-2 border-t border-border">
        {premios.map((p) => (
          <li key={p.id} className="flex flex-col pt-2">
            <span className="text-[13px] font-semibold text-white">{premioTitulo(p)}</span>
            <span className="text-[13px] text-content">{p.description}</span>
            {ganador(p) && <span className="text-[12px] text-brand font-semibold">Ganó {ganador(p)}</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}
