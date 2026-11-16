import { useState } from 'react';
import { LEVEL_BRANCHES, CATEGORY_NUMBERS, SUM_NUMBERS, describeLevel, buildLevel } from '../../utils/category';

const KINDS = [
  { value: 'fixed', label: 'Categoría' },
  { value: 'sum',   label: 'Suma' },
];

// Categoría de un TORNEO: tipo (categoría fija o suma) + rama (Caballeros,
// Damas o Mixto) + número. `value` es 'C7', 'M6', 'SC11'… o null (heredar).
export default function LevelPicker({ value, onChange, emptyLabel = 'Sin categoría' }) {
  const current = describeLevel(value);
  const [draft, setDraft] = useState({ kind: 'fixed', branch: 'C' });
  const kind   = current?.kind ?? draft.kind;
  const branch = current?.branch ?? draft.branch;
  const numbers = kind === 'sum' ? SUM_NUMBERS : CATEGORY_NUMBERS;

  function change(patch) {
    const next = { kind, branch, ...patch };
    setDraft({ kind: next.kind, branch: next.branch });
    // Al cambiar de tipo el número deja de valer (una suma va de 8 a 15).
    const keep = current && next.kind === current.kind ? current.value : null;
    onChange(buildLevel(next.kind, next.branch, keep));
  }

  const segment = (items, selected, onPick, label) => (
    <div className="inline-flex p-1 gap-1 rounded-lg border border-border-mid bg-surface" role="group" aria-label={label}>
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          onClick={() => onPick(it.value)}
          aria-pressed={selected === it.value}
          className={`min-h-[32px] px-3 rounded-md font-sans text-[13px] border-0 cursor-pointer transition-colors ${
            selected === it.value ? 'bg-brand text-base font-bold' : 'bg-transparent text-soft hover:text-white'
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {segment(KINDS, kind, (k) => change({ kind: k }), 'Tipo de categoría')}
        {segment(LEVEL_BRANCHES, branch, (b) => change({ branch: b }), 'Rama')}
      </div>
      <select
        value={current?.value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : buildLevel(kind, branch, Number(e.target.value)))}
        aria-label={kind === 'sum' ? 'Suma de la pareja' : 'Número de categoría'}
        className="w-full h-10 bg-surface border border-border-mid text-white px-3 font-sans text-[14px] rounded-lg outline-none focus:border-brand cursor-pointer"
      >
        <option value="">{emptyLabel}</option>
        {numbers.map((n) => (
          <option key={n} value={n}>
            {kind === 'sum' ? `SUMA ${n}` : branch === 'M' ? `MIXTO ${n}` : `${branch}${n}`}
          </option>
        ))}
      </select>
      <span className="text-[12px] font-sans text-secondary leading-snug">
        {kind === 'sum'
          ? 'Las categorías de la pareja tienen que sumar este número o más. Ejemplo: C6 + C5 en SUMA 11.'
          : branch === 'M'
            ? 'Un caballero y una dama, cada uno de esta categoría o de una más baja.'
            : 'Cada jugador de esta categoría o de una más baja (número igual o mayor).'}
      </span>
    </div>
  );
}
