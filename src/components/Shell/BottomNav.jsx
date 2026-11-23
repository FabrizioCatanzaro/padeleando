import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useSummary } from '../../hooks/useSummary'
import { NAV_ITEMS, BADGE_TONE, showsBottomNav } from './navConfig'

const CreateMenu = lazy(() => import('./CreateMenu'))

function NavItem({ item, pathname, count = 0 }) {
  const Icon = item.icon
  const active = item.match(pathname)
  return (
    <Link to={item.to} aria-current={active ? 'page' : undefined}
      className={`w-15 h-14 flex flex-col items-center justify-center gap-1 rounded-[20px] no-underline transition-colors ${active ? 'text-brand bg-brand/10' : 'text-soft hover:text-white'}`}>
      <span className="relative flex">
        <Icon size={22} strokeWidth={active ? 2.2 : 2} />
        {count > 0 && (
          <span className={`absolute -top-1.5 -right-2.5 min-w-4.5 h-4.5 px-1 rounded-full flex items-center justify-center text-black font-sans font-bold text-[10px] ${BADGE_TONE[item.badge]}`}>
            {count > 9 ? '9+' : count}<span className="sr-only"> pendientes</span>
          </span>
        )}
      </span>
      <span className={`font-sans text-[10px] leading-none ${active ? 'font-bold' : 'font-semibold'}`}>{item.label}</span>
    </Link>
  )
}

export default function BottomNav() {
  const { pathname } = useLocation()
  const summary = useSummary()
  const countOf = (item) => (item.badge ? (summary?.pending?.[item.badge] ?? 0) : 0)
  const [openAt, setOpenAt] = useState(null)
  // Se abre atado a la ruta: al navegar se cierra solo.
  const createOpen = openAt === pathname
  const setCreateOpen = (v) => setOpenAt((cur) => ((typeof v === 'function' ? v(cur === pathname) : v) ? pathname : null))

  useEffect(() => {
    if (!createOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setOpenAt(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [createOpen])

  if (!showsBottomNav(pathname)) return null
  const [a, b, c, d] = NAV_ITEMS

  return (
    <>
      {createOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/55 backdrop-blur-[3px]" onClick={() => setCreateOpen(false)}>
          <div role="dialog" aria-label="Crear" onClick={(e) => e.stopPropagation()}
            className="glass-nav absolute inset-x-2.5 bottom-[calc(104px+env(safe-area-inset-bottom))] rounded-[28px] border border-white/10 shadow-2xl px-3.5 pt-4.5 pb-2.5">
            <Suspense fallback={<div className="min-h-72" />}><CreateMenu onClose={() => setCreateOpen(false)} /></Suspense>
          </div>
        </div>
      )}
      <nav aria-label="Navegación principal"
        className="glass-nav lg:hidden fixed inset-x-3.5 bottom-[calc(16px+env(safe-area-inset-bottom))] z-40 h-17 rounded-[34px] border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.55)] flex items-center justify-around px-1.5">
        <NavItem item={a} pathname={pathname} count={countOf(a)} />
        <NavItem item={b} pathname={pathname} count={countOf(b)} />
        <button type="button" onClick={() => setCreateOpen((o) => !o)} aria-label={createOpen ? 'Cerrar' : 'Crear'} aria-expanded={createOpen}
          className={`w-14 h-14 rounded-full border-0 flex items-center justify-center cursor-pointer transition-all ${createOpen ? 'bg-white text-(color:--color-base)' : 'bg-brand text-(color:--color-base) shadow-[0_6px_20px_color-mix(in_srgb,var(--color-brand)_35%,transparent)]'}`}>
          <Plus size={26} strokeWidth={2.6} className={`transition-transform ${createOpen ? 'rotate-45' : ''}`} />
        </button>
        <NavItem item={c} pathname={pathname} count={countOf(c)} />
        <NavItem item={d} pathname={pathname} count={countOf(d)} />
      </nav>
    </>
  )
}
