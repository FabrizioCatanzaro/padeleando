import { MAX_RULES } from '../../utils/rules';

// Texto del reglamento con contador. `heredado` es el de la categoría, si hay.
export default function RulesEditor({ value, onChange, heredado = null }) {
  return (
    <>
      <textarea
        id="signup-reglamento" aria-label="Reglamento"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        maxLength={MAX_RULES} rows={6}
        placeholder={heredado ? 'Igual que la categoría' : 'Formato, puntos, W.O., horarios, pelotas…'}
        className="w-full bg-surface border border-border-mid text-white px-3 py-2.5 font-sans text-[14px] leading-relaxed rounded-lg outline-none focus:border-brand resize-y"
      />
      <span className="self-end text-[12px] text-secondary tabular-nums">{(value ?? '').length}/{MAX_RULES}</span>
    </>
  );
}
