import { useState } from 'react'
import { Trash2, Upload } from 'lucide-react'
import { api } from '../../../utils/api'
import { useToast } from '../../../context/useToast'
import { clubPhotoUrl } from '../../../utils/clubPhotos'

// Cada foto se sube y se borra en el momento, como las canchas
export default function ClubPhotosEditor({ club, onChange }) {
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const photos = club.photos ?? []
  const limit = club.photo_limit ?? 4
  const full = photos.length >= limit

  async function onPick(e) {
    const files = [...(e.target.files ?? [])].slice(0, limit - photos.length)
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    let next = photos
    try {
      for (const f of files) {
        const p = await api.clubs.gallery.upload(club.id, f)
        next = [...next, p]
        onChange(next)
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    setBusy(true)
    try {
      await api.clubs.gallery.remove(club.id, id)
      onChange(photos.filter((p) => p.id !== id))
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(110px,1fr))]">
        {photos.map((p) => (
          <div key={p.id} className="relative aspect-square rounded-[10px] overflow-hidden bg-surface-alt">
            <img src={clubPhotoUrl(p.url, { w: 240 })} alt="" width="120" height="120" className="w-full h-full object-cover" />
            <button type="button" onClick={() => remove(p.id)} disabled={busy} aria-label="Borrar foto"
              className="absolute top-1.5 right-1.5 w-9 h-9 rounded-lg bg-photo-shade/70 text-photo-ink border-0 cursor-pointer flex items-center justify-center hover:text-danger disabled:opacity-50">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {!full && (
          <label className={`aspect-square rounded-[10px] border border-dashed border-border-strong flex flex-col items-center justify-center gap-1.5 text-[13px] text-soft ${busy ? 'opacity-60' : 'cursor-pointer hover:border-soft'}`}>
            <Upload size={18} aria-hidden="true" />{busy ? 'Subiendo…' : 'Subir fotos'}
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy} onChange={onPick} />
          </label>
        )}
      </div>
      <p className="m-0 mt-3 text-[13px] text-secondary">
        {photos.length} de {limit} fotos.{full ? ' Llegaste al límite: borrá una para subir otra.' : ''}
      </p>
    </div>
  )
}
