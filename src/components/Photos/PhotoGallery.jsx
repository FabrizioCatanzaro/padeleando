import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, X, Gem, Pencil, Check, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../utils/api';
import { fmt } from '../../utils/helpers';
import Modal from '../shared/Modal';
import PremiumModal from '../shared/PremiumModal';

const MAX_PHOTO_BYTES    = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTOS         = 12;
const MAX_CAPTION_LEN    = 100;

function cld(src, width) {
  if (!src || !src.includes('/upload/')) return src;
  return src.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
}

export default function PhotoGallery({ tournamentId, isOwner = false, isPremium = false }) {
  const fileInputRef = useRef(null);
  const trackRef     = useRef(null);
  const [photos,     setPhotos]     = useState([]);
  const [index,      setIndex]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [listError,  setListError]  = useState(null);

  // Upload (single, con modal de caption)
  const [uploading,    setUploading]    = useState(false);
  const [uploadError,  setUploadError]  = useState(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [pendingFile,  setPendingFile]  = useState(null);

  // Upload múltiple (batch)
  const [batch, setBatch] = useState(null); // { total, done }

  // Edición inline de caption
  const [editingId,  setEditingId]  = useState(null);
  const [editDraft,  setEditDraft]  = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [lightbox,       setLightbox]       = useState(null);
  const [confirmDel,     setConfirmDel]     = useState(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setListError(null);
    api.photos.list(tournamentId)
      .then((list) => { if (alive) { setPhotos(Array.isArray(list) ? list : []); setIndex(0); } })
      .catch((e)   => { if (alive) { setListError(e.message); console.error('[PhotoGallery] list failed:', e); } })
      .finally(()  => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tournamentId]);

  const goTo = useCallback((i, behavior = 'smooth') => {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(i, photos.length - 1));
    el.scrollTo({ left: clamped * el.clientWidth, behavior });
    setIndex(clamped);
  }, [photos.length]);

  function handleScroll() {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIndex((prev) => (prev === i ? prev : i));
  }

  function openFilePicker() {
    if (!isPremium) { setShowPremiumModal(true); return; }
    if (uploading || batch) return;
    setUploadError(null);
    fileInputRef.current?.click();
  }

  function validateFile(file) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) return `${file.name}: formato no soportado`;
    if (file.size > MAX_PHOTO_BYTES)             return `${file.name}: excede 10 MB`;
    return null;
  }

  async function handleFilesPicked(e) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    const issues = [];
    const valid  = [];
    for (const f of files) {
      const err = validateFile(f);
      if (err) issues.push(err); else valid.push(f);
    }

    const slotsLeft = Math.max(0, MAX_PHOTOS - photos.length);
    if (slotsLeft === 0) {
      setUploadError(`Límite de ${MAX_PHOTOS} fotos alcanzado`); return;
    }
    const toUpload = valid.slice(0, slotsLeft);
    const overflow = valid.length - toUpload.length;

    if (toUpload.length === 0) {
      setUploadError(issues.join(' · ') || 'No hay archivos válidos'); return;
    }

    // 1 archivo → modal para agregar caption antes de subir.
    if (toUpload.length === 1 && issues.length === 0 && overflow === 0) {
      setPendingFile(toUpload[0]);
      setCaptionDraft('');
      setUploadError(null);
      return;
    }

    // >1 archivo → batch sin caption (el usuario las puede editar después).
    await uploadBatch(toUpload, { issues, overflow });
  }

  async function uploadBatch(files, { issues = [], overflow = 0 } = {}) {
    setUploadError(null);
    setBatch({ total: files.length, done: 0 });
    const uploaded = [];
    const errors   = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const created = await api.photos.upload(tournamentId, files[i], '');
        uploaded.push(created);
      } catch (err) {
        errors.push(`${files[i].name}: ${err.message}`);
      }
      setBatch({ total: files.length, done: i + 1 });
    }

    // Mantener orden: más nuevas primero.
    setPhotos((prev) => [...uploaded.reverse(), ...prev]);
    setBatch(null);
    goTo(0, 'auto');

    const msg = [];
    if (issues.length)   msg.push(...issues);
    if (overflow > 0)    msg.push(`${overflow} no subida(s) por el límite de ${MAX_PHOTOS}`);
    if (errors.length)   msg.push(...errors);
    if (msg.length)      setUploadError(msg.join(' · '));
  }

  async function confirmUpload() {
    if (!pendingFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const created = await api.photos.upload(tournamentId, pendingFile, captionDraft.trim());
      setPhotos((prev) => [created, ...prev]);
      setPendingFile(null);
      setCaptionDraft('');
      goTo(0, 'auto');
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function cancelPending() {
    if (uploading) return;
    setPendingFile(null);
    setCaptionDraft('');
    setUploadError(null);
  }

  async function handleSetCover(photoId) {
    try {
      await api.photos.setCover(tournamentId, photoId);
      setPhotos((prev) => {
        const updated = prev.map((p) => ({ ...p, is_cover: p.id === photoId }));
        return updated.sort((a, b) => {
          if (a.is_cover && !b.is_cover) return -1;
          if (!a.is_cover && b.is_cover) return 1;
          return new Date(b.created_at) - new Date(a.created_at);
        });
      });
      goTo(0, 'auto');
    } catch (err) {
      setUploadError(err.message);
    }
  }

  async function handleDelete(photoId) {
    try {
      await api.photos.delete(tournamentId, photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setConfirmDel(null);
      setLightbox((lb) => (lb?.id === photoId ? null : lb));
      setIndex((i) => Math.max(0, Math.min(i, photos.length - 2)));
    } catch (err) {
      setUploadError(err.message);
      setConfirmDel(null);
    }
  }

  function startEdit(photo) {
    setEditingId(photo.id);
    setEditDraft(photo.caption ?? '');
    setUploadError(null);
  }

  function cancelEdit() {
    if (editSaving) return;
    setEditingId(null);
    setEditDraft('');
  }

  async function saveEdit(photoId) {
    setEditSaving(true);
    try {
      const updated = await api.photos.updateCaption(tournamentId, photoId, editDraft.trim());
      setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, caption: updated.caption } : p));
      setEditingId(null);
      setEditDraft('');
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setEditSaving(false);
    }
  }

  const total        = photos.length;
  const reachedLimit = total >= MAX_PHOTOS;
  const busy         = uploading || !!batch;
  const current      = photos[Math.min(index, total - 1)] ?? null;
  const isEditing    = current ? editingId === current.id : false;

  if (loading) {
    return (
      <div className="mt-8 pt-6 border-t border-border">
        <div className="font-condensed font-bold text-sm tracking-[3px] text-muted">FOTOS</div>
        <div className="text-xs font-mono text-dim mt-3">Cargando...</div>
      </div>
    );
  }

  // Visitante sin fotos y sin error: galería oculta.
  if (!isOwner && total === 0 && !listError) return null;

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="font-condensed font-bold text-sm tracking-[3px] text-muted flex items-center gap-2">
          <ImageIcon size={14} /> FOTOS {total > 0 && <span className="text-dim font-mono">({total}/{MAX_PHOTOS})</span>}
        </div>

        {isOwner && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleFilesPicked}
            />
            <button
              type="button"
              onClick={openFilePicker}
              disabled={(busy && isPremium) || reachedLimit}
              className="relative flex items-center gap-1.5 bg-brand text-base border-0 px-3 py-1.5 font-condensed font-bold text-[12px] tracking-wide cursor-pointer rounded disabled:opacity-50 disabled:cursor-wait"
            >
              <Camera size={13} />
              {batch && isPremium
                ? `SUBIENDO ${batch.done}/${batch.total}...`
                : 'SUBIR FOTOS'}
              <span className="absolute -top-2 -right-2 bg-[#7c3aed] text-white rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                <Gem size={9} />
              </span>
            </button>
          </>
        )}
      </div>

      {listError && (
        <div className="text-xs text-danger font-mono mb-3">{listError}</div>
      )}
      {uploadError && (
        <div className="text-xs text-danger font-mono mb-3">{uploadError}</div>
      )}

      {total === 0 && isOwner && (
        <div className="text-center text-dim py-8 px-5 font-sans text-sm border border-dashed border-border-mid rounded-lg">
          Todavía no hay fotos. Subí la primera para darle vida al torneo.
        </div>
      )}

      {total > 0 && (
        <div className="rounded-lg overflow-hidden border border-border-mid bg-surface">
          <div className="relative">
            <div
              ref={trackRef}
              onScroll={handleScroll}
              className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {photos.map((p, i) => (
                <div
                  key={p.id}
                  className="relative w-full shrink-0 snap-center aspect-4/5 max-h-[70vh] bg-black overflow-hidden"
                >
                  <img
                    src={cld(p.url, 48)}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-40"
                  />
                  <button
                    type="button"
                    onClick={() => setLightbox(p)}
                    className="relative block w-full h-full p-0 bg-transparent border-0 cursor-zoom-in"
                    aria-label="Ampliar foto"
                  >
                    <img
                      src={cld(p.url, 1000)}
                      alt={p.caption || 'Foto del torneo'}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      className="w-full h-full object-contain"
                    />
                  </button>

                  {p.is_cover && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-brand text-base px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest pointer-events-none">
                      <Star size={9} fill="currentColor" /> PORTADA
                    </div>
                  )}
                  {total > 1 && (
                    <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-0.5 rounded-full text-[10px] font-mono pointer-events-none">
                      {i + 1}/{total}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => goTo(index - 1)}
                  disabled={index === 0}
                  aria-label="Foto anterior"
                  className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white border-0 rounded-full w-9 h-9 items-center justify-center cursor-pointer hover:bg-black/80 transition disabled:opacity-0 disabled:pointer-events-none"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => goTo(index + 1)}
                  disabled={index >= total - 1}
                  aria-label="Foto siguiente"
                  className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white border-0 rounded-full w-9 h-9 items-center justify-center cursor-pointer hover:bg-black/80 transition disabled:opacity-0 disabled:pointer-events-none"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>

          {total > 1 && (
            <div className="flex items-center justify-center gap-1.5 py-2.5">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Ir a la foto ${i + 1}`}
                  className={`border-0 p-0 rounded-full cursor-pointer transition ${
                    i === index ? 'w-2 h-2 bg-brand' : 'w-1.5 h-1.5 bg-border-strong'
                  }`}
                />
              ))}
            </div>
          )}

          {current && (isEditing ? (
            <div className="px-3 py-2.5 flex items-center gap-2 border-t border-border">
              <input
                autoFocus
                type="text"
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')  saveEdit(current.id);
                  if (e.key === 'Escape') cancelEdit();
                }}
                maxLength={MAX_CAPTION_LEN}
                placeholder="Descripción"
                className="flex-1 min-w-0 bg-base border border-border-mid text-white px-2.5 py-1.5 rounded text-[12px] outline-none font-sans"
              />
              <span className={`text-[11px] font-mono shrink-0 tabular-nums ${editDraft.length >= MAX_CAPTION_LEN ? 'text-danger' : 'text-dim'}`}>
                {MAX_CAPTION_LEN - editDraft.length}
              </span>
              <button
                type="button"
                onClick={() => saveEdit(current.id)}
                disabled={editSaving}
                title="Guardar"
                className="bg-brand text-base border-0 w-8 h-8 flex items-center justify-center cursor-pointer rounded disabled:opacity-50"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={editSaving}
                title="Cancelar"
                className="bg-transparent text-muted border border-border-strong w-8 h-8 flex items-center justify-center cursor-pointer rounded disabled:opacity-50"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="px-3 py-2.5 border-t border-border flex items-center justify-between gap-3 text-[12px] font-mono">
              <span className={`truncate ${current.caption ? 'text-muted' : 'text-dim italic'}`}>
                {current.caption || (isOwner ? 'Sin descripción' : '')}
              </span>
              <span className="text-dim whitespace-nowrap shrink-0">{fmt(current.created_at)}</span>
            </div>
          ))}

          {current && isOwner && !isEditing && (
            <div className="px-3 py-2 border-t border-border flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleSetCover(current.id)}
                disabled={current.is_cover}
                className="flex items-center gap-1.5 bg-transparent text-muted border border-border-strong px-2.5 py-1.5 rounded text-[11px] font-mono cursor-pointer hover:text-brand hover:border-brand transition disabled:opacity-50 disabled:cursor-default disabled:hover:text-muted disabled:hover:border-border-strong"
              >
                <Star size={12} fill={current.is_cover ? 'currentColor' : 'none'} />
                {current.is_cover ? 'Es portada' : 'Portada'}
              </button>
              <button
                type="button"
                onClick={() => startEdit(current)}
                className="flex items-center gap-1.5 bg-transparent text-muted border border-border-strong px-2.5 py-1.5 rounded text-[11px] font-mono cursor-pointer hover:text-white hover:border-white transition"
              >
                <Pencil size={12} /> Editar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDel(current)}
                className="flex items-center gap-1.5 bg-transparent text-muted border border-border-strong px-2.5 py-1.5 rounded text-[11px] font-mono cursor-pointer hover:text-danger hover:border-danger transition ml-auto"
              >
                <Trash2 size={12} /> Eliminar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-1000 p-5"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 bg-surface text-white border border-border-strong rounded-full w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-border-mid transition"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={cld(lightbox.url, 1600)} alt={lightbox.caption || ''} className="w-full max-h-[80vh] object-contain rounded" />
            {lightbox.caption && (
              <div className="mt-3 text-center text-sm font-mono text-muted">{lightbox.caption}</div>
            )}
          </div>
        </div>
      )}

      {/* Modal de upload single (con caption opcional) */}
      {pendingFile && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-1000 p-5">
          <div className="bg-surface border border-border-strong rounded-[10px] p-6 max-w-105 w-full">
            <div className="font-condensed font-bold text-2xl text-white mb-2.5">Subir foto</div>
            <div className="text-sm text-secondary font-sans mb-4">
              {pendingFile.name} · {(pendingFile.size / 1024 / 1024).toFixed(1)} MB
            </div>
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <label className="block text-[11px] tracking-[2px] text-dim font-mono">DESCRIPCIÓN (OPCIONAL)</label>
              <span className={`text-[11px] font-mono tabular-nums ${captionDraft.length >= MAX_CAPTION_LEN ? 'text-danger' : 'text-dim'}`}>
                {captionDraft.length}/{MAX_CAPTION_LEN}
              </span>
            </div>
            <input
              type="text"
              value={captionDraft}
              onChange={(e) => setCaptionDraft(e.target.value)}
              maxLength={MAX_CAPTION_LEN}
              placeholder="Ej: Final del torneo"
              className="w-full bg-surface border border-border-mid text-white px-3.5 py-2.5 rounded text-sm outline-none font-sans"
            />
            {uploadError && <div className="text-xs text-danger font-mono mt-3">{uploadError}</div>}
            <div className="flex gap-2.5 justify-end mt-5">
              <button
                onClick={cancelPending}
                disabled={uploading}
                className="bg-transparent text-muted border border-border-strong px-5 py-2.5 text-sm cursor-pointer rounded font-sans disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmUpload}
                disabled={uploading}
                className="border-0 px-5 py-2.5 font-condensed font-bold text-sm tracking-wide cursor-pointer rounded whitespace-nowrap text-base bg-brand disabled:opacity-50 disabled:cursor-wait"
              >
                {uploading ? 'SUBIENDO...' : 'SUBIR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de borrado */}
      {confirmDel && (
        <Modal
          title="Eliminar foto"
          message="Esta acción es permanente."
          confirmText="Eliminar"
          confirmDanger
          onCancel={() => setConfirmDel(null)}
          onConfirm={() => handleDelete(confirmDel.id)}
        />
      )}

      {showPremiumModal && <PremiumModal onClose={() => setShowPremiumModal(false)} />}
    </div>
  );
}
