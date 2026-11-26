import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, X, Clock, Unlink, Pencil, Check, Search, ArrowUp, ArrowDown, Trash2, Link2, Copy, IdCard } from 'lucide-react';
import { api } from '../../utils/api';
import PlayerAvatar from '../shared/PlayerAvatar';
import ActionMenu from '../shared/ActionMenu';
import Modal from '../shared/Modal';
import Btn from '../shared/Btn';
import { CardSkeleton } from '../shared/Skeleton';
import PlayerSheet from '../shared/PlayerSheet';

// Cuántas filas se pintan de entrada. El filtro corre siempre sobre el plantel
// completo (5000 jugadores se filtran en 1,5 ms), así que este tope existe sólo
// para no crear cientos de nodos del DOM de una, que es lo único que escala mal.
const PAGE = 40;

const FILTROS = [
  { id: 'all',      label: 'TODOS' },
  { id: 'linked',   label: 'VINCULADOS' },
  { id: 'unlinked', label: 'SIN VINCULAR' },
];

// `defaultDir` es la dirección con la que entra cada criterio, que es la que se
// espera en cada caso: los nombres de la A a la Z, los torneos de mayor a menor.
const ORDENES = [
  { id: 'name',    label: 'NOMBRE',  defaultDir: 'asc'  },
  { id: 'torneos', label: 'TORNEOS', defaultDir: 'desc' },
];

// Sin acentos y en minúsculas: buscar "nunez" tiene que encontrar a "Núñez".
const norm = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Plantel de la categoría. Existe como pestaña propia porque invitar, renombrar
// y desvincular son acciones de la CATEGORÍA, no del torneo: una cuenta ocupa un
// solo slot por categoría y el vínculo vale para todos sus torneos. Hacerlas
// desde la pantalla de un torneo hacía creer que sólo afectaban a esa fecha.
export default function GroupPlayers({ groupId, canManage }) {
  const [fichaFor, setFichaFor] = useState(null);
  const [q,       setQ]       = useState('');
  const [filtro,  setFiltro]  = useState('all');
  const [orden,   setOrden]   = useState('name');
  const [dir,     setDir]     = useState('asc');   // 'asc' | 'desc'
  const [visible, setVisible] = useState(PAGE);
  const [players, setPlayers] = useState(null);
  const [error,   setError]   = useState(null);

  const [inviteFor,    setInviteFor]    = useState(null);   // playerId
  const [inviteValue,  setInviteValue]  = useState('');
  const [inviteBusy,   setInviteBusy]   = useState(false);
  const [inviteError,  setInviteError]  = useState(null);

  const [renameFor,   setRenameFor]   = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const [unlinkTarget, setUnlinkTarget] = useState(null);
  const [unlinkBusy,   setUnlinkBusy]   = useState(false);

  const [removeTarget, setRemoveTarget] = useState(null);
  const [removeBusy,   setRemoveBusy]   = useState(false);

  const [linkFor, setLinkFor] = useState(null);   // { playerId, url }
  const [copied,  setCopied]  = useState(false);

  const load = useCallback(async () => {
    try { setPlayers(await api.players.byGroup(groupId)); }
    catch (e) { setError(e.message); }
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  async function sendInvite(playerId) {
    if (!inviteValue.trim() || inviteBusy) return;
    setInviteBusy(true);
    setInviteError(null);
    try {
      await api.invitations.send(playerId, groupId, inviteValue.trim());
      setInviteFor(null);
      setInviteValue('');
      await load();
    } catch (e) {
      setInviteError(e.message);
    } finally {
      setInviteBusy(false);
    }
  }

  // Para quien no tiene cuenta: en vez de una invitación que nadie recibe, un
  // link que puede abrir, registrarse y quedar vinculado de una.
  async function createLink(playerId) {
    if (inviteBusy) return;
    setInviteBusy(true);
    setInviteError(null);
    try {
      const { url } = await api.invitations.createLink(playerId, groupId);
      setLinkFor({ playerId, url });
      setInviteFor(null);
      await load();
    } catch (e) {
      setInviteError(e.message);
    } finally {
      setInviteBusy(false);
    }
  }

  async function copyLink(url) {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* sin portapapeles: el input queda para copiar a mano */ }
  }

  async function cancelInvite(player) {
    if (!player.invitation_id) return;
    try { await api.invitations.cancel(player.invitation_id); await load(); }
    catch (e) { setError(e.message); }
  }

  async function confirmRename(playerId) {
    if (!renameValue.trim()) return;
    try { await api.players.rename(playerId, renameValue.trim(), groupId); await load(); }
    catch (e) { setError(e.message); }
    finally { setRenameFor(null); setRenameValue(''); }
  }

  async function confirmUnlink() {
    if (!unlinkTarget || unlinkBusy) return;
    setUnlinkBusy(true);
    try { await api.players.unlink(unlinkTarget.id, groupId); setUnlinkTarget(null); await load(); }
    catch (e) { setError(e.message); }
    finally { setUnlinkBusy(false); }
  }

  async function confirmRemove() {
    if (!removeTarget || removeBusy) return;
    setRemoveBusy(true);
    try { await api.players.removeFromGroup(removeTarget.id, groupId); setRemoveTarget(null); await load(); }
    catch (e) { setError(e.message); setRemoveTarget(null); }
    finally { setRemoveBusy(false); }
  }

  function actions(p) {
    const items = [];
    if (!p.user_id && p.invitation_status !== 'pending') {
      items.push({ label: 'Vincular cuenta', icon: <UserPlus size={15} />, onClick: () => { setInviteFor(p.id); setInviteValue(''); setInviteError(null); } });
    }
    if (p.invitation_status === 'pending') {
      items.push({ label: 'Cancelar invitación', icon: <X size={15} />, onClick: () => cancelInvite(p) });
    }
    if (p.user_id) {
      items.push({ label: 'Ver ficha', icon: <IdCard size={15} />, onClick: () => setFichaFor(p.user_id) });
      items.push({ label: 'Desvincular cuenta', icon: <Unlink size={15} />, onClick: () => setUnlinkTarget(p) });
    }
    items.push({ label: 'Renombrar', icon: <Pencil size={15} />, onClick: () => { setRenameFor(p.id); setRenameValue(p.name); } });
    // Sólo para los que no jugaron nada: con torneos encima, quitarlo del
    // plantel dejaría sus partidos apuntando a alguien que ya no figura.
    if (!p.tournament_count) {
      items.push({ label: 'Quitar de la categoría', icon: <Trash2 size={15} />, danger: true, onClick: () => setRemoveTarget(p) });
    }
    return items;
  }

  // Se recalcula sólo cuando cambia el plantel o algún control, no en cada
  // tecleo de los formularios de invitar o renombrar.
  const shown = useMemo(() => {
    const nq = norm(q.trim());
    const out = (players ?? []).filter((p) => {
      if (filtro === 'linked'   && !p.user_id) return false;
      if (filtro === 'unlinked' &&  p.user_id) return false;
      if (!nq) return true;
      // También por el nombre viejo: si lo conocés como "Juancito" y se registró
      // como "Juan Pablo", buscar "juancito" tiene que encontrarlo igual.
      return norm(p.linked_name ?? p.name).includes(nq)
          || norm(p.linked_username).includes(nq)
          || norm(p.original_name).includes(nq);
    });

    const nombre = (p) => p.linked_name ?? p.name;
    const signo  = dir === 'asc' ? 1 : -1;

    // El desempate por nombre es siempre ascendente: invertir también el criterio
    // secundario hace que dos jugadores con los mismos torneos salten de lugar
    // al cambiar la dirección, sin motivo visible.
    return out.sort((a, b) => (
      orden === 'torneos'
        ? signo * ((a.tournament_count ?? 0) - (b.tournament_count ?? 0)) || nombre(a).localeCompare(nombre(b))
        : signo * nombre(a).localeCompare(nombre(b))
    ));
  }, [players, q, filtro, orden, dir]);

  // Tocar el criterio activo invierte la dirección; tocar el otro cambia de
  // criterio y entra con la suya.
  function pickOrden(o) {
    if (o.id === orden) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setOrden(o.id); setDir(o.defaultDir); }
  }

  // Al cambiar de filtro se vuelve a la primera tanda.
  useEffect(() => { setVisible(PAGE); }, [q, filtro, orden, dir]);

  if (error && !players) return <div className="text-danger text-sm font-mono">{error}</div>;

  if (!players) return (
    <div className="flex flex-col gap-2">
      <CardSkeleton lines={1} /><CardSkeleton lines={1} /><CardSkeleton lines={1} />
    </div>
  );

  if (players.length === 0) return (
    <div className="border border-dashed border-border-strong rounded-lg p-8 text-center">
      <p className="text-muted text-sm font-sans mb-1">Todavía no hay jugadores en esta categoría.</p>
      <p className="text-dim text-[12px] font-mono">
        Se agregan al crear un torneo; después aparecen acá para invitarlos.
      </p>
    </div>
  );

  const vinculados = players.filter((p) => p.user_id).length;

  return (
    <div>
      <div className="text-[11px] font-mono text-muted mb-3">
        {players.length} {players.length === 1 ? 'jugador' : 'jugadores'} · {vinculados} con cuenta vinculada
      </div>

      {/* Buscador y filtros. Todo corre en memoria sobre el plantel completo:
          es instantáneo y no manda una petición por tecla. */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o @usuario..."
            className="w-full bg-surface border border-border-mid text-white pl-9 pr-8 py-2 rounded-lg text-[13px] outline-none font-sans placeholder:text-muted focus:border-border-strong transition-colors"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-0 text-dim hover:text-muted cursor-pointer p-0.5"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Desktop: filtros a la izquierda y orden a la derecha en una línea.
            Mobile: dos filas completas, porque en una sola el orden se partía y
            el rótulo quedaba colgado arriba de sus propios botones. La flecha
            reemplaza a ese rótulo: dice qué hace el botón sin ocupar una línea. */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`px-2.5 py-1 text-[10px] font-mono tracking-widest rounded border cursor-pointer transition-colors ${
                  filtro === f.id
                    ? 'border-brand text-brand bg-brand/10'
                    : 'border-border-strong text-muted hover:border-border-mid'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap sm:ml-auto">
            {ORDENES.map((o) => {
              const activo = orden === o.id;
              const Flecha = dir === 'asc' ? ArrowUp : ArrowDown;
              return (
                <button
                  key={o.id}
                  onClick={() => pickOrden(o)}
                  title={activo ? 'Invertir el orden' : `Ordenar por ${o.label.toLowerCase()}`}
                  aria-pressed={activo}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono tracking-widest rounded border cursor-pointer transition-colors ${
                    activo
                      ? 'border-brand text-brand bg-brand/10'
                      : 'border-border-strong text-muted hover:border-border-mid'
                  }`}
                >
                  {o.label}
                  {activo && <Flecha size={11} strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && <div className="text-danger text-[12px] font-mono mb-3">{error}</div>}

      {shown.length === 0 && (
        <div className="text-center text-dim py-8 px-5 font-mono text-[12px]">
          Ningún jugador coincide con la búsqueda.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {shown.slice(0, visible).map((p) => {
          const nombre = p.linked_name ?? p.name;
          return (
            <div key={p.id} className="bg-surface border border-border-mid rounded-md px-3.5 py-2.5">
              <div className="flex items-center gap-3">
                <PlayerAvatar name={nombre} src={p.linked_avatar_url} size={30} premium={p.is_premium} />

                <div className="flex-1 min-w-0">
                  {renameFor === p.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') confirmRename(p.id); if (e.key === 'Escape') setRenameFor(null); }}
                        className="flex-1 min-w-0 bg-surface-alt border border-border-mid text-white px-2 py-1 rounded text-[13px] outline-none font-sans"
                      />
                      <Btn variant="primary" size="sm" icon={Check} onClick={() => confirmRename(p.id)}>OK</Btn>
                      <Btn variant="secondary" size="sm" onClick={() => setRenameFor(null)}>CANCELAR</Btn>
                    </div>
                  ) : (
                    <>
                      <div className="text-[14px] text-white truncate">
                        {nombre}
                        {/* Cómo lo habías anotado vos. Sin esto, si la persona
                            se registró con otro nombre no había forma de saber
                            a quién corresponde el lugar. */}
                        {canManage && p.original_name && p.original_name !== nombre && (
                          <span className="text-dim text-[12px] font-mono"> · anotado como {p.original_name}</span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-dim truncate">
                        {p.linked_username
                          ? <Link to={`/u/${p.linked_username}`} className="text-brand hover:underline">@{p.linked_username}</Link>
                          : p.invitation_status === 'pending'
                            ? <span className="inline-flex items-center gap-1"><Clock size={11} />Invitación pendiente{p.invited_identifier ? ` · ${p.invited_identifier}` : ''}</span>
                            : 'Sin cuenta vinculada'}
                        {p.tournament_count > 0
                          ? <span> · {p.tournament_count} {p.tournament_count === 1 ? 'torneo' : 'torneos'}</span>
                          : <span className="text-yellow-400"> · sin torneos</span>}
                      </div>
                    </>
                  )}
                </div>

                {canManage && renameFor !== p.id && <ActionMenu items={actions(p)} />}
              </div>

              {inviteFor === p.id && (
                <div className="mt-3 pt-3 border-t border-border-mid">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      autoFocus
                      value={inviteValue}
                      onChange={(e) => setInviteValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') sendInvite(p.id); if (e.key === 'Escape') setInviteFor(null); }}
                      placeholder="@usuario o email"
                      className="flex-1 min-w-[180px] bg-surface-alt border border-border-mid text-white px-2.5 py-1.5 rounded text-[13px] outline-none font-sans"
                    />
                    <Btn variant="primary" size="sm" disabled={inviteBusy} onClick={() => sendInvite(p.id)}>
                      {inviteBusy ? 'ENVIANDO...' : 'INVITAR'}
                    </Btn>
                    <Btn variant="secondary" size="sm" onClick={() => setInviteFor(null)}>CANCELAR</Btn>
                  </div>
                  {inviteError && <div className="text-danger text-[11px] font-mono mt-2">{inviteError}</div>}
                  <div className="flex items-center gap-2 flex-wrap mt-2.5">
                    <p className="text-[11px] font-mono text-dim flex-1 min-w-[160px]">
                      Al aceptar, sus partidos en toda la categoría cuentan en su perfil.
                    </p>
                    <Btn variant="secondary" size="sm" icon={Link2} disabled={inviteBusy} onClick={() => createLink(p.id)}>
                      ¿NO TIENE CUENTA?
                    </Btn>
                  </div>
                </div>
              )}

              {linkFor?.playerId === p.id && (
                <div className="mt-3 pt-3 border-t border-border-mid">
                  <div className="text-[11px] font-mono text-brand mb-2">
                    Link de invitación · se acepta una sola vez
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      readOnly
                      value={linkFor.url}
                      onFocus={(e) => e.target.select()}
                      className="flex-1 min-w-[180px] bg-surface-alt border border-border-mid text-content px-2.5 py-1.5 rounded text-[12px] outline-none font-mono"
                    />
                    <Btn variant="primary" size="sm" icon={copied ? Check : Copy} onClick={() => copyLink(linkFor.url)}>
                      {copied ? 'COPIADO' : 'COPIAR'}
                    </Btn>
                    <Btn variant="secondary" size="sm" onClick={() => setLinkFor(null)}>LISTO</Btn>
                  </div>
                  <p className="text-[11px] font-mono text-dim mt-2">
                    Quien lo abra puede registrarse y queda vinculado a {p.name}. Mandáselo sólo a esa persona.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {visible < shown.length && (
        <div className="flex justify-center mt-4">
          <Btn size="sm" onClick={() => setVisible((v) => v + PAGE)}>
            CARGAR MÁS ({shown.length - visible} restantes)
          </Btn>
        </div>
      )}

      {removeTarget && (
        <Modal
          title={`¿Quitar a ${removeTarget.linked_name ?? removeTarget.name}?`}
          message="No jugó ningún torneo de esta categoría, así que sacarlo del plantel no borra ningún resultado. Podés volver a agregarlo al crear un torneo."
          confirmText="Quitar"
          confirmDanger
          confirmDisabled={removeBusy}
          onConfirm={confirmRemove}
          onCancel={() => setRemoveTarget(null)}
        />
      )}

      {fichaFor && <PlayerSheet groupId={groupId} userId={fichaFor} onClose={() => setFichaFor(null)} />}

      {unlinkTarget && (
        <Modal
          title={`¿Desvincular a ${unlinkTarget.linked_name ?? unlinkTarget.name}?`}
          message={`${unlinkTarget.name} y sus partidos se quedan en la categoría, pero dejan de estar asociados a esa cuenta y de contar en las estadísticas de su perfil, en TODOS los torneos de esta categoría. Vas a poder volver a invitar a alguien a ese lugar.`}
          confirmText="Desvincular"
          confirmDanger
          confirmDisabled={unlinkBusy}
          onConfirm={confirmUnlink}
          onCancel={() => setUnlinkTarget(null)}
        />
      )}
    </div>
  );
}
