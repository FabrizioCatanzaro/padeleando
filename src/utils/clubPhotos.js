// Miniatura cuadrada o foto a lo ancho, con transformación de Cloudinary
export function clubPhotoUrl(url, { w = 400, square = true } = {}) {
  if (!url?.includes('/upload/')) return url
  return url.replace('/upload/', square ? `/upload/c_fill,ar_1:1,g_auto,f_auto,q_auto,w_${w}/` : `/upload/c_limit,f_auto,q_auto,w_${w}/`)
}
