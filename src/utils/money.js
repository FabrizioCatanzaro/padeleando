// Formato de dinero de la app: siempre en pesos enteros -- nunca centavos --
// y con separador de miles es-AR (punto), ej. 20000 -> "$20.000" (decisión de
// Fabri, 2026-09-06: antes se mostraba "$20000" tal cual venía de la base).
export function formatMoney(amount) {
  if (amount == null) return null
  return `$${Math.round(Number(amount)).toLocaleString('es-AR')}`
}
