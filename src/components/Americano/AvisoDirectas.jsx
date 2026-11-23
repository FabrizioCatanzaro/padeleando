import { AlertTriangle } from "lucide-react";
import { americanoDirectas } from "../../utils/helpers";

export default function AvisoDirectas({ pairCount, className = "" }) {
  const info = americanoDirectas(pairCount);
  if (!info) return null;
  const { directas, primera, segunda } = info;
  const una = directas === 1;
  return (
    <div className={`flex items-start gap-2 bg-brand/10 border border-brand/30 rounded-md px-3.5 py-2.5 text-[13px] text-brand leading-relaxed ${className}`}>
      <AlertTriangle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
      <span>
        Con {pairCount} parejas, {una ? 'la mejor' : `las ${directas} mejores`} de la fase previa {una ? 'pasa' : 'pasan'} directo a {segunda}.
        <span className="block text-soft mt-0.5">
          {una ? 'No juega' : 'No juegan'} {primera}. Las demás parejas juegan {primera} por los lugares que quedan.
        </span>
      </span>
    </div>
  );
}
