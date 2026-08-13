// Genera src/components/Tutorial/tutorialIndex.js: el texto plano de cada
// sección de ayuda, para que el buscador del tutorial filtre por el cuerpo y no
// sólo por el título.
//
// Cómo: el contenido vive dentro de props JSX de 28 componentes, así que en vez
// de parsearlos los ejecutamos. esbuild transpila tutorialSections.js y sus
// imports a un bundle temporal, se renderiza cada componente con
// renderToStaticMarkup y del HTML resultante se extrae el texto. Es lo que ve
// el usuario, ni más ni menos — nada de heurísticas sobre el código fuente.
//
// Las secciones son componentes puros (sin hooks, sin router, sin contexto), lo
// cual es la precondición para poder renderizarlas fuera del browser. Si alguna
// deja de serlo el script falla acá, no en silencio.
//
// Corre solo en `npm run build` (prebuild). El resultado se commitea para que
// `npm run dev` funcione sin haber corrido nada.

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { build } from 'esbuild'
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

import { collapse } from '../src/components/Tutorial/searchText.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ENTRY = resolve(ROOT, 'src/components/Tutorial/tutorialSections.js')
const OUT = resolve(ROOT, 'src/components/Tutorial/tutorialIndex.js')
// Dentro de node_modules para que el bundle resuelva react/react-dom del
// proyecto al importarlo.
const TMP_DIR = resolve(ROOT, 'node_modules/.tutorial-index')
const TMP_BUNDLE = resolve(TMP_DIR, 'sections.mjs')

// Texto de chrome de los componentes, no del contenido: aparecería en todas las
// secciones que todavía no tienen captura y haría matchear "imagen" con medio
// tutorial.
const CHROME = ['IMAGEN PRÓXIMAMENTE']

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
}

// El bundle temporal no se conserva: quedaría desactualizado y confundiría. Que
// no se pueda borrar no es motivo para fallar — el índice ya está escrito.
function cleanup() {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true })
  } catch {
    /* sin permisos para borrar: no importa */
  }
}

function htmlToText(html) {
  return html
    // Los bloques dejan un separador visible. El índice alimenta los fragmentos
    // que se muestran en los resultados, y sin esto el final de un párrafo se
    // pega con el título del siguiente paso: "…iniciar sesión. Ir al inicio
    // Desde la pantalla principal…" se lee como una sola frase rota.
    .replace(/<\/(p|div|li|h[1-6]|ol|ul|blockquote|section)>/gi, ' · ')
    // El resto de las etiquetas se reemplaza por un espacio, no por nada: si no,
    // "</b><span>" pegaría dos palabras en una.
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    // Los cierres anidados (</div></li></ol>) generan separadores en fila, y
    // después de un punto el separador sobra.
    .replace(/\s+/g, ' ')
    .replace(/(?:·\s*)+/g, '· ')
    .replace(/([.:;,!?])\s*·/g, '$1')
    .replace(/^[·\s]+|[·\s]+$/g, '')
}

async function bundleSections() {
  mkdirSync(TMP_DIR, { recursive: true })
  await build({
    entryPoints: [ENTRY],
    outfile: TMP_BUNDLE,
    bundle: true,
    format: 'esm',
    platform: 'node',
    jsx: 'automatic',
    loader: { '.js': 'jsx' },
    // Externos, no bundleados: el bundle temporal vive dentro de node_modules,
    // así que Node los resuelve desde el proyecto al importarlo. Los íconos de
    // lucide no aportan texto pero renderizan, y sacarlos del bundle es más
    // barato que bundlearlos.
    external: ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react'],
    logLevel: 'silent',
  })
  return import(pathToFileURL(TMP_BUNDLE).href)
}

async function main() {
  const mod = await bundleSections()

  const index = {}
  const empty = []

  for (const section of mod.SECTIONS) {
    const html = renderToStaticMarkup(createElement(section.component))
    let text = htmlToText(html)
    for (const chunk of CHROME) text = text.split(chunk).join(' ')

    // Se guarda el texto tal cual lo lee el usuario, sin normalizar: los
    // resultados muestran un fragmento y "podés seleccionar hasta 2 emojis" se
    // lee bien, "podes seleccionar hasta 2 emojis" no. La versión plegada para
    // comparar se calcula en runtime, una sola vez, en searchText.js.
    //
    // Sí se colapsan los espacios acá: el plegado en runtime es 1:1 por
    // carácter, así que los índices de coincidencia sirven para cortar el
    // fragmento del texto original sólo si nadie más toca el largo.
    const clean = collapse(text)
    if (!clean) empty.push(section.id)
    index[section.id] = clean
  }

  cleanup()

  if (empty.length) {
    throw new Error(`Secciones sin texto indexable: ${empty.join(', ')}`)
  }

  const body = Object.entries(index)
    .map(([id, text]) => `  ${JSON.stringify(id)}: ${JSON.stringify(text)},`)
    .join('\n')

  const file = `// GENERADO AUTOMÁTICAMENTE — no editar a mano.
// Fuente: scripts/build-tutorial-index.mjs (corre en \`npm run build\`).
// Para regenerarlo después de tocar una sección: npm run tutorial:index
//
// Texto tal cual lo lee el usuario, con los espacios colapsados. El plegado
// para comparar (minúsculas, sin tildes) lo hace searchText.js en runtime.
export default {
${body}
}
`

  const prev = (() => { try { return readFileSync(OUT, 'utf8') } catch { return null } })()
  if (prev === file) {
    console.log(`tutorial-index: sin cambios (${mod.SECTIONS.length} secciones)`)
    return
  }

  writeFileSync(OUT, file)
  const kb = (Buffer.byteLength(file) / 1024).toFixed(1)
  console.log(`tutorial-index: ${mod.SECTIONS.length} secciones, ${kb} KB → ${OUT.replace(ROOT + '/', '')}`)
}

main().catch((err) => {
  cleanup()
  console.error('tutorial-index falló:', err.message)
  process.exit(1)
})
