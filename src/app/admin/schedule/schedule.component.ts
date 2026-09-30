import { Component, OnDestroy, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { LoadDataService } from '../../utils/load-data.service';
import { ConstantData } from '../../utils/constant-data';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-schedule',
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.css']
})
export class ScheduleComponent implements OnInit, OnDestroy {
  SocietyList: any[] = [];
  HeadList: any[] = [];
  RuleList: any[] = [];
  BalanceList: any[] = [];
  MemberList: any[] = [];
  VoucherList: any[] = [];
  SocietyId: any = null;
  VoucherDate: any = new Date();
  FinancialYearName = '';
  Narration = '';
  ExternalReference = '';
  ChequeNo = '';
  Line: any = {};
  Lines: any[] = [];
  MemberSearch = '';
  SelectedMember: any = null;
  MemberBalance: any = null;
  dataLoading = false;
  isSaving = false;
  CanCreate = false;
  pendingTransaction: any = null;
  contextRequest = 0;
  memberRequest = 0;
  storageError = false;
  SettlementHeadId: any = null;
  BankHeadList: any[] = [];
  RecoveryRows: any[] = [];
  RecoverySocieties: string[] = [];
  RecoverySociety = '';
  RecoveryMappings: any[] = [];
  SourceMonth = '';
  ImportName = '';
  StatementText = '';
  ImportKind = '';
  SelectedRecoveryCode = '';
  Reviewed = false;
  PreviewSearch = '';
  IssuesOnly = false;
  PreviewPage = 1;
  itemPerPage = 10;
  get PreviewRows() {
    const search = this.PreviewSearch.trim().toLowerCase();
    return this.Lines.filter(row => (!this.IssuesOnly || row.Issue) && (!search || [row.HeadName, row.MemberName, row.MemberNo, row.StaffNo, row.Narration].join(' ').toLowerCase().includes(search)));
  }
  get IssueCount() { return this.Lines.filter(row => row.Issue).length; }
  formatMonth(yyyymm: string) {
    if (!yyyymm || yyyymm.length !== 6) return yyyymm;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const m = parseInt(yyyymm.substring(4, 6), 10);
    return (months[m - 1] || yyyymm.substring(4, 6)) + '-' + yyyymm.substring(0, 4);
  }
  constructor(private service: AppService, private localService: LocalService,
    private loadData: LoadDataService, private toastr: ToastrService) { }

  ngOnInit() {
    this.resetLine();
    try {
      const pending = sessionStorage.getItem(this.pendingKey());
      if (pending) this.pendingTransaction = JSON.parse(this.localService.decrypt(pending));
    } catch { this.storageError = true; this.toastr.error('Unable to restore the pending transaction. Contact the administrator before posting.'); }
    this.getSetup();
  }
  ngOnDestroy() { this.contextRequest++; this.memberRequest++; }
  pendingKey() { return 'SCHEDULEPending:' + this.localService.getEmployeeDetail().StaffLoginId; }
  request(data: any) {
    return { request: this.localService.encrypt(JSON.stringify({ ...data, SourceType: 'SCHEDULE', StaffLoginId: this.localService.getEmployeeDetail().StaffLoginId })).toString() };
  }
  getSetup() {
    this.dataLoading = true;
    this.service.accounting('TransactionSetup', this.request({})).subscribe((response: any) => {
      this.dataLoading = false;
      if (response.Message != ConstantData.SuccessMessage) { this.toastr.error(response.Message); return; }
      this.SocietyList = response.SocietyList;
      this.RuleList = response.RuleList;
      this.HeadList = response.HeadList.filter((x: any) => (x.HeadType != 1 && x.HeadType != 2) && !this.RuleList.some(r => r.HeadId == x.HeadId && !r.IsPostingAllowed));
      this.BankHeadList = response.HeadList.filter((x: any) => (x.HeadType == 1 || x.HeadType == 2) && !this.RuleList.some(r => r.HeadId == x.HeadId && !r.IsPostingAllowed));
      this.CanCreate = response.CanCreate;
      if (this.SocietyList.length == 1) this.SocietyId = this.SocietyList[0].SocietyId;
      this.getContext();
    }, error => { this.dataLoading = false; this.toastr.error(error.error?.Message || 'Unable to load schedule'); });
  }
  getContext() {
    const current = ++this.contextRequest;
    this.BalanceList = []; this.MemberBalance = null; this.FinancialYearName = ''; this.VoucherList = [];
    if (!this.SocietyId || !this.VoucherDate) return;
    this.service.accounting('JournalContext', this.request({ SocietyId: this.SocietyId, VoucherDate: this.loadData.loadDateYMD(this.VoucherDate), HeadId: this.Line.HeadId || 0, MemberId: this.Line.MemberId || null })).subscribe((response: any) => {
      if (current != this.contextRequest) return;
      if (response.Message != ConstantData.SuccessMessage) { this.toastr.error(response.Message); return; }
      this.BalanceList = response.BalanceList; this.MemberBalance = response.MemberBalance;
      this.FinancialYearName = response.FinancialYearName; this.VoucherList = response.VoucherList;
    }, error => { if (current == this.contextRequest) this.toastr.error(error.error?.Message || 'Unable to load balances'); });
  }
  findMembers() {
    this.Line.MemberId = null; this.SelectedMember = null; this.MemberBalance = null;
    const current = ++this.memberRequest;
    this.MemberList = [];
    if (!this.MemberSearch.trim()) return;
    this.service.accounting('TransactionMembers', this.request({ Search: this.MemberSearch })).subscribe((response: any) => {
      if (current == this.memberRequest) this.MemberList = response.Rows || [];
    }, error => { if (current == this.memberRequest) this.toastr.error(error.error?.Message || 'Unable to find members'); });
  }
  selectMember(member: any) {
    this.memberRequest++;
    this.SelectedMember = member; this.Line.MemberId = member.MemberId;
    this.MemberSearch = member.MemberName + ' — ' + member.MemberNo + ' / ' + member.StaffNo;
    this.getContext();
  }
  resetLine() { this.Line = { HeadId: null, MemberId: null, DebitCredit: 'Debit', Amount: null, Narration: '' }; this.SelectedMember = null; this.MemberSearch = ''; this.MemberList = []; this.MemberBalance = null; this.memberRequest++; }
  removeLine(index: number) { if (this.dataLoading || this.isSaving || this.pendingTransaction) return; this.Lines.splice(index, 1); this.Reviewed = false; }
  editLine(index: number) {
    if (this.dataLoading || this.isSaving || this.pendingTransaction) return;
    this.Reviewed = false;
    const row = this.Lines[index];
    this.Line = { ...row, Amount: row.Amount || row.Debit || row.Credit, DebitCredit: row.Credit > 0 ? 'Credit' : 'Debit' };
    this.SelectedMember = row.MemberId ? { MemberId: row.MemberId, MemberName: row.MemberName, MemberNo: row.MemberNo, StaffNo: row.StaffNo } : null;
    this.MemberSearch = this.SelectedMember ? row.MemberName + ' — ' + row.MemberNo + ' / ' + row.StaffNo : '';
    this.Lines.splice(index, 1); this.getContext();
  }
  headName(id: any) { return this.HeadList.find(x => x.HeadId == id)?.HeadName || id; }
  balance(id: any) { return this.BalanceList.find(x => x.HeadId == id)?.ClosingBalance; }
  formatBalance(value: any) { return value == null ? 'Not available' : Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (value > 0 ? ' Dr' : value < 0 ? ' Cr' : ''); }
  total(field: string) { return this.Lines.reduce((sum, x) => sum + Math.round(Number(x[field] || 0) * 100), 0) / 100; }
  addLine() {
    if (this.dataLoading || this.isSaving || this.pendingTransaction || !this.CanCreate) return;
    const amount = Number(this.Line.Amount);
    if (!this.Line.HeadId || !Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) { this.toastr.error('Select a head and enter a positive amount with at most two decimals'); return; }
    const rule = this.RuleList.find(x => x.HeadId == this.Line.HeadId);
    if (!this.Line.MemberId) { this.toastr.error('Select a member from the suggestions'); return; }
    if (rule?.RequiresLoan && !this.Line.LoanId || rule?.RequiresDepositAccount && !this.Line.DepositAccountId) { this.toastr.error('This head requires its loan/deposit account details'); return; }
    this.Reviewed = false;
    this.Lines.push({
      ...this.Line, Issue: '', HeadName: this.headName(this.Line.HeadId), MemberName: this.SelectedMember?.MemberName,
      MemberNo: this.SelectedMember?.MemberNo, StaffNo: this.SelectedMember?.StaffNo,
      Debit: this.Line.DebitCredit == 'Debit' ? amount : 0, Credit: this.Line.DebitCredit == 'Credit' ? amount : 0
    });
    this.resetLine();
  }
  buildPayload() {
    if (!this.Reviewed || this.Lines.some(x => x.Issue || !x.HeadId || !x.MemberId)) { this.toastr.error('Resolve every row and confirm that you reviewed the entries'); return null; }
    if (this.SourceMonth && (this.loadData.loadDateYMD(this.VoucherDate) || '').replace(/-/g, '').slice(0, 6) != this.SourceMonth) { this.toastr.error('The date must belong to the imported recovery month'); return null; }
    if (!this.Lines.length || !this.SettlementHeadId || !this.ExternalReference.trim()) { this.toastr.error('Add member/head rows, select bank/cash and enter a unique schedule reference'); return null; }
    if (!this.Lines.some(x => x.Debit > 0 || x.Credit > 0)) { this.toastr.error('There are no positive recoveries to post'); return null; }
    return {
      Lines: this.Lines.filter(x => x.Debit > 0 || x.Credit > 0).map(x => ({
        HeadId: x.HeadId, MemberId: x.MemberId || null, LoanId: x.LoanId || null,
        DepositAccountId: x.DepositAccountId || null, Component: x.Component || null, Debit: x.Debit, Credit: x.Credit, Narration: x.Narration || ''
      })), SettlementHeadId: this.SettlementHeadId, SourceMonth: this.SourceMonth
    };
  }
  readRecovery(book: XLSX.WorkBook) {
    // Read the master sheet once; CD/CPL/CPI tabs repeat the same recoveries.
    const data: any[][] = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, defval: '' });
    const index = data.findIndex(row => row.includes('STAFF') && row.includes('REC_CODE') && row.includes('COOP_SOCNO'));
    if (index < 0) return null;
    const header = data[index].map(x => String(x).trim());
    const rows = data.slice(index + 1).filter(row => row.some(value => String(value).trim())).map(row => {
      const result: any = {}; header.forEach((key, column) => result[key] = row[column]); return result;
    });
    // Printed total rows have no staff number — they have no STAFF value; filter them out.
    return rows.filter(row => String(row.STAFF || '').trim() !== '');
  }
  readLoanRecovery(text: string) {
    const period = text.match(/MONTH OF\s*:\s*(\d{4})/);
    const society = text.match(/Soc No\.:\s*(\d+)/);
    if (!period || !society || !/^(0[1-9]|1[0-2])\d{2}$/.test(period[1])) throw new Error('Unrecognized loan recovery statement header');
    const lines = text.split(/\r?\n/);
    const detail = lines.filter(line => /^ {0,5}\d+\s+\d{6}\s+/.test(line));
    const rows = detail.map((line, index) => {
      const identity = line.match(/^\s*(\d+)\s+(\d{6})\s+/);
      const payroll = line.match(/PAYROL\s+(\d{4})/);
      const amount = line.slice(89, 110).trim();
      if (!identity || Number(identity[1]) != index + 1 || line.indexOf('PAYROL') != 62 || payroll?.[1] != period[1] || !/^\d+(\.\d{1,2})?$/.test(amount)) throw new Error('Unrecognized loan recovery row ' + (index + 1) + '. No entries were loaded.');
      return { STAFF: identity[2], NAME: '', REC_CODE: 'CPL', AMOUNT: Number(amount), YYYYMM: '20' + period[1].slice(2) + period[1].slice(0, 2), COOP_SOCNO: society[1] };
    });
    const footer = text.match(/^ {0,5}(\d+)[ \t]+\d+[ \t]+\d+[ \t]+P[ \t]+-?\d+(?:\.\d+)?[ \t]+(\d+(?:\.\d+)?)/m);
    if (!rows.length || !footer || Number(footer[1]) != rows.length || Math.round(rows.reduce((sum, row) => sum + row.AMOUNT, 0) * 100) != Math.round(Number(footer[2]) * 100)) throw new Error('The loan statement row count or payroll recovery total does not match its footer');
    return rows;
  }
  selectRecoverySociety() {
    this.Lines = []; this.Reviewed = false; this.SourceMonth = ''; this.SelectedRecoveryCode = '';
    const rows = this.RecoveryRows.filter(x => String(x.COOP_SOCNO) == this.RecoverySociety);
    const months = Array.from(new Set(rows.map(x => String(x.YYYYMM))));
    if (months.length != 1 || !/^\d{4}(0[1-9]|1[0-2])$/.test(months[0])) { this.toastr.error('Select a file with one valid recovery month'); return; }
    this.SourceMonth = months[0];
    this.RecoveryMappings = Array.from(new Set(rows.map(x => String(x.REC_CODE).trim()))).map(code => ({
      Code: code, HeadId: null, Count: rows.filter(x => String(x.REC_CODE).trim() == code).length,
      Amount: rows.filter(x => String(x.REC_CODE).trim() == code).reduce((sum, x) => sum + Number(x.AMOUNT), 0)
    }));
    this.ExternalReference = this.ImportKind + '-' + this.RecoverySociety + '-' + this.SourceMonth;
    this.Narration = 'Payroll recovery ' + this.SourceMonth + ' / society ' + this.RecoverySociety;
  }
  previewRecovery() {
    if (this.dataLoading || this.isSaving || this.pendingTransaction) return;
    try {
      if (!this.SourceMonth || !this.SelectedRecoveryCode) throw new Error('Select the society and choose a recovery code row to load');
      const selectedMapping = this.RecoveryMappings.find(m => m.Code === this.SelectedRecoveryCode);
      if (!selectedMapping?.HeadId) throw new Error('Select the credit head for the chosen recovery code');
      const source = this.RecoveryRows.filter(x => String(x.COOP_SOCNO) == this.RecoverySociety && String(x.REC_CODE).trim() === this.SelectedRecoveryCode);
      const rows = source.map(x => {
        if (!/^\d+$/.test(String(x.STAFF).trim()) || !Number.isFinite(Number(x.AMOUNT)) || Number(x.AMOUNT) < 0) throw new Error('Invalid staff number or recovery amount for ' + x.STAFF);
        return { StaffNo: Number(x.STAFF), MemberNo: 0, HeadName: this.headName(selectedMapping.HeadId), Debit: 0, Credit: Number(x.AMOUNT), Narration: String(x.REC_CODE) + ' / ' + x.NAME };
      });
      this.loadImportPreview(rows);
    } catch (error: any) { this.toastr.error(error.message); }
  }
  loadImportPreview(rows: any[]) {
    if (!rows.length || rows.length > 2000) { this.toastr.error('Import between 1 and 2000 rows'); return; }
    this.dataLoading = true; this.Lines = []; this.Reviewed = false;
    this.service.accounting('ImportTransaction', this.request({ ImportRows: rows })).subscribe((response: any) => {
      this.dataLoading = false;
      if (response.Message != ConstantData.SuccessMessage) { this.toastr.error(response.Message); return; }
      this.Lines = response.Rows; this.PreviewPage = 1;
      this.toastr.success('Preview loaded. Resolve highlighted rows and review before Submit.');
    }, error => { this.dataLoading = false; this.toastr.error(error.error?.Message || 'Import failed'); });
  }
  clearImport() {
    if (this.dataLoading || this.isSaving || this.pendingTransaction) return;
    this.Lines = []; this.RecoveryRows = []; this.RecoveryMappings = []; this.RecoverySocieties = [];
    this.RecoverySociety = ''; this.SourceMonth = ''; this.ImportName = ''; this.ImportKind = ''; this.StatementText = ''; this.SelectedRecoveryCode = ''; this.Reviewed = false;
    this.PreviewPage = 1; this.PreviewSearch = ''; this.IssuesOnly = false;
  }
  async importFile(event: any) {
    if (this.dataLoading || this.isSaving || this.pendingTransaction) return;
    const file: File = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Use a file smaller than 5 MB');
      if (this.Lines.length || this.RecoveryRows.length) throw new Error('Clear the current import before importing another recovery file');
      if (/\.txt$/i.test(file.name)) {
        const text = await file.text();
        const rows = this.readLoanRecovery(text);
        this.RecoveryRows = rows; this.ImportKind = 'LOAN-RECOVERY'; this.StatementText = text; this.ImportName = file.name;
        this.RecoverySocieties = Array.from(new Set(rows.map(x => String(x.COOP_SOCNO))));
        this.RecoverySociety = this.RecoverySocieties[0]; this.selectRecoverySociety(); return;
      }
      const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const recovery = this.readRecovery(book);
      if (recovery) {
        if (!recovery.length) throw new Error('No compulsory deposit (COM) rows found');
        this.RecoveryRows = recovery; this.ImportName = file.name; this.ImportKind = 'COMPULSORY-DEPOSIT';
        this.RecoverySocieties = Array.from(new Set(recovery.map(x => String(x.COOP_SOCNO)))).sort();
        this.RecoverySociety = this.RecoverySocieties.includes('5') ? '5' : this.RecoverySocieties[0];
        this.selectRecoverySociety(); return;
      }
      const rows: any[] = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { defval: '' });
      if (!rows.length || rows.length > 2000) throw new Error('Import between 1 and 2000 rows');
      for (const row of rows) {
        if (!['HeadName', 'StaffNo', 'MemberNo', 'Debit', 'Credit'].every(key => Object.prototype.hasOwnProperty.call(row, key))) throw new Error('Use the template columns: HeadName, StaffNo, MemberNo, Debit, Credit, Narration');
        if (!String(row.StaffNo).trim() || !String(row.MemberNo).trim() || !Number.isInteger(Number(row.StaffNo)) || !Number.isInteger(Number(row.MemberNo)) || !Number.isFinite(Number(row.Debit)) || !Number.isFinite(Number(row.Credit))) throw new Error('Member/staff numbers and amounts must be numeric');
      }
      this.loadImportPreview(rows.map(x => ({ HeadName: String(x.HeadName), StaffNo: Number(x.StaffNo), MemberNo: Number(x.MemberNo), Debit: Number(x.Debit), Credit: Number(x.Credit), Narration: String(x.Narration || '') })));
    } catch (error: any) { this.toastr.error(error.message); }
    finally { event.target.value = ''; }
  }
  downloadTemplate() {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['HeadName', 'StaffNo', 'MemberNo', 'Debit', 'Credit', 'Narration']]), 'Entries');
    XLSX.writeFile(book, 'schedule-template.xlsx');
  }
  submit() {
    if (this.dataLoading || this.isSaving || this.storageError || !this.CanCreate) return;
    if (!this.pendingTransaction) {
      if (!this.SocietyId || !this.VoucherDate || !this.Narration.trim()) { this.toastr.error('Select society, date and enter narration'); return; }
      const payload = this.buildPayload();
      if (!payload) return;
      this.pendingTransaction = { ...payload, SocietyId: this.SocietyId, VoucherDate: this.loadData.loadDateYMD(this.VoucherDate), Narration: this.Narration, ChequeNo: this.ChequeNo, ExternalReference: this.ExternalReference, RequestKey: crypto.randomUUID() };
      try { sessionStorage.setItem(this.pendingKey(), this.localService.encrypt(JSON.stringify(this.pendingTransaction)).toString()); }
      catch { this.pendingTransaction = null; this.toastr.error('Enable session storage to retain a safe retry'); return; }
    }
    this.isSaving = true;
    this.service.accounting('SaveTransaction', this.request(this.pendingTransaction)).subscribe((response: any) => {
      this.isSaving = false;
      if (response.Message != ConstantData.SuccessMessage) { this.toastr.error(response.Message); return; }
      sessionStorage.removeItem(this.pendingKey()); this.pendingTransaction = null; this.clearImport();
      this.Narration = ''; this.ExternalReference = ''; this.ChequeNo = ''; this.resetLine(); this.getContext();
      this.toastr.success('Schedule posted: ' + response.VoucherNumber);
    }, error => {
      this.isSaving = false;
      if ([400, 401, 403, 404, 409].includes(error.status)) { sessionStorage.removeItem(this.pendingKey()); this.pendingTransaction = null; }
      this.toastr.error(error.error?.Message || 'Confirmation unavailable. Retry this same transaction.');
    });
  }
}

