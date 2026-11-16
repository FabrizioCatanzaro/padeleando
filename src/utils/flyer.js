// Flyer del torneo recortado a 9:16 por Cloudinary; g_auto centra lo importante.
export function flyerSrc(url, width) {
  if (!url) return null;
  if (!url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/c_fill,ar_9:16,g_auto,f_auto,q_auto,w_${width}/`);
}

export const FLYER_MAX_BYTES = 10 * 1024 * 1024;
export const FLYER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
