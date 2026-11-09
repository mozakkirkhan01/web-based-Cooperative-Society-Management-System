/**
 * Shared Calendar & Fiscal Year Constants
 */

export const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
] as const;

export const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

export const FISCAL_MONTH_NAMES = [
  'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December', 'January', 'February', 'March'
] as const;

/**
 * Returns formatted date string "DD-MMM-YYYY" for today's date (e.g. "09-Nov-2026")
 */
export function getTodayDisplayDate(): string {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mmm = SHORT_MONTH_NAMES[today.getMonth()];
  const yyyy = today.getFullYear();
  return `${dd}-${mmm}-${yyyy}`;
}

/**
 * Generates the standard 12 fiscal months for a given financial year (e.g. "2026-27")
 * Returns array of { MonthCode: '0426', MonthName: 'April 2026' }
 */
export function generateFiscalMonthsForYear(fyName: string): { MonthCode: string; MonthName: string }[] {
  if (!fyName || !fyName.includes('-')) {
    const today = new Date();
    const curYear = today.getFullYear();
    const startYr = today.getMonth() >= 3 ? curYear : curYear - 1;
    fyName = `${startYr}-${String(startYr + 1).slice(-2)}`;
  }

  const parts = fyName.split('-');
  const startYear = parseInt(parts[0], 10);
  const endYear = startYear + 1;

  const calendarMeta = [
    { name: 'April', num: 4, yr: startYear },
    { name: 'May', num: 5, yr: startYear },
    { name: 'June', num: 6, yr: startYear },
    { name: 'July', num: 7, yr: startYear },
    { name: 'August', num: 8, yr: startYear },
    { name: 'September', num: 9, yr: startYear },
    { name: 'October', num: 10, yr: startYear },
    { name: 'November', num: 11, yr: startYear },
    { name: 'December', num: 12, yr: startYear },
    { name: 'January', num: 1, yr: endYear },
    { name: 'February', num: 2, yr: endYear },
    { name: 'March', num: 3, yr: endYear }
  ];

  return calendarMeta.map(m => {
    const mm = String(m.num).padStart(2, '0');
    const yy = String(m.yr).slice(-2);
    return {
      MonthCode: `${mm}${yy}`,
      MonthName: `${m.name} ${m.yr}`
    };
  });
}
