import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { LoadDataService } from '../../utils/load-data.service';
import { ConstantData } from '../../utils/constant-data';
import { NotificationService } from '../../utils/notification.service';

@Component({
  selector: 'app-verify-transactions',
  templateUrl: './verify-transactions.component.html',
  styleUrls: ['./verify-transactions.component.css']
})
export class VerifyTransactionsComponent implements OnInit, OnDestroy {
  dataLoading = false;
  linesLoading = false;
  isProcessing = false;

  // Filter state
  txnType = 'ALL';
  dateFrom: any = null;
  dateTo: any = null;
  searchText = '';

  // Mode state
  isUnmarkMode = false;
  showPasswordModal = false;
  unmarkPassword = '';
  showPasswordText = false;
  passwordError = '';

  // Data lists
  transactions: any[] = [];
  selectedTransaction: any = null;
  transactionLines: any[] = [];
  totalDebit = 0;
  totalCredit = 0;

  // Selection
  selectedIds = new Set<number>();
  selectAll = false;

  staffLogin: any = {};
  targetVoucherId: number | null = null;

  constructor(
    private service: AppService,
    private localService: LocalService,
    private loadData: LoadDataService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.route.queryParams.subscribe(params => {
      if (params['voucherId']) {
        this.targetVoucherId = Number(params['voucherId']);
      }
      this.loadTransactions();
    });
  }

  ngOnDestroy(): void {}

  request(data: any): any {
    return {
      request: this.localService.encrypt(
        JSON.stringify({
          ...data,
          StaffLoginId: this.staffLogin?.StaffLoginId || 0,
          SourceType: 'JOURNAL'
        })
      ).toString()
    };
  }

  loadTransactions(): void {
    this.dataLoading = true;
    this.selectedIds.clear();
    this.selectAll = false;

    const payload = {
      TxnType: this.txnType,
      DateFrom: this.dateFrom ? this.loadData.loadDateYMD(this.dateFrom) : null,
      DateTo: this.dateTo ? this.loadData.loadDateYMD(this.dateTo) : null,
      Search: this.searchText ? this.searchText.trim() : '',
      Status: this.isUnmarkMode ? 'POSTED' : 'DRAFT'
    };

    this.service.accounting('PendingTransactions', this.request(payload)).subscribe({
      next: (response: any) => {
        this.dataLoading = false;
        if (response.Message !== ConstantData.SuccessMessage) {
          this.toastr.error(response.Message || 'Failed to load transactions');
          return;
        }

        this.transactions = response.Transactions || [];

        // If target voucher from query params or previously selected
        let toSelect = null;
        if (this.targetVoucherId) {
          toSelect = this.transactions.find(x => x.VoucherId === this.targetVoucherId);
          this.targetVoucherId = null; // Clear after initial selection
        }
        if (!toSelect && this.selectedTransaction) {
          toSelect = this.transactions.find(x => x.VoucherId === this.selectedTransaction.VoucherId);
        }
        if (!toSelect && this.transactions.length > 0) {
          toSelect = this.transactions[0];
        }

        if (toSelect) {
          this.selectTransaction(toSelect);
        } else {
          this.selectedTransaction = null;
          this.transactionLines = [];
          this.totalDebit = 0;
          this.totalCredit = 0;
        }

        this.notificationService.refresh();
      },
      error: (err: any) => {
        this.dataLoading = false;
        this.toastr.error(err.error?.Message || 'Unable to connect to transaction service');
      }
    });
  }

  selectTransaction(tx: any): void {
    this.selectedTransaction = tx;
    this.loadLines(tx.VoucherId);
  }

  loadLines(voucherId: number): void {
    this.linesLoading = true;
    this.service.accounting('TransactionLines', this.request({ VoucherId: voucherId })).subscribe({
      next: (response: any) => {
        this.linesLoading = false;
        if (response.Message === ConstantData.SuccessMessage) {
          this.transactionLines = response.Lines || [];
          this.totalDebit = response.TotalDebit || 0;
          this.totalCredit = response.TotalCredit || 0;
        } else {
          this.transactionLines = [];
        }
      },
      error: () => {
        this.linesLoading = false;
        this.transactionLines = [];
      }
    });
  }

  onFilter(): void {
    this.loadTransactions();
  }

  onResetFilter(): void {
    this.txnType = 'ALL';
    this.dateFrom = null;
    this.dateTo = null;
    this.searchText = '';
    this.loadTransactions();
  }

  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    if (this.selectAll) {
      this.transactions.forEach(x => this.selectedIds.add(x.VoucherId));
    } else {
      this.selectedIds.clear();
    }
  }

  toggleSelect(tx: any, event: MouseEvent): void {
    event.stopPropagation();
    if (this.selectedIds.has(tx.VoucherId)) {
      this.selectedIds.delete(tx.VoucherId);
      this.selectAll = false;
    } else {
      this.selectedIds.add(tx.VoucherId);
      if (this.selectedIds.size === this.transactions.length) {
        this.selectAll = true;
      }
    }
  }

  isSelected(tx: any): boolean {
    return this.selectedIds.has(tx.VoucherId);
  }

  getEffectiveSelectedIds(): number[] {
    if (this.selectedIds.size > 0) {
      return Array.from(this.selectedIds);
    }
    if (this.selectedTransaction) {
      return [this.selectedTransaction.VoucherId];
    }
    return [];
  }

  // Action: Verify
  verifySelected(): void {
    const ids = this.getEffectiveSelectedIds();
    if (ids.length === 0) {
      this.toastr.warning('Please select at least one transaction to verify.');
      return;
    }

    if (!confirm(`Are you sure you want to verify and post ${ids.length} selected transaction(s)? This will commit them to the General Ledger and Member Balances.`)) {
      return;
    }

    this.isProcessing = true;
    this.service.accounting('VerifyTransactions', this.request({ VoucherIds: ids })).subscribe({
      next: (response: any) => {
        this.isProcessing = false;
        if (response.Message === ConstantData.SuccessMessage) {
          this.toastr.success(response.Feedback || `Verified ${ids.length} transaction(s) successfully!`);
          this.loadTransactions();
        } else {
          this.toastr.error(response.Message);
        }
      },
      error: (err: any) => {
        this.isProcessing = false;
        this.toastr.error(err.error?.Message || 'Verification failed.');
      }
    });
  }

  verifyAll(): void {
    if (this.transactions.length === 0) {
      this.toastr.warning('No pending transactions to verify.');
      return;
    }

    const ids = this.transactions.map(x => x.VoucherId);
    if (!confirm(`Are you sure you want to verify ALL ${ids.length} pending transaction(s)?`)) {
      return;
    }

    this.isProcessing = true;
    this.service.accounting('VerifyTransactions', this.request({ VoucherIds: ids })).subscribe({
      next: (response: any) => {
        this.isProcessing = false;
        if (response.Message === ConstantData.SuccessMessage) {
          this.toastr.success(response.Feedback || `All ${ids.length} transactions verified successfully!`);
          this.loadTransactions();
        } else {
          this.toastr.error(response.Message);
        }
      },
      error: (err: any) => {
        this.isProcessing = false;
        this.toastr.error(err.error?.Message || 'Verification failed.');
      }
    });
  }

  // Action: Delete
  deleteSelected(): void {
    const ids = this.getEffectiveSelectedIds();
    if (ids.length === 0) {
      this.toastr.warning('Please select at least one transaction to delete.');
      return;
    }

    if (!confirm(`Are you sure you want to cancel and delete ${ids.length} selected unverified transaction(s)?`)) {
      return;
    }

    this.isProcessing = true;
    this.service.accounting('DeleteDraftTransactions', this.request({ VoucherIds: ids })).subscribe({
      next: (response: any) => {
        this.isProcessing = false;
        if (response.Message === ConstantData.SuccessMessage) {
          this.toastr.success(response.Feedback || `Deleted ${ids.length} transaction(s).`);
          this.loadTransactions();
        } else {
          this.toastr.error(response.Message);
        }
      },
      error: (err: any) => {
        this.isProcessing = false;
        this.toastr.error(err.error?.Message || 'Deletion failed.');
      }
    });
  }

  deleteAll(): void {
    if (this.transactions.length === 0) {
      this.toastr.warning('No unverified transactions to delete.');
      return;
    }

    const ids = this.transactions.map(x => x.VoucherId);
    if (!confirm(`CAUTION: Are you sure you want to DELETE ALL ${ids.length} unverified transaction(s)?`)) {
      return;
    }

    this.isProcessing = true;
    this.service.accounting('DeleteDraftTransactions', this.request({ VoucherIds: ids })).subscribe({
      next: (response: any) => {
        this.isProcessing = false;
        if (response.Message === ConstantData.SuccessMessage) {
          this.toastr.success(response.Feedback || `Deleted ${ids.length} transactions.`);
          this.loadTransactions();
        } else {
          this.toastr.error(response.Message);
        }
      },
      error: (err: any) => {
        this.isProcessing = false;
        this.toastr.error(err.error?.Message || 'Deletion failed.');
      }
    });
  }

  // Unmark Verification Modal & Execution
  openUnmarkModal(): void {
    this.unmarkPassword = '';
    this.passwordError = '';
    this.showPasswordModal = true;
  }

  closeUnmarkModal(): void {
    this.showPasswordModal = false;
    this.unmarkPassword = '';
    this.passwordError = '';
  }

  submitUnmarkPassword(): void {
    if (!this.unmarkPassword || !this.unmarkPassword.trim()) {
      this.passwordError = 'Please enter password.';
      return;
    }

    // Switch to unmark mode
    this.isUnmarkMode = true;
    this.showPasswordModal = false;
    this.toastr.info('Entered Unmark Verification Mode. You can now view and un-verify posted transactions.');
    this.loadTransactions();
  }

  unmarkSelected(): void {
    const ids = this.getEffectiveSelectedIds();
    if (ids.length === 0) {
      this.toastr.warning('Please select at least one posted transaction to unmark.');
      return;
    }

    if (!this.unmarkPassword) {
      this.openUnmarkModal();
      return;
    }

    if (!confirm(`Are you sure you want to unmark ${ids.length} transaction(s)? They will be reverted to Draft, allowing edit or deletion.`)) {
      return;
    }

    this.isProcessing = true;
    this.service.accounting('UnverifyTransactions', this.request({
      VoucherIds: ids,
      Password: this.unmarkPassword
    })).subscribe({
      next: (response: any) => {
        this.isProcessing = false;
        if (response.Message === ConstantData.SuccessMessage) {
          this.toastr.success(response.Feedback || `Successfully unmarked ${ids.length} transaction(s).`);
          this.loadTransactions();
        } else {
          this.toastr.error(response.Message);
        }
      },
      error: (err: any) => {
        this.isProcessing = false;
        this.toastr.error(err.error?.Message || 'Authorization failed. Check your password.');
      }
    });
  }

  exitUnmarkMode(): void {
    this.isUnmarkMode = false;
    this.unmarkPassword = '';
    this.toastr.info('Exited Unmark Mode. Showing pending transactions.');
    this.loadTransactions();
  }

  // Badge helpers
  getTypeBadgeClass(type: string): string {
    const t = (type || '').toUpperCase();
    if (t === 'PAYMENT') return 'bg-danger text-white';
    if (t === 'RECEIPT') return 'bg-success text-white';
    if (t === 'TRANSFER') return 'bg-primary text-white';
    if (t === 'CONTRA') return 'bg-info text-dark';
    if (t === 'SCHEDULE') return 'bg-warning text-dark';
    if (t === 'SALARY') return 'bg-secondary text-white';
    return 'bg-dark text-white';
  }
}
