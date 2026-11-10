/**
 * Centralized Society & Business Domain Constants
 * Bokaro Steel Employees (TA/MED/MAT.) C.C.S.Ltd.
 */

export interface SocietySettings {
  /** 3-digit official society code used in text files and voucher prefixes (e.g. "005/001") */
  Code3: string;

  /** 2-digit society code prefix used in voucher numbers (e.g. "05" + MemberNo -> "057784") */
  Code2: string;

  /** Society official bank/control account number */
  DefaultAccountNo: string;

  /** Default regular/general loan code */
  DefaultLoanCode: string;

  /** Maximum loan tenure in months */
  MaxLoanTenorMonths: number;

  /** Standard loan interest rate in percentage per annum */
  DefaultInterestRate: number;

  /** Maximum data rows allowed per physical printout sheet */
  MaxPrintRowsPerPage: number;

  /** Company / Society display names */
  OfficialNameEn: string;
  OfficialNameHi: string;
  RegdNo: string;
  Address: string;

  LogoPNG?: string;
  Logo?: string;
  Email?: string;
  MobileNo?: string;
}

export const SocietyConfig: SocietySettings = {
  Code3: '005',
  Code2: '05',
  DefaultAccountNo: '000048',
  DefaultLoanCode: '09',
  MaxLoanTenorMonths: 84,
  DefaultInterestRate: 6.5,
  MaxPrintRowsPerPage: 10,
  OfficialNameEn: 'Bokaro Steel Employees (TA/MED/MAT.) C.C.S.Ltd.',
  OfficialNameHi: 'बोकारो इस्पात कर्मचारी (टी०ए०/मेड०/मैट०) सहकारी साख समिति लिमिटेड',
  RegdNo: 'BAGH-6/78',
  Address: 'Old Admn. Bldg., Bokaro Steel City-827001'
} as const;
