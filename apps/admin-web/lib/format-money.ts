/**
 * Formatea montos con la moneda y locale del tenant (configuración).
 */
export function formatMoney(
  amount: number | string,
  currencyCode: string,
  locale: string,
): string {
  const n = typeof amount === 'string' ? Number.parseFloat(amount) : amount;
  if (Number.isNaN(n)) return String(amount);
  const safeLocale = locale?.trim() || 'en-US';
  const code = currencyCode?.trim() || 'USD';
  try {
    return new Intl.NumberFormat(safeLocale, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${code} ${n}`;
  }
}
