import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { api } from '../../utils/api'
import EventCard from '../Home/EventCard'
import SignupFooter from '../Home/SignupFooter'
import GroupCard from '../shared/GroupCard'

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
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    api.home.get()
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setData({}) })
    return () => { cancelled = true }
  }, [])

  if (!data) return <div className="min-h-[50vh] flex justify-center pt-10"><Loader2 size={20} className="animate-spin text-muted" /></div>

  const signup = data.signup ?? []
  const shown = new Set(signup.map((t) => t.id))
  const live = (data.live ?? []).filter((t) => !shown.has(t.id))
  const upcoming = (data.upcoming ?? []).filter((t) => !shown.has(t.id))
  const featured = data.featured ?? []
  const open = (id) => navigate(`/view/${id}`)

  if (signup.length + live.length + upcoming.length + featured.length === 0) {
    return <p className="font-sans text-[13px] text-secondary min-h-[40vh]">No hay torneos públicos para mostrar ahora.</p>
  }

  return (
    <div className="flex flex-col gap-8">
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
