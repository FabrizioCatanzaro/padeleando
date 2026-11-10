import { useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { partesDelReglamento } from '../../utils/rules';

// Reglamento del torneo a pantalla completa en el teléfono y centrado en escritorio.
export default function RulesModal({ rules, tournamentName = null, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/75 flex sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="reglamento-titulo" onClick={onClose}>
      <div className="bg-base w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-lg sm:rounded-2xl sm:border sm:border-border-mid flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <header className="h-14 pl-4 pr-2 flex items-center gap-2.5 border-b border-border shrink-0">
          <FileText size={17} className="text-brand shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <h2 id="reglamento-titulo" className="m-0 text-[15px] font-bold text-white">Reglamento</h2>
            {tournamentName && <div className="text-[12px] text-secondary truncate">{tournamentName}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="w-11 h-11 flex items-center justify-center bg-transparent border-0 text-soft cursor-pointer hover:text-white"><X size={20} /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <p className="m-0 text-[14px] text-content leading-relaxed whitespace-pre-wrap break-words font-sans">
            {partesDelReglamento(rules).map((p, i) => (p.link
              ? <a key={i} href={p.t} target="_blank" rel="noopener noreferrer" className="text-brand underline break-all">{p.t}</a>
              : <span key={i}>{p.t}</span>))}
          </p>
        </div>
      </div>
    </div>
  );
}
