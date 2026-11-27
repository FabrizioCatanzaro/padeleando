import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ClipboardList, ChevronRight, Plus, Loader2, Pencil, UserPlus, Users, BarChart3, ExternalLink, Radio, Wallet, Link2, Link2Off } from 'lucide-react'
import { api } from '../../utils/api'
import ActionMenu from '../shared/ActionMenu'
import ClubLogo from '../shared/ClubLogo'
import AdBanner from '../shared/AdBanner'
import AdInline from '../shared/AdInline'
import { dayKey, shortDay } from '../../utils/agenda'

function quotaOf(c, plan) {
  if (c.owner_is_premium) return { full: false, text: c.is_owner ? 'Sin límite · Organizador' : `Sin límite · plan de ${c.owner_name}`, pct: 100, cls: 'bg-cyan', txt: 'text-cyan' }
  const max = plan.tournaments_per_month
  const full = c.month_count >= max
  return { full, text: full ? `${c.month_count} de ${max} · límite del mes` : `${c.month_count} de ${max}`, pct: Math.min(100, (c.month_count / max) * 100), cls: full ? 'bg-danger' : 'bg-brand', txt: full ? 'text-danger' : 'text-brand' }
}

function stateLine(c, today) {
  if (c.live) return { text: `En vivo: ${c.live.name}`, cls: 'text-green' }
  if (c.next) {
    const future = c.next.event_date && c.next.event_date > today
    return { text: future ? `Próximo: ${c.next.name} · ${shortDay(c.next.event_date)}` : `En curso: ${c.next.name}`, cls: 'text-white' }
  }
  return { text: 'Sin torneos activos', cls: 'text-secondary' }
}

function CategoryCard({ c, plan, today }) {
  const navigate = useNavigate()
  const quota = quotaOf(c, plan)
  const state = stateLine(c, today)
  const items = [
    { label: 'Abrir categoría', icon: <ExternalLink size={15} />, onClick: () => navigate(`/cat/${c.id}`) },
    ...(c.is_owner ? [
      { label: 'Editar categoría', icon: <Pencil size={15} />, onClick: () => navigate(`/cat/${c.id}?accion=editar`) },
      { label: c.collaborator_count ? `Co-organizadores (${c.collaborator_count})` : 'Co-organizadores', icon: <UserPlus size={15} />, onClick: () => navigate(`/cat/${c.id}?accion=coorg`) },
    ] : []),
    { label: 'Jugadores', icon: <Users size={15} />, onClick: () => navigate(`/cat/${c.id}?tab=jugadores`) },
    { label: 'Estadísticas', icon: <BarChart3 size={15} />, onClick: () => navigate(`/cat/${c.id}?tab=estadisticas`) },
  ]
  return (
    <div className="flex flex-col gap-3.5 p-4 rounded-2xl bg-surface border border-border-mid">
      <div className="flex items-center gap-3">
        {c.club_photo_url
          ? <ClubLogo name={c.club_name} src={c.club_photo_url} size={44} />
          : <span className="w-11 h-11 shrink-0 rounded-full bg-surface-alt border border-border-strong flex items-center justify-center text-[18px]">{c.emojis?.[0] ?? ''}</span>}
        <Link to={`/cat/${c.id}`} className="flex-1 min-w-0 no-underline">
          <span className="font-sans font-bold text-[15px] leading-snug text-white line-clamp-2 break-words hover:text-brand transition-colors">
            {c.emojis?.length > 0 && <span className="mr-1">{c.emojis.join(' ')}</span>}{c.name}
          </span>
          <span className="block font-sans text-[12px] text-secondary mt-0.5 truncate">{[c.club_name, c.is_public ? 'Pública' : 'Privada'].filter(Boolean).join(' · ')}</span>
        </Link>
        <span className={`shrink-0 font-sans text-[11px] font-bold px-2.5 py-1 rounded-full border ${c.is_owner ? 'text-brand border-brand/40' : 'text-cyan border-cyan/40'}`}>{c.is_owner ? 'Dueño' : 'Co-organizás'}</span>
        <ActionMenu label={`Acciones de ${c.name}`} items={items} />
      </div>
      <div className={`flex items-center gap-1.5 font-sans text-[12px] font-bold ${state.cls}`}>
        {c.live && <Radio size={13} />}<span className="truncate">{state.text}</span>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 font-sans text-[12px] text-secondary">
        <span><b className="text-white">{c.tournament_count}</b> torneos</span>
        <span><b className="text-white">{c.player_count}</b> jugadores</span>
        <span><b className="text-white">{c.collaborator_count}</b> co-organizadores</span>
      </div>
      <div>
        <div className="flex justify-between font-sans text-[11px] text-secondary">
          <span>Torneos este mes</span><span className={`font-bold ${quota.txt}`}>{quota.text}</span>
        </div>
        <div className="h-1 rounded-full bg-border mt-1.5 overflow-hidden"><div className={`h-full ${quota.cls}`} style={{ width: `${quota.pct}%` }} /></div>
      </div>
      <div className="flex gap-2">
        <button type="button" disabled={quota.full} onClick={() => navigate(`/cat/${c.id}/torneo/new`)}
          title={quota.full ? 'Esta categoría ya usó sus torneos del mes' : undefined}
          className="h-10 px-4 rounded-lg border-0 bg-brand text-black font-sans font-extrabold text-[12.5px] inline-flex items-center gap-1.5 cursor-pointer disabled:bg-border-mid disabled:text-muted disabled:cursor-not-allowed">
          <Plus size={15} strokeWidth={2.6} />Torneo
        </button>
        <Link to={`/cat/${c.id}?tab=jugadores`} className="h-10 px-4 rounded-lg border border-border-strong text-content font-sans font-bold text-[12.5px] inline-flex items-center no-underline hover:text-white">Jugadores</Link>
      </div>
    </div>
  )
}

// Cuenta de Mercado Pago donde entra el cobro online de los torneos de tus categorías.
function CobrosCard() {
  const [params, setParams] = useSearchParams()
  const [mp, setMp] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const result = params.get('mp')

  useEffect(() => {
    let cancelled = false
    api.payments.mp().then((d) => { if (!cancelled) setMp(d) }).catch(() => { if (!cancelled) setMp({ connected: false }) })
    return () => { cancelled = true }
  }, [])

  async function connect() {
    setBusy(true); setError(null)
    try { window.location.href = (await api.payments.connect()).authorize_url }
    catch (e) { setError(e.message); setBusy(false) }
  }
  async function disconnect() {
    if (!window.confirm('Se desvincula tu Mercado Pago y se apaga el cobro por la app en tus torneos sin terminar. ¿Seguimos?')) return
    setBusy(true); setError(null)
    try { await api.payments.disconnect(); setMp({ connected: false }) }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  return (
    <section aria-labelledby="org-cobros" className="p-4 rounded-2xl bg-surface border border-border-mid flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 shrink-0 rounded-[10px] bg-brand/10 text-brand flex items-center justify-center"><Wallet size={18} /></span>
        <div className="flex-1 min-w-0">
          <h2 id="org-cobros" className="m-0 font-sans font-bold text-[14px] text-white">Cobro de inscripciones</h2>
          <p className="m-0 font-sans text-[12px] text-secondary leading-snug">
            {mp?.connected ? 'Tu Mercado Pago está vinculado. Activá el cobro en cada torneo desde Gestión › Inscripción.'
              : 'Vinculá tu Mercado Pago: el jugador paga al anotarse y la plata entra directo a tu cuenta.'}
          </p>
        </div>
        {mp && (mp.connected ? (
          <button type="button" onClick={disconnect} disabled={busy}
            className="shrink-0 inline-flex items-center gap-1.5 bg-transparent border-0 p-0 font-sans text-[12px] text-muted hover:text-danger cursor-pointer disabled:opacity-50">
            <Link2Off size={13} /> Desvincular
          </button>
        ) : (
          <button type="button" onClick={connect} disabled={busy}
            className="shrink-0 h-9 px-3 rounded-lg border-0 bg-brand text-black font-sans font-extrabold text-[12.5px] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60">
            <Link2 size={14} /> Vincular
          </button>
        ))}
      </div>
      {result && (
        <p className={`m-0 font-sans text-[12.5px] ${result === 'connected' ? 'text-green' : 'text-danger'}`}>
          {result === 'connected' ? 'Listo: tu Mercado Pago quedó vinculado.' : 'No se pudo vincular Mercado Pago. Probá de nuevo.'}
          <button type="button" onClick={() => { params.delete('mp'); setParams(params, { replace: true }) }}
            className="ml-2 bg-transparent border-0 p-0 text-muted underline cursor-pointer font-sans text-[12px]">Cerrar</button>
        </p>
      )}
      {error && <p className="m-0 font-sans text-[12.5px] text-danger">{error}</p>}
    </section>
  )
}

export default function Organizar() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    api.me.organize()
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [])

  if (error) return <p className="font-sans text-[13px] text-danger">{error}</p>
  if (!data) return <div className="min-h-[50vh] flex justify-center pt-10"><Loader2 size={20} className="animate-spin text-muted" /></div>

  const { categories, registrations, plan } = data
  const today = dayKey()
  const groupsFull = !plan.premium && plan.groups_owned >= plan.max_groups
  const own = categories.filter((c) => c.is_owner)

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-10 xl:items-start">
      <div className="min-w-0 flex flex-col gap-7">
        {own.length > 0 && <CobrosCard />}
        {registrations.length > 0 && (
          <section aria-labelledby="org-insc">
            <h2 id="org-insc" className="m-0 mb-3 font-sans text-[11px] font-bold tracking-[2px] text-muted">INSCRIPCIONES POR APROBAR</h2>
            <div className="rounded-xl bg-surface border border-border overflow-hidden">
              {registrations.map((r, i) => (
                <Link key={r.id} to={`/cat/${r.group_id}/torneo/${r.id}?tab=registrations`}
                  className={`flex items-center gap-3.5 px-4 py-3.5 no-underline hover:bg-surface-alt transition-colors ${i > 0 ? 'border-t border-border' : ''}`}>
                  <span className="w-9 h-9 shrink-0 rounded-[10px] bg-cyan/10 text-cyan flex items-center justify-center"><ClipboardList size={18} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-sans font-bold text-[14px] text-white">{r.count} {r.count === 1 ? 'inscripción' : 'inscripciones'} por aprobar</span>
                    <span className="block font-sans text-[12px] text-secondary truncate">{r.name}</span>
                  </span>
                  <span className="hidden sm:inline font-sans font-bold text-[12px] text-cyan">Revisar</span>
                  <ChevronRight size={16} className="text-dim shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="org-cats">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h2 id="org-cats" className="m-0 font-sans text-[11px] font-bold tracking-[2px] text-muted">TUS CATEGORÍAS</h2>
            <span className="hidden sm:inline font-sans text-[12px] text-secondary">Agrupan torneos, jugadores y co-organizadores</span>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {categories.map((c) => <CategoryCard key={c.id} c={c} plan={plan} today={today} />)}
            <button type="button" onClick={() => navigate('/?nueva=categoria')}
              className="min-h-40 flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border border-dashed border-border-strong bg-transparent text-content cursor-pointer hover:border-brand/50 transition-colors">
              <span className="w-11 h-11 rounded-full bg-surface-alt border border-border-strong flex items-center justify-center text-brand"><Plus size={20} strokeWidth={2.4} /></span>
              <span className="font-sans font-bold text-[14px] text-white">Nueva categoría</span>
              {groupsFull && <span className="font-sans text-[12px] text-secondary text-center max-w-60">Usaste {plan.groups_owned} de {plan.max_groups} en el plan Gratis. Con el plan Organizador no hay límite.</span>}
            </button>
          </div>
        </section>
      </div>

      <aside className="hidden xl:flex flex-col gap-5 sticky top-24" aria-label="Tu plan">
        <section className="p-4 rounded-2xl bg-surface border border-border-mid">
          <div className="flex justify-between items-center">
            <h2 className="m-0 font-sans text-[11px] font-bold tracking-[2px] text-muted">TU PLAN</h2>
            <span className="font-sans text-[12px] font-bold text-white">{plan.premium ? 'Organizador' : 'Gratis'}</span>
          </div>
          {plan.premium ? (
            <p className="m-0 mt-3 font-sans text-[12.5px] text-soft leading-relaxed">Categorías y torneos sin límite.</p>
          ) : (
            <>
              <Usage label="Categorías propias" n={plan.groups_owned} max={plan.max_groups} />
              {own.map((c) => <Usage key={c.id} label={`Torneos · ${c.name}`} n={c.month_count} max={plan.tournaments_per_month} />)}
            </>
          )}
          <Link to="/subscription/manage" className="inline-block mt-4 font-sans text-[12px] font-bold text-brand no-underline hover:underline">{plan.premium ? 'Ver mi plan →' : 'Ver planes →'}</Link>
        </section>
        <p className="m-0 font-sans text-[12px] text-muted leading-relaxed">En una categoría donde co-organizás valen los límites del plan del dueño.</p>
        <AdBanner />
      </aside>
      <AdInline />
    </div>
  )
}

function Usage({ label, n, max }) {
  const full = n >= max
  return (
    <div className="mt-3.5">
      <div className="flex justify-between gap-2 font-sans text-[12px]">
        <span className="text-content truncate">{label}</span>
        <span className={`font-bold shrink-0 ${full ? 'text-danger' : 'text-brand'}`}>{n} de {max}</span>
      </div>
      <div className="h-1 rounded-full bg-border mt-1.5 overflow-hidden"><div className={`h-full ${full ? 'bg-danger' : 'bg-brand'}`} style={{ width: `${Math.min(100, (n / max) * 100)}%` }} /></div>
    </div>
  )
}
