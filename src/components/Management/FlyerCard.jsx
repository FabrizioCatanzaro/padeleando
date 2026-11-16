import { useRef, useState } from 'react';
import { ImagePlus, Trash2, RefreshCw } from 'lucide-react';
import Btn from '../shared/Btn';
import { flyerSrc, FLYER_MAX_BYTES, FLYER_TYPES } from '../../utils/flyer';

// Flyer del torneo en Gestión: subir, cambiar o quitar.
export default function FlyerCard({ tournament, onUpload, onDelete }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const url = tournament.flyer_url ?? null;

  async function elegir(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!FLYER_TYPES.includes(file.type)) return setError('Usá una imagen JPG, PNG o WEBP.');
    if (file.size > FLYER_MAX_BYTES) return setError('La imagen supera los 10 MB.');
    setError(null);
    setBusy('subir');
    try { await onUpload(file); } catch (err) { setError(err.message ?? 'No se pudo subir el flyer'); }
    finally { setBusy(null); }
  }

  async function quitar() {
    setBusy('quitar');
    setError(null);
    try { await onDelete(); } catch (err) { setError(err.message ?? 'No se pudo quitar el flyer'); }
    finally { setBusy(null); }
  }

  return (
    <section aria-label="Flyer del torneo" className="bg-surface border border-border-mid rounded-xl mt-6 p-4 flex gap-4 items-start">
      <div className="w-[90px] shrink-0 aspect-[9/16] rounded-lg overflow-hidden border border-border-mid bg-surface-alt flex items-center justify-center">
        {url
          ? <img src={flyerSrc(url, 270)} alt="Flyer del torneo" width={90} height={160} className="w-full h-full object-cover" />
          : <ImagePlus size={24} className="text-dim" aria-hidden="true" />}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <h4 className="m-0 text-[15px] font-bold text-white">Flyer</h4>
        <p className="m-0 text-[13px] text-secondary leading-snug">
          La imagen que usás para promocionar el torneo. Se muestra vertical, en formato 9:16.
        </p>
        <div className="flex gap-2 flex-wrap mt-1">
          <Btn size="sm" variant={url ? 'secondary' : 'primary'} icon={url ? RefreshCw : ImagePlus}
            loading={busy === 'subir'} disabled={!!busy} onClick={() => input.current?.click()}>
            {url ? 'Cambiar' : 'Subir flyer'}
          </Btn>
          {url && (
            <Btn size="sm" variant="danger" icon={Trash2} loading={busy === 'quitar'} disabled={!!busy} onClick={quitar}>Quitar</Btn>
          )}
        </div>
        {error && <p className="m-0 text-[12px] text-danger">{error}</p>}
        <input ref={input} type="file" accept={FLYER_TYPES.join(',')} className="hidden" onChange={elegir} />
      </div>
    </section>
  );
}
