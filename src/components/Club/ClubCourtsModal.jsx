import { X } from 'lucide-react'
import ClubCourtsManager from './ClubCourtsManager'
import Btn from '../shared/Btn'

// Sin botón Guardar: cada acción de ClubCourtsManager ya persiste sola
export default function ClubCourtsModal({ clubId, onClose, onCourtsChange }) {
  return (
    <div className="fixed inset-0 z-1000 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-surface border border-border-mid rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-mid sticky top-0 bg-surface z-10">
          <span className="font-mono text-[11px] text-[#555] tracking-widest">CANCHAS</span>
          <button onClick={onClose} className="bg-transparent border-none text-[#555] hover:text-white cursor-pointer transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          <ClubCourtsManager clubId={clubId} onCourtsChange={onCourtsChange} />
          <Btn variant="primary" full size="md" onClick={onClose}>LISTO</Btn>
        </div>
      </div>
    </div>
  )
}
