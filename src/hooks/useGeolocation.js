import { useEffect, useState } from 'react'

function locate(setState) {
  if (!navigator.geolocation) { setState({ status: 'unsupported', coords: null }); return }
  setState((s) => ({ ...s, status: 'loading' }))
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => setState({ status: 'done', coords: { lat: coords.latitude, lon: coords.longitude } }),
    (err) => setState({ status: err.code === 1 ? 'denied' : 'error', coords: null }),
    { maximumAge: 10 * 60 * 1000, timeout: 10000 },
  )
}

// Pide la ubicación al tocar; si el permiso ya estaba dado, la pide sola al montar.
export function useGeolocation() {
  const [state, setState] = useState({ status: 'idle', coords: null })

  useEffect(() => {
    let cancelled = false
    navigator.permissions?.query({ name: 'geolocation' })
      .then((r) => { if (!cancelled && r.state === 'granted') locate(setState) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return [state, () => locate(setState)]
}
