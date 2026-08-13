import { useState, useEffect, useMemo, useRef } from 'react'
import { ChevronDown, Search, X, CornerDownLeft } from 'lucide-react'
import FadeInCard from '../shared/FadeInCard'
import { GROUPS, SECTIONS } from './tutorialSections'
import { collapse, fold, searchTerms, searchSections } from './searchText'

// Los títulos se pliegan una vez, no en cada tecla.
const TITLES = Object.fromEntries(SECTIONS.map((s) => [s.id, fold(collapse(s.title))]))

// /tutorial#crear-categoria abre esa sección. Lo usan el checklist de la portada
// y cualquier ayuda contextual que quiera mandar acá sin repetir el texto.
function sectionFromHash() {
  const id = window.location.hash.replace('#', '')
  return SECTIONS.some((s) => s.id === id) ? id : null
}

export default function TutorialView() {
  const [activeId, setActiveId] = useState(() => sectionFromHash() ?? SECTIONS[0].id)
  const [indexOpen, setIndexOpen] = useState(false)
  const [query, setQuery] = useState('')
  // Texto del cuerpo de cada sección: 40 KB que sólo hacen falta si alguien
  // busca, así que entran por import dinámico en su propio chunk. Hasta que
  // llega, se busca por título en vez de mostrar cero resultados.
  const [body, setBody] = useState(null)
  const bodyRequested = useRef(false)

  function loadBody() {
    if (bodyRequested.current) return
    bodyRequested.current = true
    import('./tutorialIndex').then((m) => setBody(m.default)).catch(() => {
      bodyRequested.current = false
    })
  }

  // Navegar a otro #hash con el tutorial ya abierto no remonta el componente.
  useEffect(() => {
    const onHash = () => { const id = sectionFromHash(); if (id) setActiveId(id) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // El plegado del cuerpo se hace una sola vez al llegar el índice, no por tecla.
  const folded = useMemo(() => {
    if (!body) return null
    return Object.fromEntries(Object.entries(body).map(([id, text]) => [id, fold(text)]))
  }, [body])

  const terms = useMemo(() => searchTerms(query), [query])

  const results = useMemo(
    () => searchSections({ groups: GROUPS, titles: TITLES, terms, body, folded }),
    [terms, body, folded],
  )

  const searching = terms.length > 0

  const active = SECTIONS.find((s) => s.id === activeId) ?? SECTIONS[0]
  const ActiveComponent = active.component
  const ActiveIcon = active.icon

  function select(id) {
    setActiveId(id)
    setIndexOpen(false)
    // Abrir un resultado cierra la búsqueda: si no, la pantalla principal
    // seguiría mostrando la lista y el click no haría nada visible.
    setQuery('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function onSearchKeyDown(e) {
    if (e.key === 'Escape') { setQuery(''); e.currentTarget.blur() }
    // Enter abre el primer resultado: buscar y elegir sin sacar las manos del teclado.
    if (e.key === 'Enter' && results?.length) {
      select(results[0].section.id)
      e.currentTarget.blur()
    }
  }

  const searchBox = (
    <div className="relative">
      <Search
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
      />
      <input
        type="search"
        value={query}
        onChange={(e) => { setQuery(e.target.value); loadBody() }}
        onFocus={loadBody}
        onKeyDown={onSearchKeyDown}
        placeholder="Buscar en la ayuda…"
        aria-label="Buscar en la ayuda"
        className="w-full bg-surface border border-border rounded-lg pl-9 pr-9 py-2 text-[13px] text-white font-sans placeholder:text-muted outline-none focus:border-brand/50 transition-colors [&::-webkit-search-cancel-button]:hidden"
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-md bg-transparent border-0 text-muted hover:text-white cursor-pointer transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )

  const snippetText = (snippet) => (
    <p className="text-[13px] text-secondary font-sans leading-relaxed mt-1.5 mb-0">
      {snippet.cutStart && '… '}
      {snippet.parts.map((part, i) =>
        part.hit ? (
          <mark key={i} className="bg-brand/25 text-white rounded-[3px] px-0.5">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
      {snippet.cutEnd && ' …'}
    </p>
  )

  const resultCard = ({ section, group, snippet }) => {
    const Icon = section.icon
    return (
      <button
        key={section.id}
        onClick={() => select(section.id)}
        className="w-full text-left bg-surface border border-border rounded-lg px-5 py-4 cursor-pointer transition-colors hover:border-brand/40 focus:border-brand/40 outline-none"
      >
        <div className="flex items-center gap-2.5">
          <Icon size={15} className="text-brand shrink-0" />
          <span className="font-condensed font-bold text-[17px] text-white tracking-wide leading-tight">
            {section.title}
          </span>
          <span className="text-[10px] font-mono text-muted tracking-widest uppercase ml-auto shrink-0">
            {group}
          </span>
        </div>
        {snippet && snippetText(snippet)}
      </button>
    )
  }

  // Función, no constante: `results` es null mientras no hay consulta, así que
  // esto sólo puede evaluarse cuando searching es true.
  const resultsPane = () => (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] font-mono text-muted tracking-widest uppercase">
          {results.length === 0
            ? 'Sin resultados'
            : `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'} para “${collapse(query)}”`}
        </span>
        {results.length > 0 && (
          <span className="hidden md:flex items-center gap-1.5 text-[10px] font-mono text-muted tracking-wide ml-auto">
            <CornerDownLeft size={12} /> abre el primero
          </span>
        )}
      </div>

      {results.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg px-5 py-6 text-[14px] text-secondary font-sans leading-relaxed">
          No encontramos nada para{' '}
          <span className="text-white">“{collapse(query)}”</span>. Probá con menos
          palabras o con otro término. Si la ayuda que buscás no existe todavía,
          escribinos y la sumamos.
        </div>
      ) : (
        <div className="flex flex-col gap-3">{results.map(resultCard)}</div>
      )}
    </div>
  )

  // Mientras se busca, el panel central muestra los resultados en vez de la
  // sección. El sidebar queda intacto: un lugar para navegar, otro para buscar.
  const mainPane = searching ? (
    <FadeInCard key="resultados">{resultsPane()}</FadeInCard>
  ) : (
    <FadeInCard key={activeId}>
      <ActiveComponent />
    </FadeInCard>
  )

  const navButton = (s) => {
    const Icon = s.icon
    const isActive = s.id === activeId && !searching
    return (
      <button
        key={s.id}
        onClick={() => select(s.id)}
        className={`w-full flex items-center gap-3 px-5 py-2.5 text-left bg-transparent border-0 text-sm font-sans transition-colors cursor-pointer ${
          isActive
            ? 'text-brand bg-surface border-r-2 border-r-brand'
            : 'text-content hover:text-white hover:bg-surface'
        }`}
      >
        <Icon size={15} className="shrink-0" />
        <span className="leading-snug">{s.title}</span>
      </button>
    )
  }

  const groupLabel = (label) => (
    <div className="text-[10px] font-mono text-muted tracking-widest px-5 pt-4 pb-2 uppercase">
      {label}
    </div>
  )

  const navList = GROUPS.map((g) => (
    <div key={g.id}>
      {groupLabel(g.label)}
      {g.sections.map(navButton)}
    </div>
  ))

  return (
    <div className="bg-base text-content font-sans pb-15">
      {/* Cabecera */}
      <div className="px-6 pt-6 pb-5 border-b border-border">
        <div className="font-condensed font-bold text-[28px] text-white tracking-wide">
          Ayuda y tutoriales
        </div>
        <div className="text-[12px] text-muted font-mono mt-1">
          Todo lo que necesitás saber para usar Padeleando
        </div>
      </div>

      {/* Mobile: buscador + índice desplegable. Una tira horizontal de 28 tabs
          no se puede recorrer. Con la búsqueda activa el desplegable se esconde:
          los resultados ya ocupan la pantalla y el índice sólo estorbaría. */}
      <div className="md:hidden border-b border-border">
        <div className="px-6 pt-4 pb-3">{searchBox}</div>

        {!searching && (
          <>
            <button
              onClick={() => { setIndexOpen((v) => !v); loadBody() }}
              className="w-full flex items-center justify-between gap-3 px-6 pb-3.5 bg-transparent border-0 cursor-pointer"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <ActiveIcon size={15} className="text-brand shrink-0" />
                <span className="font-condensed font-bold text-[15px] text-white tracking-wide truncate">
                  {active.title}
                </span>
              </span>
              <ChevronDown
                size={16}
                className={`text-muted shrink-0 transition-transform ${indexOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {indexOpen && (
              <div className="border-t border-border pb-2 max-h-[60vh] overflow-y-auto">
                {navList}
              </div>
            )}
          </>
        )}
      </div>

      {/* Desktop: sidebar agrupado + contenido */}
      <div className="hidden md:flex gap-0">
        <aside className="w-64 shrink-0 border-r border-border sticky top-0 self-start h-screen overflow-y-auto pb-6">
          <div className="px-4 pt-4">{searchBox}</div>
          {navList}
        </aside>

        <main className="flex-1 min-w-0 p-8 max-w-3xl">{mainPane}</main>
      </div>

      {/* Mobile: contenido debajo del índice */}
      <div className="md:hidden p-6">{mainPane}</div>
    </div>
  )
}
