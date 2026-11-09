/**
 * Centralized Society & Business Domain Constants
 * Bokaro Steel Employees (TA/MED/MAT.) C.C.S.Ltd.
 */

export const SocietyConfig = {
  /** 3-digit official society code used in text files and voucher prefixes (e.g. "005/001") */
  Code3: '005',

  /** 2-digit society code prefix used in voucher numbers (e.g. "05" + MemberNo -> "057784") */
  Code2: '05',

  /** Society official bank/control account number */
  DefaultAccountNo: '000048',

  /** Default regular/general loan code */
  DefaultLoanCode: '09',

  /** Maximum loan tenure in months */
  MaxLoanTenorMonths: 84,

  /** Standard loan interest rate in percentage per annum */
  DefaultInterestRate: 6.5,

  /** Maximum data rows allowed per physical printout sheet */
  MaxPrintRowsPerPage: 10,

  /** Company / Society display names */
  OfficialNameEn: 'Bokaro Steel Employees (TA/MED/MAT.) C.C.S.Ltd.',
  OfficialNameHi: 'बोकारो इस्पात कर्मचारी (टी०ए०/मेड०/मैट०) सहकारी साख समिति लिमिटेड',
  RegdNo: 'BAGH-6/78',
  Address: 'Old Admn. Bldg., Bokaro Steel City-827001'
} as const;
