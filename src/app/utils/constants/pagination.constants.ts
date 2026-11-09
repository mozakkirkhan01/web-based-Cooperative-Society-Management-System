/**
 * Shared Pagination Options & Configurations
 */

export interface PageSizeOption {
  label: string;
  value: number;
}

/** Standard grid table page sizes */
export const DEFAULT_PAGE_SIZES: readonly number[] = [10, 20, 100, 200, 500, 1000, 2000, 5000] as const;

/** Standard report and advice page size dropdown choices */
export const REPORT_PAGE_SIZE_OPTIONS: readonly PageSizeOption[] = [
  { label: '10 / page', value: 10 },
  { label: '25 / page', value: 25 },
  { label: '50 / page', value: 50 },
  { label: 'All records', value: -1 }
] as const;
