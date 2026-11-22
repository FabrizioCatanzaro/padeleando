import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Plus, ChevronDown, Building2 } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { NAV_ITEMS, profileItem } from './navConfig'

const CreateMenu = lazy(() => import('./CreateMenu'))

const ITEM = 'flex items-center gap-3 h-11 px-3 rounded-[10px] font-sans text-[14px] no-underline transition-colors'

export default function Sidebar() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [openAt, setOpenAt] = useState(null)
  // Se abre atado a la ruta: al navegar se cierra solo.
  const createOpen = openAt === pathname
  const setCreateOpen = (v) => setOpenAt((cur) => ((typeof v === 'function' ? v(cur === pathname) : v) ? pathname : null))
  const createRef = useRef(null)
  const items = [...NAV_ITEMS, profileItem(user?.username)]
  const clubs = user?.owned_clubs ?? []

  useEffect(() => {
    if (!createOpen) return
    const onDown = (e) => { if (!createRef.current?.contains(e.target)) setOpenAt(null) }
    const onKey = (e) => { if (e.key === 'Escape') setOpenAt(null) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [createOpen])

  return (
    <nav aria-label="Navegación principal"
      className="hidden lg:flex flex-col gap-1 shrink-0 w-[72px] xl:w-62 px-3 xl:px-3.5 py-5 border-r border-border sticky top-[71px] self-start h-[calc(100vh-71px)]">
      <div className="relative mb-4" ref={createRef}>
        <button type="button" onClick={() => setCreateOpen((o) => !o)} aria-haspopup="menu" aria-expanded={createOpen} aria-label="Crear"
          className="w-full h-12 rounded-xl border-0 bg-brand text-(color:--color-base) font-condensed font-bold text-[13px] tracking-wider flex items-center justify-center xl:justify-start gap-2.5 px-0 xl:px-3.5 cursor-pointer shadow-[0_6px_24px_color-mix(in_srgb,var(--color-brand)_18%,transparent)] hover:brightness-105 transition">
          <Plus size={18} strokeWidth={2.6} className="shrink-0" />
          <span className="hidden xl:inline flex-1 text-left">CREAR</span>
          <ChevronDown size={16} strokeWidth={2.4} className={`hidden xl:inline shrink-0 transition-transform ${createOpen ? 'rotate-180' : ''}`} />
        </button>
        {createOpen && (
          <div role="menu" className="absolute left-0 top-full mt-2 w-80 z-50 p-2.5 rounded-2xl bg-surface-alt border border-border-strong shadow-2xl">
            <Suspense fallback={<div className="min-h-72" />}><CreateMenu onClose={() => setCreateOpen(false)} /></Suspense>
          </div>
        )}
      </div>

      {items.map((it) => {
        const Icon = it.icon
        const active = it.match(pathname)
        return (
          <Link key={it.id} to={it.to} aria-current={active ? 'page' : undefined} title={it.label}
            className={`${ITEM} justify-center xl:justify-start ${active ? 'bg-brand/10 text-brand font-bold' : 'text-content font-semibold hover:bg-surface-alt hover:text-white'}`}>
            <Icon size={20} strokeWidth={active ? 2.2 : 2} className="shrink-0" />
            <span className="hidden xl:inline">{it.label}</span>
          </Link>
        )
      })}

      {clubs.length > 0 && (
        <>
          <div className="h-px bg-border mx-1.5 my-3.5" />
          <div className="hidden xl:block font-sans text-[10px] font-bold tracking-[2px] text-muted px-3 pb-1.5">TUS CLUBES</div>
          {clubs.map((c) => {
            const active = pathname === `/club/${c.id}`
            return (
              <Link key={c.id} to={`/club/${c.id}`} title={c.name} aria-current={active ? 'page' : undefined}
                className={`${ITEM} justify-center xl:justify-start ${active ? 'bg-brand/10 text-brand font-bold' : 'text-content font-semibold hover:bg-surface-alt hover:text-white'}`}>
                <Building2 size={20} className="shrink-0" />
                <span className="hidden xl:inline truncate min-w-0">{c.name}</span>
              </Link>
            )
          })}
        </>
      )}
    </nav>
  )
}
