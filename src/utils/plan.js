// Espejo de padeliando-api/src/lib/planCatalog.js y lib/plan.js: el servidor decide.
export const FREE_MAX_GROUPS            = 2;
export const FREE_TOURNAMENTS_PER_MONTH = 2;
export const FREE_COPAS_PER_MONTH       = 1;

export const isPlanLimit = (e) => e?.data?.code === 'plan_limit';

const ROLES = {
  premium:      ['jugador', 'organizador'],
  jugador_plus: ['jugador'],
  organizador:  ['organizador'],
  combo:        ['jugador', 'organizador'],
  club:         ['jugador', 'organizador', 'club'],
};

export const rolesOf    = (plan) => ROLES[plan] ?? [];
export const hasRole    = (plan, role) => rolesOf(plan).includes(role);
export const isPaidPlan = (plan) => !!ROLES[plan];
export const userPlan   = (user) => user?.subscription?.plan ?? 'free';
export const userHasRole = (user, role) => hasRole(userPlan(user), role);

export const CLUB_PLAN_ENABLED = false;
export const CLUB_MIN_PRICE    = 30000;

// El anual cobra 10 meses y usa 12.
export const ANNUAL_MONTHS = 10;

export const PLAN_ORDER = ['jugador_plus', 'organizador', 'combo', 'club'];

export const PLAN_INFO = {
  free: {
    name: 'Gratis',
    tagline: 'Para jugar y organizar lo justo',
    features: [
      'Inscripción a torneos y amistosos',
      'Tabla en vivo, resultados y perfil',
      'Estadísticas básicas',
      `${FREE_MAX_GROUPS} categorías y ${FREE_TOURNAMENTS_PER_MONTH} torneos por mes en cada una`,
    ],
  },
  jugador_plus: {
    name: 'Jugador+',
    tagline: 'Tu juego, a fondo',
    price: { promo: 2900, list: 4900 },
    features: [
      'Estadísticas avanzadas en tu perfil',
      'Insignia en tu perfil',
      'Sin publicidad',
      'Aviso anticipado de torneos de tu categoría (próximamente)',
    ],
  },
  organizador: {
    name: 'Organizador',
    tagline: 'Organizá sin límites',
    price: { promo: 14900, list: 24900 },
    features: [
      'Categorías ilimitadas',
      'Torneos y copas ilimitados',
      'Estadísticas avanzadas de tus categorías',
      'Álbum de fotos de tus torneos',
      'Sin publicidad',
      'Comisión reducida en el cobro online (próximamente)',
      '1 torneo destacado por mes (próximamente)',
    ],
  },
  combo: {
    name: 'Combo',
    tagline: 'Organizador + Jugador+',
    price: { promo: 16350, list: 27350 },
    features: [
      'Todo lo del plan Organizador',
      'Todo lo del plan Jugador+',
    ],
  },
  club: {
    name: 'Club',
    tagline: 'Tu club en la app',
    priceLabel: 'Según tus canchas',
    available: CLUB_PLAN_ENABLED,
    features: [
      'Cobro online de reservas',
      'Estadísticas de ocupación e ingresos',
      'Encargados que gestionan las reservas',
      'Organizador y Jugador+ para el dueño',
    ],
  },
  premium: {
    name: 'Premium',
    tagline: 'Tu plan anterior: incluye Organizador y Jugador+',
    features: [
      'Todo lo del plan Organizador',
      'Todo lo del plan Jugador+',
    ],
  },
};

export const planName = (plan) => PLAN_INFO[plan]?.name ?? PLAN_INFO.free.name;
export const isPurchasable = (plan) => PLAN_ORDER.includes(plan) && (plan !== 'club' || CLUB_PLAN_ENABLED);

/** Precio por período en AR$, o null si el plan no tiene precio fijo. */
export function planPrice(plan, billing = 'monthly', { list = false } = {}) {
  const p = PLAN_INFO[plan]?.price;
  if (!p) return null;
  const monthly = list ? p.list : p.promo;
  return billing === 'annual' ? monthly * ANNUAL_MONTHS : monthly;
}

export function clubMonthlyPrice(courts = []) {
  const active = courts.filter((c) => c.active !== false);
  const priced = active.map((c) => Number(c.price_60)).filter((p) => Number.isFinite(p) && p > 0);
  if (!active.length || !priced.length) return CLUB_MIN_PRICE;
  const avg = priced.reduce((a, b) => a + b, 0) / priced.length;
  return Math.max(CLUB_MIN_PRICE, Math.round(active.length * avg));
}

export const COMPARISON_PLANS = ['free', 'jugador_plus', 'organizador', 'combo'];

export const PLAN_COMPARISON = [
  { feature: 'Categorías',             free: `${FREE_MAX_GROUPS} máx.`, jugador_plus: `${FREE_MAX_GROUPS} máx.`, organizador: 'Ilimitadas', combo: 'Ilimitadas' },
  { feature: 'Torneos',                free: `${FREE_TOURNAMENTS_PER_MONTH}/mes`, jugador_plus: `${FREE_TOURNAMENTS_PER_MONTH}/mes`, organizador: 'Ilimitados', combo: 'Ilimitados' },
  { feature: 'Estadísticas del perfil', free: 'Básicas', jugador_plus: 'Avanzadas', organizador: 'Básicas', combo: 'Avanzadas' },
  { feature: 'Estadísticas de categoría', free: 'Básicas', jugador_plus: 'Básicas', organizador: 'Avanzadas', combo: 'Avanzadas' },
  { feature: 'Álbum de fotos',         free: false, jugador_plus: false, organizador: true, combo: true },
  { feature: 'Insignia en el perfil',  free: false, jugador_plus: true, organizador: false, combo: true },
  { feature: 'Sin publicidad',         free: false, jugador_plus: true, organizador: true, combo: true },
];
