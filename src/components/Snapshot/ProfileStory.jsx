import { Gem } from 'lucide-react';
import StoryFrame, { StatTile } from './StoryFrame';
import { C, fonts } from './story-theme';
import PlayerAvatar from '../shared/PlayerAvatar';
import { calcNivel, bestMonthOf } from '../../utils/helpers';

function fmtDuracion(segundos) {
  const min = Math.round(segundos / 60);
  if (min < 60) return `${min} m`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} m`;
}

// La semana arranca el lunes; el backend usa el DOW de Postgres (0 = domingo).
const WEEK = [
  { dow: 1, full: 'Lunes' },   { dow: 2, full: 'Martes' }, { dow: 3, full: 'Miércoles' },
  { dow: 4, full: 'Jueves' },  { dow: 5, full: 'Viernes' }, { dow: 6, full: 'Sábado' },
  { dow: 0, full: 'Domingo' },
];

// La columna deja 255 px de contenido y el valor va en una sola línea, así que
// los valores de texto ("Julio 2026", "Miércoles") no entran al tamaño de un
// número. Unbounded 800 gasta ~0,65 em por carácter.
function valueFontSize(value) {
  const len = String(value).length;
  if (len <= 8)  return 40;
  if (len <= 11) return 32;
  if (len <= 14) return 26;
  return 22;
}

// Tarjeta compacta del bloque avanzado. Más baja que StatTile porque van hasta
// siete y el alto del lienzo es fijo.
function MiniTile({ value, label, sub, accent = C.brand }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
      padding: '18px 22px', minWidth: 0, overflow: 'hidden',
    }}>
      {/* Alto fijo y apoyado abajo: con tamaños distintos por tarjeta, si no,
          las etiquetas de una misma fila quedaban a distinta altura. */}
      <div style={{ height: 40, display: 'flex', alignItems: 'flex-end' }}>
        <span style={{
          fontFamily: fonts.display, fontWeight: 800, fontSize: valueFontSize(value), lineHeight: 1,
          color: accent, whiteSpace: 'nowrap',
        }}>
          {value}
        </span>
      </div>
      <div style={{ fontSize: 18, letterSpacing: 2.5, color: C.dim, marginTop: 10, fontWeight: 600 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 17, color: C.muted, marginTop: 5 }}>{sub}</div>}
      <div style={{ height: 4, borderRadius: 2, marginTop: 12, background: accent, opacity: 0.4 }} />
    </div>
  );
}

// Las tarjetas avanzadas que tienen dato. Las que hoy dan siempre cero quedan
// fuera a propósito: sets y remontadas (ningún partido al mejor de tres) y
// palizas (no existe un 6-0, los partidos se juegan a 3, 4 o 6 games).
function advancedTiles(stats, monthlyStats, weekdayStats) {
  const tiles = [];

  if ((stats.titulos_liga ?? 0) > 0)
    tiles.push({ value: stats.titulos_liga, label: 'LIGAS GANADAS', accent: C.amber });
  if ((stats.campeon_americano ?? 0) > 0)
    tiles.push({ value: stats.campeon_americano, label: stats.campeon_americano === 1 ? 'AMERICANO GANADO' : 'AMERICANOS GANADOS', accent: '#a84af0' });
  if ((stats.campeon_copa ?? 0) > 0)
    tiles.push({ value: stats.campeon_copa, label: stats.campeon_copa === 1 ? 'COPA GANADA' : 'COPAS GANADAS', accent: C.cyan });
  if ((stats.racha_max ?? 0) > 0)
    tiles.push({ value: stats.racha_max, label: 'MEJOR RACHA', sub: 'victorias seguidas', accent: C.brand });

  const gf = stats.games_favor ?? 0;
  const gc = stats.games_contra ?? 0;
  if (gf + gc > 0) {
    const diff = gf - gc;
    tiles.push({
      value: `${diff > 0 ? '+' : ''}${diff}`,
      label: 'DIF. DE GAMES',
      sub: `${gf} GF · ${gc} GC`,
      accent: diff >= 0 ? C.green : C.danger,
    });
  }

  if ((stats.ajustados ?? 0) > 0) {
    const pct = Math.round((stats.ajustados_ganados / stats.ajustados) * 100);
    tiles.push({
      value: `${pct}%`,
      label: 'EN PARTIDOS PAREJOS',
      sub: `${stats.ajustados_ganados} de ${stats.ajustados} por 1 game`,
      accent: pct >= 60 ? C.green : pct >= 40 ? C.brand : '#f07a4a',
    });
  }

  // La duración no está en todos los partidos: el sub dice sobre cuántos mide.
  const timed = stats.partidos_con_duracion ?? 0;
  if (timed > 0)
    tiles.push({
      value: fmtDuracion(stats.segundos_jugados ?? 0),
      label: 'EN CANCHA',
      sub: `${timed} de ${stats.partidos} con tiempo`,
      accent: C.cyan,
    });

  const favorito = (() => {
    const byDow = Object.fromEntries((weekdayStats ?? []).map((w) => [w.dow, w]));
    const rows = WEEK
      .map(({ dow, full }) => ({ full, partidos: byDow[dow]?.partidos ?? 0, victorias: byDow[dow]?.victorias ?? 0 }))
      .filter((r) => r.partidos > 0);
    if (!rows.length) return null;
    return rows.reduce((best, r) => (r.partidos > best.partidos ? r : best), rows[0]);
  })();
  if (favorito)
    tiles.push({
      value: favorito.full,
      label: 'TU DÍA',
      sub: `${favorito.partidos} ${favorito.partidos === 1 ? 'partido' : 'partidos'} · ${Math.round((favorito.victorias / favorito.partidos) * 100)}%`,
      accent: C.cyan,
    });

  const bestMonth = bestMonthOf(monthlyStats);
  if (bestMonth)
    tiles.push({
      value: bestMonth.label,
      label: 'MEJOR MES',
      sub: `${bestMonth.partidos}PJ · ${bestMonth.victorias}V`,
      accent: '#a84af0',
    });

  return tiles;
}

// Historia del perfil de un usuario.
// `advanced` lo decide el call site: sólo el dueño premium de un perfil exporta
// el bloque avanzado. Un visitante siempre se lleva la captura básica.
export default function ProfileStory({ owner, stats = {}, avatar, advanced = false, monthlyStats = [], weekdayStats = [] }) {
  const partidos  = stats.partidos ?? 0;
  const victorias = stats.victorias ?? 0;
  const torneos   = stats.torneos ?? 0;
  const racha     = stats.racha ?? 0;
  const pct       = partidos > 0 ? Math.round((victorias / partidos) * 100) : 0;
  const pctColor  = pct >= 60 ? C.green : pct >= 40 ? C.brand : '#f07a4a';
  const nivel     = calcNivel(partidos, pct);

  const tiles = advanced ? advancedTiles(stats, monthlyStats, weekdayStats) : [];
  const showAdvanced = tiles.length > 0;

  // Con el bloque avanzado el alto va justo, así que la cabecera se comprime.
  const avatarSize = showAdvanced ? 180 : 240;

  // Sin bloque avanzado los títulos van en tarjetas grandes, que es lo único
  // que se agrega a la captura básica.
  const basicTitles = !showAdvanced
    ? [
        (stats.titulos_liga ?? 0) > 0 && { value: stats.titulos_liga, label: stats.titulos_liga === 1 ? 'LIGA GANADA' : 'LIGAS GANADAS', accent: C.amber },
        (stats.campeon_americano ?? 0) > 0 && { value: stats.campeon_americano, label: stats.campeon_americano === 1 ? 'AMERICANO' : 'AMERICANOS', accent: '#a84af0' },
        (stats.campeon_copa ?? 0) > 0 && { value: stats.campeon_copa, label: stats.campeon_copa === 1 ? 'COPA' : 'COPAS', accent: C.cyan },
      ].filter(Boolean)
    : [];

  return (
    <StoryFrame eyebrow="PERFIL DE JUGADOR" title="">
      {/* Cabecera del jugador */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: -20 }}>
        {/* El diamante inclinado marca la cuenta premium, igual que en la app. */}
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <PlayerAvatar name={owner.name} src={avatar ?? owner.avatar_url} size={avatarSize} premium={!!owner.is_premium} />
          {owner.is_premium && (
            <div style={{
              position: 'absolute',
              right: -Math.round(avatarSize * 0.11),
              top: Math.round(avatarSize * 0.08),
              transform: 'rotate(18deg)',
              filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.55))',
              lineHeight: 0,
            }}>
              <Gem size={Math.round(avatarSize * 0.3)} color={C.amber} strokeWidth={1.6} />
            </div>
          )}
        </div>
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 60, color: C.white, marginTop: 34, lineHeight: 1.05 }}>
          {owner.name}
        </div>
        <div style={{ fontSize: 30, color: C.secondary, marginTop: 12 }}>@{owner.username}</div>
        {nivel && (
          <div style={{
            marginTop: 22, padding: '10px 26px', borderRadius: 999,
            border: `1px solid ${nivel.color}66`, background: `${nivel.color}18`,
            color: nivel.color, fontSize: 24, letterSpacing: 4, fontWeight: 700,
          }}>
            {nivel.label.toUpperCase()}
          </div>
        )}
      </div>

      {/* Stats principales */}
      <div style={{ display: 'flex', gap: 22, marginTop: showAdvanced ? 40 : 64 }}>
        <StatTile value={torneos}   label="TORNEOS"  accent={C.cyan} />
        <StatTile value={partidos}  label="PARTIDOS" accent={C.green} />
        <StatTile value={racha}     label="RACHA"    accent={racha > 0 ? C.brand : C.faint} sub={racha === 1 ? 'victoria' : 'victorias'} />
      </div>

      {/* Barra de win rate */}
      {partidos > 0 && (
        <div style={{
          marginTop: 24, background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 20, padding: '32px 34px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
            <span style={{ fontSize: 24, letterSpacing: 3, color: C.muted, fontWeight: 600 }}>% VICTORIAS</span>
            <span style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 52, color: pctColor, lineHeight: 1 }}>{pct}%</span>
          </div>
          <div style={{ height: 18, borderRadius: 999, background: '#111', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pctColor, borderRadius: 999 }} />
          </div>
          <div style={{ fontSize: 24, color: C.dim, marginTop: 16 }}>
            {victorias} {victorias === 1 ? 'victoria' : 'victorias'} en {partidos} partidos
          </div>
        </div>
      )}

      {basicTitles.length > 0 && (
        <div style={{ display: 'flex', gap: 22, marginTop: 24 }}>
          {basicTitles.map((t) => <StatTile key={t.label} {...t} />)}
        </div>
      )}

      {showAdvanced && (
        <div style={{ marginTop: 26 }}>
          <div style={{ fontSize: 20, letterSpacing: 4, fontWeight: 700, color: C.brand, marginBottom: 14 }}>
            ESTADÍSTICAS PREMIUM
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {tiles.map((t) => <MiniTile key={t.label} {...t} />)}
          </div>
        </div>
      )}
    </StoryFrame>
  );
}
