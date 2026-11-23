import { useEffect, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../utils/api'
import { useAuth } from '../context/useAuth'

const MIN_GAP_MS = 15_000

let summary = null
let lastFetch = 0
let inflight = null
const listeners = new Set()

function emit() {
  listeners.forEach((fn) => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function load(force = false) {
  if (inflight || (!force && Date.now() - lastFetch < MIN_GAP_MS)) return
  lastFetch = Date.now()
  inflight = api.me.summary()
    .then((data) => { summary = data; emit() })
    .catch(() => {})
    .finally(() => { inflight = null })
}

// Para llamar después de una acción que cambia un contador (confirmar un resultado, aprobar una inscripción).
export function refreshSummary() {
  load(true)
}

// Un solo pedido compartido entre el menú lateral, la barra inferior y la cabecera.
export function useSummary() {
  const { isLoggedIn } = useAuth()
  const { pathname } = useLocation()
  const data = useSyncExternalStore(subscribe, () => summary)

  useEffect(() => {
    if (isLoggedIn) { load(); return }
    summary = null
    lastFetch = 0
    emit()
  }, [isLoggedIn, pathname])

  useEffect(() => {
    if (!isLoggedIn) return
    const onVisible = () => { if (!document.hidden) load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [isLoggedIn])

  return isLoggedIn ? data : null
}
