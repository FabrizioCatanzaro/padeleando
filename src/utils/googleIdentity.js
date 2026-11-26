// Google Identity se carga solo donde hace falta (98,6 KB); se inicializa una vez y cada botón trae su propio callback.

const GSI_SRC = 'https://accounts.google.com/gsi/client'
let gsiPromise = null
let initialized = false
let handler = null

export function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${GSI_SRC}"]`)
      const script = existing ?? document.createElement('script')
      script.addEventListener('load', () => resolve())
      script.addEventListener('error', () => { gsiPromise = null; reject(new Error('No se pudo cargar Google')) })
      if (!existing) {
        script.src = GSI_SRC
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }
    })
  }
  return gsiPromise
}

/** Dibuja el botón de Google en `el`; `onCredential` recibe el id token. */
export async function renderGoogleButton(el, onCredential, options = {}) {
  await loadGoogleIdentity()
  if (!el) return
  if (!initialized) {
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: ({ credential }) => handler?.(credential),
    })
    initialized = true
  }
  handler = onCredential
  window.google.accounts.id.renderButton(el, {
    type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', locale: 'es',
    width: el.offsetWidth, ...options,
  })
}
