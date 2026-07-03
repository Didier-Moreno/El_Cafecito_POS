/**
 * Formatea un número con separadores de miles y 2 decimales.
 * Ej: 15000.00 -> 15.000,00
 */
export function formatPrecio(valor) {
  const num = Number(valor);
  if (isNaN(num)) return '0,00';
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
