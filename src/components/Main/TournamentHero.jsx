import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Pencil, Share2, Eye, QrCode, Tv, Radio, Trophy, Lock, User,
} from 'lucide-react';
import { fmt, fmtHora, tournamentCourts, bracketPhaseLabel, isDeletedAccount } from '../../utils/helpers';
import Badge from '../shared/Badge';
import Btn from '../shared/Btn';
import ClubLogo from '../shared/ClubLogo';
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

function RailCell({ value, label, sub, onEdit, title, children, muted = false }) {
  const editable = typeof onEdit === 'function';
  const Tag = editable ? 'button' : 'div';
  return (
    <Tag
      type={editable ? 'button' : undefined}
      onClick={onEdit}
      title={title}
      className={`group relative px-3.5 py-3 min-w-0 text-left border-r border-border last:border-r-0 bg-transparent w-full ${
        editable ? 'cursor-pointer hover:bg-surface transition-colors' : ''
      }`}
    >
      {children ?? (
        <div className={`font-condensed font-black text-[17px] leading-none tabular-nums truncate ${muted ? 'text-muted' : 'text-white'}`}>
          {value}
        </div>
      )}
      <div className="text-[9px] tracking-[0.12em] text-muted mt-1.5 uppercase truncate">{label}</div>
      {sub && <div className="text-[10px] text-dim mt-0.5 truncate">{sub}</div>}
      {editable && (
        <Pencil size={11} className="absolute top-2 right-2 text-muted opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" />
      )}
    </Tag>
  );
}

/**
 * Encabezado del torneo. Los datos que antes eran una tira de texto gris del
 * mismo peso pasan a un riel donde cada uno se lee de un vistazo y, si podés
 * gestionar, se toca. Las canchas son la excepción: cuando el torneo tiene club
 * salen del club, no del torneo, así que ahí no hay nada que editar acá.
 */
export default function TournamentHero({
  tournament, groupId, groupName, groupEmojis, groupIsPublic = true, owner = null,
  isOwner, playedCount, scheduledCount = 0, statusMeta, winnerLabel,
  isPairs, signup, tvActivo = false,
  onEditName, onShare, onQr, onTv, onSpectator, onManage,
}) {
  const navigate = useNavigate();
  // En un club con varias canchas se juegan varios partidos a la vez: el
  // encabezado los muestra todos, no sólo el primero. Los que ya arrancaron van
  // antes que los que están en cancha esperando.
  const live = (Array.isArray(tournament.live_match) ? tournament.live_match : [])
    .filter(Boolean)
    .slice()
    .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
  // Cuántos están realmente jugándose. Los otros están anunciados pero todavía
  // no arrancaron: son próximos, no partidos en cancha.
  const enJuego = live.filter((m) => m.startedAt != null).length;
  const conClub = !!tournament.club_id;
  const canchas = tournamentCourts(tournament);
  const total = playedCount + scheduledCount;

  const irAGestion = isOwner ? onManage : undefined;

  return (
    <div>
      {/* Barra de contexto. La categoría sigue siendo un enlace: es la vuelta
          natural desde una jornada. */}
      <div className="flex items-center justify-between gap-3 flex-wrap px-5 sm:px-6 pt-4">
        <div className="flex items-center gap-2 min-w-0">
          <Btn
            size="sm" icon={ChevronLeft}
            onClick={() => (groupIsPublic && groupId ? navigate(`/cat/${groupId}`) : navigate(-1))}
          >
            Volver
          </Btn>
          {groupName && (
            groupIsPublic && groupId ? (
              <button
                type="button"
                onClick={() => navigate(`/cat/${groupId}`)}
                className="inline-flex items-center gap-1.5 bg-surface border border-border-mid rounded-full px-3 py-1 cursor-pointer hover:border-border-strong transition-colors"
              >
                {groupEmojis?.length > 0 && <span className="text-sm leading-none">{groupEmojis.join(' ')}</span>}
                <span className="text-[11px] font-mono text-muted truncate max-w-[160px]">{groupName}</span>
              </button>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 bg-surface border border-border-mid rounded-full px-3 py-1"
                title="La categoría es privada"
              >
                {groupEmojis?.length > 0 && <span className="text-sm leading-none">{groupEmojis.join(' ')}</span>}
                <span className="text-[11px] font-mono text-muted truncate max-w-[160px]">{groupName}</span>
                <Lock size={10} className="text-yellow-400" />
              </span>
            )
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* El Modo TV es lo que se deja puesto en la pantalla del club: lo
              necesita el organizador tanto como el espectador. */}
          <Btn size="sm" icon={Tv} onClick={onTv} variant={tvActivo ? 'primary' : 'secondary'}
            title={tvActivo ? 'Salir del Modo TV' : 'Modo TV'} />
          {isOwner && <Btn size="sm" icon={Eye} onClick={onSpectator} title="Ver como espectador" />}
          <Btn size="sm" icon={QrCode} onClick={onQr} title="Código QR" />
          <Btn variant="primary" size="sm" icon={Share2} onClick={onShare} />
        </div>
      </div>

      {/* Identidad */}
      <div className="px-5 sm:px-6 pt-4 pb-3">
        <div className="flex items-start gap-2.5 flex-wrap">
          <h1 className="font-condensed font-black text-[26px] sm:text-[31px] text-white tracking-wide leading-none m-0 min-w-0">
            {tournament.name}
          </h1>
          {isOwner && (
            <button
              type="button"
              onClick={onEditName}
              title="Editar el nombre"
              className="shrink-0 bg-transparent text-muted border border-border-strong px-1.5 py-1.5 text-[11px] cursor-pointer rounded-sm hover:text-white transition-colors"
            >
              <Pencil size={12} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2.5 flex-wrap mt-2.5">
          <Badge variant="status" color={statusMeta.color} icon={statusMeta.icon} pulse={statusMeta.pulse}>
            {statusMeta.label}
          </Badge>
          <span className="text-dim">·</span>
          <span className="text-[12px] font-mono text-muted">
            {tournament.format === 'americano'
              ? 'americano'
              : tournament.mode === 'pairs' ? 'parejas fijas' : 'equipos libres'}
          </span>
          {winnerLabel && <Badge variant="chip" color="brand" icon={Trophy}>{winnerLabel}</Badge>}
          <SignupPricePill signup={signup} />
          {owner?.username && (
            isDeletedAccount(owner.username) ? (
              <span className="inline-flex items-center gap-1.5 bg-surface border border-border-strong rounded-full pl-2 pr-2.5 py-0.5 text-[11px] font-mono text-muted">
                <User size={11} /> Cuenta eliminada
              </span>
            ) : (
              <button
                type="button"
                onClick={() => navigate(`/u/${owner.username}`)}
                title={`Ver el perfil de @${owner.username}`}
                className="inline-flex items-center gap-1.5 bg-surface border border-border-strong rounded-full pl-0.5 pr-2.5 py-0.5 text-[11px] font-mono text-muted hover:text-white hover:border-soft cursor-pointer transition-colors"
              >
                <PlayerAvatar
                  name={owner.name ?? owner.username}
                  src={owner.avatar_url ?? null}
                  size={18}
                  premium={!!owner.isPremium}
                />
                @{owner.username}
              </button>
            )
          )}
        </div>
      </div>

      {/* Riel */}
      <div className="grid grid-cols-3 sm:grid-cols-6 border-y border-border">
        <RailCell
          value={fmt(tournament.event_date ?? tournament.createdAt)}
          label="Fecha y hora"
          sub={tournament.event_time ? fmtHora(tournament.event_time) : null}
          onEdit={irAGestion}
          title={isOwner ? 'Cambiar la fecha y la hora' : undefined}
        />
        <RailCell
          value={tournament.players.filter((p) => !p.removed).length}
          label="Jugadores"
          onEdit={irAGestion}
          title={isOwner ? 'Gestionar los jugadores' : undefined}
        />
        {isPairs ? (
          <RailCell
            value={tournament.pairs.length}
            label="Parejas"
            onEdit={irAGestion}
            title={isOwner ? 'Gestionar las parejas' : undefined}
          />
        ) : (
          <RailCell value={tournament.matches.length} label="Cargados" />
        )}
        <RailCell
          value={scheduledCount > 0 ? `${playedCount}/${total}` : playedCount}
          label="Partidos"
          sub={scheduledCount > 0 ? `${scheduledCount} por jugar` : null}
        />
        {/* Las canchas de un torneo con club son las del club: acá no se editan. */}
        <RailCell
          value={canchas ?? '—'}
          muted={canchas == null}
          label="Canchas"
          sub={conClub ? 'del club' : null}
          onEdit={conClub ? undefined : irAGestion}
          title={conClub ? 'Las canchas las define el club' : isOwner ? 'Cambiar la cantidad de canchas' : undefined}
        />
        {conClub ? (
          <RailCell label="Club" title={`Ver ${tournament.club_name ?? 'el club'}`}>
            <button
              type="button"
              onClick={() => navigate(`/club/${tournament.club_id}`)}
              className="flex items-center gap-2 min-w-0 w-full bg-transparent border-0 p-0 cursor-pointer text-left hover:opacity-80 transition-opacity"
            >
              <ClubLogo name={tournament.club_name} src={tournament.club_photo_url} size={24} />
              <span className="font-condensed font-black text-[15px] text-white leading-none truncate">
                {tournament.club_name ?? 'Club'}
              </span>
            </button>
          </RailCell>
        ) : (
          <RailCell
            value="—"
            muted
            label="Club"
            onEdit={irAGestion}
            title={isOwner ? 'Asignar un club' : undefined}
          />
        )}
      </div>

      {/* Lo que se está jugando ahora. Es el único dato de la página que caduca
          en minutos, y hasta acá no aparecía en ningún lado. */}
      {live.length > 0 && (
        <div className="mx-5 sm:mx-6 mt-4 flex flex-col gap-2">
          {live.length > 1 && (
            <div className="flex items-center gap-2.5">
              <span className="font-condensed font-bold text-[10.5px] tracking-[0.15em] text-muted shrink-0">
                {enJuego === live.length ? `${live.length} PARTIDOS EN VIVO`
                  : enJuego === 0        ? `${live.length} PARTIDOS PRÓXIMOS`
                  : `${enJuego} EN VIVO · ${live.length - enJuego} ${live.length - enJuego === 1 ? 'PRÓXIMO' : 'PRÓXIMOS'}`}
              </span>
              <span className="flex-1 h-px bg-border" />
            </div>
          )}
          {live.map((m, i) => {
            const jugandose = m.startedAt != null;
            const tono = jugandose ? 'var(--color-green)' : 'var(--color-cyan)';
            return (
            <div
              key={`${m.team1Label}|${m.team2Label}|${m.court ?? i}`}
              className="flex items-center gap-4 flex-wrap rounded-xl px-4 py-3"
              style={{
                borderWidth: 1, borderStyle: 'solid',
                borderColor: `color-mix(in srgb, ${tono} 38%, transparent)`,
                background: `color-mix(in srgb, ${tono} 8%, transparent)`,
              }}
            >
              <span
                className="shrink-0 inline-flex items-center gap-1.5 font-condensed font-bold text-[9px] tracking-[0.12em] px-2 py-[3px] rounded-[5px]"
                style={{ color: tono, borderWidth: 1, borderStyle: 'solid',
                  borderColor: `color-mix(in srgb, ${tono} 40%, transparent)` }}
              >
                <Radio size={9} />
                {jugandose ? 'EN VIVO' : 'PRÓXIMO'}
              </span>
              {/* De qué fase del cuadro es el cruce. Sin esto, un partido de
                  semis se anunciaba igual que uno de la fase previa. */}
              {bracketPhaseLabel(m.phase) && (
                <span className="shrink-0 inline-flex items-center font-condensed font-bold text-[9px] tracking-[0.12em] px-2 py-[3px] rounded-[5px] text-cyan border border-cyan/40">
                  {bracketPhaseLabel(m.phase)}
                </span>
              )}
              <div className="min-w-0 basis-[210px] grow">
                <div className="font-condensed font-bold text-[16px] text-white leading-tight">
                  {m.team1Label} <span className="text-muted font-normal font-sans">vs</span> {m.team2Label}
                </div>
                <div className="text-[11.5px] text-muted mt-1">
                  {m.court != null && <>Cancha {m.court}<span className="opacity-40"> · </span></>}
                  {jugandose
                    ? <LiveClock startedAt={m.startedAt} />
                    : <span>todavía sin empezar</span>}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* El progreso sólo se puede afirmar si hay partidos programados: sin
          fixture el total no se sabe, y una barra sin denominador sería un
          número inventado. */}
      {scheduledCount > 0 && (
        <div className="px-5 sm:px-6 pt-4">
          <div className="flex items-baseline justify-between gap-3 mb-1.5">
            <span className="font-condensed font-bold text-[10.5px] tracking-[0.15em] text-muted">PROGRESO DEL FIXTURE</span>
            <span className="text-[11.5px] text-muted">
              <span className="text-white font-semibold">{playedCount}</span> de {total} programados
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
