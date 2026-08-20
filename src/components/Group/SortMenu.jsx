import { SORT_OPTIONS } from '../../utils/tournamentFilters';
import SortMenu from '../shared/SortMenu';

// El menú genérico vive en shared/: el perfil usa el mismo para ordenar
// partidos y para elegir categoría.
export default function TournamentSortMenu({ value, onChange }) {
  return (
    <SortMenu
      value={value}
      onChange={onChange}
      options={SORT_OPTIONS}
      title="Ordenar torneos"
    />
  );
}
