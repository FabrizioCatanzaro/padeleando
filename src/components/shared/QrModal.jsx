import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { Check, Copy, Download, Loader2, X } from 'lucide-react';

function slugify(s) {
  return (s || 'torneo')
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'torneo';
}

export default function QrModal({ url, tournamentName, categoryName, onClose }) {
  const [copied, setCopied]           = useState(false);
  const [downloading, setDownloading] = useState(false);
  const qrRef = useRef(null);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const downloadQr = async () => {
    if (!qrRef.current || downloading) return;
    setDownloading(true);
    try {
      if (document.fonts?.ready) { try { await document.fonts.ready; } catch { /* ignore */ } }
      const dataUrl = await toPng(qrRef.current, { pixelRatio: 3, cacheBust: true, backgroundColor: '#ffffff' });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `qr-${slugify(tournamentName)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch { /* ignore */ } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-1000 bg-black/75 flex items-end sm:items-center justify-center sm:p-5"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up bg-surface border border-border-strong w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="relative flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-mid">
          {/* Handle (mobile) */}
          <div className="sm:hidden absolute left-1/2 -translate-x-1/2 top-2 w-9 h-1 rounded-full bg-border-strong" />
          <span className="font-condensed font-bold text-xl text-white">Código QR</span>
          <button
            onClick={onClose}
            className="bg-transparent border-0 text-muted hover:text-white cursor-pointer p-1 transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-6 flex flex-col items-center">
          {/* QR sobre fondo blanco para escaneo confiable en tema oscuro.
              Este nodo es el que se exporta como PNG. */}
          <div ref={qrRef} className="bg-[#ffffff] rounded-2xl p-4">
            <QRCodeSVG value={url} size={220} level="M" marginSize={2} bgColor="#ffffff" fgColor="#000000" />
          </div>

          <div className="mt-4 text-center">
            <div className="font-condensed font-bold text-lg text-white leading-tight">{tournamentName}</div>
            {categoryName && <div className="text-[12px] font-mono text-muted mt-0.5">{categoryName}</div>}
          </div>

          <p className="text-[12px] text-secondary text-center mt-3 max-w-[260px] leading-relaxed">
            Escaneá este código para entrar al torneo y seguir los resultados en vivo.
          </p>

          <div className="flex items-center gap-2 mt-5">
            <button
              onClick={downloadQr}
              disabled={downloading}
              className="inline-flex items-center gap-2 text-[12px] font-condensed font-bold tracking-wide bg-brand text-base rounded-full px-4 py-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Descargar QR
            </button>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-2 text-[12px] font-mono text-muted hover:text-soft transition-colors bg-transparent border border-border-strong rounded-full px-3.5 py-2 cursor-pointer"
            >
              {copied ? <Check size={13} className="text-brand" /> : <Copy size={13} />}
              {copied ? 'Copiado' : 'Copiar link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
