// Espejo de padeliando-api/src/lib/commission.js: el servidor decide lo que se cobra.
export const RATES = {
  free:        { pct: 0.06, min: 500 },
  organizador: { pct: 0.03, min: 300 },
};

export const rateFor = (organizerPlan) => (organizerPlan ? RATES.organizador : RATES.free);

export function feePerPlayer(pricePerPlayer, organizerPlan = false) {
  const { pct, min } = rateFor(organizerPlan);
  return Math.round(Math.max(pricePerPlayer * pct, min));
}

export function quote({ price, unit = 'player', kind = 'solo', payer = 'player', organizerPlan = false, waived = false }) {
  const players = kind === 'pair' ? 2 : 1;
  const perPlayer = unit === 'pair' ? price / 2 : price;
  const base = Math.round(perPlayer * players);
  const fee = waived ? 0 : feePerPlayer(perPlayer, organizerPlan) * players;
  if (payer === 'organizer') return { players, base, fee, total: base, net: base - fee };
  return { players, base, fee, total: base + fee, net: base };
}

/** Precio por jugador a cargar para recibir `net` por jugador. */
export function priceForNet(net, { payer = 'player', organizerPlan = false } = {}) {
  if (!(net > 0)) return null;
  if (payer === 'player') return Math.round(net);
  const { pct, min } = rateFor(organizerPlan);
  const byPct = Math.ceil(net / (1 - pct));
  return byPct * pct >= min ? byPct : Math.round(net + min);
}

export const rateLabel = (organizerPlan) => {
  const { pct, min } = rateFor(organizerPlan);
  return `${Math.round(pct * 100)} % por jugador, mínimo $${min.toLocaleString('es-AR')}`;
};
