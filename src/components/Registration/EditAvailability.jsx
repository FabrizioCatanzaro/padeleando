import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../utils/api';
import Btn from '../shared/Btn';
import AvailabilityEditor from '../shared/AvailabilityEditor';
import { disponibilidadInvalida } from '../../utils/disponibilidad';

const INPUT = 'h-12 w-full box-border bg-surface border border-border-strong rounded-lg px-3.5 text-white font-sans text-[15px] outline-none focus:border-brand';
const vacia = (d) => !d?.slots?.length && !String(d?.note ?? '').trim();
const WA = /^[+\d][\d\s()-]{5,24}$/;

// Datos de la inscripción ya enviada: WhatsApp, si se muestra y los horarios.
// El titular también edita los del compañero sin cuenta.
export default function EditAvailability({ registration: r, userId, conContacto = false, onClose, onSaved }) {
  const soyP1 = r.p1_user_id === userId;
  const conInvitado = soyP1 && r.kind === 'pair' && !r.p2_user_id;
  const [disp, setDisp] = useState(() => (soyP1 ? r.availability : r.p2_availability) ?? { slots: [], note: '' });
  const [dispCompa, setDispCompa] = useState(() => r.p2_availability ?? { slots: [], note: '' });
  const [wa, setWa] = useState(() => (soyP1 ? r.p1_whatsapp : r.p2_phone) ?? '');
  const [visible, setVisible] = useState(() => (soyP1 ? r.p1_whatsapp_visible : r.p2_whatsapp_visible) === true);
  const [waCompa, setWaCompa] = useState(() => r.p2_phone ?? '');
  const [de, setDe] = useState('yo');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const waOk = !conContacto || WA.test(wa.trim());
  const waCompaOk = !conContacto || !conInvitado || WA.test(waCompa.trim());

  async function guardar() {
    setSaving(true);
    setError(null);
    try {
      const body = { availability: vacia(disp) ? null : disp };
      if (conContacto) Object.assign(body, { whatsapp: wa.trim(), whatsapp_visible: visible });
      if (conInvitado) {
        body.partner_availability = vacia(dispCompa) ? null : dispCompa;
        if (conContacto) body.partner_whatsapp = waCompa.trim();
      }
      const res = await api.registrations.datos(r.id, body);
      onSaved?.(res);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="disp-titulo">
      <div className="bg-base w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl sm:border sm:border-border-mid flex flex-col overflow-hidden">
        <header className="h-14 pl-4 pr-2 flex items-center justify-between border-b border-border shrink-0">
          <h2 id="disp-titulo" className="m-0 text-[15px] font-bold text-white">{conContacto ? 'Tus datos' : 'Tus horarios'}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="w-11 h-11 flex items-center justify-center bg-transparent border-0 text-soft cursor-pointer"><X size={20} /></button>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3">
          {conInvitado && (
            <div role="group" aria-label="De quién son los datos" className="grid grid-cols-2 gap-1 p-1 bg-surface border border-border-strong rounded-lg">
              {[{ v: 'yo', l: 'Vos' }, { v: 'compa', l: r.p2_name ?? 'Tu compañero' }].map((o) => (
                <button key={o.v} type="button" aria-pressed={de === o.v} onClick={() => setDe(o.v)}
                  className={`h-10 rounded-md border-0 font-sans text-[13px] cursor-pointer truncate px-2 ${de === o.v ? 'bg-brand text-black font-bold' : 'bg-transparent text-soft font-semibold'}`}>
                  {o.l}
                </button>
              ))}
            </div>
          )}
          {de === 'yo' ? (
            <>
              {conContacto && (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] tracking-wide text-dim font-semibold">WHATSAPP</span>
                    <input type="tel" inputMode="tel" className={INPUT} maxLength={25} placeholder="+54 9 11 1234-5678" value={wa} onChange={(e) => setWa(e.target.value)} />
                  </label>
                  <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border-strong bg-surface cursor-pointer">
                    <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="w-5 h-5 mt-0.5 accent-brand cursor-pointer shrink-0" />
                    <span className="text-[14px] text-content leading-snug">
                      Mostrarlo a los demás jugadores del torneo
                      <span className="block text-[12px] text-secondary mt-0.5">Los organizadores lo ven siempre.</span>
                    </span>
                  </label>
                </>
              )}
              <p className="m-0 text-[14px] text-soft leading-snug">El organizador usa tus horarios para programar los partidos de cada fecha.</p>
              <AvailabilityEditor key="yo" value={disp} onChange={setDisp} />
            </>
          ) : (
            <>
              {conContacto && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] tracking-wide text-dim font-semibold">WHATSAPP DE {String(r.p2_name ?? 'tu compañero').toUpperCase()}</span>
                  <input type="tel" inputMode="tel" className={INPUT} maxLength={25} value={waCompa} onChange={(e) => setWaCompa(e.target.value)} />
                  <span className="text-[12px] text-dim">Solo lo ven el organizador y vos.</span>
                </label>
              )}
              <AvailabilityEditor key="compa" value={dispCompa} onChange={setDispCompa} />
            </>
          )}
          {error && <p className="m-0 text-[13px] text-danger">{error}</p>}
        </main>
        <footer className="p-4 border-t border-border shrink-0">
          <Btn variant="primary" size="lg" full onClick={guardar} loading={saving}
            disabled={!waOk || !waCompaOk || disponibilidadInvalida(disp) || disponibilidadInvalida(dispCompa)}>
            GUARDAR
          </Btn>
        </footer>
      </div>
    </div>
  );
}
