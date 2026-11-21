import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Plus, X, Check, MessageCircle, Share2, Trophy, Loader2, UserPlus, Pencil, LogIn, Link2 } from 'lucide-react'
import { api } from '../../utils/api'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/useToast'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatMoney } from '../../utils/money'
import {
  SIDE_OPTIONS, HAND_OPTIONS, STYLE_LABEL, longDate, endTime, freeCount, isFilled, playerName,
  teamNames, setsText, emptySets, normalizeSets, resultSummary, whatsappHref,
} from '../../utils/friendlies'
import { whatsappDePerfil } from '../../utils/copa'
import Btn from '../shared/Btn'
import Modal from '../shared/Modal'
import SlotEditor from './SlotEditor'
import SetsEditor from './SetsEditor'
import ShareFriendlyModal from './ShareFriendlyModal'
import { INPUT, LABEL, LevelChip, PlayerRow, SegButtons, Sheet, StatusChip } from './parts'

export default function FriendlyDetail() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const token = params.get('t')
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isLoggedIn } = useAuth()
  const { showToast } = useToast()

  const [m, setM]           = useState(null)
  const [error, setError]   = useState(null)
  const [sheet, setSheet]   = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy]     = useState(false)

  useDocumentTitle(m ? `Amistoso ${longDate(m.date)}` : 'Amistoso')

  const load = useCallback(() => {
    api.friendlies.get(id, token)
      .then((data) => { setM(data); setError(null) })
      .catch((e) => setError(e.status === 404 ? 'Este amistoso no existe o es privado.' : e.message))
  }, [id, token])

  useEffect(() => { load() }, [load])

  async function run(action, okText) {
    setBusy(true)
    try {
      const data = await action()
      if (data && data.id) setM(data)
      else load()
      if (okText) showToast(okText)
      setSheet(null)
      setConfirm(null)
      return true
    } catch (e) {
      showToast(e.message, 'error')
      return false
    } finally {
      setBusy(false)
    }
  }

  if (error) return <p className="max-w-xl mx-auto px-4 py-10 text-[14px] text-secondary">{error}</p>
  if (!m) return <div className="min-h-screen flex justify-center pt-16"><Loader2 size={20} className="animate-spin text-muted" /></div>

  const v = m.viewer
  const insider = v.team !== null
  const libres = freeCount(m.players)
  const shareUrl = `${window.location.origin}/amistoso/${m.id}${m.visibility === 'link' && m.share_token ? `?t=${m.share_token}` : ''}`
  const canDelete = v.is_creator && (m.status === 'vencido' || (m.status !== 'confirmado' && (m.proposals?.length ?? 0) === 0))
  const started = m.status === 'falta_resultado' || m.status === 'por_confirmar'

  function openJoin(team, position) {
    if (!isLoggedIn) { setSheet({ kind: 'login' }); return }
    setSheet({ kind: 'join', team, position })
  }


  async function openInvite(p) {
    setBusy(true)
    try {
      const { token: invite } = await api.friendlies.invite(m.id, p.team, p.position)
      setSheet({ kind: 'invite', guest: p.guest_name, url: `${window.location.origin}/amistoso/invitacion/${invite}` })
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const slotAction = (p) => {
    if (isFilled(p)) {
      const canRemove = v.is_creator && !p.is_creator && m.status !== 'confirmado' && m.status !== 'cancelado' && m.status !== 'vencido'
      const canInvite = v.is_creator && !p.user && m.status !== 'cancelado'
      if (canRemove || canInvite) {
        return (
          <div className="flex items-center -mr-2">
            {canInvite && (
              <button type="button" disabled={busy} onClick={() => openInvite(p)} aria-label={`Invitar a ${playerName(p)} a vincular su cuenta`} title="Mandarle el link para vincular su cuenta"
                className="w-11 h-11 flex items-center justify-center bg-transparent border-0 text-cyan hover:text-white cursor-pointer disabled:opacity-40"><Link2 size={17} /></button>
            )}
            {canRemove && (
              <button type="button" onClick={() => setConfirm({ kind: 'remove', p })} aria-label={`Quitar a ${playerName(p)}`}
                className="w-11 h-11 flex items-center justify-center bg-transparent border-0 text-muted hover:text-danger cursor-pointer"><X size={16} /></button>
            )}
          </div>
        )
      }
      if (insider && p.whatsapp && p.user?.id !== user?.id) {
        return (
          <a href={whatsappHref(p.whatsapp)} target="_blank" rel="noopener noreferrer" aria-label={`Escribirle a ${playerName(p)} por WhatsApp`}
            className="w-11 h-11 -mr-2 flex items-center justify-center text-green"><MessageCircle size={18} /></a>
        )
      }
    }
    return null
  }

  const freeSlot = (p) => {
    const canFill = v.is_creator && ['abierto', 'completo', 'falta_resultado'].includes(m.status)
    const canJoinHere = m.status === 'abierto' && (!isLoggedIn || v.can_join)
    if (canJoinHere) {
      return (
        <button key={`${p.team}${p.position}`} type="button" onClick={() => openJoin(p.team, p.position)}
          className="h-12 rounded-lg border-[1.5px] border-dashed border-brand bg-brand/10 text-brand flex items-center justify-center gap-1.5 font-condensed font-bold text-[10.5px] tracking-widest cursor-pointer hover:bg-brand/20 transition-colors">
          <Plus size={15} strokeWidth={3} />SUMARME
        </button>
      )
    }
    if (canFill) {
      return (
        <button key={`${p.team}${p.position}`} type="button" onClick={() => setSheet({ kind: 'fill', team: p.team, position: p.position })}
          className="h-12 rounded-lg border-[1.5px] border-dashed border-border-strong bg-transparent text-content flex items-center justify-center gap-1.5 text-[13px] font-sans cursor-pointer hover:text-white">
          <UserPlus size={15} />Completar lugar
        </button>
      )
    }
    return <div key={`${p.team}${p.position}`} className="h-12 rounded-lg border-[1.5px] border-dashed border-border-mid flex items-center justify-center text-[13px] text-muted">Lugar libre</div>
  }

  const team = (t) => (
    <div className="flex flex-col gap-2.5">
      <span className="text-[10px] tracking-[0.14em] text-secondary font-bold">EQUIPO {t}{v.team === t ? ' · EL TUYO' : ''}</span>
      {m.players.filter((p) => p.team === t).map((p) => (isFilled(p)
        ? <PlayerRow key={`${p.team}${p.position}`} p={p} me={Boolean(user && p.user?.id === user.id)} onOpenProfile={(u) => navigate(`/u/${u}`)} action={slotAction(p)} />
        : freeSlot(p)))}
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-7 pt-4 sm:pt-6 pb-12 font-sans">
      <Link to="/amistosos" className="inline-flex items-center gap-1 min-h-11 text-[13px] text-soft hover:text-white no-underline">
        <ChevronLeft size={16} />Amistosos
      </Link>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:items-start">
        <div className="min-w-0 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div>
              <StatusChip status={m.status} highlight={v.needs_action}
                extra={v.needs_action ? 'TE TOCA' : m.status === 'abierto' ? `${libres} ${libres === 1 ? 'LUGAR' : 'LUGARES'}` : null} />
            </div>
            <h1 className="m-0 font-condensed font-extrabold text-[22px] sm:text-[30px] text-white leading-tight">
              {longDate(m.date)} · <span className="text-brand">{m.start_time}</span>
              <span className="text-[14px] sm:text-[16px] text-secondary font-semibold"> a {endTime(m.start_time, m.duration_minutes)}</span>
            </h1>
            <div className="text-[14px]">
              <Link to={`/club/${m.club.id}`} className="text-white font-semibold no-underline hover:text-brand">{m.club.name}</Link>
              <span className="text-muted">{m.court_label ? ` · ${m.court_label}` : ''}{m.club.location_name ? ` · ${m.club.location_name}` : ''}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Tag>{m.sets_format === 3 ? 'Mejor de 3' : 'Set único'}</Tag>
              {m.style && <Tag>{STYLE_LABEL[m.style]}</Tag>}
              <LevelChip level={m.level} />
              {m.price_per_person != null && <Tag strong>{formatMoney(m.price_per_person)} c/u</Tag>}
            </div>
          </div>

          <section aria-label="Equipos">
            <span className={LABEL}>EQUIPOS</span>
            <div className="flex flex-col sm:flex-row rounded-xl border border-border-mid bg-surface">
              <div className="flex-1 p-4">{team(1)}</div>
              <div className="relative flex items-center justify-center sm:w-14 h-0 sm:h-auto border-t-2 sm:border-t-0 border-dashed border-brand/40">
                <div aria-hidden="true" className="hidden sm:block absolute top-4 bottom-4 left-1/2 border-l-2 border-dashed border-brand/40" />
                <span className="relative -translate-y-0 h-6 px-3 rounded-full bg-brand text-base font-condensed font-extrabold text-[10px] tracking-widest flex items-center">VS</span>
              </div>
              <div className="flex-1 p-4 pt-6 sm:pt-4">{team(2)}</div>
            </div>
          </section>

          <ResultSection m={m} busy={busy}
            onAccept={() => run(() => api.friendlies.accept(m.id, m.pending.id), 'Resultado confirmado')}
            onPropose={() => setSheet({ kind: 'propose' })} />

          {m.proposals?.length > 0 && <History proposals={m.proposals} />}
        </div>

        <aside className="mt-6 lg:mt-0 flex flex-col gap-4">
          <div className="rounded-xl border border-border-mid bg-surface px-4">
            {m.court_price != null && <InfoRow k="Alquiler" v={<><b>{formatMoney(m.price_per_person)}</b> por persona <span className="text-muted">· {formatMoney(m.court_price)}</span></>} />}
            {m.creator && <InfoRow k="Organiza" v={<Link to={`/u/${m.creator.username}`} className="text-white font-semibold no-underline hover:text-brand">@{m.creator.username}</Link>} />}
            <InfoRow k="Visibilidad" v={m.visibility === 'link' ? 'Solo con link' : 'Público'} />
            {!['confirmado', 'cancelado', 'vencido'].includes(m.status) && <InfoRow k="Si no se confirma" v={`Vence el ${longDate(m.expires_on).toLowerCase()}`} />}
          </div>

          <div className="flex flex-col gap-2">
            {m.status === 'abierto' && (!isLoggedIn || v.can_join) && (
              <Btn variant="primary" size="lg" icon={Plus} full
                onClick={() => { const p = m.players.find((x) => !isFilled(x)); openJoin(p.team, p.position) }}>SUMARME</Btn>
            )}
            <Btn size="lg" full icon={Share2} onClick={() => setSheet({ kind: 'share' })}>Compartir</Btn>
            {insider && ['abierto', 'completo', 'falta_resultado', 'por_confirmar'].includes(m.status) && (
              <Btn size="lg" full icon={Pencil} onClick={() => setSheet({ kind: 'me' })}>Mis datos de juego</Btn>
            )}
            {v.can_leave && (
              <Btn variant="ghost" full onClick={() => setConfirm({ kind: 'leave' })}>{started ? 'No jugué este partido' : 'Salir del partido'}</Btn>
            )}
            {v.can_cancel && <Btn variant="danger" full onClick={() => setConfirm({ kind: 'cancel' })}>Cancelar partido</Btn>}
            {canDelete && <Btn variant="danger" full onClick={() => setConfirm({ kind: 'delete' })}>Borrar partido</Btn>}
          </div>
        </aside>
      </div>

      {sheet?.kind === 'share' && <ShareFriendlyModal m={m} url={shareUrl} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'invite' && <ShareFriendlyModal m={m} url={sheet.url} guest={sheet.guest} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'login' && (
        <Sheet title="NECESITÁS UNA CUENTA" subtitle="Para sumarte al partido tenés que iniciar sesión. Después volvés a esta pantalla." onClose={() => setSheet(null)}>
          <Btn variant="primary" size="lg" full icon={LogIn}
            onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`)}>INICIAR SESIÓN</Btn>
          <Btn size="lg" full onClick={() => navigate(`/register?redirect=${encodeURIComponent(location.pathname + location.search)}`)}>Crear cuenta gratis</Btn>
        </Sheet>
      )}
      {sheet?.kind === 'join' && (
        <GameDataSheet title={`SUMARTE AL EQUIPO ${sheet.team}`} initial={{ whatsapp: whatsappDePerfil(user?.social_links) }}
          subtitle={`${longDate(m.date)} · ${m.start_time} · ${m.club.name}${m.price_per_person != null ? ` · ${formatMoney(m.price_per_person)} por persona` : ''}`}
          submitLabel="CONFIRMAR LUGAR" busy={busy} onClose={() => setSheet(null)}
          onSubmit={(data) => run(() => api.friendlies.join(m.id, { team: sheet.team, position: sheet.position, t: token ?? undefined, ...data }), 'Ya estás en el partido')} />
      )}
      {sheet?.kind === 'me' && (
        <GameDataSheet title="MIS DATOS DE JUEGO" subtitle="Los usan los demás jugadores para armar el partido."
          initial={m.players.find((p) => p.user?.id === user?.id)} submitLabel="GUARDAR" busy={busy} onClose={() => setSheet(null)}
          onSubmit={(data) => run(() => api.friendlies.updateMe(m.id, data), 'Datos guardados')} />
      )}
      {sheet?.kind === 'fill' && (
        <FillSheet m={m} sheet={sheet} busy={busy} onClose={() => setSheet(null)}
          onSubmit={(body) => run(() => api.friendlies.fillSlot(m.id, sheet.team, sheet.position, body), 'Lugar completado')} />
      )}
      {sheet?.kind === 'propose' && (
        <ProposeSheet m={m} busy={busy} onClose={() => setSheet(null)}
          onSubmit={(sets) => run(() => api.friendlies.propose(m.id, sets), 'Resultado enviado al equipo rival')} />
      )}

      {confirm?.kind === 'cancel' && (
        <Modal title="Cancelar partido" message="Se avisa a los jugadores con cuenta. No se puede deshacer." confirmText="CANCELAR PARTIDO" confirmDanger
          onCancel={() => setConfirm(null)} onConfirm={() => run(() => api.friendlies.cancel(m.id), 'Partido cancelado')} />
      )}
      {confirm?.kind === 'delete' && (
        <Modal title="Borrar partido" message="Se borra el amistoso y sus avisos. No se puede deshacer." confirmText="BORRAR" confirmDanger
          onCancel={() => setConfirm(null)}
          onConfirm={async () => { if (await run(() => api.friendlies.remove(m.id), 'Partido borrado')) navigate('/amistosos?tab=mios', { replace: true }) }} />
      )}
      {confirm?.kind === 'leave' && (
        <Modal title={started ? 'No jugué este partido' : 'Salir del partido'}
          message={started ? 'Tu lugar queda libre y la propuesta de resultado vigente se anula.' : 'Tu lugar queda libre para otro jugador.'}
          confirmText="CONFIRMAR" confirmDanger onCancel={() => setConfirm(null)}
          onConfirm={async () => { if (await run(() => api.friendlies.leave(m.id), 'Saliste del partido')) navigate('/amistosos', { replace: true }) }} />
      )}
      {confirm?.kind === 'remove' && (
        <Modal title="Quitar jugador" message={`${playerName(confirm.p)} deja el partido y su lugar queda libre.`} confirmText="QUITAR" confirmDanger
          onCancel={() => setConfirm(null)}
          onConfirm={() => run(() => api.friendlies.clearSlot(m.id, confirm.p.team, confirm.p.position), 'Jugador quitado')} />
      )}
    </div>
  )
}

function Tag({ strong = false, children }) {
  return <span className={`text-[12px] border border-border-mid rounded px-2 py-0.5 ${strong ? 'text-white font-bold' : 'text-content'}`}>{children}</span>
}

function InfoRow({ k, v }) {
  return (
    <div className="flex items-center justify-between gap-3 min-h-11 border-b border-border last:border-b-0 text-[13px]">
      <span className="text-secondary">{k}</span>
      <span className="text-white text-right">{v}</span>
    </div>
  )
}

function Scoreboard({ m, sets, winner }) {
  const rows = [1, 2].map((t) => ({ t, names: teamNames(m.players, t) || `Equipo ${t}` }))
  return (
    <table className="w-full border-collapse">
      <tbody>
        {rows.map(({ t, names }) => (
          <tr key={t} className="border-t border-border first:border-t-0">
            <th scope="row" className="text-left py-3 pl-3 font-normal">
              <span className="flex items-center gap-2">
                {winner === t ? <Trophy size={14} className="text-brand shrink-0" aria-label="Ganador" /> : <span className="w-3.5 shrink-0" />}
                <span className="flex flex-col">
                  <span className="text-[14px] text-white font-semibold">{names}</span>
                  <span className="text-[11px] text-muted">Equipo {t}</span>
                </span>
              </span>
            </th>
            {sets.map((s, i) => {
              const mine = t === 1 ? s.s1 : s.s2
              const other = t === 1 ? s.s2 : s.s1
              return <td key={i} className={`w-10 text-center font-condensed text-[18px] tabular-nums last:pr-3 ${mine > other ? 'text-white font-extrabold' : 'text-muted font-semibold'}`}>{mine}</td>
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ResultSection({ m, busy, onAccept, onPropose }) {
  const v = m.viewer
  if (m.status === 'confirmado' && m.result) {
    const w = resultSummary(m.sets_format, m.result.sets).winner
    return (
      <section aria-label="Resultado" className="rounded-xl border border-green/30 bg-surface overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border text-[12px] text-green font-bold tracking-wide"><Check size={14} />RESULTADO CONFIRMADO</div>
        <Scoreboard m={m} sets={m.result.sets} winner={w} />
      </section>
    )
  }
  if (m.pending) {
    const w = resultSummary(m.sets_format, m.pending.sets).winner
    const mineProposed = v.team === m.pending.team
    return (
      <section aria-label="Resultado propuesto" className="flex flex-col gap-2">
        <div className="rounded-xl border border-border-mid bg-surface overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border text-[12px] text-soft">
            Propuesto por <span className="text-white font-semibold">{m.pending.proposed_by_name ?? 'un jugador'}</span> · equipo {m.pending.team}
          </div>
          <Scoreboard m={m} sets={m.pending.sets} winner={w} />
        </div>
        {v.can_accept && <Btn variant="primary" size="lg" full icon={Check} loading={busy} onClick={onAccept}>APROBAR RESULTADO</Btn>}
        {v.can_propose && <Btn size="lg" full onClick={onPropose}>No fue así: proponer otro</Btn>}
        {mineProposed && <p className="m-0 text-[12.5px] text-secondary">Esperando que el equipo rival lo apruebe. Al aprobarlo, suma a los jugadores con cuenta.</p>}
        {!v.team && <p className="m-0 text-[12.5px] text-secondary">Esperando que el equipo rival lo apruebe.</p>}
      </section>
    )
  }
  if (m.status === 'vencido') return <p className="m-0 text-[13px] text-secondary">Pasaron 30 días sin un resultado confirmado. Este partido no suma.</p>
  if (m.status === 'cancelado') return <p className="m-0 text-[13px] text-secondary">El creador canceló este partido.</p>
  if (v.can_propose) return <Btn variant="primary" size="lg" full onClick={onPropose}>CARGAR RESULTADO</Btn>
  if (m.status === 'falta_resultado' && v.team) {
    return <p className="m-0 text-[13px] text-secondary">{freeCount(m.players) > 0 ? 'Faltan jugadores: el creador tiene que completar los lugares para cargar el resultado.' : 'El equipo rival no tiene jugadores con cuenta: el partido no se puede confirmar.'}</p>
  }
  return null
}

function History({ proposals }) {
  const label = { pendiente: 'vigente', aceptada: 'aceptada', rechazada: 'rechazada con contrapropuesta' }
  return (
    <section aria-label="Historial">
      <span className={LABEL}>HISTORIAL</span>
      <ol className="m-0 p-0 list-none flex flex-col">
        {[...proposals].reverse().map((p, i, arr) => (
          <li key={p.id} className="flex gap-3">
            <span className="flex flex-col items-center">
              <span className={`w-2.5 h-2.5 mt-1 rounded-full ${p.status === 'rechazada' ? 'border-[1.5px] border-muted' : 'bg-brand'}`} />
              {i < arr.length - 1 && <span className="flex-1 w-px bg-border-strong my-1" />}
            </span>
            <span className="pb-3.5 flex flex-col gap-0.5">
              <span className="text-[13px] text-white"><b>{p.proposed_by_name ?? 'Un jugador'}</b> propuso {setsText(p.sets)}</span>
              <span className="text-[11.5px] text-secondary">{new Date(p.created_at).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {label[p.status]}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function GameDataSheet({ title, subtitle, initial, submitLabel, busy, onClose, onSubmit }) {
  const [side, setSide] = useState(initial?.side ?? null)
  const [hand, setHand] = useState(initial?.hand ?? null)
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? '')
  return (
    <Sheet title={title} subtitle={subtitle} onClose={onClose}>
      <div><span className={LABEL}>LADO PREFERIDO</span><SegButtons label="Lado preferido" options={SIDE_OPTIONS} value={side} allowEmpty onChange={setSide} /></div>
      <div><span className={LABEL}>MANO HÁBIL</span><SegButtons label="Mano hábil" options={HAND_OPTIONS} value={hand} allowEmpty onChange={setHand} /></div>
      <div>
        <label htmlFor="am-sheet-wa" className={LABEL}>WHATSAPP (OPCIONAL)</label>
        <input id="am-sheet-wa" type="tel" inputMode="tel" className={INPUT} value={whatsapp} placeholder="Ej: 11 5555 1234" onChange={(e) => setWhatsapp(e.target.value)} />
        <p className="m-0 mt-1.5 text-[12px] text-secondary">Lo ven solo los jugadores de este partido.</p>
      </div>
      <Btn variant="primary" size="lg" full loading={busy} onClick={() => onSubmit({ side, hand, whatsapp: whatsapp.trim() || null })}>{submitLabel}</Btn>
    </Sheet>
  )
}

function FillSheet({ m, sheet, busy, onClose, onSubmit }) {
  const [value, setValue] = useState(null)
  const taken = m.players.map((p) => p.user?.id).filter(Boolean)
  const body = value?.user ? { username: value.user.username } : value?.guest_name ? { guest_name: value.guest_name, side: value.side, hand: value.hand } : null
  return (
    <Sheet title={`COMPLETAR LUGAR · EQUIPO ${sheet.team}`} subtitle="Cargá a alguien por usuario o por nombre." onClose={onClose}>
      <SlotEditor value={value} onChange={setValue} excludeIds={taken} emptyLabel="Elegir jugador" emptyHint="Usuario o nombre" />
      <Btn variant="primary" size="lg" full loading={busy} disabled={!body} onClick={() => onSubmit(body)}>COMPLETAR</Btn>
    </Sheet>
  )
}

function ProposeSheet({ m, busy, onClose, onSubmit }) {
  const [sets, setSets] = useState(m.pending ? m.pending.sets : emptySets(m.sets_format))
  const visible = normalizeSets(m.sets_format, sets)
  const ready = resultSummary(m.sets_format, visible).ready
  const rival = m.viewer.team === 1 ? 2 : 1
  return (
    <Sheet title={m.pending ? 'PROPONER OTRO RESULTADO' : 'CARGAR RESULTADO'}
      subtitle={`${teamNames(m.players, rival) || 'El equipo rival'} tiene que aprobarlo. Si no está de acuerdo, te devuelve otra propuesta.`}
      onClose={onClose}>
      <SetsEditor setsFormat={m.sets_format} sets={sets} onChange={setSets}
        team1={teamNames(m.players, 1) || 'Equipo 1'} team2={teamNames(m.players, 2) || 'Equipo 2'} />
      <Btn variant="primary" size="lg" full loading={busy} disabled={!ready} onClick={() => onSubmit(visible)}>ENVIAR PROPUESTA</Btn>
    </Sheet>
  )
}
