/**
 * Shared Indian Currency & Amount Formatting Utilities
 */

/**
 * Formats a number/string into Indian rupee standard format (e.g. 500000 -> "5,00,000.00" or "500,000.00")
 */
export function formatIndianCurrency(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '0.00';
  const cleanStr = String(val).replace(/,/g, '');
  const num = Number(cleanStr);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Formats an account or head closing balance with 'Dr' or 'Cr' suffix (or signed balance)
 */
export function formatBalance(
  val: number | string | null | undefined,
  signed: boolean = true,
  loading: boolean = false
): string {
  if (val === null || val === undefined || val === '') return loading ? 'Loading...' : 'Not available';
  const cleanStr = String(val).replace(/,/g, '');
  const num = Number(cleanStr);
  if (isNaN(num)) return loading ? 'Loading...' : 'Not available';
  const amount = signed ? Math.abs(num) : num;
  const absFormatted = amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!signed) return absFormatted;
  if (num > 0) return `${absFormatted} Dr`;
  if (num < 0) return `${absFormatted} Cr`;
  return absFormatted;
}

/**
 * Formats a numeric value as a clean plain integer without commas and without decimals (.00)
 * Used in EDP advice tables and printouts (e.g. 500000.00 -> "500000", 0 with showDash -> "-")
 */
export function formatPlainInt(val: any, showDashIfZero: boolean = false): string {
  if (val === null || val === undefined || val === '') {
    return showDashIfZero ? '-' : '0';
  }
  const cleanStr = String(val).replace(/,/g, '');
  const n = Math.round(Number(cleanStr) || 0);
  if (n === 0 && showDashIfZero) return '-';
  return String(n);
}
