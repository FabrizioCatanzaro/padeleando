import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Loader2, Plus, Swords, Trophy, LayoutGrid, CalendarDays } from 'lucide-react'
import { api } from '../../utils/api'

const CREATE_OPTIONS = [
  { id: 'amistoso',  label: 'Amistoso',        sub: 'Abrí un partido o cargá uno jugado', icon: Swords,       tone: 'brand', to: '/amistosos/nuevo' },
  { id: 'torneo',    label: 'Torneo',          sub: 'Liga, Americano o Copa',             icon: Trophy,       tone: 'cyan' },
  { id: 'categoria', label: 'Categoría',       sub: 'Agrupá torneos del mismo grupo',     icon: LayoutGrid,   tone: 'muted', to: '/?nueva=categoria' },
  { id: 'reserva',   label: 'Reservar cancha', sub: 'En clubes con turnos online',        icon: CalendarDays, tone: 'muted', to: '/padeleros/clubes' },
]

const TONE = {
  brand: 'bg-brand/12 text-brand',
  cyan:  'bg-cyan/12 text-cyan',
  muted: 'bg-white/7 text-content',
}

const ROW = 'w-full flex items-center gap-3.5 min-h-16 px-2 py-2 rounded-2xl bg-transparent border-0 text-left cursor-pointer transition-colors hover:bg-white/5'

export default function CreateMenu({ onClose }) {
  const navigate = useNavigate()
  const [step, setStep] = useState('root')
  const [groups, setGroups] = useState(null)

  useEffect(() => {
    if (step !== 'torneo' || groups) return
    let cancelled = false
    Promise.all([api.groups.list(), api.groups.collaborating()])
      .then(([own, collab]) => {
        if (cancelled) return
        const seen = new Set()
        setGroups([...(own ?? []), ...(collab ?? [])].filter((g) => !seen.has(g.id) && seen.add(g.id)))
      })
      .catch(() => { if (!cancelled) setGroups([]) })
    return () => { cancelled = true }
  }, [step, groups])

  function go(to) {
    onClose()
    navigate(to)
  }

  function pick(opt) {
    if (opt.id === 'torneo') setStep('torneo')
    else go(opt.to)
  }

  if (step === 'torneo') return (
    <div>
      <button type="button" onClick={() => setStep('root')}
        className="flex items-center gap-1 min-h-11 px-2 bg-transparent border-0 text-[13px] text-soft hover:text-white cursor-pointer">
        <ChevronLeft size={16} />Volver
      </button>
      <div className="font-condensed font-bold text-[15px] text-white px-2 pb-2">¿En qué categoría?</div>
      {groups == null && (
        <div className="flex items-center justify-center min-h-24 text-muted"><Loader2 size={18} className="animate-spin" /></div>
      )}
      {groups?.length === 0 && (
        <div className="px-2 pb-2">
          <p className="m-0 text-[13px] text-soft">Los torneos se crean dentro de una categoría. Todavía no organizás ninguna.</p>
          <button type="button" onClick={() => go('/?nueva=categoria')}
            className="mt-3 h-10 px-4 rounded-lg border-0 bg-brand text-(color:--color-base) font-sans font-bold text-[13px] cursor-pointer inline-flex items-center gap-2">
            <Plus size={16} />Crear categoría
          </button>
        </div>
      )}
      {groups?.length > 0 && (
        <div className="max-h-[50vh] overflow-y-auto">
          {groups.map((g) => (
            <button key={g.id} type="button" onClick={() => go(`/cat/${g.id}/torneo/new`)} className={ROW}>
              <span className="w-11 h-11 shrink-0 rounded-xl bg-white/7 flex items-center justify-center text-[18px]">
                {g.emojis?.[0] ?? <Plus size={18} className="text-muted" />}
              </span>
              <span className="flex-1 min-w-0 font-sans font-semibold text-[15px] text-white truncate">{g.name}</span>
              <ChevronRight size={16} className="text-muted shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div className="font-condensed font-bold text-[15px] text-white px-2 pb-2">¿Qué querés crear?</div>
      {CREATE_OPTIONS.map((opt) => {
        const Icon = opt.icon
        return (
          <button key={opt.id} type="button" onClick={() => pick(opt)} className={ROW}>
            <span className={`w-11 h-11 shrink-0 rounded-[14px] flex items-center justify-center ${TONE[opt.tone]}`}>
              <Icon size={21} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-sans font-bold text-[15px] text-white">{opt.label}</span>
              <span className="block font-sans text-[12px] text-secondary mt-0.5">{opt.sub}</span>
            </span>
            <ChevronRight size={16} className="text-muted shrink-0" />
          </button>
        )
      })}
    </div>
  )
}
