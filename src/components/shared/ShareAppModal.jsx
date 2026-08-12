import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, MoreHorizontal, X } from 'lucide-react';
import { Tile, WhatsAppIcon } from './ShareModal';

export default function ShareAppModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;
  const url = window.location.origin;

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const lines = [
    '🎾 Organizá torneos americanos y ligas',
    '📊 Cargá los partidos en vivo y llevá tus estadísticas',
  ];

  // WhatsApp interpreta *texto* como negrita
  const waText    = ['¡Sumate a *Padeleando*!', ...lines, `\n🔗 ${url}`].join('\n');
  const plainText = ['¡Sumate a Padeleando!', ...lines, `\n🔗 ${url}`].join('\n');

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank', 'noopener');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const moreOptions = async () => {
    if (canNativeShare) {
      try { await navigator.share({ title: 'Padeleando', text: plainText, url }); } catch { /* usuario canceló */ }
    } else {
      copyLink();
    }
  };

  // El header lo renderiza dentro de un contenedor con `translate`, y un
  // `translate` distinto de `none` es bloque contenedor de los `fixed` que
  // cuelgan de él: sin portal el overlay se ancla a la barra del header.
  return createPortal(
    <div
      className="fixed inset-0 z-1000 bg-black/75 flex items-end sm:items-center justify-center sm:p-5"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up bg-surface border border-border-strong w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="relative flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-mid">
          <div className="sm:hidden absolute left-1/2 -translate-x-1/2 top-2 w-9 h-1 rounded-full bg-border-strong" />
          <span className="font-condensed font-bold text-xl text-white">Invitar amigos</span>
          <button
            onClick={onClose}
            className="bg-transparent border-0 text-muted hover:text-white cursor-pointer p-1 transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex items-start gap-2 px-5 pt-5 pb-4">
          <Tile onClick={shareWhatsApp} accent icon={<WhatsAppIcon size={24} />} label="WhatsApp" />
          <Tile
            onClick={copyLink}
            icon={copied ? <Check size={22} /> : <Copy size={22} />}
            label={copied ? 'Copiado' : 'Copiar link'}
          />
          <Tile onClick={moreOptions} icon={<MoreHorizontal size={22} />} label="Más opciones" />
        </div>

        <div className="px-5 pb-5">
          <div className="text-[10px] font-mono tracking-widest text-muted mb-2">VISTA PREVIA</div>
          <div className="bg-surface-alt border border-border-mid rounded-xl px-4 py-3">
            <p className="text-[13px] text-content leading-relaxed font-sans">
              ¡Sumate a <strong className="text-white font-semibold">Padeleando</strong>!
            </p>
            {lines.map((l) => (
              <p key={l} className="text-[13px] text-content leading-relaxed font-sans">{l}</p>
            ))}
            <p className="text-[12px] text-brand font-mono break-all mt-2">🔗 {url}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
