import { useEffect } from 'react';
import { X } from 'lucide-react';
import { flyerSrc } from '../../utils/flyer';

// Flyer a pantalla completa; se cierra tocando afuera o con Escape.
export default function FlyerViewer({ url, tournamentName = '', onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Flyer de ${tournamentName}`} onClick={onClose}>
      <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center rounded-full bg-black/60 border border-border-strong text-white cursor-pointer"><X size={20} /></button>
      <img
        src={flyerSrc(url, 1080)} alt={`Flyer de ${tournamentName}`} width={1080} height={1920}
        className="max-h-full max-w-full w-auto h-auto aspect-[9/16] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
