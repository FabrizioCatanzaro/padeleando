import { Lock } from 'lucide-react';

const ROUND_LABEL = {
  octavos: 'Octavos', cuartos: 'Cuartos', semis: 'Semifinal', final: 'Final',
};

// Un empate no es ni victoria ni derrota: va con la marca, que en el sistema
// significa "atención", no "bien" ni "mal".
const TONE = {
  win:  'text-green  border-green/35  bg-green/12',
  draw: 'text-brand  border-brand/35  bg-brand/10',
  loss: 'text-danger border-danger/30 bg-danger/10',
};
const SCORE = { win: 'text-green', draw: 'text-brand', loss: 'text-danger' };

const firstName = (n) => n?.split(' ')[0] ?? '?';

export default function MatchRow({ m, onOpen }) {
  const result = m.result === 'win' ? 'win' : m.result === 'draw' ? 'draw' : 'loss';
  // De una categoría privada llega el resultado, no la jornada.
  const priv = m.private_group;

  return (
    <div
      role={priv ? undefined : 'button'}
      tabIndex={priv ? undefined : 0}
      onClick={priv ? undefined : onOpen}
      onKeyDown={priv ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.(); } }}
      className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 bg-surface transition-colors outline-none ${
        priv ? '' : 'cursor-pointer hover:bg-surface-alt focus-visible:bg-surface-alt'
      }`}
    >
      <span className={`shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center font-condensed font-bold text-[12px] ${TONE[result]}`}>
        {result === 'win' ? 'V' : result === 'draw' ? 'E' : 'D'}
      </span>

      <div className="min-w-0 flex-1">
        <div className="font-condensed font-bold text-[14px] text-white truncate">
          <span className="font-sans font-normal text-muted">con </span>{firstName(m.partner_name)}
        </div>
        <div className="font-mono text-[11px] text-muted mt-1 truncate">
          <span className="opacity-70">vs </span>{firstName(m.opp1_name)} &amp; {firstName(m.opp2_name)}
          <span className="opacity-40"> · </span>
          {priv
            ? <span className="inline-flex items-center gap-1"><Lock size={9} className="shrink-0" />Categoría privada</span>
            : m.tournament_name}
          {m.bracket_round && <span className="text-brand"> · {ROUND_LABEL[m.bracket_round] ?? m.bracket_round}</span>}
        </div>
      </div>

      <span className="shrink-0 font-mono text-[11px] text-dim hidden sm:block">
        {m.played_at ? `${m.played_at.slice(8, 10)}/${m.played_at.slice(5, 7)}` : ''}
      </span>
      <span className={`shrink-0 font-condensed font-bold text-[16px] leading-none tabular-nums ${SCORE[result]}`}>
        {m.my_score}<span className="text-muted font-normal"> - </span>{m.opp_score}
      </span>
    </div>
  );
}
