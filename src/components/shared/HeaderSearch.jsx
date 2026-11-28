import { lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import useHomeSearch from '../../hooks/useHomeSearch'

const SearchPalette = lazy(() => import('../Home/SearchPalette'))

// Paleta global del buscador. "Ver todos" lleva los resultados completos a Inicio con ?q=.
export default function HeaderSearch({ onClose }) {
  const navigate = useNavigate()
  const search = useHomeSearch()
  const palette = {
    ...search,
    commit: () => {
      const term = search.q.trim()
      if (term.length < 2) return
      navigate(`/?q=${encodeURIComponent(term)}`)
    },
  }
  return createPortal(
    <Suspense fallback={null}>
      <SearchPalette open onClose={onClose} search={palette} onNavigate={(to) => navigate(to)} />
    </Suspense>,
    document.body,
  )
}
