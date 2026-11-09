// Estado y lógica del onboarding de la portada. Vive fuera de los componentes
// porque el lint de react-refresh exige que un archivo .jsx exporte sólo
// componentes.
//
// Los pasos NO se guardan en ningún lado: se derivan de los datos que la portada
// ya trae. Así no hay un estado de onboarding que se pueda desincronizar de la
// realidad, y si el usuario hizo algo desde otra pantalla el paso ya aparece
// tildado. Lo único que se persiste es que decidió ocultar la ayuda.

const ROLE_DISMISS_KEY  = 'padeliando_role_dismissed';
const STEPS_DISMISS_KEY = 'padeliando_firststeps_dismissed';
const LEVEL_DISMISS_KEY = 'padeliando_level_dismissed';

const read  = (key) => { try { return localStorage.getItem(key) === '1' } catch { return false } };
const write = (key) => { try { localStorage.setItem(key, '1') } catch { /* modo privado */ } };

export const isRoleDismissed       = () => read(ROLE_DISMISS_KEY);
export const dismissRole           = () => write(ROLE_DISMISS_KEY);
export const isFirstStepsDismissed = () => read(STEPS_DISMISS_KEY);
export const dismissFirstSteps     = () => write(STEPS_DISMISS_KEY);
export const isLevelDismissed      = () => read(LEVEL_DISMISS_KEY);
export const dismissLevel          = () => write(LEVEL_DISMISS_KEY);

export function buildSteps({ role, groups = [], partGroups = [], favGroups = [], user }) {
  const sum = (key) => groups.reduce((n, g) => n + (g[key] ?? 0), 0);

  if (role === 'player') {
    return [
      {
        done: partGroups.length > 0,
        label: 'Sumate al torneo en el que jugás',
        help: 'Abrí el link que te pasaron y reclamá tu lugar, o pedile al organizador que te invite.',
        section: 'sumarte',
      },
      {
        done: !!user?.avatar_url,
        label: 'Ponete una foto de perfil',
        help: 'Así te reconocen en las tablas de posiciones y en los partidos.',
        section: 'perfil',
      },
      {
        done: favGroups.length > 0,
        label: 'Guardá las categorías que seguís',
        help: 'Agregalas a favoritas y las tenés en la portada, aunque no juegues en ellas.',
        section: 'encontrar',
      },
    ];
  }

  return [
    {
      done: groups.length > 0,
      label: 'Creá tu primera categoría',
      help: 'Es el grupo de gente que juega junta. Adentro van todos los torneos.',
      section: 'crear-categoria',
    },
    {
      done: sum('tournament_count') > 0,
      label: 'Creá el primer torneo',
      help: 'Cada fecha que juegan es un torneo dentro de la categoría. Ahí elegís Liga o Americano.',
      section: 'crear-torneo',
    },
    {
      done: sum('player_count') > 0,
      label: 'Cargá a los jugadores',
      help: 'Alcanza con el nombre. Después podés vincular sus cuentas para que les cuente en el perfil.',
      section: 'jugadores',
    },
    {
      done: sum('match_count') > 0,
      label: 'Cargá el primer resultado',
      help: 'La tabla de posiciones se arma sola con lo que vayas cargando.',
      section: 'crear-partido',
    },
  ];
}
