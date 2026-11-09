import {
  Status,
  Gender,
  PsuUnit,
  MemberType,
  NomineeRelation,
  GuardianType,
  BankCashType,
  DebitCreditType,
  HeadType,
  Category,
  StaffType
} from '../enum';

export interface KeyValueOption<K = any, V = string> {
  Key: K;
  Value: V;
}

/** Standard Active/Inactive dropdown options */
export const STATUS_OPTIONS: readonly KeyValueOption<number, string>[] = [
  { Key: Status.Active, Value: 'Active' },
  { Key: Status.Inactive, Value: 'Inactive' }
] as const;

/** Gender dropdown options */
export const GENDER_OPTIONS: readonly KeyValueOption<number, string>[] = [
  { Key: Gender.Male, Value: 'Male' },
  { Key: Gender.Female, Value: 'Female' },
  { Key: Gender.Other, Value: 'Other' }
] as const;

/** PSU Unit dropdown options */
export const PSU_UNIT_OPTIONS: readonly KeyValueOption<number, string>[] = [
  { Key: PsuUnit.Sail, Value: 'SAIL' },
  { Key: PsuUnit.Bpscl, Value: 'BPSCL' }
] as const;

/** Member Type dropdown options */
export const MEMBER_TYPE_OPTIONS: readonly KeyValueOption<number, string>[] = [
  { Key: MemberType.Member, Value: 'Member' },
  { Key: MemberType.Staff, Value: 'Staff' }
] as const;

/** Nominee Relation dropdown options */
export const NOMINEE_RELATION_OPTIONS: readonly KeyValueOption<number, string>[] = [
  { Key: NomineeRelation.Father, Value: 'Father' },
  { Key: NomineeRelation.Mother, Value: 'Mother' },
  { Key: NomineeRelation.Husband, Value: 'Husband' },
  { Key: NomineeRelation.Wife, Value: 'Wife' },
  { Key: NomineeRelation.Son, Value: 'Son' },
  { Key: NomineeRelation.Daughter, Value: 'Daughter' },
  { Key: NomineeRelation.Brother, Value: 'Brother' },
  { Key: NomineeRelation.Sister, Value: 'Sister' },
  { Key: NomineeRelation.Nephew, Value: 'Nephew' }
] as const;

/** Guardian Type options */
export const GUARDIAN_TYPE_OPTIONS: readonly KeyValueOption<number, string>[] = [
  { Key: GuardianType.Father, Value: 'Father' },
  { Key: GuardianType.Husband, Value: 'Husband' }
] as const;

/** Bank / Cash options */
export const BANK_CASH_TYPE_OPTIONS: readonly KeyValueOption<number, string>[] = [
  { Key: BankCashType.Bank, Value: 'Bank' },
  { Key: BankCashType.Cash, Value: 'Cash' }
] as const;

/** Debit / Credit options */
export const DEBIT_CREDIT_TYPE_OPTIONS: readonly KeyValueOption<number, string>[] = [
  { Key: DebitCreditType.Debit, Value: 'Debit' },
  { Key: DebitCreditType.Credit, Value: 'Credit' }
] as const;

/** Debit / Credit short label dictionary */
export const DEBIT_CREDIT_LABELS = {
  [DebitCreditType.Debit]: 'Dr',
  [DebitCreditType.Credit]: 'Cr'
} as const;

/** Account Head Type options */
export const HEAD_TYPE_OPTIONS: readonly KeyValueOption<number, string>[] = [
  { Key: HeadType.Bank, Value: 'Bank' },
  { Key: HeadType.Cash, Value: 'Cash' },
  { Key: HeadType.Member, Value: 'Member' },
  { Key: HeadType.Office, Value: 'Office' },
  { Key: HeadType.Other, Value: 'Other' }
] as const;

/** Social Category options */
export const CATEGORY_OPTIONS: readonly KeyValueOption<number, string>[] = [
  { Key: Category.General, Value: 'General' },
  { Key: Category.OBC, Value: 'OBC' },
  { Key: Category.SC, Value: 'SC' },
  { Key: Category.ST, Value: 'ST' },
  { Key: Category.Other, Value: 'Other' }
] as const;

/** Staff Type options */
export const STAFF_TYPE_OPTIONS: readonly KeyValueOption<number, string>[] = [
  { Key: StaffType.SuperAdmin, Value: 'Super Admin' },
  { Key: StaffType.Admin, Value: 'Admin' },
  { Key: StaffType.TeachingStaff, Value: 'Teaching Staff' },
  { Key: StaffType.NonTeachingStaff, Value: 'Non Teaching Staff' }
] as const;

/** Member category filter for EDP Advice (BSL/BPSCL/ALL) */
export const MEMBER_CATEGORY_FILTER_OPTIONS: readonly KeyValueOption<string, string>[] = [
  { Key: 'BSL', Value: 'BSL (SAIL)' },
  { Key: 'BPSCL', Value: 'BPSCL' },
  { Key: 'ALL', Value: 'All Members' }
] as const;

/** Sort options for EDP advice */
export const EDP_SORT_BY_OPTIONS: readonly KeyValueOption<string, string>[] = [
  { Key: 'Date', Value: 'Date, LoanSerial' },
  { Key: 'StaffNo', Value: 'Staff Number' }
] as const;

/** Transaction / Voucher types filter for Verification */
export const TRANSACTION_TYPE_FILTER_OPTIONS: readonly KeyValueOption<string, string>[] = [
  { Key: 'ALL', Value: 'All Types' },
  { Key: 'PAYMENT', Value: 'Payments' },
  { Key: 'RECEIPT', Value: 'Receipts' },
  { Key: 'CONTRA', Value: 'Contra' },
  { Key: 'TRANSFER', Value: 'Transfer' },
  { Key: 'SCHEDULE', Value: 'Schedule' },
  { Key: 'SALARY', Value: 'Salary' }
] as const;
