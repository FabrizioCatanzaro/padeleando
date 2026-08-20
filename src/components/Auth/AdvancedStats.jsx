// Bloque de estadísticas avanzadas del perfil. Vive aparte porque es lo único
// que usa Recharts (111 KB en red) y sólo se muestra si mirás tu propio perfil,
// siendo premium y con partidos jugados. Importado de forma estática arrastraba
// esa librería a toda visita de perfil, incluida la de un anónimo que nunca la
// ve. ProfileView lo carga con React.lazy.
import { bestMonthOf } from '../../utils/helpers';
import StatTile, { StatTiles } from '../shared/StatTile';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border-strong rounded px-3 py-2 text-xs font-mono">
      <div className="text-muted mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}{p.unit ?? ''}</div>
      ))}
    </div>
  );
}

// ── Heatmap de actividad ──────────────────────────────────────────────────────
// Rampa secuencial: un solo matiz, luminosidad monótona. Antes eran cuatro
// alfas del amarillo de marca sobre negro, que en tema claro se veían como
// nada. Ahora son escalones opacos con su propio valor en cada tema.
const HEATMAP_COLORS = [
  'var(--color-heat-0)',   // 0 — sin actividad
  'var(--color-heat-1)',   // 1
  'var(--color-heat-2)',   // 2
  'var(--color-heat-3)',   // 3
  'var(--color-heat-4)',   // 4+
];

function heatColor(n) {
  if (n <= 0) return HEATMAP_COLORS[0];
  if (n === 1) return HEATMAP_COLORS[1];
  if (n === 2) return HEATMAP_COLORS[2];
  if (n === 3) return HEATMAP_COLORS[3];
  return HEATMAP_COLORS[4];
}

function ActivityHeatmap({ dailyActivity }) {
  const activityMap = Object.fromEntries((dailyActivity ?? []).map(d => [d.day, d.partidos]));
  // Sin actividad era una grilla de 119 casilleros apagados: ocupaba el mismo
  // espacio que el gráfico lleno y no decía nada.
  if (!dailyActivity?.length) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Arrancar desde el lunes de hace 52 semanas
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  const dow = start.getDay();
  start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));

  const weeks = [];
  const cur = new Date(start);
  while (cur <= today) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      const isFuture = cur > today;
      week.push({
        date: dateStr,
        n: isFuture ? -1 : (activityMap[dateStr] ?? 0),
        label: isFuture ? '' : cur.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' }),
      });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  // Etiquetas de mes (primer semana visible de cada mes)
  const monthLabels = [];
  weeks.forEach((week, wi) => {
    const d = new Date(week[0].date);
    if (d.getDate() <= 7 && (!monthLabels.length || monthLabels[monthLabels.length - 1].wi !== wi - 1)) {
      monthLabels.push({ wi, label: d.toLocaleDateString('es-AR', { month: 'short' }) });
    }
  });

  const CELL = 11;
  const GAP  = 2;
  const STEP = CELL + GAP;
  const DAY_LABELS = ['Lun', '', 'Mié', '', 'Vie', '', ''];

  return (
    <div>
      <div className="text-[10px] font-mono tracking-[2px] text-muted mb-3">ACTIVIDAD (ÚLTIMOS 12 MESES)</div>
      <div className="overflow-x-auto pb-2">
        <div style={{ display: 'inline-flex', flexDirection: 'column', minWidth: 'max-content' }}>
          {/* Etiquetas de mes */}
          <div style={{ display: 'flex', marginLeft: 28, marginBottom: 3 }}>
            {weeks.map((_, wi) => {
              const lbl = monthLabels.find(m => m.wi === wi);
              return (
                <div key={wi} style={{ width: STEP, flexShrink: 0, fontSize: 9, color: 'var(--color-muted)', fontFamily: 'monospace' }}>
                  {lbl?.label ?? ''}
                </div>
              );
            })}
          </div>
          {/* Filas (días) */}
          {Array.from({ length: 7 }, (_, di) => (
            <div key={di} style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: GAP }}>
              <div style={{ width: 26, fontSize: 8, color: 'var(--color-dim)', fontFamily: 'monospace', textAlign: 'right', paddingRight: 4, flexShrink: 0 }}>
                {DAY_LABELS[di]}
              </div>
              {weeks.map((week, wi) => {
                const cell = week[di];
                if (!cell) return <div key={wi} style={{ width: CELL, height: CELL, marginRight: GAP }} />;
                return (
                  <div
                    key={wi}
                    title={cell.n > 0 ? `${cell.label}: ${cell.n} ${cell.n === 1 ? 'partido' : 'partidos'}` : cell.label || ''}
                    style={{
                      width: CELL, height: CELL,
                      borderRadius: 2,
                      background: cell.n < 0 ? 'transparent' : heatColor(cell.n),
                      marginRight: GAP,
                      flexShrink: 0,
                    }}
                  />
                );
              })}
            </div>
          ))}
          {/* Leyenda */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 6, marginLeft: 28 }}>
            <span style={{ fontSize: 9, color: 'var(--color-dim)', fontFamily: 'monospace', marginRight: 2 }}>Menos</span>
            {HEATMAP_COLORS.map((bg, i) => (
              <div key={i} style={{ width: CELL, height: CELL, borderRadius: 2, background: bg, flexShrink: 0 }} />
            ))}
            <span style={{ fontSize: 9, color: 'var(--color-dim)', fontFamily: 'monospace', marginLeft: 2 }}>Más</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// La semana arranca el lunes; el backend usa el DOW de Postgres (0 = domingo).
const WEEK = [
  { dow: 1, label: 'Lun', full: 'Lunes' },     { dow: 2, label: 'Mar', full: 'Martes' },
  { dow: 3, label: 'Mié', full: 'Miércoles' }, { dow: 4, label: 'Jue', full: 'Jueves' },
  { dow: 5, label: 'Vie', full: 'Viernes' },   { dow: 6, label: 'Sáb', full: 'Sábado' },
  { dow: 0, label: 'Dom', full: 'Domingo' },
];

function WeekdayStats({ weekdayStats }) {
  const byDow = Object.fromEntries((weekdayStats ?? []).map((w) => [w.dow, w]));
  const rows = WEEK.map(({ dow, label, full }) => {
    const row = byDow[dow];
    const partidos = row?.partidos ?? 0;
    const victorias = row?.victorias ?? 0;
    return { label, full, partidos, victorias, winRate: partidos > 0 ? Math.round((victorias / partidos) * 100) : 0 };
  });
  const total = rows.reduce((acc, r) => acc + r.partidos, 0);
  if (total === 0) return null;

  const favorito = rows.reduce((best, r) =>
    r.partidos > best.partidos || (r.partidos === best.partidos && r.winRate > best.winRate) ? r : best, rows[0]);

  // Con uno o dos días activos el gráfico serían cinco barras en cero.
  const activeDays = rows.filter((r) => r.partidos > 0).length;

  return (
    <div className="mb-6">
      <div className="text-[10px] font-mono tracking-[2px] text-muted mb-3">POR DÍA DE LA SEMANA</div>
      {favorito.partidos > 0 && (
        <div className="bg-base rounded-lg px-4 py-3 border border-border-strong mb-3">
          <div className="font-condensed font-black text-[22px] text-white leading-none">{favorito.full}</div>
          <div className="text-[10px] font-mono mt-1.5 tracking-widest" style={{ color: 'var(--color-dim)' }}>TU DÍA</div>
          <div className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--color-muted)' }}>
            {favorito.partidos} {favorito.partidos === 1 ? 'partido' : 'partidos'} · {favorito.winRate}% de victorias
          </div>
          <div className="h-0.5 rounded-full mt-2 bg-cyan opacity-40" />
        </div>
      )}
      {activeDays >= 3 && (
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={rows} margin={{ top: 0, right: 0, left: -28, bottom: 0 }} barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'var(--color-dim)', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--color-dim)', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'color-mix(in srgb, var(--color-content) 6%, transparent)' }} />
            <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--color-muted)', paddingTop: 4 }} />
            <Bar dataKey="partidos" name="Partidos" fill="var(--color-chart-2)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="victorias" name="Victorias" fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
      {activeDays === 2 && (
        <div className="text-[10px] font-mono text-dim">
          {rows.filter((r) => r.partidos > 0).map((r) => `${r.full}: ${r.partidos} (${r.winRate}%)`).join(' · ')}
        </div>
      )}
    </div>
  );
}

function fmtDuracion(segundos) {
  const min = Math.round(segundos / 60);
  if (min < 60) return `${min} m`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} m`;
}

// ── Estadísticas avanzadas (premium) ─────────────────────────────────────────
export default function AdvancedStats({ stats, monthlyStats, dailyActivity, weekdayStats }) {
  // Los tres cortes (por día, por mes, actividad diaria) necesitan historial.
  // Con pocos partidos llegan vacíos y antes se reservaba el espacio igual:
  // tres gráficos en blanco. Un aviso corto explica mejor que un hueco.
  const sinHistorial =
    !weekdayStats?.length && !monthlyStats?.length && !dailyActivity?.length;

  if (sinHistorial) {
    return (
      <div className="border border-dashed border-border-strong rounded-lg p-8 text-center mb-6">
        <div className="font-condensed font-bold text-[15px] text-white">
          Todavía no hay suficientes partidos
        </div>
        <p className="text-[13px] text-muted font-sans leading-relaxed mt-2 mb-0 max-w-sm mx-auto">
          Cuando juegues unos cuantos más vas a ver en qué días te va mejor,
          tu mejor racha y cómo venís mes a mes.
        </p>
      </div>
    );
  }

  const gf   = stats.games_favor  ?? 0;
  const gc   = stats.games_contra ?? 0;
  const diff = gf - gc;

  // Rellenar meses faltantes en los últimos 12
  const filledMonths = (() => {
    const map = Object.fromEntries((monthlyStats ?? []).map(m => [m.month, m]));
    const result = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
      const row = map[key];
      result.push({
        month: label,
        partidos:  row?.partidos  ?? 0,
        victorias: row?.victorias ?? 0,
        winRate:   row?.partidos > 0 ? Math.round((row.victorias / row.partidos) * 100) : 0,
      });
    }
    return result;
  })();

  const timedMatches = stats.partidos_con_duracion ?? 0;
  const setsTotal = (stats.sets?.sets_favor ?? 0) + (stats.sets?.sets_contra ?? 0);
  const setsPct   = setsTotal > 0 ? Math.round((stats.sets.sets_favor / setsTotal) * 100) : 0;
  const tightRate  = stats.ajustados > 0 ? Math.round((stats.ajustados_ganados / stats.ajustados) * 100) : 0;

  const activeMonths = filledMonths.filter(m => m.partidos > 0).length;
  const avgPerMonth  = activeMonths > 0 ? (stats.partidos / activeMonths).toFixed(1) : '—';

  const bestMonth = bestMonthOf(monthlyStats);

  return (
    <div className="mb-6">
      {/* El título y el sello PREMIUM los pone la pestaña: acá adentro serían
          un segundo encabezado pegado al primero. */}
      <StatTiles>
        <StatTile
          value={stats.racha_max ?? 0}
          label="Mejor racha"
          sub={(stats.racha_max ?? 0) === 1 ? 'victoria al hilo' : 'victorias al hilo'}
          tone={(stats.racha_max ?? 0) > 0 ? 'brand' : 'off'}
        />
        {bestMonth ? (
          <StatTile
            // En media columna no entra el año de cuatro cifras: ahí va
            // abreviado ("Julio '26") y a partir de sm, completo.
            value={(
              <span className="text-[20px]">
                {bestMonth.mes}{' '}
                <span className="sm:hidden">&apos;{bestMonth.anio.slice(-2)}</span>
                <span className="hidden sm:inline">{bestMonth.anio}</span>
              </span>
            )}
            label="Mejor mes"
            sub={`${bestMonth.partidos} PJ · ${bestMonth.victorias} V`}
          />
        ) : (
          <StatTile value="—" label="Mejor mes" sub="falta un mes completo" tone="off" />
        )}
        <StatTile value={activeMonths} label="Meses activos" sub="últimos 12 meses" />
        <StatTile value={avgPerMonth} label="Prom. partidos/mes" sub="en meses activos" />
      </StatTiles>

      {/* Gráfico de barras — partidos + victorias por mes */}
      <div className="mt-3 bg-surface border border-border-mid rounded-xl p-4">
        <div className="text-[10px] font-mono tracking-[2px] text-muted mb-3">PARTIDOS POR MES</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={filledMonths} margin={{ top: 0, right: 0, left: -28, bottom: 0 }} barSize={10} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'var(--color-dim)', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--color-dim)', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'color-mix(in srgb, var(--color-content) 6%, transparent)' }} />
            <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--color-muted)', paddingTop: 4 }} />
            <Bar dataKey="partidos" name="Partidos" fill="var(--color-chart-2)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="victorias" name="Victorias" fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de líneas — win rate por mes */}
      <div className="mt-3 bg-surface border border-border-mid rounded-xl p-4">
        <div className="text-[10px] font-mono tracking-[2px] text-muted mb-3">WIN RATE % POR MES</div>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={filledMonths} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'var(--color-dim)', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: 'var(--color-dim)', fontSize: 9 }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'color-mix(in srgb, var(--color-content) 15%, transparent)' }} />
            <Line
              type="monotone"
              dataKey="winRate"
              name="Win Rate"
              unit="%"
              stroke="var(--color-chart-1)"
              strokeWidth={2}
              dot={{ fill: 'var(--color-brand)', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Rendimiento por día de la semana */}
      <div className="mt-3">
        <WeekdayStats weekdayStats={weekdayStats} />
      </div>

      {/* Heatmap de actividad */}
      <ActivityHeatmap dailyActivity={dailyActivity} />

      {/* El detalle fino va al final: son cifras para mirar de a una, no el
          titular de la pestaña. */}
      <StatTiles className="mt-3">
        <StatTile value={gf} label="Games a favor" tone={gf > 0 ? 'green' : 'off'} />
        <StatTile value={gc} label="Games en contra" tone={gc > 0 ? 'danger' : 'off'} />
        <StatTile
          value={`${diff > 0 ? '+' : ''}${diff}`}
          label="Diferencia"
          tone={diff > 0 ? 'green' : diff < 0 ? 'danger' : 'default'}
        />
        {stats.sets?.disponible && (
          <StatTile
            value={`${stats.sets.sets_favor}-${stats.sets.sets_contra}`}
            label="Sets"
            sub={`${setsPct}% ganados · ${stats.sets.partidos} partidos a tres`}
          />
        )}
        {stats.sets?.disponible && (
          <StatTile
            value={stats.sets.remontadas}
            label="Remontadas"
            sub="iba perdiendo y ganó"
            tone={stats.sets.remontadas > 0 ? 'brand' : 'off'}
          />
        )}
        {(stats.ajustados ?? 0) > 0 && (
          <StatTile
            value={`${stats.ajustados_ganados}/${stats.ajustados}`}
            label="Partidos parejos"
            sub={`${tightRate}% de los definidos por 1 game`}
            tone={tightRate >= 60 ? 'green' : tightRate >= 40 ? 'brand' : 'danger'}
          />
        )}
        {(stats.palizas_ganadas > 0 || stats.palizas_sufridas > 0) && (
          <StatTile
            value={`${stats.palizas_ganadas}-${stats.palizas_sufridas}`}
            label="Palizas"
            sub="dadas / sufridas · 6-0"
            tone={stats.palizas_ganadas >= stats.palizas_sufridas ? 'green' : 'danger'}
          />
        )}
        {timedMatches > 0 && (
          <StatTile
            value={<span className="text-[20px]">{fmtDuracion(stats.segundos_jugados ?? 0)}</span>}
            label="En cancha"
            sub={`${timedMatches} de ${stats.partidos} con tiempo · ${fmtDuracion(stats.segundos_jugados / timedMatches)} promedio`}
          />
        )}
      </StatTiles>
    </div>
  );
}
