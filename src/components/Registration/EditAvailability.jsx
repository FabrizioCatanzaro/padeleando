import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../utils/api';
import Btn from '../shared/Btn';
import AvailabilityEditor from '../shared/AvailabilityEditor';
import { disponibilidadInvalida } from '../../utils/disponibilidad';

// Editar los horarios de una inscripción ya enviada.
export default function EditAvailability({ registration, onClose, onSaved }) {
  const [disp, setDisp] = useState(() => registration.availability ?? { slots: [], note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function guardar() {
    setSaving(true);
    setError(null);
    try {
      const vacia = !disp.slots?.length && !disp.note?.trim();
      const r = await api.registrations.availability(registration.id, vacia ? null : disp);
      onSaved?.(r.availability ?? null);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="disp-titulo">
      <div className="bg-base w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl sm:border sm:border-border-mid flex flex-col overflow-hidden">
        <header className="h-14 pl-4 pr-2 flex items-center justify-between border-b border-border shrink-0">
          <h2 id="disp-titulo" className="m-0 text-[15px] font-bold text-white">Tus horarios</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="w-11 h-11 flex items-center justify-center bg-transparent border-0 text-soft cursor-pointer"><X size={20} /></button>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3">
          <p className="m-0 text-[14px] text-soft leading-snug">El organizador los usa para programar los partidos de cada fecha.</p>
          <AvailabilityEditor value={disp} onChange={setDisp} />
          {error && <p className="m-0 text-[13px] text-danger">{error}</p>}
        </main>
        <footer className="p-4 border-t border-border shrink-0">
          <Btn variant="primary" size="lg" full onClick={guardar} loading={saving} disabled={disponibilidadInvalida(disp)}>GUARDAR HORARIOS</Btn>
        </footer>
      </div>
    </div>
  );
}
