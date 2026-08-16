import { Clock, Pencil, Trash2 } from "lucide-react";
import { fmt, getPairLabel, courtLabel } from "../../utils/helpers";
import Badge from "../shared/Badge";
import MatchScoreboard from "../shared/MatchScoreboard";
export default function MatchCard({ match, tournament, isOwner, onEdit, onDelete, matchNum }) {
  const { team1, team2, score1, score2, date, createdAt, sets = [], sets_format } = match;
  const { players, pairs, mode } = tournament;

  // Para 1 set mostramos el score del set, no los sets ganados (que sería 1-0)
  const displayS1 = sets_format === 1 ? (sets[0]?.s1 ?? score1) : score1;
  const displayS2 = sets_format === 1 ? (sets[0]?.s2 ?? score2) : score2;
  const win1 = parseInt(score1) > parseInt(score2);

  function getLabel(team) {
    if (mode === "pairs") {
      const pair = pairs?.find(
        (p) => (p.p1 === team[0] && p.p2 === team[1]) || (p.p1 === team[1] && p.p2 === team[0])
      );
      if (pair) return getPairLabel(pair.id, pairs, players);
    }
    return team.map((id) => players.find((p) => p.id === id)?.name ?? "?").join(" & ");
  }

  return (
    <div className="bg-surface border border-border-mid rounded-lg px-4 py-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-xs text-muted font-mono">
          {matchNum != null && <span className="mr-1.5">#{matchNum} ·</span>}{fmt(date || createdAt)}
        </div>
        {courtLabel(tournament, match.court) != null && (
          <Badge variant="label" color="brand">CANCHA {courtLabel(tournament, match.court)}</Badge>
        )}
      </div>
      <MatchScoreboard
        label1={getLabel(team1)}
        label2={getLabel(team2)}
        score1={displayS1}
        score2={displayS2}
        sets={sets}
        setsFormat={sets_format}
        win1={win1}
      />
        <div className="flex flex-row gap-3 items-center justify-center text-xs text-muted font-mono mt-1 text-center">
          <Clock size={12} /> 
          {match.duration_seconds != null ? (
            <span>{String(Math.floor(match.duration_seconds / 60)).padStart(2,"0")}:{String(match.duration_seconds % 60).padStart(2,"0")} min</span>
          ) : (
            <span>--:-- min</span>
          )}
        </div>
      {isOwner && (
        <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-border-mid">
          <div onClick={onEdit}   className="flex flex-row gap-2 items-center bg-transparent border-0 text-muted cursor-pointer text-[12px] font-sans px-1.5 py-0.5">
            <Pencil size={15} />
            <span>Editar</span>
          </div>
          <div onClick={onDelete} className="flex flex-row gap-2 items-center bg-transparent border-0 text-danger cursor-pointer text-[12px] font-sans px-1.5 py-0.5">
            <Trash2 size={15} />
            <span>Eliminar</span>
          </div>
        </div>
      )}
    </div>
  );
}
