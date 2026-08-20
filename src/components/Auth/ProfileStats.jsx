import { useNavigate } from 'react-router-dom';
import { Building2, ChevronRight } from 'lucide-react';
import SectionRule from './SectionRule';
import StatTile, { StatTiles } from '../shared/StatTile';
import PlayerAvatar from '../shared/PlayerAvatar';
import ClubLogo from '../shared/ClubLogo';

// La mitad libre de la pestaña: sale de `stats`, `club_stats` y
// `frequent_partners`, que el servidor manda siempre. Nada de acá depende del
// plan, por eso lleva escrito "siempre visible": el visitante que ve el bloque
// premium tapado tiene que entender qué parte sí está viendo.
export default function ProfileStats({ stats, clubStats = [], partners = [] }) {
  const navigate = useNavigate();
  const partidos  = stats?.partidos ?? 0;
  const victorias = stats?.victorias ?? 0;
  const perdidos  = Math.max(partidos - victorias, 0);
  const pct = partidos > 0 ? Math.round((victorias / partidos) * 100) : 0;

  return (
    <>
      <SectionRule
        action={<span className="shrink-0 text-[10px] tracking-[0.12em] text-dim">SIEMPRE VISIBLE</span>}
      >
        TU JUEGO
      </SectionRule>
      <StatTiles>
        <StatTile value={partidos}  label="Partidos" />
        <StatTile value={victorias} label="Ganados"  tone={victorias > 0 ? 'green'  : 'off'} />
        <StatTile value={perdidos}  label="Perdidos" tone={perdidos  > 0 ? 'danger' : 'off'} />
        <StatTile value={`${pct}%`} label="Victorias" tone={partidos > 0 ? 'brand' : 'off'} />
      </StatTiles>

      <StatTiles className="mt-2.5">
        <StatTile
          value={stats?.torneos ?? 0}
          label="Torneos"
          sub={stats?.torneos_este_mes > 0 ? `${stats.torneos_este_mes} este mes` : 'ninguno este mes'}
        />
        <StatTile
          value={stats?.titulos ?? 0}
          label="Títulos"
          sub={`${stats?.titulos_liga ?? 0} de liga · ${stats?.campeon_americano ?? 0} americanos`}
          tone={(stats?.titulos ?? 0) > 0 ? 'gold' : 'off'}
        />
        <StatTile
          value={stats?.racha ?? 0}
          label="Racha actual"
          sub={stats?.racha > 0 ? 'partidos al hilo' : 'sin racha'}
          tone={stats?.racha > 0 ? 'brand' : 'off'}
        />
        <StatTile
          value={stats?.torneos_americanos ?? 0}
          label="Americanos"
          sub="jugados"
          tone={(stats?.torneos_americanos ?? 0) > 0 ? 'default' : 'off'}
        />
      </StatTiles>

      {clubStats.length > 0 && (
        <>
          <SectionRule>POR CLUB</SectionRule>
          <div className="border border-border-mid rounded-xl overflow-hidden">
            {clubStats.map((c) => {
              const cp = c.partidos > 0 ? Math.round((c.victorias / c.partidos) * 100) : 0;
              return (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/club/${c.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/club/${c.id}`); } }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 bg-surface cursor-pointer hover:bg-surface-alt focus-visible:bg-surface-alt outline-none transition-colors"
                >
                  {c.photo_url
                    ? <ClubLogo name={c.name} src={c.photo_url} size={30} />
                    : (
                      <span className="shrink-0 w-[30px] h-[30px] rounded-lg bg-surface-alt border border-border-mid grid place-items-center">
                        <Building2 size={14} className="text-muted" />
                      </span>
                    )}
                  <div className="min-w-0 flex-1">
                    <div className="font-condensed font-bold text-[14px] text-white truncate">{c.name}</div>
                    <div className="text-[11px] text-muted mt-[3px] truncate">
                      {c.partidos} {c.partidos === 1 ? 'partido' : 'partidos'} · {c.victorias} {c.victorias === 1 ? 'ganado' : 'ganados'}
                    </div>
                  </div>
                  <span className="shrink-0 font-condensed font-bold text-[15px] text-white tabular-nums">{cp}%</span>
                  <ChevronRight size={14} className="shrink-0 text-dim" />
                </div>
              );
            })}
          </div>
        </>
      )}

      {partners.length > 0 && (
        <>
          <SectionRule>POR COMPAÑERO</SectionRule>
          <div className="border border-border-mid rounded-xl overflow-hidden">
            {/* Sin porcentaje: `frequent_partners` trae los partidos juntos, no
                cuántos ganaron. Un % inventado acá sería un dato falso. */}
            {partners.map((p) => {
              const go = p.username ? () => navigate(`/u/${p.username}`) : undefined;
              return (
                <div
                  key={p.partner_key}
                  role={go ? 'button' : undefined}
                  tabIndex={go ? 0 : undefined}
                  onClick={go}
                  onKeyDown={go ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } } : undefined}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 bg-surface outline-none transition-colors ${
                    go ? 'cursor-pointer hover:bg-surface-alt focus-visible:bg-surface-alt' : ''
                  }`}
                >
                  <PlayerAvatar name={p.name} src={p.avatar_url} size={30} premium={p.is_premium} />
                  <div className="min-w-0 flex-1">
                    <div className="font-condensed font-bold text-[14px] text-white truncate">{p.name}</div>
                    <div className="text-[11px] text-muted mt-[3px] truncate">
                      {p.username ? `@${p.username}` : 'Sin cuenta en la app'}
                    </div>
                  </div>
                  <span className="shrink-0 text-right">
                    <span className="block font-condensed font-bold text-[15px] text-white tabular-nums leading-none">
                      {p.partidos_juntos}
                    </span>
                    <span className="block text-[10px] text-dim mt-1">juntos</span>
                  </span>
                  {go && <ChevronRight size={14} className="shrink-0 text-dim" />}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
