// Dinero en pesos enteros con separador de miles es-AR: 20000 -> "$20.000"
export function formatMoney(amount) {
  if (amount == null) return null
  return `$${Math.round(Number(amount)).toLocaleString('es-AR')}`
}
