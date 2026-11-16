import StoryFrame, { TournamentMeta, ClubBadge } from './StoryFrame';
import { C, fonts } from './story-theme';
import PlayerAvatar, { PairAvatar } from '../shared/PlayerAvatar';

const MEDAL = ['#fbbf24', '#b0b8c8', '#cd7f32'];

function RowAvatar({ row, size }) {
  if (row.p1Name) {
    return <PairAvatar name1={row.p1Name} name2={row.p2Name} src1={row.src1} src2={row.src2} size={size} />;
  }
  return <PlayerAvatar name={row.name} src={row.src} size={size} premium={!!row.is_premium} />;
}

const nameStyle = (isTop) => ({
  fontFamily: fonts.display, fontWeight: 700, fontSize: 34, lineHeight: 1.2,
  color: isTop ? C.brand : C.white,
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
});

// Historia de la tabla de posiciones de un torneo.
// rows: displayRows ya calculadas en Standings.jsx · champions: filas campeonas (puede ser []).
export default function StandingsStory({ tournament, rows = [], champions = [] }) {
  const top = rows.slice(0, champions.length > 0 ? 8 : 9);
  // En modo parejas la tabla lista parejas, no jugadores.
  const hasPairs = tournament.mode === 'pairs' && tournament.pairs?.length > 0;
  const count = hasPairs ? tournament.pairs.length : (tournament.players?.length ?? 0);
  const unit = hasPairs
    ? (count === 1 ? 'pareja' : 'parejas')
    : (count === 1 ? 'jugador' : 'jugadores');
  const matchCount = tournament.matches?.length ?? 0;

  return (
    <StoryFrame
      eyebrow="TABLA DE POSICIONES"
      title={tournament.name}
      subtitle={`${count} ${unit} · ${matchCount} ${matchCount === 1 ? 'partido' : 'partidos'}`}
      meta={<TournamentMeta tournament={tournament} />}
      headerRight={<ClubBadge tournament={tournament} />}
    >
      {champions.length > 0 && (
        <div style={{
          background: `linear-gradient(180deg, ${C.amber}1f, ${C.amber}08)`,
          border: `1px solid ${C.amber}55`, borderRadius: 22,
          padding: '30px 32px', marginBottom: 30,
          display: 'flex', alignItems: 'center', gap: 22,
        }}>
          <div style={{ fontSize: 56, lineHeight: 1 }}>🏆</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, letterSpacing: 5, color: C.amber, fontWeight: 700, marginBottom: 6 }}>
              {champions.length > 1 ? 'CAMPEONES' : 'CAMPEÓN'}
            </div>
            <div style={{
              fontFamily: fonts.display, fontWeight: 800, fontSize: 40, color: C.white, lineHeight: 1.1,
            }}>
              {champions.map((c) => c.name).join(' · ')}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {top.map((r, i) => {
          const pts  = r.pts ?? r.pg * 3;
          const diff = r.sf - r.sc;
          const isTop = i === 0 && champions.length === 0;
          return (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 20,
              background: isTop ? `${C.brand}12` : C.surface,
              border: `1px solid ${isTop ? `${C.brand}55` : C.border}`,
              borderRadius: 18, padding: '20px 26px',
            }}>
              <div style={{
                width: 48, textAlign: 'center', fontFamily: fonts.display, fontWeight: 800,
                fontSize: 34, color: MEDAL[i] ?? C.dim, flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <RowAvatar row={r} size={64} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {r.p1Name ? (
                  // Parejas: un jugador por línea para que ambos nombres se lean
                  // enteros. A 30px las dos líneas (72px) quedan a la altura del
                  // avatar de 64px, así la fila casi no crece.
                  <>
                    <div style={{ ...nameStyle(isTop), fontSize: 30 }}>{r.p1Name}</div>
                    <div style={{ ...nameStyle(isTop), fontSize: 30 }}>{r.p2Name}</div>
                  </>
                ) : (
                  <div style={nameStyle(isTop)}>{r.name}</div>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 90 }}>
                <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 40, color: C.brand, lineHeight: 1 }}>
                  {pts}
                </div>
                <div style={{ fontSize: 20, color: C.muted, marginTop: 4 }}>PTS</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 84 }}>
                <div style={{
                  fontFamily: fonts.display, fontWeight: 700, fontSize: 34,
                  color: diff >= 0 ? C.green : C.danger, lineHeight: 1,
                }}>
                  {diff > 0 ? '+' : ''}{diff}
                </div>
                <div style={{ fontSize: 20, color: C.muted, marginTop: 4 }}>DIF</div>
              </div>
            </div>
          );
        })}
      </div>
    </StoryFrame>
  );
}
