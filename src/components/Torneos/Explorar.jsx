import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { api } from '../../utils/api'
import EventCard from '../Home/EventCard'
import SignupFooter from '../Home/SignupFooter'
import GroupCard from '../shared/GroupCard'
import CategoryRow from '../shared/CategoryRow'
import { useAuth } from '../../context/useAuth'
import { mergeGroups, nextByGroup } from '../../utils/homePanel'

const MINE_STEP = 5

// Favoritas y donde jugás. Las propias y las co-organizadas están en Organizar.
function MyCategories({ rows, live, upcoming, onOpen }) {
  const [all, setAll] = useState(false)
  if (rows.length === 0) return null
  const liveIds = new Set(live.map((t) => t.group_id))
  const next = nextByGroup(upcoming)
  const shown = all ? rows : rows.slice(0, MINE_STEP)
  return (
    <section aria-label="Tus categorías">
      <h2 className="m-0 mb-3 font-sans text-[11px] font-bold tracking-[2px] text-muted">TUS CATEGORÍAS</h2>
      <div className="rounded-xl border border-border overflow-hidden">
        {shown.map((g) => <CategoryRow key={g.id} g={g} live={liveIds.has(g.id)} next={next.get(g.id)} onClick={() => onOpen(g.id)} />)}
      </div>
      {rows.length > MINE_STEP && (
        <button type="button" onClick={() => setAll(!all)}
          className="mt-2.5 min-h-11 bg-transparent border-0 p-0 font-sans text-[13px] font-bold text-brand cursor-pointer hover:underline">
          {all ? 'Ver menos' : `Ver las ${rows.length}`}
        </button>
      )}
    </section>
  )
}

function Grid({ title, rows, footer, onOpen }) {
  if (rows.length === 0) return null
  return (
    <section aria-label={title}>
      <h2 className="m-0 mb-3 font-sans text-[11px] font-bold tracking-[2px] text-muted">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((t) => (
          <EventCard key={t.id} t={t} className="h-full w-full" onClick={() => onOpen(t.id)} footer={footer ? <SignupFooter t={t} /> : null} />
        ))}
      </div>
    </section>
  )
}

// Misma vitrina pública que la portada (/api/home).
export default function Explorar() {
  const navigate = useNavigate()
  const { isLoggedIn, user } = useAuth()
  const [data, setData] = useState(null)
  const [mine, setMine] = useState([])

  useEffect(() => {
    let cancelled = false
    const empty = () => []
    Promise.all([
      api.home.get().catch(() => ({})),
      isLoggedIn ? api.groups.participating().catch(empty) : [],
      isLoggedIn ? api.groups.favorites().catch(empty) : [],
    ]).then(([home, part, favs]) => {
      if (cancelled) return
      const own = (g) => g.owner_username && g.owner_username === user?.username
      setMine(mergeGroups({ partGroups: part.filter((g) => !own(g)), favGroups: favs.filter((g) => !own(g)), liveGroupIds: new Set((home.live ?? []).map((t) => t.group_id)) }))
      setData(home)
    })
    return () => { cancelled = true }
  }, [isLoggedIn, user?.username])

  if (!data) return <div className="min-h-[50vh] flex justify-center pt-10"><Loader2 size={20} className="animate-spin text-muted" /></div>

  const signup = data.signup ?? []
  const shown = new Set(signup.map((t) => t.id))
  const live = (data.live ?? []).filter((t) => !shown.has(t.id))
  const upcoming = (data.upcoming ?? []).filter((t) => !shown.has(t.id))
  const mineIds = new Set(mine.map((g) => g.id))
  const featured = (data.featured ?? []).filter((g) => !mineIds.has(g.id))
  const open = (id) => navigate(`/view/${id}`)

  if (mine.length + signup.length + live.length + upcoming.length + featured.length === 0) {
    return <p className="font-sans text-[13px] text-secondary min-h-[40vh]">No hay torneos públicos para mostrar ahora.</p>
  }

  return (
    <div className="flex flex-col gap-8">
      <MyCategories rows={mine} live={data.live ?? []} upcoming={data.upcoming ?? []} onOpen={(id) => navigate(`/cat/${id}`)} />
      <Grid title="INSCRIPCIÓN ABIERTA" rows={signup} footer onOpen={open} />
      <Grid title="SE ESTÁN JUGANDO" rows={live} onOpen={open} />
      <Grid title="PRÓXIMOS" rows={upcoming} onOpen={open} />
      {featured.length > 0 && (
        <section aria-label="Categorías activas">
          <h2 className="m-0 mb-3 font-sans text-[11px] font-bold tracking-[2px] text-muted">CATEGORÍAS ACTIVAS</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((g) => <GroupCard key={g.id} g={g} className="h-full w-full" onClick={() => navigate(`/cat/${g.id}`)} />)}
          </div>
        </section>
      )}
    </div>
  )
}
