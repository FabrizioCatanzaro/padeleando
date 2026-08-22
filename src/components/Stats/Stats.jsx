import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { calcStandings, adaptTournament, getTournamentWinnerLabel, getTournamentWinners, tournamentDate, normalize, fmt,
  getAllMatches, calcPartnerships, tiedLabel, fmtMMSS, fmtDuracion, TIED_NAMES_PAIRS, TIED_NAMES_PLAYERS } from "../../utils/helpers";
import { Bomb, CalendarDays, Clock, Crown, Flame, Gem, Handshake, Hourglass, Scale, Swords, Target, Timer, Trophy } from "lucide-react";
import { api } from "../../utils/api";
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, LineChart, Line, Legend,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import PremiumModal from "../shared/PremiumModal";
import StatSlab, { StatSlabs } from "../shared/StatSlab";
import ClubLogo from "../shared/ClubLogo";
import ShareStoryButton from "../Snapshot/ShareStoryButton";
import SnapshotModal from "../Snapshot/SnapshotModal";
import StatsStory from "../Snapshot/StatsStory";
import CategoryStory from "../Snapshot/CategoryStory";
import RankingStory, { RANKING_STORY_LIMIT } from "../Snapshot/RankingStory";
import { TournamentMeta, ClubBadge } from "../Snapshot/StoryFrame";
import { C } from "../Snapshot/story-theme";
import groupStatsPreview from "../../assets/group-advanced-stats-preview.svg";
import { buildClubRows } from "../../utils/clubRows";

export default function Stats({ tournament, ownerIsPremium = false }) {
  const [allTournaments, setAllTournaments] = useState([]);
  const [histTab,    setHistTab]    = useState("current");
  const [histLoaded, setHistLoaded] = useState(false);
  const [histLoading, setHistLoading] = useState(false);

  async function handleTabChange(id) {
    setHistTab(id);
    if (id === "history" && !histLoaded && tournament.group_id) {
      setHistLoading(true);
      try {
        const data = await api.groups.history(tournament.group_id);
        setAllTournaments(data.map(adaptTournament));
        setHistLoaded(true);
      } finally {
        setHistLoading(false);
      }
    }
  }

  return (
    <div>
      <div className="font-condensed font-bold text-[16px] tracking-[3px] text-muted mb-4">ESTADÍSTICAS</div>

      <div className="flex mb-5 border-b border-border">
        {[
          { id: "current", label: "Este torneo" },
          { id: "history", label: histLoaded ? `Históricas (${allTournaments.length})` : "Históricas" },
        ].map((t) => (
          <button key={t.id} onClick={() => handleTabChange(t.id)}
            className={`bg-transparent border-0 px-3.5 py-3.5 font-condensed font-bold text-[13px] tracking-wide cursor-pointer border-b-2 whitespace-nowrap transition-all ${histTab === t.id ? 'text-brand border-b-brand' : 'text-muted border-b-transparent'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {histTab === "current"
        ? <CurrentStats tournament={tournament} />
        : histLoading
          ? <div className="text-center text-dim py-10 font-mono text-sm">Cargando historial...</div>
          : <HistoricalStats tournaments={allTournaments} ownerIsPremium={ownerIsPremium} groupName={tournament.group_name} />
      }
    </div>
  );
}

function fmtHorasCorto(segundos) {
  const horas = segundos / 3600;
  return horas >= 1 ? `${Math.round(horas)} h` : `${Math.round(segundos / 60)} m`;
}


function CurrentStats({ tournament }) {
  const navigate = useNavigate();
  const [showStory, setShowStory] = useState(false);
  const { players, mode, pairs: tournamentPairs } = tournament;
  const isPairs = mode === "pairs";

  const matches   = useMemo(() => getAllMatches(tournament), [tournament]);
  const played    = useMemo(() => matches.filter((m) => m.score1 !== "" && m.score2 !== ""), [matches]);
  const standings = useMemo(() => calcStandings(players, matches), [players, matches]);
  const isAmericano = tournament.format === 'americano';

  const partnerships = calcPartnerships(players, played);

  let biggestWin = null, biggestDiff = -1;
  played.forEach((m) => {
    const d = Math.abs(+m.score1 - +m.score2);
    if (d > biggestDiff) {
      biggestDiff = d; biggestWin = m;
    } else if (d === biggestDiff && biggestWin) {
      // Desempate: el partido más corto (con duración registrada tiene prioridad)
      const mDur  = m.duration_seconds ?? 0;
      const curDur = biggestWin.duration_seconds ?? 0;
      if (mDur > 0 && (curDur === 0 || mDur < curDur)) biggestWin = m;
    }
  });

  const timedMatches   = played.filter((m) => (m.duration_seconds ?? 0) > 0);
  const totalSeconds   = timedMatches.reduce((acc, m) => acc + m.duration_seconds, 0);
  const avgSeconds     = timedMatches.length > 0 ? totalSeconds / timedMatches.length : 0;
  const tightMatches   = played.filter((m) => Math.abs(+m.score1 - +m.score2) === 1);
  const tightPct       = played.length > 0 ? Math.round((tightMatches.length / played.length) * 100) : 0;

  const longestMatch = played.reduce((max, m) => {
    if (m.duration_seconds > (max?.duration_seconds ?? 0)) {
      return m;
    }
    return max;
  }, null);

  const shortestMatch = played.reduce((min, m) => {
    if (m.duration_seconds > 60 && (!min || m.duration_seconds < min.duration_seconds)) {
      return m;
    }
    return min;
  }, null);

  const getPlayerName = (id) => players.find((p) => p.id === id)?.name ?? "?";

  // Detectar empates en el TOP 1 (MVP)
  const topPg   = standings[0]?.pg ?? 0;
  const topDiff = standings[0] ? standings[0].sf - standings[0].sc : 0;
  const leaders = standings.filter((p) => p.pg === topPg && (p.sf - p.sc) === topDiff);
  const mvpLabel = tiedLabel(leaders.map((p) => p.name));
  const mvpPct   = standings[0]?.pj > 0 ? Math.round((topPg / standings[0].pj) * 100) : null;

  // Detectar empates entre las mejores parejas
  const topWinRate   = partnerships[0]?.winRate ?? -1;
  const topWins      = partnerships[0]?.wins ?? -1;
  const topPlayed    = partnerships[0]?.played ?? 0;
  const topPairDiff  = partnerships[0]?.diff ?? 0;
  const tiedPartners = partnerships.filter(
    (p) => p.winRate === topWinRate && p.wins === topWins && p.played === topPlayed && p.diff === topPairDiff
  );
  const topPartner        = tiedPartners.length === 1 ? partnerships[0] : null;
  const tiedPartnersLabel = tiedPartners.length > 1 ? tiedLabel(tiedPartners.map((p) => p.label), TIED_NAMES_PAIRS) : null;

  // Mejor pareja en modo pairs: usar las parejas fijas del torneo + sus stats
  let topPairLabel   = topPartner?.label ?? tiedPartnersLabel ?? null;
  let topPairWinRate = topPartner?.winRate ?? topWinRate;
  let topPairRecord  = topPartner ? `${topPartner.wins}/${topPartner.played}` : (topPlayed > 0 ? `${topWins}/${topPlayed}` : "");
  let topPairDiffVal = topPartner?.diff ?? topPairDiff;
  const topPairIsTied = tiedPartners.length > 1;

  if (!topPairIsTied && isPairs && tournamentPairs?.length > 0 && standings.length > 0) {
    const topFixedPair = tournamentPairs.find(
      (fp) => fp.p1 === standings[0]?.id || fp.p2 === standings[0]?.id
    );
    if (topFixedPair) {
      const n1 = players.find((p) => p.id === topFixedPair.p1)?.name ?? "?";
      const n2 = players.find((p) => p.id === topFixedPair.p2)?.name ?? "?";
      const key1 = [topFixedPair.p1, topFixedPair.p2].sort().join("-");
      const pairStats = partnerships.find((p) => p.key === key1);
      topPairLabel   = `${n1} & ${n2}`;
      topPairWinRate = pairStats ? pairStats.winRate : 0;
      topPairRecord  = pairStats ? `${pairStats.wins}/${pairStats.played}` : "0/0";
      topPairDiffVal = pairStats ? pairStats.diff : 0;
    }
  }
  const fmtDiff = (d) => `${d > 0 ? "+" : ""}${d}`;

  if (played.length === 0)
    return <div className="text-center text-dim py-10 px-5 font-sans leading-loose">Jugá partidos para ver estadísticas 📊</div>;

  // ── Highlights para la historia exportable ──────────────────────────────────
  // La historia lleva todas las tarjetas disponibles en la grilla: el hero es la
  // primera que aplica y las demás bajan a `storyItems` en el mismo orden.
  const heroKind = isAmericano && tournament.bracket?.final?.winner_id ? "campeones"
    : isPairs && topPairLabel ? "pareja"
    : leaders.length > 0 ? "mvp"
    : null;

  const storyHero = (() => {
    if (heroKind === "campeones")
      return { emoji: "🏆", label: "CAMPEONES", main: tournament.bracket.final.winner_name, accent: C.amber };
    if (heroKind === "pareja")
      // En empate el valor son varias parejas: se achica para que entren.
      return { emoji: "🔥", label: topPairIsTied ? "MEJOR PAREJA · EMPATE" : "MEJOR PAREJA", main: topPairLabel, mainSize: topPairIsTied ? 34 : undefined, sub: `${topPairWinRate}% (${topPairRecord})`, accent: C.brand };
    if (heroKind === "mvp")
      return { emoji: "🏆", label: leaders.length > 1 ? "MVP · EMPATE" : "MVP", main: mvpLabel, mainSize: leaders.length > 1 ? 34 : undefined, sub: `${topPg} ${topPg === 1 ? "victoria" : "victorias"}`, accent: C.brand };
    return null;
  })();

  // Mismo detalle que en la grilla: ganadores en blanco vs perdedores en gris.
  const sidesOf = (m) => {
    const win1 = +m.score1 > +m.score2;
    const winners = (win1 ? m.team1 : m.team2).map(getPlayerName).join(" & ");
    const losers  = (win1 ? m.team2 : m.team1).map(getPlayerName).join(" & ");
    return <><span style={{ color: C.white }}>{winners}</span> vs {losers}</>;
  };

  const storyItems = [{ emoji: "🎾", label: "PARTIDOS JUGADOS", main: played.length, accent: C.cyan }];
  // En americano el hero es el campeón, así que el MVP / la mejor pareja fija
  // (que en la grilla van en su propia tarjeta) pasan a ser un item más.
  if (heroKind === "campeones" && isPairs && topPairLabel)
    storyItems.push({ emoji: "🔥", label: topPairIsTied ? "MEJOR PAREJA · EMPATE" : "MEJOR PAREJA", main: topPairLabel, mainSize: topPairIsTied ? 26 : undefined, sub: `${topPairWinRate}% (${topPairRecord})`, accent: C.brand });
  else if (heroKind === "campeones" && !isPairs && leaders.length > 0)
    storyItems.push({ emoji: "🏆", label: leaders.length > 1 ? "MVP · EMPATE" : "MVP", main: mvpLabel, mainSize: leaders.length > 1 ? 26 : undefined, sub: `${topPg} ${topPg === 1 ? "victoria" : "victorias"}`, accent: C.brand });
  if (!isPairs && topPlayed >= 1 && topPairLabel)
    storyItems.push({ emoji: "🤝", label: topPairIsTied ? "MEJOR PAREJA · EMPATE" : "MEJOR PAREJA", main: topPairLabel, mainSize: topPairIsTied ? 26 : undefined, sub: `${topWinRate}% (${topWins}/${topPlayed})`, accent: C.cyan });
  if (biggestWin) {
    const win1 = +biggestWin.score1 > +biggestWin.score2;
    const ws = win1 ? biggestWin.score1 : biggestWin.score2;
    const ls = win1 ? biggestWin.score2 : biggestWin.score1;
    storyItems.push({ emoji: "💣", label: "PARTIDO MÁS AMPLIO", main: `${ws} — ${ls}`, sub: sidesOf(biggestWin), subSize: 20, accent: C.danger });
  }
  if (longestMatch)
    storyItems.push({ emoji: "⏱️", label: "PARTIDO MÁS LARGO", main: fmtMMSS(longestMatch.duration_seconds), sub: sidesOf(longestMatch), subSize: 20, accent: C.green });
  if (timedMatches.length > 0)
    storyItems.push({ emoji: "⌛", label: "TIEMPO DE JUEGO", main: fmtDuracion(totalSeconds), sub: `${timedMatches.length} de ${played.length} con tiempo`, accent: C.cyan });
  if (timedMatches.length >= 2)
    storyItems.push({ emoji: "🕒", label: "PROMEDIO POR PARTIDO", main: fmtMMSS(avgSeconds), sub: `${timedMatches.length} de ${played.length} con tiempo`, accent: C.cyan });
  if (tightMatches.length > 0)
    storyItems.push({ emoji: "⚖️", label: "PARTIDOS PAREJOS", main: `${tightPct}%`, sub: `${tightMatches.length} de ${played.length} por 1 game`, accent: C.brand });
  if (shortestMatch && shortestMatch !== longestMatch)
    storyItems.push({ emoji: "⚡", label: "PARTIDO MÁS RÁPIDO", main: fmtMMSS(shortestMatch.duration_seconds), sub: sidesOf(shortestMatch), subSize: 20, accent: C.secondary });

  return (
    <>
      <div className="flex justify-end mb-4">
        <ShareStoryButton onClick={() => setShowStory(true)} />
      </div>
      <StatSlabs className="mb-6">
        <StatSlab label="Partidos jugados" value={played.length} tone="secondary" icon={Swords} />

        {isAmericano && tournament.bracket?.final?.winner_id && (
          <StatSlab
            label="Campeones"
            value={tournament.bracket.final.winner_name}
            kind="name"
            tone="gold"
            icon={Trophy}
          />
        )}

        {/* En modo pairs el MVP individual no tiene sentido (ambos de la pareja tienen stats idénticas).
            Se muestra la mejor pareja en su lugar. En modo libre se muestra el MVP individual. */}
        {isPairs ? (
          topPairLabel && (
            <StatSlab
              label={topPairIsTied ? "Mejor pareja · Empate" : "Mejor pareja"}
              value={topPairLabel}
              kind="name"
              tone="brand"
              icon={Flame}
              sub={`${topPairWinRate}% (${topPairRecord}) · DIF ${fmtDiff(topPairDiffVal)}`}
              meter={topPairWinRate}
            />
          )
        ) : (
          leaders.length > 0 && (
            <StatSlab
              label={leaders.length > 1 ? "MVP · Empate" : "MVP"}
              value={mvpLabel}
              kind="name"
              tone="brand"
              icon={Trophy}
              sub={`${topPg} ${topPg === 1 ? "victoria" : "victorias"}`}
              meter={mvpPct}
              onOpen={leaders.length === 1 && leaders[0].linked_username
                ? () => navigate(`/u/${leaders[0].linked_username}`)
                : undefined}
            />
          )
        )}

        {/* En modo libre se muestra la mejor pareja dinámica además del MVP */}
        {!isPairs && topPlayed >= 1 && (
          <StatSlab
            label={topPairIsTied ? "Mejor pareja · Empate" : "Mejor pareja"}
            value={topPairIsTied ? tiedPartnersLabel : topPartner.label}
            kind="name"
            tone="cyan"
            icon={Handshake}
            sub={`${topWinRate}% (${topWins}/${topPlayed}) · DIF ${fmtDiff(topPairDiffVal)}`}
            meter={topWinRate}
          />
        )}

        {biggestWin && (() => {
          const win1        = +biggestWin.score1 > +biggestWin.score2;
          const winnerNames = (win1 ? biggestWin.team1 : biggestWin.team2).map(getPlayerName).join(" & ");
          const loserNames  = (win1 ? biggestWin.team2 : biggestWin.team1).map(getPlayerName).join(" & ");
          const winScore    = win1 ? biggestWin.score1 : biggestWin.score2;
          const loseScore   = win1 ? biggestWin.score2 : biggestWin.score1;
          return (
            <StatSlab
              label="Partido más amplio"
              value={`${winScore} — ${loseScore}`}
              tone="danger"
              icon={Bomb}
              sub={<><span className="text-white">{winnerNames}</span> vs {loserNames}
                {biggestWin.duration_seconds > 0 ? ` · ${fmtMMSS(biggestWin.duration_seconds)}` : ""}</>}
            />
          );
        })()}

        {longestMatch && (() => {
          const win1        = +longestMatch.score1 > +longestMatch.score2;
          const winnerNames = (win1 ? longestMatch.team1 : longestMatch.team2).map(getPlayerName).join(" & ");
          const loserNames  = (win1 ? longestMatch.team2 : longestMatch.team1).map(getPlayerName).join(" & ");
          return (
            <StatSlab
              label="Partido más largo"
              value={fmtMMSS(longestMatch.duration_seconds)}
              tone="green"
              icon={Clock}
              sub={<><span className="text-white">{winnerNames}</span> vs {loserNames}</>}
            />
          );
        })()}

        {timedMatches.length > 0 && (
          <StatSlab
            label="Tiempo de juego"
            value={fmtDuracion(totalSeconds)}
            tone="cyan"
            icon={Hourglass}
            sub={`${timedMatches.length} de ${played.length} con tiempo`}
            meter={Math.round((timedMatches.length / played.length) * 100)}
          />
        )}

        {timedMatches.length >= 2 && (
          <StatSlab
            label="Promedio por partido"
            value={fmtMMSS(avgSeconds)}
            tone="cyan"
            icon={Timer}
            sub={`${timedMatches.length} de ${played.length} con tiempo`}
          />
        )}

        {tightMatches.length > 0 && (
          <StatSlab
            label="Partidos parejos"
            value={`${tightPct}%`}
            tone="brand"
            icon={Scale}
            sub={`${tightMatches.length} de ${played.length} por 1 game`}
            meter={tightPct}
          />
        )}

        {shortestMatch && shortestMatch !== longestMatch && (() => {
          const win1        = +shortestMatch.score1 > +shortestMatch.score2;
          const winnerNames = (win1 ? shortestMatch.team1 : shortestMatch.team2).map(getPlayerName).join(" & ");
          const loserNames  = (win1 ? shortestMatch.team2 : shortestMatch.team1).map(getPlayerName).join(" & ");
          return (
            <StatSlab
              label="Partido más rápido"
              value={fmtMMSS(shortestMatch.duration_seconds)}
              tone="secondary"
              icon={Clock}
              sub={<><span className="text-white">{winnerNames}</span> vs {loserNames}</>}
            />
          );
        })()}
      </StatSlabs>

      {!isPairs && !isAmericano && <PerPlayerTable standings={standings} />}
      {!isPairs && <PartnershipsTable partnerships={partnerships} />}
      {isPairs && <PartnershipsTable partnerships={partnerships} titleOverride="RENDIMIENTO POR PAREJA" />}

      {showStory && (
        <SnapshotModal
          filename={`stats-${tournament.name ?? "torneo"}.png`}
          onClose={() => setShowStory(false)}
          story={<StatsStory eyebrow="ESTADÍSTICAS DEL TORNEO" title={tournament.name} meta={<TournamentMeta tournament={tournament} />} headerRight={<ClubBadge tournament={tournament} />} accent={C.brand} hero={storyHero} items={storyItems} />}
        />
      )}
    </>
  );
}

// Un mismo jugador tiene un `players.id` distinto en cada jornada, así que el
// histórico se agrupa por identidad: el @username si el slot está vinculado a
// una cuenta, y el nombre normalizado si no. Agrupar por el nombre tal cual
// fusionaba a dos homónimos con cuenta propia y separaba a quien aparecía como
// "Juan" en una jornada y "juan" en otra.
const playerKey = (p) => (p.linked_username ? `u:${p.linked_username}` : `n:${normalize(p.name ?? '')}`);

// Peso (en partidos) del suavizado del win rate. Ver rankedWinRate.
const WINRATE_PRIOR = 2;

/**
 * Win rate suavizado hacia la media de la categoría: (pg + k·media) / (pj + k).
 * Sirve sólo para ordenar — la tabla muestra siempre el % real. Sin esto, quien
 * jugó un solo partido y lo ganó (100%) quedaba arriba de quien lleva 18-4.
 */
function rankedWinRate(row, mean) {
  return (row.pg + WINRATE_PRIOR * mean) / (row.pj + WINRATE_PRIOR);
}

// Mismo criterio para jugadores y parejas. 'wins' es el default del producto.
function sortRows(rows, sortBy = 'wins') {
  const played = rows.filter((r) => r.pj > 0);
  const totalPj = played.reduce((acc, r) => acc + r.pj, 0);
  const totalPg = played.reduce((acc, r) => acc + r.pg, 0);
  const mean = totalPj > 0 ? totalPg / totalPj : 0;
  return [...rows].sort((a, b) => {
    const pctA = a.pj > 0 ? a.pg / a.pj : 0;
    const pctB = b.pj > 0 ? b.pg / b.pj : 0;
    if (sortBy === 'wins') return b.pg - a.pg || pctB - pctA || (b.sf - b.sc) - (a.sf - a.sc);
    return rankedWinRate(b, mean) - rankedWinRate(a, mean) || b.pg - a.pg || (b.sf - b.sc) - (a.sf - a.sc);
  });
}

// Líder de un conjunto según un criterio, con los empates exactos agrupados.
function topBy(rows, sortBy, labelOf = (r) => r.name, maxNames = TIED_NAMES_PLAYERS) {
  const sorted = sortRows(rows.filter((r) => r.pj > 0), sortBy);
  const first = sorted[0];
  if (!first) return null;
  const tied = sorted.filter((r) => r.pg === first.pg && r.pj === first.pj);
  return {
    label: tiedLabel(tied.map(labelOf), maxNames),
    tied: tied.length > 1,
    pg: first.pg,
    pj: first.pj,
    pct: first.pj > 0 ? Math.round((first.pg / first.pj) * 100) : 0,
    linked_username: tied.length === 1 ? first.linked_username ?? null : null,
  };
}

function accumulatePlayers(tournaments) {
  const playerMap = {};
  tournaments.forEach((t) => {
    const matches  = getAllMatches(t);
    const keyById  = Object.fromEntries(t.players.map((p) => [p.id, playerKey(p)]));
    calcStandings(t.players, matches).forEach((s) => {
      const key = playerKey(s);
      const row = (playerMap[key] ??= {
        id: key, name: s.name, linked_username: s.linked_username ?? null,
        pj: 0, pg: 0, pp: 0, torneos: 0, sf: 0, sc: 0,
      });
      if (s.linked_username && !row.linked_username) row.linked_username = s.linked_username;
      row.pj += s.pj;
      row.pg += s.pg;
      row.pp += s.pp;
      if (s.pj > 0) row.torneos++;
    });
    matches.forEach((m) => {
      const s1 = +m.score1 || 0, s2 = +m.score2 || 0;
      // Mismo criterio que calcStandings, que ya descartó este partido: sin el
      // filtro sumaría games de un partido que no cuenta como jugado.
      if (s1 === s2) return;
      [[m.team1, s1, s2], [m.team2, s2, s1]].forEach(([team, sf, sc]) => {
        team.forEach((id) => {
          const row = playerMap[keyById[id]];
          if (row) { row.sf += sf; row.sc += sc; }
        });
      });
    });
  });
  return Object.values(playerMap).filter((r) => r.pj > 0);
}

function buildIndividualRows(tournaments, sortBy = 'wins') {
  return sortRows(accumulatePlayers(tournaments), sortBy);
}

// El ranking histórico arranca en el top 10 y se amplía de a 10.
const RANK_PAGE_SIZE = 10;

const RANK_COLORS = ['#e8f04a', '#4ab8f0', '#4af07a', '#a84af0', '#f07a4a'];

const LEADER_ICONS = { crown: Crown, target: Target, handshake: Handshake };

function LeaderCard({ title, leader, icon, tone, detail, onOpen }) {
  if (!leader) return null;
  const clickable = !leader.tied && !!onOpen;
  return (
    <StatSlab
      label={leader.tied ? `Empate · ${title}` : title}
      value={leader.label}
      kind="name"
      tone={tone}
      icon={LEADER_ICONS[icon] ?? Crown}
      sub={detail(leader)}
      meter={leader.pct}
      onOpen={clickable ? () => onOpen(leader) : undefined}
    />
  );
}

function Toggle({ value, onChange, options }) {
  return (
    <div className="flex bg-surface border border-border-mid rounded-md p-0.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`px-2.5 py-1 text-[11px] font-condensed font-bold tracking-wide rounded-sm transition-colors cursor-pointer ${
            value === opt.id ? 'bg-brand text-base' : 'bg-transparent text-muted hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Mínimo de enfrentamientos para destacar un cruce como rival duro o víctima.
const H2H_MIN = 3;

function HeadToHead({ h2h, rows, selected, onSelect }) {
  const withRivals = rows.filter((r) => h2h.byKey.has(r.id));
  if (withRivals.length < 2) return null;

  const activeKey = selected && h2h.byKey.has(selected) ? selected : withRivals[0].id;
  const rivals = [...(h2h.byKey.get(activeKey) ?? new Map()).entries()]
    .map(([key, v]) => ({
      key,
      name: h2h.names.get(key) ?? '?',
      ...v,
      total: v.g + v.p,
      pct: v.g + v.p > 0 ? Math.round((v.g / (v.g + v.p)) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total || b.pct - a.pct);

  const rated  = rivals.filter((r) => r.total >= H2H_MIN);
  const nemesis = rated.length > 0 ? rated.reduce((w, r) => (r.pct < w.pct ? r : w), rated[0]) : null;
  const victim  = rated.length > 0 ? rated.reduce((b, r) => (r.pct > b.pct ? r : b), rated[0]) : null;
  const sameRival = nemesis && victim && nemesis.key === victim.key;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="font-condensed font-bold text-[13px] tracking-[3px] text-muted">CRUCES</div>
        <select
          value={activeKey}
          onChange={(e) => onSelect(e.target.value)}
          className="bg-surface border border-border-mid text-white text-[12px] font-mono rounded-md px-2 py-1 outline-none cursor-pointer max-w-[60%]"
        >
          {withRivals.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {nemesis && !sameRival && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <StatSlab
            label="Rival más duro"
            value={nemesis.name}
            kind="name"
            tone="danger"
            sub={`${nemesis.g}G ${nemesis.p}P · ${nemesis.pct}% a favor`}
            meter={nemesis.pct}
          />
          <StatSlab
            label="Víctima favorita"
            value={victim.name}
            kind="name"
            tone="green"
            sub={`${victim.g}G ${victim.p}P · ${victim.pct}% a favor`}
            meter={victim.pct}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {rivals.slice(0, 8).map((r) => (
          <div key={r.key} className="flex items-center gap-3 bg-surface border border-border-mid rounded-md px-3.5 py-2.5">
            <div className="flex-1 min-w-0 truncate text-content text-[14px]">{r.name}</div>
            <div className="flex-2 max-w-[120px]">
              <div className="h-1.5 bg-danger/40 rounded-full overflow-hidden">
                <div className="h-full bg-green rounded-full" style={{ width: `${r.pct}%` }} />
              </div>
            </div>
            <div className="min-w-22.5 text-right font-mono text-soft text-[13px]">
              {r.g}G {r.p}P <span className={r.pct >= 50 ? 'text-green' : 'text-danger'}>({r.pct}%)</span>
            </div>
          </div>
        ))}
      </div>
      {rivals.length > 0 && rated.length === 0 && (
        <div className="mt-2 text-[10px] font-mono text-dim">
          Hacen falta {H2H_MIN} cruces con un mismo rival para marcar rival más duro y víctima favorita.
        </div>
      )}
    </div>
  );
}

// Asistencia: en cuántas jornadas jugó cada uno y hace cuántas no aparece.
function buildAttendance(sortedByDate) {
  const total = sortedByDate.length;
  const byKey = new Map();
  sortedByDate.forEach((t, idx) => {
    const played = new Set();
    getAllMatches(t).forEach((m) => {
      if (m.score1 === "" || m.score2 === "") return;
      [...m.team1, ...m.team2].forEach((id) => played.add(id));
    });
    t.players.forEach((p) => {
      if (!played.has(p.id)) return;
      const key = playerKey(p);
      const row = byKey.get(key) ?? { id: key, name: p.name, jornadas: 0, ultima: -1 };
      row.name = p.name;
      row.jornadas++;
      row.ultima = idx;
      byKey.set(key, row);
    });
  });
  return [...byKey.values()]
    .map((r) => ({
      ...r,
      total,
      pct: total > 0 ? Math.round((r.jornadas / total) * 100) : 0,
      ausenteHace: total - 1 - r.ultima,
    }))
    .sort((a, b) => b.jornadas - a.jornadas || a.name.localeCompare(b.name));
}

// Puesto de cada jugador jornada a jornada. Se acumula en una sola pasada:
// recalcular el ranking completo por jornada era cuadrático sobre el histórico.
function buildRankHistory(sortedByDate, sortBy, topKeys) {
  const acc = new Map();
  const wanted = new Set(topKeys);
  const data = [];

  sortedByDate.forEach((t) => {
    const matches = getAllMatches(t);
    const keyById = Object.fromEntries(t.players.map((p) => [p.id, playerKey(p)]));
    calcStandings(t.players, matches).forEach((s) => {
      const key = playerKey(s);
      const row = acc.get(key) ?? { key, pj: 0, pg: 0, sf: 0, sc: 0 };
      row.pj += s.pj;
      row.pg += s.pg;
      acc.set(key, row);
    });
    matches.forEach((m) => {
      const s1 = +m.score1 || 0, s2 = +m.score2 || 0;
      if (s1 === s2) return;
      [[m.team1, s1, s2], [m.team2, s2, s1]].forEach(([team, sf, sc]) => {
        team.forEach((id) => {
          const row = acc.get(keyById[id]);
          if (row) { row.sf += sf; row.sc += sc; }
        });
      });
    });

    const rows = sortRows([...acc.values()].filter((r) => r.pj > 0), sortBy)
      .map((r) => [r.key, r]);

    const point = { name: tournamentDate(t).slice(5).split('-').reverse().join('/') };
    rows.forEach(([key], i) => { if (wanted.has(key)) point[key] = i + 1; });
    data.push(point);
  });

  return data;
}

// Cruces entre jugadores: victorias y derrotas de cada uno contra cada rival.
function buildHeadToHead(tournaments) {
  const byKey = new Map();
  const names = new Map();

  tournaments.forEach((t) => {
    const keyById = Object.fromEntries(t.players.map((p) => [p.id, playerKey(p)]));
    t.players.forEach((p) => names.set(playerKey(p), p.name));
    getAllMatches(t).forEach((m) => {
      const s1 = +m.score1, s2 = +m.score2;
      if (m.score1 === "" || m.score2 === "" || s1 === s2) return;
      const winners = (s1 > s2 ? m.team1 : m.team2).map((id) => keyById[id]).filter(Boolean);
      const losers  = (s1 > s2 ? m.team2 : m.team1).map((id) => keyById[id]).filter(Boolean);
      const bump = (a, b, won) => {
        const rivals = byKey.get(a) ?? new Map();
        const row = rivals.get(b) ?? { g: 0, p: 0 };
        if (won) row.g++; else row.p++;
        rivals.set(b, row);
        byKey.set(a, rivals);
      };
      winners.forEach((w) => losers.forEach((l) => { bump(w, l, true); bump(l, w, false); }));
    });
  });

  return { byKey, names };
}

// `showClubs`: en la categoría el bloque de canchas es su propia pestaña, así
// que se apaga acá para no mostrarlo dos veces. En Torneo → Estadísticas sigue
// viniendo con el resto.
export function HistoricalStats({ tournaments, showTorneos = true, showClubs = true, ownerIsPremium = false, groupName, title }) {
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [rankMode, setRankMode] = useState('wins'); // 'wins' | 'winrate'
  const [rankScope, setRankScope] = useState(null); // null = segun las jornadas; 'players' | 'pairs'
  const [h2hKey,   setH2hKey]   = useState(null);
  const [showAllAttendance, setShowAllAttendance] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [showRankStory, setShowRankStory] = useState(false);
  const navigate = useNavigate();

  // ── Standings individuales + movimiento de ranking ──────────────────────
  // buildIndividualRows llama a calcStandings una vez por torneo, así que
  // recorre el histórico completo. Se invocaba hasta cuatro veces por render, y
  // los tres useState de arriba (modal premium, orden del ranking, historia)
  // rehacían todo el cálculo con cada clic.
  const sortedByDate = useMemo(
    () => [...tournaments].sort((a, b) => tournamentDate(a).localeCompare(tournamentDate(b))),
    [tournaments]
  );
  // Base por rendimiento (%): se usa para las tarjetas y gráficos (mejor jugador, etc.).
  const playerBase = useMemo(() => accumulatePlayers(sortedByDate), [sortedByDate]);
  const rankedRows = useMemo(() => sortRows(playerBase, rankMode), [playerBase, rankMode]);
  // Las tarjetas no dependen del switch: cada una fija su propio criterio.
  const topPlayerWins = useMemo(() => topBy(playerBase, 'wins'), [playerBase]);
  const topPlayerRate = useMemo(() => topBy(playerBase, 'winrate'), [playerBase]);

  const attendance = useMemo(() => buildAttendance(sortedByDate), [sortedByDate]);
  const h2h        = useMemo(() => buildHeadToHead(sortedByDate), [sortedByDate]);
  // El gráfico de puestos se limita a los cinco primeros: con más líneas no se lee.
  const rankTop    = useMemo(() => rankedRows.slice(0, 5).map((r) => r.id), [rankedRows]);
  const rankHistory = useMemo(
    () => (sortedByDate.length >= 3 ? buildRankHistory(sortedByDate, rankMode, rankTop) : []),
    [sortedByDate, rankMode, rankTop]
  );

  const movementMap = useMemo(() => {
    if (sortedByDate.length < 2) return {};
    const prevRows = buildIndividualRows(sortedByDate.slice(0, -1), rankMode);
    const prevRank = Object.fromEntries(prevRows.map((r, i) => [r.id, i + 1]));
    return Object.fromEntries(
      rankedRows.map((r, i) => {
        const prev = prevRank[r.id];
        const curr = i + 1;
        if (!prev) return [r.id, 'new'];
        if (curr < prev) return [r.id, 'up'];
        if (curr > prev) return [r.id, 'down'];
        return [r.id, null];
      })
    );
  }, [sortedByDate, rankMode, rankedRows]);

  if (tournaments.length === 0)
    return <div className="text-center text-dim py-10 px-5 font-sans leading-loose">No hay torneos anteriores registrados.</div>;

  const hasPairMode = tournaments.some((t) => t.mode === "pairs");
  const allPairMode = tournaments.every((t) => t.mode === "pairs");

  // ── Standings por pareja ────────────────────────────────────────────────
  // La clave es la identidad de los dos jugadores, no sus players.id: al ser
  // distintos en cada jornada, una pareja que jugó tres jornadas aparecía como
  // tres parejas diferentes.
  const pairMap = {};
  if (hasPairMode) {
    const infoById = {};
    tournaments.forEach((t) => t.players.forEach((p) => { infoById[p.id] = { key: playerKey(p), name: p.name }; }));
    tournaments.filter((t) => t.mode === "pairs").forEach((t) => {
      // Una pareja suma la jornada una sola vez, jugue los partidos que juegue.
      const seen = new Set();
      getAllMatches(t).forEach((m) => {
        const s1 = +m.score1, s2 = +m.score2;
        // Igual que calcStandings: un marcador igualado no es un partido válido.
        if (s1 === s2) return;
        [[m.team1, s1, s2], [m.team2, s2, s1]].forEach(([team, sf, sc]) => {
          const keys  = team.map((id) => infoById[id]?.key ?? `?${id}`);
          const key   = [...keys].sort().join("|");
          const label = team.map((id) => infoById[id]?.name ?? "?").join(" & ");
          if (!pairMap[key]) pairMap[key] = { id: key, label, pj: 0, pg: 0, pp: 0, sf: 0, sc: 0, torneos: 0 };
          if (!seen.has(key)) { seen.add(key); pairMap[key].torneos++; }
          pairMap[key].pj++;
          pairMap[key].sf += sf;
          pairMap[key].sc += sc;
          if (sf > sc) pairMap[key].pg++;
          else         pairMap[key].pp++;
        });
      });
    });
  }
  const pairBase = Object.values(pairMap);
  const pairRows = sortRows(pairBase, rankMode);

  const pairLabel   = (p) => p.label;
  const topPairWins = topBy(pairBase, 'wins', pairLabel, TIED_NAMES_PAIRS);
  const topPairRate = topBy(pairBase, 'winrate', pairLabel, TIED_NAMES_PAIRS);

  // ── Más veces campeón ──────────────────────────────────────────────────
  // Se cuenta por identidad de jugador. Antes se reconstruía a partir del label
  // (split por " / " y " & "), así que cualquier nombre con un "&" adentro
  // generaba campeones fantasma.
  const champCount = {};
  tournaments.forEach((t) => {
    const playerById = Object.fromEntries(t.players.map((p) => [p.id, p]));
    getTournamentWinners(t).forEach((w) => {
      w.ids.forEach((id) => {
        const player = playerById[id];
        if (!player) return;
        const key = playerKey(player);
        const row = (champCount[key] ??= { name: player.name, count: 0 });
        row.name = player.name;
        row.count++;
      });
    });
  });
  const champRows     = Object.entries(champCount)
    .map(([key, v]) => ({ key, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count);
  const topChampCount = champRows[0]?.count ?? 0;
  const topChamps     = champRows.filter((c) => c.count === topChampCount);
  const champLabel    = tiedLabel(topChamps.map((c) => c.name));

  function bracketPlayedCount(t) {
    if (t.format !== 'americano' || !t.bracket) return 0;
    return [...(t.bracket.octavos ?? []), ...(t.bracket.cuartos ?? []),
            ...(t.bracket.semis   ?? []), ...(t.bracket.final ? [t.bracket.final] : [])]
      .filter(m => m.winner_id != null).length;
  }
  const totalMatches = tournaments.reduce((acc, t) => acc + t.matches.length + bracketPlayedCount(t), 0);
  const canShowPairs  = hasPairMode && pairRows.length > 0;
  const showPairTable = canShowPairs && (rankScope ?? (allPairMode ? 'pairs' : 'players')) === 'pairs';

  const allHistMatches = tournaments.flatMap(getAllMatches);
  const histTimed      = allHistMatches.filter((m) => (m.duration_seconds ?? 0) > 0);
  const histSeconds    = histTimed.reduce((acc, m) => acc + m.duration_seconds, 0);

  // Los torneos sin club quedan afuera. El cálculo vive en GroupClubs, que es
  // quien lo muestra como pestaña propia en la categoría.
  const clubRows = buildClubRows(tournaments);

  // ── Datos para gráficos avanzados ──────────────────────────────────────
  const champChartData = champRows.slice(0, 5).map((c) => ({ key: c.key, name: c.name.split(' ')[0], torneos: c.count }));

  const activityChartData = [...tournaments]
    .sort((a, b) => tournamentDate(a).localeCompare(tournamentDate(b)))
    .map((t) => {
      // Las dos series salen del mismo universo de partidos: la barra contaba
      // los del cuadro final y la línea de games no, así que medían distinto.
      const all = getAllMatches(t);
      const totalMatches = all.length;
      const totalGames = all.reduce((acc, m) => acc + (+m.score1 || 0) + (+m.score2 || 0), 0);
      const label = tournamentDate(t).slice(5).split('-').reverse().join('/');
      return { name: label, partidos: totalMatches, games: totalGames };
    });

  // ── Datos para la historia exportable de la categoría ───────────────────────
  // El bloque avanzado (mejor jugador/pareja, ranking y campeones) sólo se arma
  // si el dueño es premium: CategoryStory lo ignora en cuentas free.
  const storyChampion = champLabel
    ? { label: champLabel, count: topChampCount, tied: topChamps.length > 1 }
    : null;
  // El ranking del snapshot siempre va por partidos ganados.
  const storyRankedRows = showPairTable
    ? sortRows(pairRows, 'wins')
    : buildIndividualRows(sortedByDate, 'wins');
  // Top 5: con la lista completa el snapshot se estiraba y las filas quedaban ilegibles.
  const storyRanking = storyRankedRows.slice(0, 5).map((r) => ({
    key: r.id ?? r.name,
    name: showPairTable ? r.label : r.name,
    pj: r.pj,
    pg: r.pg,
    pct: r.pj > 0 ? Math.round((r.pg / r.pj) * 100) : 0,
  }));
  const storyGames = allHistMatches.reduce((acc, m) => acc + (+m.score1 || 0) + (+m.score2 || 0), 0);
  // En el snapshot el total va compacto ("104 h"): a tamaño de tarjeta, un
  // "104 h 32 m" no entra en el ancho y quedaba cortado con elipsis.
  const storyPlayTime = histTimed.length > 0
    ? {
        total: fmtHorasCorto(histSeconds),
        // Sólo el subconjunto cronometrado: el detalle dice sobre cuántos mide.
        detail: histTimed.length === totalMatches
          ? `${fmtDuracion(histSeconds / histTimed.length)} / partido`
          : `${fmtDuracion(histSeconds / histTimed.length)} · ${histTimed.length} partidos`,
      }
    : null;
  const storyClub = clubRows[0] ? { name: clubRows[0].name, jornadas: clubRows[0].jornadas } : null;

  // ── Historia del ranking: refleja los dos selectores de la tabla ───────────
  const rankStoryAll = showPairTable ? pairRows : rankedRows;
  const rankStoryRows = rankStoryAll.slice(0, RANKING_STORY_LIMIT).map((r) => ({
    key: r.id ?? r.name,
    name: showPairTable ? r.label : r.name,
    pj: r.pj,
    pg: r.pg,
    pct: r.pct ?? (r.pj > 0 ? Math.round((r.pg / r.pj) * 100) : 0),
  }));

  return (
    <>
      {title ? (
        <div className="flex items-center justify-between gap-3 pb-4 mb-5">
          <div className="font-condensed font-bold text-[16px] tracking-[3px] text-muted">{title}</div>
          <ShareStoryButton variant="icon" onClick={() => setShowStory(true)} />
        </div>
      ) : (
        <div className="flex justify-end mb-4">
          <ShareStoryButton onClick={() => setShowStory(true)} />
        </div>
      )}

      {/* ── BÁSICAS (siempre visibles) ── */}
      <StatSlabs className="mb-6">
        <StatSlab label="Torneos jugados" value={tournaments.length} tone="cyan" icon={CalendarDays} />
        <StatSlab label="Partidos en total" value={totalMatches} tone="secondary" icon={Swords} />
        {histTimed.length > 0 && (
          <StatSlab
            label="Tiempo de juego"
            value={fmtDuracion(histSeconds)}
            tone="green"
            icon={Hourglass}
            sub={histTimed.length === totalMatches
              ? `${fmtDuracion(histSeconds / histTimed.length)} por partido`
              : `${histTimed.length} de ${totalMatches} con tiempo`}
            meter={totalMatches > 0 ? Math.round((histTimed.length / totalMatches) * 100) : null}
          />
        )}
        {champLabel && (
          <StatSlab
            label={topChamps.length > 1 ? "Empate · Más veces campeones" : "Más veces campeón"}
            value={champLabel}
            kind="name"
            tone="gold"
            icon={Trophy}
            sub={`${topChampCount} de ${tournaments.length} ${tournaments.length === 1 ? "torneo" : "torneos"}`}
            meter={Math.round((topChampCount / tournaments.length) * 100)}
          />
        )}
      </StatSlabs>

      {/* ── AVANZADAS (solo si el dueño tiene premium) ── */}
      {ownerIsPremium ? (
        <>
          <div className="flex items-center gap-2 font-condensed font-bold text-[16px] tracking-[3px] text-muted my-5 py-4 border-t border-border">
            <Gem size={15} className="text-brand shrink-0" />
            ESTADÍSTICAS AVANZADAS
          </div>
          <StatSlabs className="mb-6">
            <LeaderCard
              title="Jugador más ganador"
              leader={topPlayerWins}
              icon="crown"
              tone="brand"
              detail={(l) => `${l.pg} ${l.pg === 1 ? 'ganado' : 'ganados'} de ${l.pj}`}
              onOpen={(l) => l.linked_username && navigate(`/u/${l.linked_username}`)}
            />
            <LeaderCard
              title="Jugador más efectivo"
              leader={topPlayerRate}
              icon="target"
              tone="cyan"
              detail={(l) => `${l.pct}% (${l.pg}/${l.pj})`}
              onOpen={(l) => l.linked_username && navigate(`/u/${l.linked_username}`)}
            />
            {canShowPairs && (
              <>
                <LeaderCard
                  title="Pareja más ganadora"
                  leader={topPairWins}
                  icon="handshake"
                  tone="green"
                  detail={(l) => `${l.pg} ${l.pg === 1 ? 'ganado' : 'ganados'} de ${l.pj}`}
                />
                <LeaderCard
                  title="Pareja más efectiva"
                  leader={topPairRate}
                  icon="target"
                  tone="secondary"
                  detail={(l) => `${l.pct}% (${l.pg}/${l.pj})`}
                />
              </>
            )}
          </StatSlabs>

          <div className="mb-6">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="font-condensed font-bold text-[13px] tracking-[3px] text-muted">RANKING HISTÓRICO</div>
                {rankStoryRows.length > 0 && <ShareStoryButton onClick={() => setShowRankStory(true)} />}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {canShowPairs && (
                  <Toggle
                    value={showPairTable ? 'pairs' : 'players'}
                    onChange={setRankScope}
                    options={[
                      { id: 'players', label: 'Jugadores' },
                      { id: 'pairs',   label: 'Parejas' },
                    ]}
                  />
                )}
                <Toggle
                  value={rankMode}
                  onChange={setRankMode}
                  options={[
                    { id: 'wins',    label: 'Por ganados' },
                    { id: 'winrate', label: 'Por rendimiento' },
                  ]}
                />
              </div>
            </div>
            {showPairTable
              ? <PerPlayerTable standings={pairRows} useLabelKey sortBy={rankMode} pageSize={RANK_PAGE_SIZE} />
              : <PerPlayerTable standings={rankedRows} movementMap={movementMap} sortBy={rankMode} pageSize={RANK_PAGE_SIZE} />
            }
            {showPairTable && !allPairMode && (
              <div className="mt-2 text-[10px] font-mono text-dim">
                Sólo cuenta los torneos de parejas fijas ({tournaments.filter((t) => t.mode === 'pairs').length} de {tournaments.length}).
              </div>
            )}
          </div>

          {/* Gráficos avanzados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {champChartData.length > 0 && (
              <div className="bg-surface border border-border-mid rounded-lg p-4">
                <div className="text-[10px] font-mono tracking-[2px] text-muted mb-3">CAMPEONES</div>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={champChartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#444', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 4, fontSize: 11 }} cursor={{ fill: '#ffffff06' }} />
                    <Bar dataKey="torneos" name="Torneos ganados" fill="#e8f04a" radius={[0, 3, 3, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {attendance.length > 0 && (
              <div className="bg-surface border border-border-mid rounded-lg p-4">
                <div className="text-[10px] font-mono tracking-[2px] text-muted mb-3">
                  ASISTENCIA ({attendance[0].total} {attendance[0].total === 1 ? 'TORNEO' : 'TORNEOS'})
                </div>
                <div className="flex flex-col gap-2">
                  {(showAllAttendance ? attendance : attendance.slice(0, 6)).map((r) => (
                    <div key={r.id} className="flex items-center gap-2">
                      <div className="w-16 shrink-0 truncate text-[11px] font-mono text-soft">{r.name.split(' ')[0]}</div>
                      <div className="flex-1 h-2.5 bg-border rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-cyan" style={{ width: `${r.pct}%` }} />
                      </div>
                      <div className="w-9 shrink-0 text-right text-[11px] font-mono text-secondary">{r.pct}%</div>
                      <div className="w-20 shrink-0 text-right text-[10px] font-mono">
                        {r.ausenteHace > 0
                          ? <span className="text-danger">falta {r.ausenteHace}</span>
                          : <span className="text-dim">{r.jornadas}/{r.total}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                {attendance.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setShowAllAttendance((v) => !v)}
                    className="mt-3 w-full text-center text-[10px] font-mono text-dim hover:text-white transition-colors cursor-pointer bg-transparent border-none py-1"
                  >
                    {showAllAttendance ? '▲ Ver menos' : `▼ Ver todos (${attendance.length})`}
                  </button>
                )}
              </div>
            )}
          </div>

          {rankHistory.length >= 3 && rankTop.length > 1 && (
            <div className="bg-surface border border-border-mid rounded-lg p-4 mb-6">
              <div className="text-[10px] font-mono tracking-[2px] text-muted mb-3">
                PUESTO POR TORNEO (TOP {rankTop.length})
              </div>
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={rankHistory} margin={{ top: 4, right: 10, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                  <YAxis reversed domain={[1, 'dataMax']} allowDecimals={false} tick={{ fill: '#444', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 4, fontSize: 11 }} cursor={{ stroke: '#ffffff15' }} />
                  <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace', color: '#555', paddingTop: 4 }} />
                  {rankTop.map((key, i) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={rankedRows.find((r) => r.id === key)?.name?.split(' ')[0] ?? key}
                      stroke={RANK_COLORS[i % RANK_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 2.5, strokeWidth: 0 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <HeadToHead h2h={h2h} rows={rankedRows} selected={h2hKey} onSelect={setH2hKey} />

          {activityChartData.length > 1 && (
            <div className="bg-surface border border-border-mid rounded-lg p-4 mb-6">
              <div className="text-[10px] font-mono tracking-[2px] text-muted mb-3">EVOLUCIÓN POR TORNEO</div>
              <div className="flex items-center gap-4 mb-3">
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-muted">
                  <span className="inline-block w-3 h-3 rounded-sm bg-[#4ab8f0]" />Partidos
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-muted">
                  <span className="inline-block w-4 h-0.5 bg-brand" />Games totales
                </span>
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <ComposedChart data={activityChartData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: '#444', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#444', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 4, fontSize: 11 }}
                    cursor={{ fill: '#ffffff06' }}
                  />
                  <Bar yAxisId="left" dataKey="partidos" name="Partidos" fill="#4ab8f0" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="games" name="Games totales" stroke="#e8f04a" strokeWidth={2} dot={{ r: 3, fill: '#e8f04a', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      ) : (
        <div className="relative rounded-lg overflow-hidden select-none mb-6 border border-border-mid">
          <img
            src={groupStatsPreview}
            alt=""
            aria-hidden="true"
            draggable="false"
            className="w-full rounded-lg"
            style={{ filter: 'blur(5px)', transform: 'scale(1.03)' }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-base/55 rounded-lg">
            <div className="flex items-center gap-2">
              <Gem size={18} className="text-brand" />
              <span className="font-condensed font-bold text-base text-white tracking-wide">ESTADÍSTICAS AVANZADAS</span>
            </div>
            <p className="text-xs font-sans text-secondary text-center px-6 max-w-xs">
              El dueño de esta categoría necesita Premium para desbloquear estas estadísticas.
            </p>
            <button
              type="button"
              onClick={() => setShowPremiumModal(true)}
              className="flex items-center gap-2 bg-brand text-base border-0 px-4 py-2 font-condensed font-bold text-sm tracking-wide cursor-pointer rounded-lg"
            >
              <Gem size={13} /> CONOCER PREMIUM
            </button>
          </div>
        </div>
      )}

      {showClubs && clubRows.length > 0 && (
        <div className="mt-6">
          <div className="font-condensed font-bold text-[13px] tracking-[3px] text-muted mb-3">CANCHAS</div>
          <div className="flex flex-col gap-2">
            {clubRows.map((c) => (
              <div key={c.id}
                onClick={() => navigate(`/club/${c.id}`)}
                className="flex items-center gap-3 bg-surface border border-border-mid rounded-md px-3.5 py-2.5 cursor-pointer hover:border-border-strong transition-colors">
                <ClubLogo name={c.name} src={c.photo_url} size={28} />
                <div className="flex-1 min-w-0 truncate text-content text-[14px]">{c.name}</div>
                <div className="shrink-0 font-mono text-soft text-[13px]">
                  {c.jornadas} {c.jornadas === 1 ? 'torneo' : 'torneos'} · {c.partidos}P
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showTorneos && (
        <div className="mt-6">
          <div className="font-condensed font-bold text-[13px] tracking-[3px] text-muted mb-3">TORNEOS</div>
          <div className="flex flex-col gap-2">
            {[...tournaments].sort((a, b) => tournamentDate(b).localeCompare(tournamentDate(a))).map((t) => {
              const winnerLabel = getTournamentWinnerLabel(t);
              return (
                <div key={t.id} className="flex items-center gap-2 bg-base border border-border-mid rounded-md px-3 py-2 flex-col">
                  <div className="flex justify-between w-full">
                    <span className="text-white font-condensed font-bold text-[16px]">{t.name}</span>
                    {winnerLabel && <span className="text-brand text-[13px] flex items-center gap-2 justify-center"><Trophy size={13} /> {winnerLabel}</span>}
                  </div>
                  <span className="text-muted text-[11px] font-mono">
                    {fmt(tournamentDate(t))} · {t.format === 'americano' ? `${t.pairs?.length ?? 0} parejas` : `${t.players.length} jugadores`} · {t.matches.length + bracketPlayedCount(t)} partidos
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showPremiumModal && <PremiumModal onClose={() => setShowPremiumModal(false)} />}

      {showRankStory && (
        <SnapshotModal
          filename={`ranking${groupName ? "-" + groupName : ""}.png`}
          onClose={() => setShowRankStory(false)}
          story={
            <RankingStory
              groupName={groupName}
              rows={rankStoryRows}
              mode={rankMode}
              scope={showPairTable ? 'pairs' : 'players'}
              tournamentsCount={tournaments.length}
              hiddenCount={rankStoryAll.length - rankStoryRows.length}
              note={showPairTable && !allPairMode
                ? `Sólo torneos de parejas fijas (${tournaments.filter((t) => t.mode === 'pairs').length} de ${tournaments.length})`
                : null}
            />
          }
        />
      )}

      {showStory && (
        <SnapshotModal
          filename={`stats-categoria${groupName ? "-" + groupName : ""}.png`}
          onClose={() => setShowStory(false)}
          story={
            <CategoryStory
              groupName={groupName}
              tournamentsCount={tournaments.length}
              totalMatches={totalMatches}
              isPremium={ownerIsPremium}
              champion={storyChampion}
              bestPlayer={topPlayerWins ? { name: topPlayerWins.label, wins: topPlayerWins.pg } : null}
              bestPair={canShowPairs && topPairWins ? { label: topPairWins.label, record: `${topPairWins.pg}/${topPairWins.pj}`, tied: topPairWins.tied } : null}
              ranking={storyRanking}
              rankingTitle={showPairTable ? "TOP 5 PAREJAS · GANADOS" : "TOP 5 HISTÓRICO · GANADOS"}
              champions={champRows.slice(0, 3)}
              playersCount={playerBase.length}
              totalGames={storyGames}
              playTime={storyPlayTime}
              topClub={storyClub}
            />
          }
        />
      )}
    </>
  );
}

// pageSize acota la tabla al top N y va sumando de a N: una categoría grande
// llegaba a renderizar cien filas que nadie mira.
function PerPlayerTable({ standings, showTourneys, useLabelKey, movementMap = {}, sortBy = 'wins', pageSize }) {
  const navigate = useNavigate();
  const winsActive = sortBy === 'wins';
  const [limit, setLimit] = useState(pageSize ?? 0);
  const paged   = pageSize ? standings.slice(0, limit) : standings;
  const hidden  = standings.length - paged.length;
  return (
    <div className="mt-4">
      {!showTourneys && !useLabelKey && (
        <div className="font-condensed font-bold text-[13px] tracking-[3px] text-muted mb-3">RENDIMIENTO POR JUGADOR</div>
      )}
      {/* Header */}
      <div className="flex items-center gap-2 px-3.5 mb-2">
        <div className="shrink-0 w-8" />
        <div className="flex-1 min-w-0 text-[10px] font-mono tracking-[2px] text-dim">NOMBRE</div>
        <div className="shrink-0 w-7 text-[10px] font-mono tracking-[2px] text-dim text-center">J</div>
        <div className="shrink-0 w-14 text-[10px] font-mono tracking-[2px] text-dim text-center">WIN RATE</div>
        <div className={`shrink-0 w-7 text-[10px] font-mono tracking-[2px] text-center ${winsActive ? 'text-brand' : 'text-dim'}`}>G</div>
        <div className="shrink-0 w-7 text-[10px] font-mono tracking-[2px] text-dim text-center">P</div>
        <div className={`shrink-0 w-9 text-[10px] font-mono tracking-[2px] text-right ${winsActive ? 'text-dim' : 'text-brand'}`}>%</div>
      </div>

      <div className="flex flex-col gap-2">
        {paged.map((p, i) => {
          const pct = p.pj > 0 ? Math.round((p.pg / p.pj) * 100) : 0;
          const username = p.linked_username ?? null;
          const displayName = useLabelKey ? p.label : p.name;
          const movement = movementMap[p.id ?? p.name] ?? null;
          return (
            <div key={p.id ?? p.name} className="flex items-center gap-2 bg-surface border border-border-mid rounded-md px-3.5 py-2.5">
              <div className="shrink-0 w-8 flex items-center gap-0.5">
                <span className="text-[#666] font-mono font-bold text-[13px]">{i + 1}</span>
                {movement === 'up'   && <span className="text-green   text-[9px] leading-none">▲</span>}
                {movement === 'down' && <span className="text-danger  text-[9px] leading-none">▼</span>}
                {movement === 'new'  && <span className="text-brand   text-[8px] leading-none font-bold font-mono">N</span>}
              </div>
              <div
                className={`flex-1 min-w-0 truncate font-semibold text-white ${username ? 'cursor-pointer hover:text-brand transition-colors' : ''}`}
                onClick={() => username && navigate(`/u/${username}`)}
              >
                {displayName}
              </div>
              <div className="shrink-0 w-7 text-center font-mono text-soft text-[13px]">{p.torneos ?? '-'}</div>
              <div className="shrink-0 w-14">
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-[width] duration-500 ${pct > 60 ? 'bg-brand' : pct > 40 ? 'bg-cyan' : 'bg-danger'}`}
                    style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className={`shrink-0 w-7 text-center font-mono text-[13px] ${winsActive ? 'text-brand font-bold' : 'text-soft'}`}>{p.pg}</div>
              <div className="shrink-0 w-7 text-center font-mono text-soft text-[13px]">{p.pp}</div>
              <div className="shrink-0 w-9 text-right font-mono text-[13px]">
                <span className={pct >= 50 ? "text-brand" : "text-danger"}>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {pageSize > 0 && standings.length > pageSize && (
        <button
          type="button"
          onClick={() => setLimit((v) => (hidden > 0 ? v + pageSize : pageSize))}
          className="mt-3 w-full text-center text-[10px] font-mono text-dim hover:text-white transition-colors cursor-pointer bg-transparent border-none py-1"
        >
          {hidden === 0    ? '▲ Ver menos'
           : hidden <= pageSize ? `▼ Ver ${hidden === 1 ? 'el último' : `los ${hidden} restantes`}`
           : `▼ Ver ${pageSize} más (${hidden} restantes)`}
        </button>
      )}
    </div>
  );
}

function PartnershipsTable({ partnerships, titleOverride }) {
  if (partnerships.length === 0) return null;
  return (
    <div className="mt-6">
      <div className="font-condensed font-bold text-[13px] tracking-[3px] text-muted mb-3">
        {titleOverride ?? "PAREJAS"}
      </div>
      <div className="flex flex-col gap-2">
        {partnerships.map((p, i) => (
          <div key={i} className="flex items-center gap-3 bg-surface border border-border-mid rounded-md px-3.5 py-2.5">
            <div className="flex-1 text-content text-[14px]">{p.label}</div>
            <div className="flex-2">
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-cyan rounded-full" style={{ width: `${p.winRate}%` }} />
              </div>
            </div>
            <div className="min-w-22.5 text-right font-mono text-soft text-[13px]">
              {p.wins}G {p.played - p.wins}P <span className="text-cyan">({p.winRate}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
