import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Pencil, Share2, Eye, QrCode, Tv, Radio, Lock, User, Link2,
} from 'lucide-react';
import { fmtHora, tournamentCourts, bracketPhaseLabel, isDeletedAccount } from '../../utils/helpers';
import Badge from '../shared/Badge';
import Btn from '../shared/Btn';
import PlayerAvatar from '../shared/PlayerAvatar';
import SignupPricePill from '../shared/SignupPricePill';

// Reloj del partido en curso. Vive acá y no adentro del formulario: el que mira
// no tiene ningún formulario abierto, y el organizador puede cerrar el suyo sin
// que el cronómetro del espectador se quede sin dueño.
function LiveClock({ startedAt }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return undefined;
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  if (!startedAt) return null;
  const s = Math.max(0, Math.floor((ahora - startedAt) / 1000));
  return (
    <span className="text-green tabular-nums">
      {String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}
    </span>
  );
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** '2026-08-11' → 'Lun 11/8'. Sin fecha del evento no se inventa una. */
function fechaCorta(d) {
  if (!d) return null;
  const str = String(d).slice(0, 10);
  const date = new Date(`${str}T00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return `${DIAS[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
}

/**
 * Menú Compartir: link, QR, Modo TV y, para el organizador, ver la página como
 * la ve un jugador. Antes eran cuatro íconos sueltos sin texto (auditoría UI).
 */
function ShareMenu({ isOwner, onShare, onQr, onTv, onSpectator }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const cerrar = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', cerrar);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', cerrar); document.removeEventListener('keydown', esc); };
  }, [open]);
  const item = (Icon, label, fn) => (
    <button
      type="button"
      role="menuitem"
      onClick={() => { setOpen(false); fn?.(); }}
      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-transparent border-0 text-left text-[14px] text-content hover:bg-surface-alt hover:text-white cursor-pointer"
    >
      <Icon size={16} className="shrink-0 text-soft" /> {label}
    </button>
  );
  return (
    <div ref={ref} className="relative">
      <Btn variant="primary" size="sm" icon={Share2} onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
        Compartir
      </Btn>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 z-50 min-w-56 py-1.5 bg-surface border border-border-strong rounded-xl shadow-xl">
          {item(Link2, 'Compartir link', onShare)}
          {item(QrCode, 'Código QR', onQr)}
          {item(Tv, 'Modo TV', onTv)}
          {isOwner && item(Eye, 'Ver como jugador', onSpectator)}
        </div>
      )}
    </div>
  );
}

/**
 * Encabezado del torneo (auditoría UI, tanda 2). En un celular el riel de seis
 * celdas ocupaba la primera pantalla y cortaba la fecha y el club. Ahora son
 * dos líneas: cuándo y dónde, y qué pasa en el torneo según su estado.
 */
export default function TournamentHero({
  tournament, groupId, groupName, groupIsPublic = true, owner = null,
  isOwner, playedCount, scheduledCount = 0, statusMeta,
  isPairs, signup, tvActivo = false, draft = null,
  onEditName, onShare, onQr, onTv, onSpectator, onManage,
}) {
  const navigate = useNavigate();
  // En un club con varias canchas se juegan varios partidos a la vez: el
  // encabezado los muestra todos. Los que ya arrancaron van primero.
  const live = (Array.isArray(tournament.live_match) ? tournament.live_match : [])
    .filter(Boolean)
    .slice()
    .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
  const enJuego = live.filter((m) => m.startedAt != null).length;
  const canchas = tournamentCourts(tournament);
  const total = playedCount + scheduledCount;

  // Línea 1: cuándo y dónde.
  const fecha = fechaCorta(tournament.event_date);
  const hora = tournament.event_time ? fmtHora(tournament.event_time) : null;
  const canchasTxt = canchas > 0 ? `${canchas} ${canchas === 1 ? 'cancha' : 'canchas'}` : null;

  // Línea 2: los números del torneo, cuando ya se pueden mostrar.
  const jugadores = tournament.players.filter((p) => !p.removed).length;
  const conteo = tournament.roster_hidden ? null : [
    `${jugadores} ${jugadores === 1 ? 'jugador' : 'jugadores'}`,
    isPairs ? `${tournament.pairs.length} ${tournament.pairs.length === 1 ? 'pareja' : 'parejas'}` : null,
    playedCount > 0 ? `${playedCount} ${playedCount === 1 ? 'partido jugado' : 'partidos jugados'}` : null,
  ].filter(Boolean).join(' · ');

  const formato = tournament.format === 'americano'
    ? 'Americano'
    : tournament.mode === 'pairs' ? 'Liga · parejas fijas' : 'Liga · equipos libres';

  return (
    <div>
      {/* Barra de contexto: volver, la categoría y Compartir. */}
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-4">
        <div className="flex items-center gap-2 min-w-0">
          <Btn
            size="sm" icon={ChevronLeft}
            onClick={() => (groupIsPublic && groupId ? navigate(`/cat/${groupId}`) : navigate(-1))}
            aria-label="Volver"
          />
          {groupName && (
            groupIsPublic && groupId ? (
              <button
                type="button"
                onClick={() => navigate(`/cat/${groupId}`)}
                className="inline-flex items-center gap-1.5 min-w-0 bg-surface border border-border-mid rounded-full px-3 py-1.5 cursor-pointer hover:border-border-strong transition-colors"
              >
                <span className="text-[13px] text-content truncate max-w-[220px]">{groupName}</span>
              </button>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 min-w-0 bg-surface border border-border-mid rounded-full px-3 py-1.5"
                title="La categoría es privada"
              >
                <span className="text-[13px] text-content truncate max-w-[220px]">{groupName}</span>
                <Lock size={12} className="text-yellow-400 shrink-0" />
              </span>
            )
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {tvActivo && <Btn size="sm" icon={Tv} onClick={onTv} variant="secondary">Salir de TV</Btn>}
          <ShareMenu isOwner={isOwner} onShare={onShare} onQr={onQr} onTv={onTv} onSpectator={onSpectator} />
        </div>
      </div>

      {/* Identidad */}
      <div className="px-5 sm:px-6 pt-4 pb-4 flex flex-col gap-2 border-b border-border">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Badge variant="status" color={statusMeta.color} icon={statusMeta.icon} pulse={statusMeta.pulse}>
            {statusMeta.label}
          </Badge>
          <span className="text-[13px] text-soft">{formato}</span>
        </div>
        <div className="flex items-start gap-2.5">
          <h1 className="font-condensed font-black text-[26px] sm:text-[31px] text-white leading-tight m-0 min-w-0">
            {tournament.name}
          </h1>
          {isOwner && (
            <button
              type="button"
              onClick={onEditName}
              title="Editar el nombre"
              aria-label="Editar el nombre"
              className="shrink-0 mt-1 bg-transparent text-muted border border-border-strong p-1.5 cursor-pointer rounded-sm hover:text-white transition-colors"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>

        {/* Línea 1: cuándo y dónde. */}
        <p className="m-0 text-[14px] text-soft leading-relaxed">
          <span className={fecha ? 'text-white font-semibold' : 'text-secondary'}>{fecha ?? 'Fecha a confirmar'}</span>
          {hora && <> · {hora}</>}
          {tournament.club_id ? (
            <> · <button
              type="button"
              onClick={() => navigate(`/club/${tournament.club_id}`)}
              className="inline bg-transparent border-0 p-0 text-[14px] text-content underline decoration-border-strong underline-offset-2 cursor-pointer hover:text-white"
            >{tournament.club_name ?? 'Club'}</button></>
          ) : null}
          {canchasTxt && <> · {canchasTxt}</>}
          {isOwner && (
            <> <button
              type="button"
              onClick={onManage}
              className="inline-flex items-center gap-1 ml-1 bg-transparent border-0 p-0 text-[13px] text-brand cursor-pointer hover:underline"
            ><Pencil size={12} /> Editar</button></>
          )}
        </p>

        {/* Línea 2: lo que importa según el estado. */}
        {draft && isOwner ? (
          <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-brand/35 bg-brand/5 px-3.5 py-2.5">
            <span className="text-[14px] font-semibold text-white">{draft}</span>
            <Btn size="sm" variant="primary" onClick={onManage}>
              {isPairs ? 'Cargar parejas' : 'Cargar jugadores'}
            </Btn>
          </div>
        ) : conteo ? (
          <p className="m-0 text-[13px] text-secondary">{conteo}</p>
        ) : null}

        <div className="flex items-center gap-2 flex-wrap">
          <SignupPricePill signup={signup} />
          {owner?.username && (
            isDeletedAccount(owner.username) ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
                <User size={13} /> Cuenta eliminada
              </span>
            ) : (
              <button
                type="button"
                onClick={() => navigate(`/u/${owner.username}`)}
                title={`Ver el perfil de @${owner.username}`}
                className="inline-flex items-center gap-1.5 bg-transparent border-0 p-0 text-[13px] text-secondary hover:text-white cursor-pointer transition-colors"
              >
                <PlayerAvatar
                  name={owner.name ?? owner.username}
                  src={owner.avatar_url ?? null}
                  size={20}
                  premium={!!owner.isPremium}
                />
                Organiza @{owner.username}
              </button>
            )
          )}
        </div>
      </div>

      {/* Lo que se está jugando ahora. */}
      {live.length > 0 && (
        <div className="mx-5 sm:mx-6 mt-4 flex flex-col gap-2">
          {live.length > 1 && (
            <h2 className="m-0 text-[13px] font-bold text-white">
              {enJuego === live.length ? `${live.length} partidos en juego`
                : enJuego === 0        ? `${live.length} partidos por empezar`
                : `${enJuego} en juego · ${live.length - enJuego} por empezar`}
            </h2>
          )}
          {live.map((m, i) => {
            const jugandose = m.startedAt != null;
            const tono = jugandose ? 'var(--color-green)' : 'var(--color-cyan)';
            const fase = bracketPhaseLabel(m.phase);
            return (
            <div
              key={`${m.team1Label}|${m.team2Label}|${m.court ?? i}`}
              className="flex flex-col gap-1.5 rounded-xl px-4 py-3"
              style={{
                borderWidth: 1, borderStyle: 'solid',
                borderColor: `color-mix(in srgb, ${tono} 38%, transparent)`,
                background: `color-mix(in srgb, ${tono} 8%, transparent)`,
              }}
            >
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: tono }}>
                <Radio size={12} />
                {jugandose ? 'En juego' : 'Por empezar'}
                {m.court != null && <span className="text-soft font-normal">· Cancha {m.court}</span>}
                {fase && <span className="text-soft font-normal">· {fase.charAt(0) + fase.slice(1).toLowerCase()}</span>}
                {jugandose && <span className="font-normal">· <LiveClock startedAt={m.startedAt} /></span>}
              </span>
              <div className="text-[15px] font-semibold text-white leading-snug">
                {m.team1Label} <span className="text-secondary font-normal text-[13px]">contra</span> {m.team2Label}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Avance del fixture: sólo con partidos programados, que dan el total. */}
      {scheduledCount > 0 && (
        <div className="px-5 sm:px-6 pt-4">
          <div className="flex items-baseline justify-between gap-3 mb-1.5">
            <span className="text-[13px] font-semibold text-white">Partidos del fixture</span>
            <span className="text-[13px] text-secondary">
              <span className="text-white font-semibold">{playedCount}</span> de {total} jugados
            </span>
          </div>
          <div className="h-[5px] rounded-full bg-surface-alt overflow-hidden">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-500"
              style={{ width: `${total > 0 ? Math.round((playedCount / total) * 100) : 0}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
