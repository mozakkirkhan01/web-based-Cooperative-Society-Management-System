import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { LoadDataService } from '../../utils/load-data.service';
import { ConstantData } from '../../utils/constant-data';
import { NotificationService } from '../../utils/notification.service';

@Component({
  selector: 'app-transfer',
  templateUrl: './transfer.component.html',
  styleUrls: ['./transfer.component.css']
})
export class TransferComponent implements OnInit, OnDestroy {
  showViewModal = false;
  viewLoading = false;
  selectedVoucher: any = null;
  editingVoucherId: number | null = null;
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
  TransferNo = '';
  get TransactionNo(): string { return this.TransferNo; }
  set TransactionNo(val: string) { this.TransferNo = val; }
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
  isReadOnly = false;
  currentFinancialYear: any = null;
  isLockedFinancialYear: boolean = false;
  lockedFYName: string = '';

  minVoucherDate: Date | null = null;

  maxVoucherDate: Date | null = null;

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
    private loadData: LoadDataService, private toastr: ToastrService,
    private notificationService: NotificationService,
    private route: ActivatedRoute, private router: Router) { }

  ngOnInit() {
    this.resetLine(true);
    try {
      const pending = sessionStorage.getItem(this.pendingKey());
      if (pending) {
        this.pendingTransaction = JSON.parse(this.localService.decrypt(pending));
        if (this.pendingTransaction.TransferNo) this.TransferNo = this.pendingTransaction.TransferNo;
        else if (this.pendingTransaction.VoucherNo) this.TransferNo = this.pendingTransaction.VoucherNo;
        else if (this.pendingTransaction.ExternalReference) this.TransferNo = this.pendingTransaction.ExternalReference;
      }
    } catch { this.storageError = true; this.toastr.error('Unable to restore the pending transaction. Contact the administrator before posting.'); }
    this.loadData.getCurrentFinancialYear(this.service, (fy: any) => {
      this.currentFinancialYear = fy;
      if (fy) {
        this.minVoucherDate = new Date(fy.StartDate);
        this.maxVoucherDate = new Date(fy.EndDate);
        this.checkFinancialYearLock();
      }
    });
    this.getSetup();
    this.route.queryParams.subscribe(params => {
      if (params['viewVoucherId']) {
        this.loadForEdit(Number(params['viewVoucherId']), true);
      } else if (params['editVoucherId']) {
        this.loadForEdit(Number(params['editVoucherId']), false);
      }
    });
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
  checkFinancialYearLock() {
    if (!this.currentFinancialYear || !this.VoucherDate) return;
    const isInside = this.loadData.isDateInCurrentFY(this.VoucherDate, this.currentFinancialYear);
    if (!isInside) {
      this.isReadOnly = true;
      this.isLockedFinancialYear = true;
      const d = new Date(this.VoucherDate);
      const year = d.getFullYear();
      this.lockedFYName = `${year}-${(year + 1).toString().slice(-2)}`;
    } else if (this.isLockedFinancialYear) {
      this.isLockedFinancialYear = false;
      this.isReadOnly = false;
    }
  }

  getContext() {
    const current = ++this.contextRequest;
    this.BalanceList = []; this.MemberBalance = null; this.FinancialYearName = ''; this.VoucherList = [];
    this.checkFinancialYearLock();

    if (!this.SocietyId || !this.VoucherDate) return;
    this.service.accounting('JournalContext', this.request({ SocietyId: this.SocietyId, VoucherDate: this.loadData.loadDateYMD(this.VoucherDate), HeadId: this.Line.HeadId || 0, MemberId: this.Line.MemberId || null })).subscribe((response: any) => {
      if (current != this.contextRequest) return;
      if (response.Message != ConstantData.SuccessMessage) { this.toastr.error(response.Message); return; }
      this.BalanceList = response.BalanceList; this.MemberBalance = response.MemberBalance;
      this.FinancialYearName = response.FinancialYearName; this.VoucherList = response.VoucherList;
      const nextNo = response.NextTransferNo || response.NextVoucherNo;
      if (!this.TransferNo && nextNo) {
        this.TransferNo = String(nextNo);
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
  formatBalance(value: any) { return value == null ? 'Not available' : Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (value > 0 ? ' Dr' : value < 0 ? ' Cr' : ''); }
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
    const selectedDebitCredit = this.Line.DebitCredit;

this.resetLine(false);

this.Line.DebitCredit = selectedDebitCredit;

    // Show modal popup when balanced (matching legacy software)
    if (this.isBalanced) {
      this.showBalanceModal = true;
    }
  }
  closeBalanceModal(complete: boolean) {
    this.showBalanceModal = false;
    if (complete) {
      if (!this.TransferNo || !this.TransferNo.trim()) {
        this.toastr.error('Transfer no. is required');
        return;
      }
      this.submit();
    }
  }
  buildPayload() {
    if (this.Lines.some(x => x.Issue || !x.HeadId)) { this.toastr.error('Resolve member/head issues before submitting'); return null; }
    if (this.Lines.length < 2 || Math.abs(this.total('Debit') - this.total('Credit')) > 0.001) { this.toastr.error('Add at least two lines with equal total debit and credit'); return null; }
    return {
      Lines: this.Lines.map(x => ({
        HeadId: x.HeadId, MemberId: x.MemberId || null, LoanId: x.LoanId || null,
        DepositAccountId: x.DepositAccountId || null, Component: x.Component || null, Debit: x.Debit, Credit: x.Credit, Narration: x.Narration || ''
      }))
    };
  }
  submit() {
    if (this.dataLoading || this.isSaving || this.storageError || !this.CanCreate || this.isReadOnly || this.isLockedFinancialYear) {

      if (this.isLockedFinancialYear) this.toastr.warning(`Transactions in prior Financial Year (${this.lockedFYName}) are locked and cannot be submitted.`);

      return;

    }
    this.showBalanceModal = false;
    if (!this.TransferNo || !this.TransferNo.trim()) {
      this.toastr.error('Transfer no. is required');
      return;
    }
    if (!this.pendingTransaction) {
      if (!this.SocietyId || !this.VoucherDate) { this.toastr.error('Select society and date'); return; }
      const payload = this.buildPayload();
      if (!payload) return;
      this.pendingTransaction = {
        ...payload,
        VoucherId: this.editingVoucherId,
        SocietyId: this.SocietyId,
        VoucherDate: this.loadData.loadDateYMD(this.VoucherDate),
        Narration: this.Narration ? this.Narration.trim() : '',
        ChequeNo: this.ChequeNo ? this.ChequeNo.trim() : null,
        ExternalReference: this.TransferNo.trim(),
        VoucherNo: this.TransferNo.trim(),
        TransferNo: this.TransferNo.trim(),
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
      const savedTransferNo = this.pendingTransaction?.TransferNo || this.pendingTransaction?.VoucherNo || this.TransferNo;
      const wasEdit = !!this.editingVoucherId;
      const assignedTrnNo = response.TrnNo || response.VoucherNumber || this.TrnNo;
      this.pendingTransaction = null;
      this.Lines = [];
      this.Narration = '';
      if (wasEdit) {
        this.toastr.success(`Transfer updated successfully on Trn No: ${assignedTrnNo}!`);
        this.editingVoucherId = null;
        this.router.navigate([], { relativeTo: this.route, queryParams: {} });
      } else {
        this.toastr.success(`Transfer submitted for verification. Trn No: ${assignedTrnNo}, Transfer No: ${savedTransferNo}`);
      }
      this.notificationService.refresh();
      if (!wasEdit && this.autoIncrement && this.TransferNo) {
        const match = this.TransferNo.match(/^([A-Za-z]*)(\d+)$/);
        if (match) {
          const prefix = match[1];
          const numStr = match[2];
          const nextNum = Number(numStr) + 1;
          this.TransferNo = prefix + String(nextNum).padStart(numStr.length, '0');
        } else if (!isNaN(Number(this.TransferNo))) {
          this.TransferNo = String(Number(this.TransferNo) + 1);
        } else {
          this.TransferNo = '';
        }
      } else if (!this.autoIncrement) {
        this.TransferNo = '';
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

  loadForEdit(voucherId: number, isView = false) {
    this.dataLoading = true;
    this.service.accounting('TransactionDetail', this.request({
      SourceId: voucherId,
      VoucherId: voucherId,
      SourceType: 'TRANSFER'
    })).subscribe({
      next: (response: any) => {
        this.dataLoading = false;
        if (response.Message !== ConstantData.SuccessMessage || !response.Voucher) {
          this.toastr.error(response.Message || 'Failed to load transfer');
          return;
        }
        const v = response.Voucher;
        const isPosted = v.Status === 'POSTED';
        this.isReadOnly = isPosted || isView;
        this.editingVoucherId = v.VoucherId;
        this.TrnNo = v.VoucherNumber;
        this.TransferNo = v.TransferNo || v.VoucherNo || '';
        this.SocietyId = v.SocietyId;
        this.VoucherDate = this.loadData.loadDate(v.VoucherDate);
        this.ChequeNo = v.ChequeNo || '';

        let cleanNarration = v.Narration || '';
        if (cleanNarration.startsWith('TRANSFER | ')) {
          cleanNarration = cleanNarration.substring(11).trim();
        }
        const trfNoIndex = cleanNarration.indexOf(' | TrfNo: ');
        if (trfNoIndex >= 0) {
          cleanNarration = cleanNarration.substring(0, trfNoIndex).trim();
        }
        const vNoIndex = cleanNarration.indexOf(' | VNo: ');
        if (vNoIndex >= 0) {
          cleanNarration = cleanNarration.substring(0, vNoIndex).trim();
        }
        const chqIndex = cleanNarration.indexOf(' | Cheque: ');
        if (chqIndex >= 0) {
          cleanNarration = cleanNarration.substring(0, chqIndex).trim();
        }
        this.Narration = cleanNarration;

        this.Lines = (v.Lines || []).map((l: any) => ({
          HeadId: l.HeadId,
          HeadName: l.HeadName,
          MemberId: l.MemberId,
          MemberNo: l.MemberNo,
          StaffNo: l.StaffNo,
          MemberName: l.MemberName,
          LoanId: l.LoanId,
          DepositAccountId: l.DepositAccountId,
          Component: l.Component,
          Debit: l.Debit,
          Credit: l.Credit,
          Narration: l.Narration || '',
          Issue: ''
        }));

        this.resetLine(true);
        this.checkFinancialYearLock();
        if (this.isLockedFinancialYear) {
          this.toastr.warning(`This transaction belongs to prior Financial Year ${this.lockedFYName}. Opened in Read-Only mode.`);
        }
        this.getContext();
        if (this.isReadOnly) {
          this.toastr.info(`Loaded Transfer ${this.TrnNo} in Read-Only mode.`);
        } else {
          this.toastr.info(`Loaded Transfer ${this.TrnNo} for editing.`);
        }
      },
      error: (err: any) => {
        this.dataLoading = false;
        this.toastr.error(err.error?.Message || 'Error loading transaction');
      }
    });
  }

  cancelEdit() {
    this.editingVoucherId = null;
    this.isReadOnly = false;
    this.isLockedFinancialYear = false;
    this.TrnNo = 'Assigned on save';
    this.Lines = [];
    this.Narration = '';
    this.ChequeNo = '';
    this.resetLine(true);
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    this.getContext();
  }

  viewVoucher(voucher: any) {
    this.showViewModal = true;
    this.viewLoading = true;
    this.selectedVoucher = null;
    this.service.accounting('TransactionDetail', this.request({
      SourceId: voucher.VoucherId,
      VoucherId: voucher.VoucherId,
      SourceType: 'TRANSFER',
      SocietyId: this.SocietyId
    })).subscribe((response: any) => {
      this.viewLoading = false;
      if (response.Message != ConstantData.SuccessMessage) {
        this.toastr.error(response.Message || 'Failed to load voucher details');
        this.closeViewModal();
        return;
      }
      this.selectedVoucher = response;
    }, () => {
      this.viewLoading = false;
      this.toastr.error('Unable to load transfer details');
      this.closeViewModal();
    });
  }

  closeViewModal() {
    this.showViewModal = false;
    this.selectedVoucher = null;
  }

}
