import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { clubPhotoUrl } from '../../utils/clubPhotos'

function Lightbox({ photos, index, onClose, onMove }) {
  const prev = useCallback(() => onMove((index + photos.length - 1) % photos.length), [index, photos.length, onMove])
  const next = useCallback(() => onMove((index + 1) % photos.length), [index, photos.length, onMove])
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, prev, next])
  const btn = 'w-11 h-11 rounded-full bg-photo-shade/60 text-photo-ink border-0 cursor-pointer flex items-center justify-center hover:bg-photo-shade/85'
  return (
    <div role="dialog" aria-modal="true" aria-label={`Foto ${index + 1} de ${photos.length}`}
      className="fixed inset-0 z-1000 bg-photo-shade/90 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <img src={clubPhotoUrl(photos[index].url, { w: 1600, square: false })} alt=""
        className="max-w-full max-h-[85vh] object-contain rounded-lg" />
      <button type="button" onClick={onClose} aria-label="Cerrar" className={`${btn} absolute top-4 right-4`}><X size={20} /></button>
      {photos.length > 1 && (
        <>
          <button type="button" onClick={prev} aria-label="Foto anterior" className={`${btn} absolute left-3 top-1/2 -translate-y-1/2`}><ChevronLeft size={22} /></button>
          <button type="button" onClick={next} aria-label="Foto siguiente" className={`${btn} absolute right-3 top-1/2 -translate-y-1/2`}><ChevronRight size={22} /></button>
        </>
      )}
      <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[13px] text-photo-ink/80">{index + 1} / {photos.length}</span>
    </div>
  )
}

// Grilla de fotos; con `max` muestra unas pocas y la última cuenta las que faltan
export default function ClubGallery({ photos, max = null, onMore = null }) {
  const [open, setOpen] = useState(null)
  if (!photos?.length) return null
  const visible = max ? photos.slice(0, max) : photos
  const rest = max ? photos.length - visible.length : 0
  return (
    <>
      <div className={`grid gap-2 ${max ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
        {visible.map((p, i) => {
          const isMore = rest > 0 && i === visible.length - 1
          return (
            <button key={p.id} type="button" onClick={() => (isMore && onMore ? onMore() : setOpen(i))}
              aria-label={isMore ? `Ver las ${photos.length} fotos` : `Ver foto ${i + 1}`}
              className="relative block p-0 border-0 rounded-[10px] overflow-hidden cursor-pointer bg-surface-alt aspect-square">
              <img src={clubPhotoUrl(p.url, { w: max ? 300 : 500 })} alt="" width="300" height="300" loading="lazy"
                className={`w-full h-full object-cover ${isMore ? 'brightness-40' : ''}`} />
              {isMore && <span className="absolute inset-0 flex items-center justify-center font-condensed font-black text-[20px] text-photo-ink">+{rest + 1}</span>}
            </button>
          )
        })}
      </div>
      {open != null && <Lightbox photos={photos} index={open} onClose={() => setOpen(null)} onMove={setOpen} />}
    </>
  )
}
