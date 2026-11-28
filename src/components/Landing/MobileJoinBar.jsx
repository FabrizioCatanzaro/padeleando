import { Link } from 'react-router-dom'

// Aparece cuando el hero sale de pantalla: ahí ya no se ven sus botones.
export default function MobileJoinBar({ visible }) {
  return (
    <div inert={!visible}
      className={`lg:hidden fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] bg-land-night/90 backdrop-blur-md border-t border-land-text/12 transition-transform duration-300 ease-out motion-reduce:transition-none ${visible ? 'translate-y-0' : 'translate-y-[110%]'}`}>
      <div className="flex-1 min-w-0">
        <div className="font-sans font-bold text-[15px] text-land-text">Jugar es gratis</div>
        <Link to="/login" className="font-sans text-[13px] text-land-soft no-underline">Ya tengo cuenta</Link>
      </div>
      <Link to="/register" className="inline-flex items-center h-12 px-[22px] rounded-full bg-land-lime font-sans font-bold text-[15px] text-land-ink no-underline">Crear cuenta gratis</Link>
    </div>
  )
}
