import { Component, Input, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { ConstantData } from '../../utils/constant-data';
import { ActionModel } from '../../utils/interface';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-accounting',
  templateUrl: './accounting.component.html',
  styleUrls: ['./accounting.component.css']
})
export class AccountingComponent implements OnInit {
  @Input() action: ActionModel = {} as ActionModel;
  SocietyList: any[] = [];
  CompanyList: any[] = [];
  unlinkedCompanies: any[] = [];
  CompanyId: any = null;
  FinancialYearList: any[] = [];
  HeadList: any[] = [];
  BankList: any[] = [];
  RuleList: any[] = [];
  SettlementList: any[] = [];
  BalanceList: any[] = [];
  UnpostedList: any[] = [];
  VoucherList: any[] = [];
  PeriodList: any[] = [];
  SocietyId: any = null;
  FinancialYearId: any = null;
  OpeningDate: any = null;
  PriorYearsOpen = false;
  AsOfDate = '';
  Rule: any = {};
  Settlement: any = { BankId: null };
  Journal: any = { Purpose: 'OPENING', VoucherDate: '', Narration: '', Lines: [this.newLine(), this.newLine()] };
  ImportList: any[] = [];
  SurplusHeadId: any = null;
  Reconciled = false;
  dataLoading = false;
  isSaving = false;
  reportLoaded = false;
  reportRequest = 0;
  pendingBatch: any = null;

  staffLogin: any;

  constructor(private service: AppService, private localService: LocalService, private toastr: ToastrService) { }

  ngOnInit() {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.getSetup();
    try {
      const pending = sessionStorage.getItem(this.pendingKey());
      if (pending) this.pendingBatch = JSON.parse(this.localService.decrypt(pending));
    } catch { this.isSaving = true; this.toastr.error('Unable to restore a pending journal. Contact the administrator before posting again.'); }
  }

  pendingKey() { return 'AccountingPending:' + this.staffLogin.StaffLoginId; }
  newLine() { return { HeadId: null, MemberId: null, LoanId: null, DepositAccountId: null, Component: null, Debit: 0, Credit: 0, Narration: '' }; }
  request(data: any) {
    const payload = { ...data, StaffLoginId: this.staffLogin.StaffLoginId };
    for (const field of ['SocietyId', 'FinancialYearId', 'CompanyId', 'HeadId', 'SurplusHeadId']) {
      if (payload[field] == null) delete payload[field];
    }
    return { request: this.localService.encrypt(JSON.stringify(payload)).toString() };
  }

  getSetup() {
    this.dataLoading = true;
    this.service.accounting('Setup', this.request({})).subscribe((r: any) => {
      this.dataLoading = false;
      if (r.Message != ConstantData.SuccessMessage) { this.toastr.error(r.Message); return; }
      this.SocietyList = r.SocietyList; this.FinancialYearList = r.FinancialYearList;
      this.CompanyList = r.CompanyList || [];
      this.unlinkedCompanies = this.CompanyList.filter(c => !this.SocietyList.some(s => s.CompanyId == c.CompanyId));
      if (this.unlinkedCompanies.length == 1) this.CompanyId = this.unlinkedCompanies[0].CompanyId;
      this.HeadList = r.HeadList; this.BankList = r.BankList; this.RuleList = r.RuleList; this.SettlementList = r.SettlementList;
      if (!this.SocietyId && this.SocietyList.length == 1) this.SocietyId = this.SocietyList[0].SocietyId;
    }, err => { this.dataLoading = false; this.toastr.error(err.error?.Message || 'Unable to load accounting setup'); });
  }

  clearReport() {
    this.reportRequest++; this.dataLoading = false; this.reportLoaded = false; this.BalanceList = []; this.UnpostedList = [];
    this.VoucherList = []; this.PeriodList = []; this.OpeningDate = null; this.Reconciled = false;
  }

  getReport() {
    this.clearReport();
    if (!this.SocietyId || !this.FinancialYearId) return;
    const request = ++this.reportRequest;
    this.dataLoading = true;
    this.service.accounting('Report', this.request({ SocietyId: this.SocietyId, FinancialYearId: this.FinancialYearId, AsOfDate: this.AsOfDate || null })).subscribe((r: any) => {
      if (request != this.reportRequest) return;
      this.dataLoading = false;
      if (r.Message != ConstantData.SuccessMessage) { this.toastr.error(r.Message); return; }
      this.BalanceList = r.BalanceList; this.UnpostedList = r.UnpostedList; this.VoucherList = r.VoucherList;
      this.PeriodList = r.PeriodList; this.OpeningDate = r.OpeningDate; this.PriorYearsOpen = r.PriorYearsOpen; this.reportLoaded = true;
    }, err => { if (request != this.reportRequest) return; this.dataLoading = false; this.toastr.error(err.error?.Message || 'Unable to load balances'); });
  }

  save(operation: string, values: any) {
    if (this.isSaving || this.pendingBatch) return;
    this.isSaving = true;
    this.service.accounting(operation, this.request({ SocietyId: this.SocietyId, FinancialYearId: this.FinancialYearId, ...values })).subscribe((r: any) => {
      this.isSaving = false;
      if (r.Message != ConstantData.SuccessMessage) { this.toastr.error(r.Message); return; }
      if (r.SocietyId) this.SocietyId = r.SocietyId;
      this.toastr.success('Accounting details saved'); this.getSetup(); this.getReport();
    }, err => { this.isSaving = false; this.toastr.error(err.error?.Message || 'Unable to save accounting details'); });
  }

  selectRule() {
    const rule = this.RuleList.find(x => x.HeadId == this.Rule.HeadId);
    this.Rule = rule ? { ...rule } : { HeadId: this.Rule.HeadId, RequiresMember: false, RequiresLoan: false, RequiresDepositAccount: false };
  }
  headName(id: any) { return this.HeadList.find(x => x.HeadId == id)?.HeadName || id; }
  bankName(id: any) { return id == null ? 'Cash in hand' : this.BankList.find(x => x.BankId == id)?.BankName || id; }
  balance(value: number) { return Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (value > 0 ? ' Dr' : value < 0 ? ' Cr' : ''); }
  total(lines: any[], field: string) { return lines.reduce((sum, x) => sum + Math.round(Number(x[field] || 0) * 100), 0) / 100; }
  get closed() { return this.PeriodList.length == 12 && this.PeriodList.every(x => x.IsClosed); }

  requestKey() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const value = Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
    return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
  }

  async importCsv(event: any) {
    if (this.isSaving || this.pendingBatch) return;
    const file: File = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Import a CSV smaller than 2 MB.');
      const book = XLSX.read(await file.text(), { type: 'string', raw: true });
      const rows: any[] = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { defval: '' });
      if (!rows.length || rows.length > 10000) throw new Error('Import between 1 and 10000 lines.');
      const groups = new Map<string, any>();
      for (const row of rows) {
        if (!Object.prototype.hasOwnProperty.call(row, 'HeadId') || !Object.prototype.hasOwnProperty.call(row, 'Debit') || !Object.prototype.hasOwnProperty.call(row, 'Credit')) throw new Error('CSV needs HeadId, Debit and Credit columns.');
        const reference = String(row.Reference || '').trim();
        if (!reference || reference.length > 200) throw new Error('Each imported voucher needs a unique Reference of up to 200 characters.');
        const date = String(row.VoucherDate || this.Journal.VoucherDate);
        const purpose = String(row.Purpose || this.Journal.Purpose);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Use YYYY-MM-DD dates in VoucherDate.');
        let journal = groups.get(reference);
        if (!journal) { journal = { VoucherDate: date, Purpose: purpose, ExternalReference: reference, Narration: reference, Lines: [] }; groups.set(reference, journal); }
        if (journal.VoucherDate != date || journal.Purpose != purpose) throw new Error('All lines with the same Reference must have the same date and purpose.');
        const line: any = { HeadId: Number(row.HeadId), Debit: Number(row.Debit || 0), Credit: Number(row.Credit || 0), Narration: String(row.Narration || ''), Component: row.Component ? String(row.Component) : null };
        for (const field of ['MemberId', 'LoanId', 'DepositAccountId']) line[field] = row[field] ? Number(row[field]) : null;
        journal.Lines.push(line);
      }
      const journals = Array.from(groups.values());
      if (journals.length > 100) throw new Error('Import at most 100 vouchers at a time.');
      this.validateJournals(journals);
      this.ImportList = journals;
      this.toastr.success('CSV loaded for review. Nothing has been posted.');
    } catch (error: any) { this.toastr.error(error.message || 'Unable to read CSV'); }
    event.target.value = '';
  }

  validateJournals(journals: any[]) {
    for (const journal of journals) {
      if (!journal.VoucherDate || !journal.Narration?.trim() || !['OPENING', 'NORMAL'].includes(journal.Purpose)) throw new Error('Enter the date, purpose and narration for every voucher.');
      if (journal.Lines.length < 2) throw new Error('Each voucher needs at least two lines.');
      for (const line of journal.Lines) {
        if (!this.HeadList.some(x => x.HeadId == line.HeadId)) throw new Error('Select a valid head on every line.');
        for (const field of ['Debit', 'Credit']) if (!Number.isFinite(Number(line[field])) || Number(line[field]) < 0 || Math.abs(Number(line[field]) * 100 - Math.round(Number(line[field]) * 100)) > 0.001) throw new Error('Amounts must be nonnegative with at most two decimal places.');
        if ((Number(line.Debit) > 0) == (Number(line.Credit) > 0)) throw new Error('Each line must have either a debit or a credit.');
      }
      if (this.total(journal.Lines, 'Debit') != this.total(journal.Lines, 'Credit')) throw new Error('Debit and credit totals must match for ' + journal.Narration);
    }
  }

  postJournals() {
    if (this.isSaving) return;
    if (!this.pendingBatch) {
      if (!this.SocietyId) { this.toastr.error('Select a society'); return; }
      const journals = this.ImportList.length ? this.ImportList : [this.Journal];
      try { this.validateJournals(journals); } catch (error: any) { this.toastr.error(error.message); return; }
      const batch = { SocietyId: this.SocietyId, Journals: journals.map(j => ({ ...j, RequestKey: this.requestKey() })) };
      try { sessionStorage.setItem(this.pendingKey(), this.localService.encrypt(JSON.stringify(batch)).toString()); }
      catch { this.toastr.error('Unable to retain the journal for safe retry. Enable browser session storage.'); return; }
      this.pendingBatch = batch;
    }
    this.isSaving = true;
    this.service.accounting('PostJournals', this.request(this.pendingBatch)).subscribe((r: any) => {
      this.isSaving = false;
      if (r.Message != ConstantData.SuccessMessage) { this.toastr.error(r.Message); return; }
      sessionStorage.removeItem(this.pendingKey()); this.pendingBatch = null; this.ImportList = [];
      this.Journal = { Purpose: 'NORMAL', VoucherDate: '', Narration: '', Lines: [this.newLine(), this.newLine()] };
      this.toastr.success('Vouchers posted successfully'); this.getReport();
    }, err => {
      this.isSaving = false;
      if ([400, 401, 403, 404, 409].includes(err.status)) { sessionStorage.removeItem(this.pendingKey()); this.pendingBatch = null; }
      this.toastr.error(err.error?.Message || 'Confirmation unavailable. Retry the same journal batch.');
    });
  }

  closeYear() {
    if (!this.Reconciled || !this.reportLoaded || this.AsOfDate) { this.toastr.error('Load the full-year report and confirm reconciliation first.'); return; }
    if (confirm('Close this financial year? Confirm that all adjustment journals are posted. This locks all twelve periods without automatic transfers.')) this.save('CloseYear', { SurplusHeadId: this.SurplusHeadId, Reconciled: true });
  }

  downloadTemplate() {
    this.download('accounting-import.csv', 'Reference,VoucherDate,Purpose,HeadId,Debit,Credit,MemberId,LoanId,DepositAccountId,Component,Narration\r\n');
  }
  exportBalances() {
    const rows = this.BalanceList.map(x => ({ HeadId: x.HeadId, HeadName: x.HeadName, OpeningDebit: Math.max(x.OpeningBalance, 0), OpeningCredit: Math.max(-x.OpeningBalance, 0), Debit: x.Debit, Credit: x.Credit, ClosingDebit: Math.max(x.ClosingBalance, 0), ClosingCredit: Math.max(-x.ClosingBalance, 0) }));
    this.download('head-balances.csv', XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows)));
  }
  download(name: string, content: string) {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
  }
}
