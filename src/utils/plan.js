// Cupos del plan Básico. Espejo de padeliando-api/src/lib/plan.js, que es quien
// los aplica de verdad: acá sólo evitan el viaje al servidor y arman el mensaje.
export const FREE_MAX_GROUPS            = 2;
export const FREE_TOURNAMENTS_PER_MONTH = 2;

// ¿El 403 que volvió del backend es un cupo lleno y no una falta de permiso?
export const isPlanLimit = (e) => e?.data?.code === 'plan_limit';

// Precios de lista en AR$. Espejo de los planes de Mercado Pago: si cambian allá,
// se tocan acá. La suscripción no devuelve el monto, así que esto es lo que se
// muestra —una suscripción vieja con otro precio vería el de hoy.
export const ORIGINAL_PRICE = 7000;
export const MONTHLY_PRICE  = 3500;
export const ANNUAL_PRICE   = Math.round(ORIGINAL_PRICE * 0.8);
export const PRICE_BY_BILLING = { monthly: MONTHLY_PRICE, annual: ANNUAL_PRICE };

export const FREE_FEATURES = [
  '2 categorías máximo',
  '2 torneos al mes',
  'Estadísticas básicas',
];

export const PRO_FEATURES = [
  'Categorías ilimitadas',
  'Torneos ilimitados',
  'Estadísticas avanzadas',
  'Álbum de fotos',
  'Ícono premium en el perfil',
  'Soporte prioritario',
];

export const PLAN_COMPARISON = [
  { feature: 'Categorías',     free: '2 máx.', pro: 'Ilimitadas' },
  { feature: 'Torneos',        free: '2/mes',  pro: 'Ilimitados' },
  { feature: 'Estadísticas',   free: 'Básicas', pro: 'Avanzadas' },
  { feature: 'Álbum de fotos', free: false,    pro: true },
  { feature: 'Ícono premium',  free: false,    pro: true },
  { feature: 'Soporte',        free: 'Básico', pro: 'Prioritario' },
];
