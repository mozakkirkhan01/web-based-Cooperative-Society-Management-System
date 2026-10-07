import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { ConstantData } from '../../utils/constant-data';
import { LoadDataService } from '../../utils/load-data.service';

@Component({
  selector: 'app-access-reports',
  templateUrl: './access-reports.component.html',
  styleUrls: ['./access-reports.component.css']
})
export class AccessReportsComponent implements OnInit, OnDestroy {
  Report = ''; Title = ''; YearId = 0; Years: any[] = []; Heads: any[] = [];
  HeadCode = ''; FromDate = ''; ToDate = ''; MemberKey = ''; MemberSearch = '';
  Members: any[] = []; SelectedMember: any = null; Search = '';
  CashBankDate: any = null;
  Rows: any[] = []; Totals: any = {}; Checks: any = {}; Total = 0;
  PageNumber = 1; PageSize = 20; dataLoading = false; Loaded = false;
  Allowed = false; Error = ''; requestNumber = 0; memberRequest = 0;
  IncludeDeleted = false;
  IncludeScheduleDetails = false;
  AccessReview = ConstantData.AccessReview; Notice = '';
  private routeSubscription?: Subscription;
  constructor(private service: AppService, private localService: LocalService, private toastr: ToastrService,
    private route: ActivatedRoute, private loadData: LoadDataService) { }
  ngOnInit() {
    this.routeSubscription = this.route.data.subscribe(data => {
      this.Report = data['report']; this.Title = data['title']; this.Allowed = false;
      this.HeadCode = ''; this.MemberKey = ''; this.MemberSearch = ''; this.SelectedMember = null;
      this.Search = ''; this.Rows = []; this.Totals = {}; this.Checks = {}; this.Loaded = false;
      this.YearId = 0; this.Years = []; this.Heads = []; this.Members = []; this.Notice = '';
      this.setup();
    });
  }
  ngOnDestroy() { this.routeSubscription?.unsubscribe(); this.requestNumber++; this.memberRequest++; }
  request(mode: string, extra: any = {}) {
    return {
      request: this.localService.encrypt(JSON.stringify({
        StaffLoginId: this.localService.getEmployeeDetail().StaffLoginId, Report: this.Report, Mode: mode,
        YearId: this.YearId, FromDate: this.FromDate || null, ToDate: (this.Report == 'DayBook' ? this.FromDate : this.ToDate) || null,
        HeadCode: this.HeadCode, MemberKey: this.MemberKey, Search: this.Search,
        PageNumber: this.PageNumber, PageSize: this.PageSize, IncludeDeleted: this.IncludeDeleted,
        IncludeScheduleDetails: this.IncludeScheduleDetails, ...extra
      })).toString()
    };
  }
  setup() {
    const current = ++this.requestNumber; this.memberRequest++;
    this.dataLoading = true; this.Error = ''; this.Notice = ''; this.Allowed = false; this.Loaded = false; this.Rows = []; this.Totals = {};
    this.service.accessReport(this.request('Setup')).subscribe((r: any) => {
      if (current != this.requestNumber) return;
      this.dataLoading = false;
      if (r.Message != ConstantData.SuccessMessage) { this.fail(r.Message); return; }
      if (r.Available === false) { this.Notice = r.Notice; return; }
      this.Allowed = true; this.Years = r.Years; this.YearId = r.Year.YearId; this.Heads = r.Heads;
      this.FromDate = r.Year.StartDate.substring(0, 10); this.ToDate = r.Year.EndDate.substring(0, 10);
      if (this.Report == 'CashBank') this.CashBankDate = new Date(this.ToDate);
      if (this.Report == 'DayBook') {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        this.FromDate = today < this.FromDate ? this.FromDate : today > this.ToDate ? this.ToDate : today;
        this.ToDate = this.FromDate;
      }
      this.PageNumber = 1;
      if (this.Report != 'MemberLedger') this.load();
    }, err => { if (current == this.requestNumber) this.fail(err.error?.Message); });
  }
  yearChanged() {
    this.HeadCode = ''; this.MemberKey = ''; this.MemberSearch = ''; this.Members = []; this.SelectedMember = null;
    this.Search = ''; this.setup();
  }
  dayBookDateChanged(date: any) {
    this.FromDate = date ? this.loadData.loadDateYMD(date) || '' : '';
    this.ToDate = this.FromDate;
    this.filtersChanged();
  }
  cashBankDateChanged(date: any) {
    this.ToDate = date ? this.loadData.loadDateYMD(date) || '' : '';
    this.filtersChanged();
  }
  filtersChanged() { this.requestNumber++; this.Rows = []; this.Totals = {}; this.Loaded = false; this.dataLoading = false; }
  findMembers() {
    this.MemberKey = ''; this.SelectedMember = null; this.filtersChanged();
    const current = ++this.memberRequest;
    if (!this.MemberSearch.trim()) { this.Members = []; return; }
    this.service.accessReport(this.request('Members', { Search: this.MemberSearch })).subscribe((r: any) => {
      if (current == this.memberRequest) this.Members = r.Message == ConstantData.SuccessMessage ? r.Rows : [];
    }, () => { if (current == this.memberRequest) this.Members = []; });
  }
  selectMember(member: any) {
    this.MemberKey = member.MemberKey; this.SelectedMember = member;
    this.MemberSearch = `${member.MemberName} — ${member.MemberNo} / ${member.StaffNo}`;
    this.filtersChanged();
  }
  show() { this.PageNumber = 1; this.load(); }
  load(exportCsv = false) {
    if (this.Report == 'DayBook') {
      if (!this.FromDate) { this.toastr.error('Select a date first'); return; }
      this.ToDate = this.FromDate;
    }
    if (this.Report == 'MemberLedger' && !this.MemberKey) { this.toastr.error('Select a member first'); return; }
    const current = ++this.requestNumber; this.dataLoading = true; this.Error = '';
    this.service.accessReport(this.request('Data', { Export: exportCsv })).subscribe((r: any) => {
      if (current != this.requestNumber) return;
      this.dataLoading = false;
      if (r.Message != ConstantData.SuccessMessage) { this.fail(r.Message); return; }
      if (exportCsv) { this.download(r.Rows); return; }
      this.Checks = r; this.Rows = r.Rows || []; this.Total = r.Total || 0; this.Totals = r.Totals || {}; this.Loaded = true;
    }, err => { if (current == this.requestNumber) this.fail(err.error?.Message); });
  }
  fail(message: string) {
    this.dataLoading = false; this.Loaded = false; this.Rows = []; this.Totals = {};
    this.Error = message || 'Unable to load this report'; this.toastr.error(this.Error);
  }
  page(change: number) { this.PageNumber += change; this.load(); }
  printDayBook() { window.print(); }
  balance(value: number) {
    if (this.Report == 'CashBank') {
      return `${Math.abs(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${value >= 0 ? ' Cr' : ' Dr'}`;
    }
    return `${Math.abs(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${value > 0 ? ' Dr' : value < 0 ? ' Cr' : ''}`;
  }
  sum(arr: number[], count?: number): number {
    if (!arr || !arr.length) return 0;
    const items = count !== undefined ? arr.slice(0, count) : arr;
    return items.reduce((a, b) => a + (b || 0), 0);
  }
  getReceiptsRowCount(): number {
    if (!this.Checks?.DayBook?.Receipts || !this.Checks.DayBook.Receipts.length) return 2;
    return this.Checks.DayBook.Receipts.reduce((sum: number, g: any) => sum + 2 + (g.Rows?.length || 0), 0) + 1;
  }
  getPaymentsRowCount(): number {
    if (!this.Checks?.DayBook?.Payments || !this.Checks.DayBook.Payments.length) return 2;
    return this.Checks.DayBook.Payments.reduce((sum: number, g: any) => sum + 2 + (g.Rows?.length || 0), 0) + 1;
  }
  get isBalance() { return this.Report == 'TrialBalance' || this.Report == 'MemberBalances'; }
  get showMember() { return this.Report == 'DayBook' || this.Report == 'HeadLedger' || this.Report == 'CashBank' || this.Report == 'MemberBalances'; }
  get pageCount() { return Math.max(1, Math.ceil(this.Total / this.PageSize)); }
  matches(row: any) { return row.ActiveRows == row.ImportedRows && row.OpeningRows == row.ImportedOpenings && row.SourceDebit == row.ImportedDebit && row.SourceCredit == row.ImportedCredit && row.SourceOpening == row.ImportedOpening; }
  private download(rows: any[]) {
    const columns = this.Report == 'LoanApplications'
      ? ['YearId', 'ApplicationNumber', 'MemberNo', 'StaffNo', 'MemberName', 'LoanType', 'Requested', 'Sanctioned', 'Payable', 'Instalment', 'CheckedDate', 'VerifiedDate', 'Passed', 'Deleted', 'SourceRowId']
      : ['Kind', 'HeadCode', 'HeadName', 'EntryDate', 'VoucherNumber', 'ReferenceNumber', 'ChequeNumber', 'MemberNo', 'StaffNo', 'MemberName', 'Narration', 'Opening', 'Debit', 'Credit', 'Closing', 'SourceRowId'];
    // Prevent spreadsheet formulas when source narrations or names start with special characters.
    const quote = (value: any) => { let text = value == null ? '' : String(value); if (typeof value == 'string' && /^[\s]*[=+\-@]/.test(text)) text = "'" + text; return '"' + text.replace(/"/g, '""') + '"'; };
    const csv = columns.join(',') + '\r\n' + rows.map(row => columns.map(column => quote(row[column])).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = `${this.Report}-${this.YearId}-${this.FromDate}-${this.ToDate}.csv`; link.click(); URL.revokeObjectURL(url);
  }
}





