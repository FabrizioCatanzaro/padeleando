import { useState } from 'react';
import { CATEGORY_BRANCHES, CATEGORY_NUMBERS, splitCategory } from '../../utils/category';
import DropdownSelect from './DropdownSelect';

// Categoría de un JUGADOR: rama (C/D) + número (1 a 10). `value` es 'C7' o null.
// `emptyLabel` se muestra sin elegir. `defaultBranch` es la rama marcada
// mientras no hay valor. Para la categoría de un torneo: LevelPicker.
export default function CategoryPicker({ value, onChange, emptyLabel = 'Sin categoría', id, defaultBranch = 'C' }) {
  const current = splitCategory(value);
  const [pending, setPending] = useState(defaultBranch);
  const branch  = current?.branch ?? pending;

  const setBranch = (b) => { setPending(b); onChange(current ? `${b}${current.number}` : null); };
  const setNumber = (n) => onChange(n === '' ? null : `${branch}${n}`);

  return (
    <div className="flex gap-2 items-center">
      <div className="inline-flex rounded-sm border border-border-mid overflow-hidden shrink-0" role="group" aria-label="Rama">
        {CATEGORY_BRANCHES.map((b) => (
          <button
            key={b.value}
            type="button"
            onClick={() => setBranch(b.value)}
            aria-pressed={branch === b.value}
            className={`px-3 py-[7px] font-sans text-[13px] border-0 cursor-pointer transition-colors ${
              branch === b.value ? 'bg-brand text-base font-bold' : 'bg-surface text-muted hover:text-white'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <DropdownSelect
          id={id ?? 'category-number'}
          value={current ? String(current.number) : ''}
          onChange={setNumber}
          label="Categoría"
          placeholder={emptyLabel}
          options={[{ value: '', label: emptyLabel }, ...CATEGORY_NUMBERS.map((n) => ({
            value: String(n),
            label: `${branch}${n}${n === 1 ? ' (profesional)' : n === 10 ? ' (principiante)' : ''}`,
          }))]}
          buttonClass="w-full bg-surface border border-border-mid text-white px-2.5 py-[7px] font-sans text-[13px] rounded-sm outline-none focus:border-border-strong"
        />
      </div>
    </div>
  );
}
