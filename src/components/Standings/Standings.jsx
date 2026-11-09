import { useState, useMemo } from "react";
import { Trophy } from "lucide-react";
import { calcStandings, pairRowStats, compareStandingRows, topStandingRows } from "../../utils/helpers";
import PlayerAvatar, { PairAvatar } from "../shared/PlayerAvatar";
import ShareStoryButton from "../Snapshot/ShareStoryButton";
import SnapshotModal from "../Snapshot/SnapshotModal";
import StandingsStory from "../Snapshot/StandingsStory";

function calcForm(playerIds, matches) {
  const ids = playerIds.map(String).filter(id => id && id !== 'null');
  if (!ids.length) return [];
  const played = matches
    .filter(m => m.score1 !== "" && m.score2 !== "")
    .filter(m => {
      const t1 = (m.team1 ?? []).map(String).filter(id => id && id !== 'null');
      const t2 = (m.team2 ?? []).map(String).filter(id => id && id !== 'null');
      if (ids.length > 1) {
        return ids.every(id => t1.includes(id)) || ids.every(id => t2.includes(id));
      }
      return [...t1, ...t2].some(id => ids.includes(id));
    });
  // API devuelve ORDER BY created_at DESC; slice(0,3) = los 3 más recientes, reverse = orden cron.
  const last3 = played.slice(0, 3).reverse();
  return last3.map(m => {
    const t1 = (m.team1 ?? []).map(String);
    const inTeam1 = ids.some(id => t1.includes(id));
    const win = inTeam1 ? parseInt(m.score1) > parseInt(m.score2) : parseInt(m.score2) > parseInt(m.score1);
    return win ? 'W' : 'L';
  });
}

function FormDots({ form }) {
  return (
    <div className="flex gap-1 justify-center">
      {Array.from({ length: 3 }).map((_, i) => {
        const r = form[i];
        return (
          <div
            key={i}
            title={r === 'W' ? 'Victoria' : r === 'L' ? 'Derrota' : '–'}
            className={`w-2 h-2 rounded-full transition-colors ${
              r === 'W' ? 'bg-green' : r === 'L' ? 'bg-danger' : 'bg-border-strong'
            }`}
          />
        );
      })}
    </div>
  );
}

const POS_COLOR = ['text-amber-400', 'text-[#b0b8c8]', 'text-[#cd7f32]'];

export default function Standings({ tournament }) {
  const [showStory, setShowStory] = useState(false);
  // calcStandings recorre todos los partidos por cada jugador y ordena: sin
  // memoizar se rehacía en cada render, incluido el de abrir el modal de
  // historia.
  const individualRows = useMemo(
    () => calcStandings(tournament.players, tournament.matches),
    [tournament.players, tournament.matches]
  );
  const isPairs        = tournament.mode === "pairs";
  const isAmericano    = tournament.format === "americano";
  const hasPairs       = isPairs && tournament.pairs?.length > 0;

  const playerById = useMemo(
    () => Object.fromEntries(tournament.players.map((p) => [String(p.id), p])),
    [tournament.players]
  );

  let displayRows;
  if (hasPairs) {
    displayRows = tournament.pairs.map((pair) => {
      const stats = pairRowStats(tournament, pair, individualRows);
      const p1 = playerById[String(pair.p1)];
      const p2 = playerById[String(pair.p2)];
      return {
        ...stats, id: pair.id,
        name: `${p1?.name ?? "?"} & ${p2?.name ?? "?"}`,
        p1Name: p1?.name ?? "?", p2Name: p2?.name ?? "?",
        src1: p1?.linked_avatar_url ?? null,
        src2: p2?.linked_avatar_url ?? null,
        playerIds: [pair.p1, pair.p2],
        withdrawn: pair.status === 'withdrawn',
      };
    // Las retiradas van al fondo, como en el seed del cuadro (computeStandings).
    }).sort((a, b) => Number(a.withdrawn) - Number(b.withdrawn) || compareStandingRows(a, b));
  } else {
    displayRows = individualRows.map((r) => {
      const p = playerById[String(r.id)];
      return { ...r, src: p?.linked_avatar_url ?? null, is_premium: p?.is_premium ?? false, playerIds: [r.id] };
    }).sort(compareStandingRows);
  }

  // Primer puesto con el desempate completo: victorias, diferencia, % de
  // victorias, games a favor. Empatados en los cuatro, comparten el puesto.
  const leaders = topStandingRows(displayRows.filter((r) => !r.withdrawn));
  const hasTie  = leaders.length > 1;
  const isTop   = (r) => !hasTie && leaders[0]?.id === r.id;

  const champions = tournament.status === 'finished' && tournament.format !== 'americano'
    ? leaders
    : [];
  const championsCount = hasPairs ? champions.length * 2 : champions.length;
  const championsLabel = championsCount > 1 ? "CAMPEONES" : "CAMPEÓN";

  return (
    <div>
      {champions.length > 0 && (
        <div className="relative mb-6 overflow-hidden rounded-lg border border-amber-400/40 bg-linear-to-b from-amber-400/15 via-amber-400/5 to-transparent p-6 text-center">
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-amber-400/60 to-transparent" />
          <Trophy size={36} className="mx-auto mb-2 text-amber-400" />
          <div className="font-mono text-[10px] tracking-[4px] text-amber-400/70 mb-1.5">{championsLabel}</div>
          <div className="flex flex-col items-center gap-3">
            {champions.map((c) => (
              <div key={c.id} className="flex flex-col items-center gap-2">
                {c.p1Name
                  ? <PairAvatar name1={c.p1Name} name2={c.p2Name} src1={c.src1} src2={c.src2} size={56} />
                  : <PlayerAvatar name={c.name} src={c.src} size={56} premium={!!(playerById[String(c.id)]?.is_premium)} />
                }
                <div className="font-condensed font-black text-[24px] text-white leading-tight">{c.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="font-condensed font-bold text-[16px] tracking-[3px] text-muted">TABLA DE POSICIONES</div>
        {displayRows.length > 0 && <ShareStoryButton onClick={() => setShowStory(true)} />}
      </div>

      <div className="rounded-lg border border-border">
        <table className="w-full table-fixed border-collapse font-condensed">
          <thead>
            <tr className="bg-surface">
              <th className="px-2 py-2.5 text-center text-[10px] tracking-[2px] text-dim border-b border-border font-mono w-8">#</th>
              <th className="px-2 py-2.5 text-left text-[10px] tracking-[2px] text-dim border-b border-border font-mono">
                {hasPairs ? "PAREJA" : "JUGADOR"}
              </th>
              <th className="px-2 py-2.5 text-center text-[10px] tracking-[2px] text-dim border-b border-border font-mono w-11">PTS</th>
              <th className="px-2 py-2.5 text-center text-[10px] tracking-[2px] text-dim border-b border-border font-mono w-10">PJ</th>
              <th className="px-2 py-2.5 text-center text-[10px] tracking-[2px] text-dim border-b border-border font-mono w-10">PG</th>
              <th className="hidden sm:table-cell px-2 py-2.5 text-center text-[10px] tracking-[2px] text-dim border-b border-border font-mono w-10">GF</th>
              <th className="hidden sm:table-cell px-2 py-2.5 text-center text-[10px] tracking-[2px] text-dim border-b border-border font-mono w-10">GC</th>
              <th className="px-2 py-2.5 text-center text-[10px] tracking-[2px] text-dim border-b border-border font-mono w-12">DIF</th>
              <th className="px-2 py-2.5 text-center text-[10px] tracking-[2px] text-dim border-b border-border font-mono w-14">ÚLT.</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((r, i) => {
              const top  = isTop(r);
              const form = calcForm(r.playerIds, tournament.matches);
              const rowBg = top
                ? "bg-gradient-to-r from-brand/10 to-transparent border-l-2 border-l-brand"
                : i % 2 === 0 ? "bg-surface/50" : "bg-base";
              return (
                <tr key={r.id} className={`${rowBg} transition-colors`}>
                  <td className="px-2 py-3 text-center">
                    {top && !isAmericano ? (
                      <Trophy size={14} className="text-amber-400 mx-auto" />
                    ) : (
                      <span className={`font-mono text-[13px] font-bold ${POS_COLOR[i] ?? 'text-dim'}`}>
                        {i + 1}
                      </span>
                    )}
                  </td>
                  <td className={`px-2 py-3 text-left text-[12px] sm:text-[18px] font-semibold ${top ? "text-brand" : "text-white"}`}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="shrink-0">
                        {r.p1Name
                          ? <PairAvatar name1={r.p1Name} name2={r.p2Name} src1={r.src1} src2={r.src2} size={22} />
                          : <PlayerAvatar name={r.name} src={r.src} size={22} premium={!!(playerById[String(r.id)]?.is_premium)} />
                        }
                      </div>
                      {r.p1Name ? (
                        <div className="min-w-0 flex flex-col leading-tight">
                          <span className="truncate">{r.p1Name}</span>
                          <span className="truncate">&amp; {r.p2Name}</span>
                          {r.withdrawn && (
                            <span className="font-mono text-[9px] tracking-[1px] text-muted">RETIRADA</span>
                          )}
                        </div>
                      ) : (
                        <span className="line-clamp-2 leading-tight min-w-0">{r.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center text-[15px] font-bold text-brand">{r.pg * 3}</td>
                  <td className="px-2 py-3 text-center text-[13px] text-secondary">{r.pj}</td>
                  <td className="px-2 py-3 text-center text-[13px] text-secondary">{r.pg}</td>
                  <td className="hidden sm:table-cell px-2 py-3 text-center text-[13px] text-secondary">{r.sf}</td>
                  <td className="hidden sm:table-cell px-2 py-3 text-center text-[13px] text-secondary">{r.sc}</td>
                  <td className={`px-2 py-3 text-center text-[13px] font-bold ${r.sf - r.sc >= 0 ? "text-green" : "text-danger"}`}>
                    {r.sf - r.sc > 0 ? "+" : ""}{r.sf - r.sc}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <FormDots form={form} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-[10px] text-dim font-mono leading-relaxed">
        PTS: 3 por victoria · PG: victorias · PJ: partidos jugados · DIF: diferencia de games · ÚLT: últimos 3
      </div>

      {showStory && (
        <SnapshotModal
          filename={`posiciones-${tournament.name ?? 'torneo'}.png`}
          onClose={() => setShowStory(false)}
          story={<StandingsStory tournament={tournament} rows={displayRows} champions={champions} />}
        />
      )}
    </div>
  );
}
