import { Component, OnDestroy, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { LoadDataService } from '../../utils/load-data.service';
import { ConstantData } from '../../utils/constant-data';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-transfer',
  templateUrl: './transfer.component.html',
  styleUrls: ['./transfer.component.css']
})
export class TransferComponent implements OnInit, OnDestroy {
  SocietyList: any[] = [];
  HeadList: any[] = [];
  headSearchText = '';
  get filteredHeadList(): any[] {
    if (!this.headSearchText?.trim()) return this.HeadList;
    const term = this.headSearchText.toLowerCase().trim();
    return (this.HeadList || []).filter((h: any) =>
      (h.HeadName || '').toLowerCase().includes(term) || h.HeadId === this.Line?.HeadId
    );
  }
  RuleList: any[] = [];
  BalanceList: any[] = [];
  MemberList: any[] = [];
  VoucherList: any[] = [];
  SocietyId: any = null;
  VoucherDate: any = new Date();
  FinancialYearName = '';
  TrnNo = 'Assigned on save';
  TransactionNo = '';
  Narration = '';
  ExternalReference = '';
  ChequeNo = '';
  autoIncrement = true;
  showBalanceModal = false;
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

  get isBalanced(): boolean {
    return this.Lines.length >= 2 && this.total('Debit') > 0 && Math.abs(this.total('Debit') - this.total('Credit')) < 0.001;
  }

  get difference(): number {
    return Math.abs(Math.round(this.total('Debit') * 100) - Math.round(this.total('Credit') * 100)) / 100;
  }

  constructor(private service: AppService, private localService: LocalService,
    private loadData: LoadDataService, private toastr: ToastrService) { }

  ngOnInit() {
    this.resetLine(true);
    try {
      const pending = sessionStorage.getItem(this.pendingKey());
      if (pending) {
        this.pendingTransaction = JSON.parse(this.localService.decrypt(pending));
        if (this.pendingTransaction.VoucherNo) this.TransactionNo = this.pendingTransaction.VoucherNo;
        else if (this.pendingTransaction.ExternalReference) this.TransactionNo = this.pendingTransaction.ExternalReference;
      }
    } catch { this.storageError = true; this.toastr.error('Unable to restore the pending transaction. Contact the administrator before posting.'); }
    this.getSetup();
  }
  ngOnDestroy() { this.contextRequest++; this.memberRequest++; }
  pendingKey() { return 'TRANSFERPending:' + this.localService.getEmployeeDetail().StaffLoginId; }
  request(data: any) {
    return { request: this.localService.encrypt(JSON.stringify({ ...data, SourceType: 'TRANSFER', StaffLoginId: this.localService.getEmployeeDetail().StaffLoginId })).toString() };
  }
  getSetup() {
    this.dataLoading = true;
    this.service.accounting('TransactionSetup', this.request({})).subscribe((response: any) => {
      this.dataLoading = false;
      if (response.Message != ConstantData.SuccessMessage) { this.toastr.error(response.Message); return; }
      this.SocietyList = response.SocietyList;
      this.RuleList = response.RuleList;
      this.HeadList = (response.HeadList || [])
        .filter((x: any) => (x.HeadType != 1 && x.HeadType != 2) && !this.RuleList.some(r => r.HeadId == x.HeadId && !r.IsPostingAllowed))
        .sort((a: any, b: any) => (a.HeadName || '').localeCompare(b.HeadName || ''));
      this.CanCreate = response.CanCreate;
      if (response.TrnNo) this.TrnNo = response.TrnNo;
      if (this.SocietyList.length == 1) this.SocietyId = this.SocietyList[0].SocietyId;
      this.getContext();
    }, error => { this.dataLoading = false; this.toastr.error(error.error?.Message || 'Unable to load transfer'); });
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
      if (!this.TransactionNo && response.NextVoucherNo) {
        this.TransactionNo = String(response.NextVoucherNo);
      }
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
  clearMember() {
    this.Line.MemberId = null;
    this.SelectedMember = null;
    this.MemberSearch = '';
    this.MemberList = [];
    this.MemberBalance = null;
    this.memberRequest++;
    this.getContext();
  }
  resetLine(clearMember = false) {
    const keepMember = !clearMember && !!this.SelectedMember;
    const currentMemberId = keepMember ? this.SelectedMember.MemberId : null;
    const previousDebitCredit = this.Line?.DebitCredit || 'Debit';

    const dr = this.total('Debit');
    const cr = this.total('Credit');
    let nextDebitCredit = previousDebitCredit;
    if (dr > cr) nextDebitCredit = 'Credit';
    else if (cr > dr) nextDebitCredit = 'Debit';

    this.Line = {
      HeadId: null,
      MemberId: currentMemberId,
      DebitCredit: nextDebitCredit,
      Amount: null,
      Narration: '',
      LoanId: null,
      DepositAccountId: null,
      Component: null
    };

    if (!keepMember) {
      this.SelectedMember = null;
      this.MemberSearch = '';
      this.MemberList = [];
      this.MemberBalance = null;
    }
    this.memberRequest++;
  }
  clearRows() {
    if (this.dataLoading || this.isSaving || this.pendingTransaction) return;
    this.Lines = [];
  }
  removeLine(index: number) { if (this.dataLoading || this.isSaving || this.pendingTransaction) return; this.Lines.splice(index, 1); }
  editLine(index: number) {
    if (this.dataLoading || this.isSaving || this.pendingTransaction) return;
    const row = this.Lines[index];
    this.Line = { ...row, Amount: row.Amount || row.Debit || row.Credit, DebitCredit: row.Credit > 0 ? 'Credit' : 'Debit' };
    this.SelectedMember = row.MemberId ? { MemberId: row.MemberId, MemberName: row.MemberName, MemberNo: row.MemberNo, StaffNo: row.StaffNo } : null;
    this.MemberSearch = this.SelectedMember ? row.MemberName + ' — ' + row.MemberNo + ' / ' + row.StaffNo : '';
    this.Lines.splice(index, 1); this.getContext();
  }
  headName(id: any) { return this.HeadList.find(x => x.HeadId == id)?.HeadName || id; }
  balance(id: any) { return this.BalanceList.find(x => x.HeadId == id)?.ClosingBalance; }
  formatBalance(value: any) { return value == null ? 'Not available' : Math.abs(value).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + (value > 0 ? ' Dr' : value < 0 ? ' Cr' : ''); }
  total(field: string) { return this.Lines.reduce((sum, x) => sum + Math.round(Number(x[field] || 0) * 100), 0) / 100; }
  addLine() {
    if (this.dataLoading || this.isSaving || this.pendingTransaction || !this.CanCreate) return;
    const amount = Number(this.Line.Amount);
    if (!this.Line.HeadId || !Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) {
      this.toastr.error('Select a head and enter a positive amount with at most two decimals');
      return;
    }
    const rule = this.RuleList.find(x => x.HeadId == this.Line.HeadId);
    if ((false || rule?.RequiresMember || this.HeadList.find(x => x.HeadId == this.Line.HeadId)?.HeadType == 3) && !this.Line.MemberId) {
      this.toastr.error('Select a member from the suggestions');
      return;
    }
    if (rule?.RequiresLoan && !this.Line.LoanId || rule?.RequiresDepositAccount && !this.Line.DepositAccountId) {
      this.toastr.error('This head requires its loan/deposit account details');
      return;
    }
    this.Lines.push({
      ...this.Line,
      Issue: '',
      HeadName: this.headName(this.Line.HeadId),
      MemberName: this.SelectedMember?.MemberName,
      MemberNo: this.SelectedMember?.MemberNo,
      StaffNo: this.SelectedMember?.StaffNo,
      Debit: this.Line.DebitCredit == 'Debit' ? amount : 0,
      Credit: this.Line.DebitCredit == 'Credit' ? amount : 0
    });
    this.resetLine(false);

    // Show modal popup when balanced (matching legacy software)
    if (this.isBalanced) {
      this.showBalanceModal = true;
    }
  }
  closeBalanceModal(complete: boolean) {
    this.showBalanceModal = false;
    if (complete) {
      if (!this.TransactionNo || !this.TransactionNo.trim()) {
        this.toastr.error('Transaction no. is required');
        return;
      }
      this.submit();
    }
  }
  buildPayload() {
    if (this.Lines.some(x => x.Issue || !x.HeadId)) { this.toastr.error('Resolve imported member/head issues before submitting'); return null; }
    if (this.Lines.length < 2 || Math.abs(this.total('Debit') - this.total('Credit')) > 0.001) { this.toastr.error('Add at least two lines with equal total debit and credit'); return null; }
    return { Lines: this.Lines.map(x => ({ HeadId: x.HeadId, MemberId: x.MemberId || null, LoanId: x.LoanId || null,
      DepositAccountId: x.DepositAccountId || null, Component: x.Component || null, Debit: x.Debit, Credit: x.Credit, Narration: x.Narration || '' })) };
  }
  async importFile(event: any) {
    if (this.isSaving || this.pendingTransaction) return;
    const file: File = event.target.files?.[0];
    if (!file) return;
    try {
      if (this.Lines.length) throw new Error('Clear the current rows before importing another file');
      if (file.size > 5 * 1024 * 1024) throw new Error('Use a file smaller than 5 MB');
      const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { defval: '' });
      if (!rows.length || rows.length > 2000) throw new Error('Import between 1 and 2000 rows');
      for (const row of rows) {
        if (!['HeadName', 'StaffNo', 'MemberNo', 'Debit', 'Credit'].every(key => Object.prototype.hasOwnProperty.call(row, key))) throw new Error('Use the template columns: HeadName, StaffNo, MemberNo, Debit, Credit, Narration');
        if (!String(row.StaffNo).trim() || !String(row.MemberNo).trim() || !Number.isInteger(Number(row.StaffNo)) || !Number.isInteger(Number(row.MemberNo)) || !Number.isFinite(Number(row.Debit)) || !Number.isFinite(Number(row.Credit))) throw new Error('Member/staff numbers and amounts must be numeric');
      }
      this.dataLoading = true;
      this.service.accounting('ImportTransaction', this.request({ ImportRows: rows.map(x => ({ HeadName: String(x.HeadName), StaffNo: Number(x.StaffNo), MemberNo: Number(x.MemberNo), Debit: Number(x.Debit), Credit: Number(x.Credit), Narration: String(x.Narration || '') })) })).subscribe((response: any) => {
        this.dataLoading = false;
        if (response.Message != ConstantData.SuccessMessage) { this.toastr.error(response.Message); return; }
        this.Lines = response.Rows;
        this.toastr.success('Import preview loaded. Review the rows before submitting.');
      }, error => { this.dataLoading = false; this.toastr.error(error.error?.Message || 'Import failed'); });
    } catch (error: any) { this.toastr.error(error.message); }
    event.target.value = '';
  }
  downloadTemplate() {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['HeadName', 'StaffNo', 'MemberNo', 'Debit', 'Credit', 'Narration']]), 'Entries');
    XLSX.writeFile(book, 'transfer-template.xlsx');
  }
  submit() {
    if (this.dataLoading || this.isSaving || this.storageError || !this.CanCreate) return;
    this.showBalanceModal = false;
    if (!this.TransactionNo || !this.TransactionNo.trim()) {
      this.toastr.error('Transaction no. is required');
      return;
    }
    if (!this.pendingTransaction) {
      if (!this.SocietyId || !this.VoucherDate) { this.toastr.error('Select society and date'); return; }
      const payload = this.buildPayload();
      if (!payload) return;
      this.pendingTransaction = {
        ...payload,
        SocietyId: this.SocietyId,
        VoucherDate: this.loadData.loadDateYMD(this.VoucherDate),
        Narration: this.Narration ? this.Narration.trim() : '',
        ChequeNo: this.ChequeNo ? this.ChequeNo.trim() : null,
        ExternalReference: this.TransactionNo.trim(),
        VoucherNo: this.TransactionNo.trim(),
        RequestKey: crypto.randomUUID()
      };
      try { sessionStorage.setItem(this.pendingKey(), this.localService.encrypt(JSON.stringify(this.pendingTransaction)).toString()); }
      catch { this.pendingTransaction = null; this.toastr.error('Enable session storage to retain a safe retry'); return; }
    }
    this.isSaving = true;
    this.service.accounting('SaveTransaction', this.request(this.pendingTransaction)).subscribe((response: any) => {
      this.isSaving = false;
      if (response.Message != ConstantData.SuccessMessage) { this.toastr.error(response.Message); return; }
      sessionStorage.removeItem(this.pendingKey());
      const savedVoucherNo = this.pendingTransaction?.VoucherNo || this.TransactionNo;
      this.pendingTransaction = null;
      this.Lines = [];
      this.Narration = '';
      const assignedTrnNo = response.TrnNo || response.VoucherNumber;
      this.toastr.success(`Transfer posted successfully. Trn No: ${assignedTrnNo}, Transaction No: ${savedVoucherNo}`);
      if (this.autoIncrement && this.TransactionNo) {
        const match = this.TransactionNo.match(/^([A-Za-z]*)(\d+)$/);
        if (match) {
          const prefix = match[1];
          const numStr = match[2];
          const nextNum = Number(numStr) + 1;
          this.TransactionNo = prefix + String(nextNum).padStart(numStr.length, '0');
        } else if (!isNaN(Number(this.TransactionNo))) {
          this.TransactionNo = String(Number(this.TransactionNo) + 1);
        } else {
          this.TransactionNo = '';
        }
      } else if (!this.autoIncrement) {
        this.TransactionNo = '';
      }
      this.TrnNo = 'Assigned on save';
      this.ChequeNo = '';
      this.resetLine(true);
      this.getContext();
    }, error => {
      this.isSaving = false;
      if ([400, 401, 403, 404, 409].includes(error.status)) { sessionStorage.removeItem(this.pendingKey()); this.pendingTransaction = null; }
      this.toastr.error(error.error?.Message || 'Confirmation unavailable. Retry this same transaction.');
    });
  }
}
