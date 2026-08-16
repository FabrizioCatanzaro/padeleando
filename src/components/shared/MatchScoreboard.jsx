import { setWinner, visibleSetsCount } from '../../utils/helpers';

// Marcador en dos filas, una por equipo, con una columna por set — el formato de
// los tableros de tenis. Sin sets hay una sola columna con el resultado.
export default function MatchScoreboard({ label1, label2, score1, score2, sets = [], setsFormat = null, win1 }) {
  const nVisible = setsFormat === 3 ? visibleSetsCount(3, sets) : 0;
  const cols = nVisible > 0
    ? sets.slice(0, nVisible).map((s) => {
        const w = setWinner(s);
        return { v1: s.s1, v2: s.s2, w1: w === 1, w2: w === 2 };
      })
    : [{ v1: score1, v2: score2, w1: win1, w2: !win1 }];

  return (
    <div className="flex flex-col gap-1">
      <ScoreRow label={label1} values={cols.map((c) => ({ v: c.v1, win: c.w1 }))} win={win1} color="brand" />
      <ScoreRow label={label2} values={cols.map((c) => ({ v: c.v2, win: c.w2 }))} win={!win1} color="cyan" />
    </div>
  );
}

function ScoreRow({ label, values, win, color }) {
  const accent = color === 'cyan' ? 'text-cyan' : 'text-brand';
  return (
    <div className="flex items-center gap-3">
      <div className={`flex-1 min-w-0 font-condensed font-semibold text-base sm:text-xl leading-tight ${win ? accent : 'text-secondary'}`}>
        {label}
      </div>
      <div className="flex shrink-0 font-mono font-bold text-[19px] sm:text-[22px] tabular-nums">
        {values.map((cell, i) => (
          <span
            key={i}
            className={`w-8 sm:w-9 text-center ${i > 0 ? 'border-l border-border-mid' : ''} ${cell.win ? accent : 'text-dim'}`}
          >
            {cell.v}
          </span>
        ))}
      </div>
    </div>
  );
}
