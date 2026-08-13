// Búsqueda del tutorial: plegado de texto, filtrado y armado de los fragmentos
// que se muestran en los resultados.
//
// La pieza que condiciona todo lo demás es el plegado. Para resaltar la
// coincidencia hay que cortar el TEXTO ORIGINAL usando índices encontrados en el
// texto PLEGADO, así que el plegado tiene que ser 1:1 en caracteres: si "categoría"
// se plegara a algo de otro largo, el fragmento saldría corrido.

const DIACRITICS = /[̀-ͯ]/g

// Colapsa espacios. El índice generado ya viene así (lo hace el script), y las
// consultas pasan por acá antes de plegarse.
export function collapse(str) {
  return String(str).replace(/\s+/g, ' ').trim()
}

// Plega carácter por carácter conservando la posición: minúsculas y sin tildes,
// pero el resultado tiene exactamente el mismo largo que la entrada.
//
// Si algún carácter cambia de largo al plegarse (ß → ss, ligaduras) se deja como
// está: perder ese match es preferible a desalinear todos los índices que vienen
// después. La ñ sí se aplana (año → ano), y la consulta pasa por lo mismo.
export function fold(str) {
  let out = ''
  for (const ch of str) {
    const folded = ch.normalize('NFD').replace(DIACRITICS, '').toLowerCase()
    out += folded.length === ch.length ? folded : ch
  }
  return out
}

// Los términos de la consulta, plegados. Se separan en palabras para poder
// exigir todas (AND): "2 emojis" no debe traer todo lo que diga "2".
export function searchTerms(query) {
  return fold(collapse(query)).split(' ').filter(Boolean)
}

// Todas las apariciones de cualquier término dentro de [from, to), fusionando
// las que se solapan para no anidar dos <mark>.
function hitRanges(folded, terms, from, to) {
  const ranges = []

  for (const term of terms) {
    let i = folded.indexOf(term, from)
    while (i !== -1 && i < to) {
      ranges.push([i, Math.min(i + term.length, to)])
      i = folded.indexOf(term, i + term.length)
    }
  }

  ranges.sort((a, b) => a[0] - b[0])

  const merged = []
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1]
    if (last && start <= last[1]) last[1] = Math.max(last[1], end)
    else merged.push([start, end])
  }
  return merged
}

// Devuelve el fragmento alrededor de la primera coincidencia, partido en trozos
// { text, hit } para que la UI resalte sin usar dangerouslySetInnerHTML.
export function buildSnippet(text, folded, terms, width = 170) {
  let at = -1
  for (const term of terms) {
    const i = folded.indexOf(term)
    if (i !== -1 && (at === -1 || i < at)) at = i
  }
  if (at === -1) return null

  // Se deja algo de contexto antes de la coincidencia, no se arranca justo ahí.
  let start = Math.max(0, at - Math.floor(width / 3))
  let end = Math.min(text.length, start + width)

  // Cortar al medio de una palabra se lee mal: se corre el borde al espacio más
  // cercano, siempre que no se coma la coincidencia.
  if (start > 0) {
    const space = text.indexOf(' ', start)
    if (space !== -1 && space < at) start = space + 1
  }
  if (end < text.length) {
    const space = text.lastIndexOf(' ', end)
    if (space > at) end = space
  }

  const parts = []
  let cursor = start
  for (const [hitStart, hitEnd] of hitRanges(folded, terms, start, end)) {
    if (hitStart > cursor) parts.push({ text: text.slice(cursor, hitStart), hit: false })
    parts.push({ text: text.slice(hitStart, hitEnd), hit: true })
    cursor = hitEnd
  }
  if (cursor < end) parts.push({ text: text.slice(cursor, end), hit: false })

  return { parts, cutStart: start > 0, cutEnd: end < text.length }
}

// Resultados planos y ordenados: primero las secciones cuyo título matchea
// (es lo que el usuario suele estar buscando), después las que matchean en el
// cuerpo. Dentro de cada tanda se respeta el orden del tutorial.
//
// `body` y `folded` pueden faltar: el índice entra por import dinámico y hasta
// que llega se busca sólo por título en vez de devolver cero resultados.
export function searchSections({ groups, titles, terms, body, folded }) {
  if (!terms.length) return null

  const byTitle = []
  const byBody = []

  for (const group of groups) {
    for (const section of group.sections) {
      const title = titles[section.id] ?? ''
      const text = body?.[section.id] ?? ''
      const foldedText = folded?.[section.id] ?? ''

      const inTitle = terms.every((t) => title.includes(t))
      const inBody = text && terms.every((t) => `${title} ${foldedText}`.includes(t))
      if (!inTitle && !inBody) continue

      const result = {
        section,
        group: group.label,
        inTitle,
        snippet: foldedText ? buildSnippet(text, foldedText, terms) : null,
      }
      ;(inTitle ? byTitle : byBody).push(result)
    }
  }

  return [...byTitle, ...byBody]
}
