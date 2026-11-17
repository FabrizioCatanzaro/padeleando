import { useState } from "react";
import Modal from "../shared/Modal";
import AvailabilityEditor from "../shared/AvailabilityEditor";
import { disponibilidadInvalida } from "../../utils/disponibilidad";

// WhatsApp y disponibilidad de un jugador en el torneo, editados por el organizador.
export default function DatosJugadorModal({ player, onSave, onClose }) {
  const [whatsapp, setWhatsapp] = useState(player.whatsapp ?? '');
  const [visible, setVisible] = useState(player.whatsapp_visible === true);
  const [disp, setDisp] = useState(player.availability ?? { slots: [], note: '' });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function guardar() {
    setSaving(true);
    setError(null);
    try {
      const vacia = (disp.slots?.length ?? 0) === 0 && !String(disp.note ?? '').trim();
      await onSave(player.id, { whatsapp: whatsapp.trim() || null, whatsapp_visible: visible, availability: vacia ? null : disp });
      onClose();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Datos de ${player.name}`}
      confirmText={saving ? 'Guardando…' : 'Guardar'}
      confirmDisabled={saving || disponibilidadInvalida(disp)}
      onConfirm={guardar}
      onCancel={onClose}
    >
      <div className="flex flex-col gap-4 text-left max-h-[60vh] overflow-y-auto pr-1">
        <label className="block">
          <span className="block text-[13px] font-semibold text-white mb-1.5">WhatsApp</span>
          <input
            type="tel" inputMode="tel" autoComplete="off" placeholder="+54 9 11 1234-5678" value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="w-full bg-base border border-border-mid text-white px-3 py-2.5 font-sans text-[14px] rounded-sm outline-none"
          />
        </label>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="w-5 h-5 mt-0.5 accent-brand cursor-pointer" />
          <span className="text-[13px] text-content">
            Mostrar a los demás jugadores del torneo
            <span className="block text-secondary text-[12px]">Los organizadores lo ven siempre. Cambialo solo si el jugador lo pidió.</span>
          </span>
        </label>
        <div>
          <span className="block text-[13px] font-semibold text-white mb-1.5">Disponibilidad</span>
          <AvailabilityEditor value={disp} onChange={setDisp} />
        </div>
        {error && <p role="alert" className="m-0 text-[13px] text-danger">{error}</p>}
      </div>
    </Modal>
  );
}
