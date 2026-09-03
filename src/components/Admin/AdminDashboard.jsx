import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, UserCheck, Crown, Layers, Trophy, Swords, UserPlus, Image, Megaphone, Building2, Inbox, ClipboardList } from 'lucide-react'
import { api } from '../../utils/api'
import Loader from '../Loader/Loader'
import TimeseriesChart from './TimeseriesChart'

const RANGE_OPTIONS = [
  { days: 7,  label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
]

// Accesos directos del panel. `badge` es opcional: cuando devuelve un número > 0
// se dibuja como pastilla en la esquina, igual que el contador de notificaciones
// del Header (mismo bg-brand/text-base/animate-pulse).
const ACTIONS = [
  { to: '/admin/users',           icon: Users,     label: 'GESTIONAR USUARIOS' },
  { to: '/admin/tournaments',     icon: Trophy,    label: 'VER TORNEOS' },
  { to: '/admin/clubs',           icon: Building2, label: 'GESTIONAR CLUBES' },
  { to: '/admin/clubs/requests',  icon: Inbox,     label: 'SOLICITUDES DE CLUB', badge: (s) => s.pending_club_requests },
  { to: '/admin/notifications',   icon: Megaphone, label: 'ENVIAR NOTIFICACIÓN' },
]

function StatCard({ icon, label, value, sub, highlight }) {
  const Icon = icon
  return (
    <div className={`bg-surface border rounded-lg p-4 flex flex-col gap-2 ${highlight ? 'border-brand/50' : 'border-border'}`}>
      <div className={`flex items-center gap-2 ${highlight ? 'text-brand' : 'text-muted'}`}>
        <Icon size={14} />
        <span className="font-condensed font-bold text-[11px] tracking-[2px] uppercase">{label}</span>
      </div>
      <div className="font-mono text-[28px] text-white font-bold leading-none">{value ?? '—'}</div>
      {sub && <div className="text-[11px] font-mono text-muted">{sub}</div>}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats,    setStats]    = useState(null)
  const [series,   setSeries]   = useState(null)
  const [days,     setDays]     = useState(30)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    Promise.all([api.admin.stats(), api.admin.timeseries(days)])
      .then(([s, ts]) => { setStats(s); setSeries(ts.points) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [days])

  if (loading) return <Loader />
  if (error)   return <p className="text-danger text-sm font-mono p-6">{error}</p>
  if (!stats)  return null

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
      <h1 className="font-condensed font-black text-2xl tracking-widest text-white mb-1">
        DASHBOARD <span className="text-brand">ADMIN</span>
      </h1>
      <p className="text-muted text-xs font-mono mb-6">Métricas agregadas de la plataforma</p>

      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mb-6">
        {ACTIONS.map((a, i) => {
          const Icon    = a.icon
          const badge   = a.badge?.(stats) ?? 0
          const lastOdd = i === ACTIONS.length - 1 && ACTIONS.length % 2 === 1
          return (
            <Link key={a.to} to={a.to}
              className={`relative flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 text-center bg-surface border border-border hover:border-brand text-white text-[10px] sm:text-xs font-condensed font-bold tracking-wide sm:tracking-widest px-3 py-3 sm:py-2 rounded transition-colors ${lastOdd ? 'col-span-2 sm:col-span-1' : ''}`}>
              <Icon size={15} className="shrink-0" />
              {a.label}
              {badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-brand text-base text-[9px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none animate-pulse">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="font-condensed font-bold text-[12px] tracking-[3px] text-muted">ACTIVIDAD</div>
          <div className="flex gap-1">
            {RANGE_OPTIONS.map(opt => (
              <button key={opt.days} onClick={() => setDays(opt.days)}
                className={`text-[11px] font-condensed font-bold tracking-widest px-2 py-1 rounded transition-colors ${
                  days === opt.days
                    ? 'bg-brand text-base'
                    : 'bg-surface border border-border text-muted hover:text-white'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {series && <TimeseriesChart points={series} />}
      </section>

      <section className="mb-8">
        <div className="font-condensed font-bold text-[12px] tracking-[3px] text-muted mb-3">USUARIOS</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Users}     label="Totales"    value={stats.total_users}    sub={`+${stats.new_users_30d} en 30d`} />
          <StatCard icon={UserCheck} label="Verificados" value={stats.verified_users} />
          <StatCard icon={UserPlus}  label="Nuevos 7d"   value={stats.new_users_7d} />
          <StatCard icon={Crown}     label="Premium"     value={stats.premium_users} />
        </div>
      </section>

      <section className="mb-8">
        <div className="font-condensed font-bold text-[12px] tracking-[3px] text-muted mb-3">TORNEOS Y CATEGORÍAS</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Layers} label="Categorías"       value={stats.total_groups}      sub={`+${stats.groups_30d} en 30d`} />
          <StatCard icon={Trophy} label="Torneos totales"  value={stats.total_tournaments} sub={`+${stats.tournaments_30d} en 30d`} />
          <StatCard icon={Trophy} label="Torneos activos"  value={stats.active_tournaments} />
          <StatCard icon={Trophy} label="Torneos 7d"       value={stats.tournaments_7d} />
        </div>
      </section>

      <section className="mb-8">
        <div className="font-condensed font-bold text-[12px] tracking-[3px] text-muted mb-3">CLUBES</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Building2}      label="Clubes totales"        value={stats.total_clubs} />
          <StatCard icon={ClipboardList}  label="Solicitudes pendientes" value={stats.pending_club_requests}
            highlight={stats.pending_club_requests > 0}
            sub={stats.pending_club_requests > 0 ? 'esperando revisión' : undefined} />
        </div>
      </section>

      <section className="mb-8">
        <div className="font-condensed font-bold text-[12px] tracking-[3px] text-muted mb-3">PARTIDOS</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Swords} label="Totales"  value={stats.total_matches} sub={`+${stats.matches_30d} en 30d`} />
          <StatCard icon={Swords} label="Últ. 7d"  value={stats.matches_7d} />
          <StatCard icon={Users}  label="Jugadores" value={stats.total_players} />
          <StatCard icon={Image}  label="Fotos"    value={stats.total_photos} />
        </div>
      </section>
    </div>
  )
}
