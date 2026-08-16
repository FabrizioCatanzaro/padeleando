import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

export default function FinishTournamentModal({ tournament, onConfirm, onCancel }) {
  const pending = tournament.matches.filter((m) => m.score1 === '').length;

  return (
    <Modal
      title="¿Finalizar el torneo?"
      confirmText="Finalizar"
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <p className="text-secondary text-sm leading-relaxed">
        Se cierra la jornada y sus resultados quedan congelados en la tabla de posiciones.
        No vas a poder cargar ni editar partidos hasta reanudarla.
      </p>
      {pending > 0 && (
        <div className="flex items-start gap-2 bg-brand/10 border border-brand/30 rounded-md px-3.5 py-2.5 mt-3 text-[12px] font-mono text-brand leading-relaxed">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            {pending === 1
              ? 'Queda 1 partido sin resultado'
              : `Quedan ${pending} partidos sin resultado`}
            {' '}— no van a contar para las posiciones.
          </span>
        </div>
      )}
      <p className="text-dim text-[12px] font-mono mt-3">
        Podés reanudarla cuando quieras desde la gestión del torneo.
      </p>
    </Modal>
  );
}
