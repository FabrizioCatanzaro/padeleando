// Provincias y localidades de Argentina desde la API Georef del Estado (datos.gob.ar).

const BASE = 'https://apis.datos.gob.ar/georef/api'
const cache = new Map()

function get(path) {
  if (!cache.has(path)) {
    const p = fetch(`${BASE}${path}`).then((r) => {
      if (!r.ok) throw new Error(`Georef ${r.status}`)
      return r.json()
    })
    p.catch(() => cache.delete(path))
    cache.set(path, p)
  }
  return cache.get(path)
}

const SMALL = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'el'])

// Algunas versiones de Georef devuelven los nombres en mayúsculas.
export function prettyName(name) {
  const v = String(name ?? '').trim()
  if (v !== v.toUpperCase()) return v
  return v.toLowerCase().split(' ').map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ')
}

/** [{ id, nombre }] ordenadas por nombre. */
export async function fetchProvincias() {
  const d = await get('/provincias?campos=id,nombre&max=30&orden=nombre')
  return (d.provincias ?? []).map((p) => ({ id: p.id, nombre: prettyName(p.nombre) }))
}

/** Nombres de localidades de una provincia, sin repetidos y ordenados. */
export async function fetchLocalidades(provinciaId) {
  const d = await get(`/localidades?provincia=${encodeURIComponent(provinciaId)}&campos=nombre&max=5000&orden=nombre`)
  return [...new Set((d.localidades ?? []).map((l) => prettyName(l.nombre)))]
}
