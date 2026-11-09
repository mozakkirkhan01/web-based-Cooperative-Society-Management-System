import { SHORT_MONTH_NAMES } from '../constants/calendar.constants';

/**
 * Shared Date Formatting Utilities
 */

/**
 * Parses raw DDMMYY or DDMMYYYY string into display format "DD-MM-YYYY"
 */
export function formatDisplayDate(raw: string | null | undefined): string {
  if (!raw) return '';
  const clean = String(raw).trim().replace(/[-/]/g, '');
  if (clean.length === 6) {
    // DDMMYY -> DD-MM-20YY
    return `${clean.substring(0, 2)}-${clean.substring(2, 4)}-20${clean.substring(4, 6)}`;
  }
  if (clean.length === 8) {
    // DDMMYYYY -> DD-MM-YYYY
    return `${clean.substring(0, 2)}-${clean.substring(2, 4)}-${clean.substring(4, 8)}`;
  }
  return String(raw);
}

/**
 * Formats a Date object or date string to "DD-MMM-YYYY" (e.g. "09-Nov-2026")
 */
export function formatDateDDMMMYYYY(dateInput: any): string {
  if (!dateInput) return '';
  if (typeof dateInput === 'string' && dateInput.includes('T')) {
    dateInput = dateInput.split('T')[0];
  }
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const parts = dateInput.split('-');
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parts[2];
    return `${day}-${SHORT_MONTH_NAMES[monthIdx] || parts[1]}-${year}`;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const mmm = SHORT_MONTH_NAMES[d.getMonth()];
  return `${day}-${mmm}-${d.getFullYear()}`;
}

/**
 * Formats date to "YYYY-MM-DD"
 */
export function formatDateYMD(date: any): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = ('0' + (d.getMonth() + 1)).slice(-2);
  const dd = ('0' + d.getDate()).slice(-2);
  return `${yyyy}-${mm}-${dd}`;
}
