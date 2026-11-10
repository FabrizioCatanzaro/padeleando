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

// Celular: posición, nombre, Pts y Dif. Escritorio: todas las columnas.
const ROW_GRID = 'grid grid-cols-[28px_minmax(0,1fr)_44px_48px] sm:grid-cols-[32px_minmax(0,1fr)_48px_64px_64px_48px_48px_52px_72px] gap-2 items-center';

const formText = (form) => (form.length ? form.map((r) => (r === 'W' ? 'Ganó' : 'Perdió')).join(' · ') : 'Sin partidos');

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

  // Con cuadro (americano o playoffs) el campeón sale de la final, no de la tabla.
  const champions = tournament.status === 'finished' && tournament.format !== 'americano' && !tournament.bracket
    ? leaders
    : [];
  const championsCount = hasPairs ? champions.length * 2 : champions.length;
  const championsLabel = championsCount > 1 ? "Campeones" : "Campeón";
  const [openId, setOpenId] = useState(null);

  return (
    <div>
      {champions.length > 0 && (
        <section aria-label={championsLabel} className="mb-5 flex items-center gap-3 rounded-xl border border-brand/35 bg-brand/5 px-4 py-3">
          <Trophy size={28} className="shrink-0 text-brand" aria-hidden="true" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[12px] font-semibold text-brand">{championsLabel}</span>
            {champions.map((c) => (
              <span key={c.id} className="text-[16px] sm:text-[18px] font-bold text-white leading-snug">{c.name}</span>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="m-0 font-condensed font-semibold text-[15px] text-white">Tabla de posiciones</h2>
        {displayRows.length > 0 && <ShareStoryButton onClick={() => setShowStory(true)} />}
      </div>

      <div className="rounded-xl border border-border-mid overflow-hidden bg-surface">
        <div className={`${ROW_GRID} px-3 py-2 text-[12px] text-secondary border-b border-border`}>
          <span>#</span>
          <span>{hasPairs ? "Pareja" : "Jugador"}</span>
          <span className="text-right">Pts</span>
          <span className="hidden sm:block text-right">Jugados</span>
          <span className="hidden sm:block text-right">Ganados</span>
          <span className="hidden sm:block text-right" title="Games a favor">GF</span>
          <span className="hidden sm:block text-right" title="Games en contra">GC</span>
          <span className="text-right">Dif.</span>
          <span className="hidden sm:block text-center">Últimos 3</span>
        </div>
        {displayRows.map((r, i) => {
          const top  = isTop(r);
          const form = calcForm(r.playerIds, tournament.matches);
          const dif  = r.sf - r.sc;
          const open = openId === r.id;
          return (
            <div key={r.id} className={`border-b border-border last:border-b-0 ${top ? 'bg-brand/5' : ''}`}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : r.id)}
                aria-expanded={open}
                className={`${ROW_GRID} w-full px-3 py-3 bg-transparent border-0 text-left cursor-pointer sm:cursor-default ${open ? 'bg-surface-alt sm:bg-transparent' : ''}`}
              >
                <span className="flex items-center">
                  {top && !isAmericano
                    ? <Trophy size={15} className="text-amber-400" aria-label="Primero" />
                    : <span className={`text-[15px] font-bold ${POS_COLOR[i] ?? 'text-soft'}`}>{i + 1}</span>}
                </span>
                <span className="flex items-center gap-2 min-w-0">
                  <span className="hidden sm:block shrink-0">
                    {r.p1Name
                      ? <PairAvatar name1={r.p1Name} name2={r.p2Name} src1={r.src1} src2={r.src2} size={26} />
                      : <PlayerAvatar name={r.name} src={r.src} size={26} premium={!!(playerById[String(r.id)]?.is_premium)} />}
                  </span>
                  {r.p1Name ? (
                    <span className="flex flex-col min-w-0 text-[15px] font-semibold text-white leading-snug">
                      <span>{r.p1Name}</span>
                      <span>{r.p2Name}</span>
                      {r.withdrawn && <span className="text-[12px] font-medium text-muted">Se retiró</span>}
                    </span>
                  ) : (
                    <span className="text-[15px] font-semibold text-white leading-snug min-w-0">{r.name}</span>
                  )}
                </span>
                <span className="text-right font-condensed font-bold text-[17px] text-brand">{r.pg * 3}</span>
                <span className="hidden sm:block text-right text-[14px] text-content">{r.pj}</span>
                <span className="hidden sm:block text-right text-[14px] text-content">{r.pg}</span>
                <span className="hidden sm:block text-right text-[14px] text-content">{r.sf}</span>
                <span className="hidden sm:block text-right text-[14px] text-content">{r.sc}</span>
                <span className={`text-right text-[15px] font-bold ${dif >= 0 ? 'text-green' : 'text-danger'}`}>
                  {dif > 0 ? '+' : ''}{dif}
                </span>
                <span className="hidden sm:flex justify-center"><FormDots form={form} /></span>
              </button>
              {open && (
                <div className="sm:hidden grid grid-cols-3 gap-2 px-3 pb-3 pl-12">
                  <div className="flex flex-col gap-0.5"><span className="text-[12px] text-secondary">Jugados</span><span className="text-[15px] font-semibold text-white">{r.pj}</span></div>
                  <div className="flex flex-col gap-0.5"><span className="text-[12px] text-secondary">Ganados</span><span className="text-[15px] font-semibold text-white">{r.pg}</span></div>
                  <div className="flex flex-col gap-0.5"><span className="text-[12px] text-secondary">Games</span><span className="text-[15px] font-semibold text-white">{r.sf} a {r.sc}</span></div>
                  <div className="col-span-3 text-[13px] text-soft">Últimos 3: <span className="font-semibold text-white">{formText(form)}</span></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-2 mb-0 text-[12px] text-secondary leading-relaxed">
        Se ordena por victorias, después diferencia de games.
        <span className="sm:hidden"> Tocá una fila para ver el detalle.</span>
      </p>

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
