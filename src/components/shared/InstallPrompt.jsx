import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Download, X, Share } from 'lucide-react'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { useAuth } from '../../context/useAuth'
import { showsBottomNav } from '../Shell/navConfig'
import { isSnoozed, OPEN_EVENT } from '../../utils/pwa'
import logoUrl from '../../assets/padeleando-logo.webp'

const DELAY_MS = 30_000


export default function InstallPrompt() {
  const { available, needsManualSteps, install, dismiss } = usePwaInstall()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const { isLoggedIn } = useAuth()
  // Con la barra de navegación de la app el cartel sube para no taparla.
  const aboveNav = isLoggedIn ? showsBottomNav(pathname) : pathname === '/'

  useEffect(() => {
    if (!available || isSnoozed()) return
    const id = setTimeout(() => setOpen(true), DELAY_MS)
    return () => clearTimeout(id)
  }, [available])

  // Apertura manual desde el menú: ignora el descarte previo.
  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [])

  if (!open || !available) return null

  function close() {
    dismiss()
    setOpen(false)
  }

  async function handleInstall() {
    const outcome = await install()
    if (outcome !== null) setOpen(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Instalar Padeleando"
      style={{ animation: 'fadeInUp 250ms ease forwards' }}
      className={`fixed left-3 right-3 z-50 sm:left-auto sm:right-5 sm:w-90
        ${aboveNav ? 'bottom-[calc(100px+env(safe-area-inset-bottom))] lg:bottom-5' : 'bottom-3 sm:bottom-5'}`}
    >
      <div className="bg-surface/85 backdrop-blur-xl border border-border-strong rounded-2xl shadow-2xl p-4 flex gap-3 items-start">
        <img src={logoUrl} width="40" height="40" alt="" className="w-10 h-10 rounded-xl shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="text-sm font-sans font-semibold text-content">Instalá Padeleando</div>

          {needsManualSteps ? (
            <p className="text-[12px] text-secondary leading-snug mt-1">
              Tocá <Share size={13} className="inline align-[-2px] text-brand" /> Compartir y
              después <span className="text-content font-semibold">Agregar a inicio</span>.
            </p>
          ) : (
            <>
              <p className="text-[12px] text-secondary leading-snug mt-1">
                Accedé más rápido desde tu pantalla de inicio, sin abrir el navegador.
              </p>
              <button
                onClick={handleInstall}
                className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 rounded-lg border border-brand/60 text-brand hover:bg-brand hover:text-base cursor-pointer transition-colors"
              >
                <Download size={13} /> Instalar
              </button>
            </>
          )}
        </div>

        <button
          onClick={close}
          aria-label="Cerrar"
          className="shrink-0 bg-transparent border-0 text-dim hover:text-content cursor-pointer transition-colors p-0.5"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
