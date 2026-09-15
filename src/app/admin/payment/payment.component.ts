import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LoadDataService } from '../../utils/load-data.service';
import { Status, BankCashType, DebitCreditType } from '../../utils/enum';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { LocalService } from '../../utils/local.service';
import { Router } from '@angular/router';
declare var $: any;

@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css']
})
export class PaymentComponent {
  BankList: any[] = [];
  // IMPORTANT: expose enum for HTML
  BankCashType = BankCashType;
  dataLoading: boolean = false
  // BankList: any = [];
  MemberList: any = []
  HeadList: any = []
  PaymentList: any = []
  Payment: any = {}
  isSubmitted = false
  isSaving = false;
  TotalRecords = 0;
  listRequest = 0;
  pendingPayment: any = null;
  FromDate: any = null;
  ToDate: any = null;
  transactionNoRequest = 0;
  StatusList = this.loadData.GetEnumList(Status);
  BankCashTypeList = this.loadData.GetEnumList(BankCashType);
  DebitCreditTypeList = this.loadData.GetEnumList(DebitCreditType);
  PageSize = ConstantData.PageSizes.filter(x => x <= 200);
  p: number = 1;
  Search: string = '';
  reverse: boolean = false;
  sortKey: string = '';
  itemPerPage: number = this.PageSize[0];
  action: ActionModel = {} as ActionModel;
  staffLogin: StaffLoginModel = {} as StaffLoginModel;
  AllStatusList = Status;
  AllBankCashTypeList = BankCashType;
  AllDebitCreditTypeList = DebitCreditType;
  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private loadData: LoadDataService,
    private localService: LocalService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.validiateMenu();
    // this.getPaymentList();
    this.getMemberList();
    this.getHeadList();
    this.getBankList();
    this.getPaymentList();
    this.resetForm();
    const pending = sessionStorage.getItem('PaymentPending:' + this.staffLogin.StaffLoginId);
    if (pending) {
      try {
        this.pendingPayment = JSON.parse(this.localService.decrypt(pending));
        this.transactionNoRequest++;
        this.Payment = { ...this.pendingPayment, PaymentDate: this.loadData.loadDate(this.pendingPayment.PaymentDate) };
        this.toastr.warning("A payment is awaiting confirmation. Retry it before starting another payment.");
      } catch {
        this.toastr.error("Unable to restore the pending payment. Contact the administrator before submitting another payment.");
        this.isSaving = true;
      }
    }
  }

  validiateMenu() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ Url: this.router.url, StaffLoginId: this.staffLogin.StaffLoginId })).toString()
    }
    this.dataLoading = true
    this.service.validiateMenu(obj).subscribe((response: any) => {
      this.action = this.loadData.validiateMenu(response, this.toastr, this.router)
      this.dataLoading = false;
    }, (err => {
      this.toastr.error("Error while fetching records")
      this.dataLoading = false;
    }))
  }

  @ViewChild('formPayment') formPayment: NgForm;
  resetForm() {
    if (this.isSaving || this.pendingPayment) return;
    this.Payment = {
      PaymentId: 0,
      TrnNo: '',
      MemberId: null,
      HeadId: null,
      BankId: null,
      ChequeNo: '',
      HeadBalance: 0,
      OpeningBalance: 0,
      Balance: null,
      PaymentDate: new Date(),
      Status: 1,
      DebitCreditType: 1,
      BankCashType: null
    };

    if (this.formPayment) {
      this.formPayment.resetForm({
        PaymentDate: new Date(),
        Status: 1,
        DebitCreditType: 1,
        HeadId: null,
        BankId: null
      });
    }

    this.isSubmitted = false;

    // Auto generate new transaction no after reset
    this.getTransactionNo();
  }

  sort(key: any) {
    this.sortKey = key;
    this.reverse = !this.reverse;
    this.filterPaymentList();
  }

  onTableDataChange(p: any) {
    this.p = p
    this.getPaymentList();
  }
  getHeadList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    }
    this.dataLoading = true
    this.service.getHeadList(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        this.HeadList = response.HeadList;
        this.onHeadChange(this.Payment.HeadId);
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false
    }, (err => {
      this.toastr.error("Error while fetching records")
    }))
  }
  onHeadChange(headId: any) {
    const selectedHead = this.HeadList.find(
      (x: any) => x.HeadId == headId
    );

    if (selectedHead) {
      this.Payment.HeadBalance = selectedHead.CurrentBalance;
    } else {
      this.Payment.HeadBalance = 0;
    }
  }

  getBankList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    }
    this.dataLoading = true
    this.service.getBankList(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        this.BankList = response.BankList;
        this.onBankChange(this.Payment.BankId);
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false
    }, (err => {
      this.toastr.error("Error while fetching records")
    }))
  }
  onBankChange(BankId: any) {
    const selectedBank = this.BankList.find(
      (x: any) => x.BankId == BankId
    );

    if (selectedBank) {
      this.Payment.OpeningBalance = selectedBank.OpeningBalance;
    } else {
      this.Payment.OpeningBalance = 0;
    }
  }
  getTransactionNo() {
    const requestNo = ++this.transactionNoRequest;
    const payment = this.Payment;
    let obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };

    this.service.getTransactionNo(obj).subscribe((response: any) => {
      if (requestNo != this.transactionNoRequest || this.Payment != payment || this.Payment.PaymentId > 0) return;
      if (response.Message == ConstantData.SuccessMessage) {
        this.Payment.TrnNo = response.TrnNo;
      } else {
        this.toastr.error(response.Message);
      }
    }, err => {
      this.toastr.error("Error while generating transaction number");
    });
  }
  onBankCashTypeChange() {
    if (this.Payment.BankCashType == BankCashType.Cash) {
      this.Payment.BankId = null;
      this.Payment.ChequeNo = '';
      this.Payment.OpeningBalance = null;
    }
  }

  //mat auto complete
  AllMemberList: any[] = [];
  filterMemberList(value: any) {
    if (value) {
      const filterValue = value.toLowerCase();
      this.MemberList = this.AllMemberList.filter((option: any) => option.SearchMember.toLowerCase().includes(filterValue));
    } else {
      this.MemberList = this.AllMemberList;
    }
    this.Payment.MemberId = 0;
    this.Payment.Balance = null;
  }
  clearMember() {
    if (this.isSaving || this.pendingPayment) return;
    this.MemberList = this.AllMemberList;
    this.Payment.MemberId = null;
    this.Payment.MemberName = '';
    this.Payment.Balance = null;
  }

  getMemberList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ Status: Status.Active })).toString()
    }
    this.dataLoading = true
    this.service.getMemberList(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        this.AllMemberList = response.MemberList;
        this.AllMemberList.map(x1 => x1.SearchMember = `${x1.MemberName} - ${x1.MemberNo} - ${x1.StaffNo}- ${x1.SailPersonalNo}`);
        this.MemberList = this.AllMemberList;
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false
    }, (err => {
      this.toastr.error("Error while fetching records")
      this.dataLoading = false;
    }))
  }
  clearCustomer() {
    this.clearMember();
  }

  //  afterMemberSelected(event: any) {
  //     this.Payment.MemberId = event.option.id;
  //     var Payment = this.MemberList.find((x: any) => x.MemberId == this.Payment.MemberId);
  //  }
  afterMemberSelected(event: any) {
    this.Payment.MemberId = event.option.id;
    this.Payment.MemberName = event.option.value;

    const member = this.MemberList.find(
      (x: any) => x.MemberId == this.Payment.MemberId
    );

    if (member) {
      this.Payment.MemberName = member.SearchMember;
    }
  }
  savePayment() {
    if (this.isSaving) return;
    if (!this.action.ResponseReceived || !(this.Payment.PaymentId > 0 ? this.action.CanEdit : this.action.CanCreate)) {
      this.toastr.error("You do not have permission to save this payment");
      return;
    }
    if (this.pendingPayment) {
      this.submitPayment(this.pendingPayment);
      return;
    }
    this.isSubmitted = true;
    this.formPayment.control.markAllAsTouched();
    if (this.formPayment.invalid) {
      this.toastr.error("Fill all the required fields !!")
      return
    }
    if (!Number.isInteger(Number(this.Payment.VoucherNo)) || Number(this.Payment.VoucherNo) <= 0 || Number(this.Payment.VoucherNo) > 2147483647) {
      this.toastr.error("Enter a positive whole voucher number");
      return;
    }
    if (!this.HeadList.some((x: any) => x.HeadId == this.Payment.HeadId)) {
      this.toastr.error("Select a valid head from the list");
      return;
    }
    if (!this.AllMemberList.some((x: any) => x.MemberId == this.Payment.MemberId)) {
      this.toastr.error("Select a valid member from the list");
      return;
    }
    if (!Number.isFinite(Number(this.Payment.Amount)) || Number(this.Payment.Amount) <= 0) {
      this.toastr.error("Amount must be greater than zero");
      return;
    }
    if (this.Payment.BankCashType == BankCashType.Bank && !this.BankList.some((x: any) => x.BankId == this.Payment.BankId)) {
      this.toastr.error("Select a bank for bank payments");
      return;
    }
    this.onBankCashTypeChange();
    const payment = {
      ...this.Payment,
      RequestKey: this.createRequestKey(),
      PaymentDate: this.loadData.loadDateTime(this.Payment.PaymentDate),
      UpdatedBy: this.staffLogin.StaffLoginId,
      CreatedBy: this.staffLogin.StaffLoginId
    };
    this.submitPayment(payment);
  }
  createRequestKey() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const value = Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
    return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
  }
  submitPayment(payment: any) {
    try {
      sessionStorage.setItem('PaymentPending:' + this.staffLogin.StaffLoginId, this.localService.encrypt(JSON.stringify(payment)).toString());
    } catch {
      this.toastr.error("Unable to retain the payment request for safe retry. Enable browser session storage.");
      return;
    }
    this.pendingPayment = payment;
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payment)).toString()
    }
    this.isSaving = true;
    this.service.savePayment(obj).subscribe(r1 => {
      this.isSaving = false;
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        this.pendingPayment = null;
        sessionStorage.removeItem('PaymentPending:' + this.staffLogin.StaffLoginId);
        if (payment.PaymentId > 0) {
          this.toastr.success("Payment detail updated successfully")
          $('#staticBackdrop').modal('hide')
        } else {
          this.toastr.success("Payment added successfully")
        }
        this.resetForm()
        this.getPaymentList()
      } else {
        this.toastr.error(response.Message)
      }
    }, (err => {
      this.isSaving = false;
      if ([400, 401, 403, 404, 409].includes(err.status)) {
        this.pendingPayment = null;
        sessionStorage.removeItem('PaymentPending:' + this.staffLogin.StaffLoginId);
      }
      this.toastr.error(err.error?.Message || "Payment confirmation unavailable. Retry the same payment.")
    }))
  }
  getPaymentList() {
    const requestNo = ++this.listRequest;
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        PageNumber: this.p,
        PageSize: Number(this.itemPerPage),
        FromDate: this.FromDate ? this.loadData.loadDateYMD(this.FromDate) : null,
        ToDate: this.ToDate ? this.loadData.loadDateYMD(this.ToDate) : null,
        Search: this.Search,
        SortKey: this.sortKey,
        Reverse: this.reverse
      })).toString()
    }
    this.dataLoading = true
    this.service.getPaymentList(obj).subscribe(r1 => {
      if (requestNo != this.listRequest) return;
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        this.PaymentList = response.PaymentList;
        this.TotalRecords = response.TotalRecords;
        this.p = response.PageNumber;
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false
    }, (err => {
      if (requestNo != this.listRequest) return;
      this.dataLoading = false;
      this.PaymentList = [];
      this.TotalRecords = 0;
      this.toastr.error(err.error?.Message || "Error while fetching records")
    }))
  }
  filterPaymentList() {
    const fromDate = this.FromDate ? this.loadData.loadDateYMD(this.FromDate) : null;
    const toDate = this.ToDate ? this.loadData.loadDateYMD(this.ToDate) : null;
    this.p = 1;
    this.listRequest++;
    if ((fromDate && fromDate.includes('NaN')) || (toDate && toDate.includes('NaN')) || (fromDate && toDate && fromDate > toDate)) {
      this.PaymentList = [];
      this.TotalRecords = 0;
      this.dataLoading = false;
      this.toastr.error("Select a valid date range");
      return;
    }
    this.getPaymentList();
  }
  clearDateFilter() {
    this.FromDate = null;
    this.ToDate = null;
    this.filterPaymentList();
  }
  DebitCreditShort: any = {
    [DebitCreditType.Debit]: 'Dr',
    [DebitCreditType.Credit]: 'Cr'
  };
  deletePayment(obj: any) {
    if (this.isSaving || this.pendingPayment || !this.action.CanDelete) return;
    if (confirm("Are your sure you want to delete this recored")) {
      var request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(obj)).toString()
      }
      this.dataLoading = true
      this.service.deletePayment(request).subscribe(r1 => {
        let response = r1 as any
        if (response.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Record Deleted successfully")
          this.getPaymentList()
        } else {
          this.toastr.error(response.Message)
          this.dataLoading = false
        }
      }, (err => {
        this.toastr.error(err.error?.Message || "Error occured while deleteing the recored")
        this.dataLoading = false
      }))
    }
  }

  editPayment(obj: any) {
    if (this.isSaving || this.pendingPayment || !this.action.CanEdit) return;
    this.transactionNoRequest++;
    this.Payment = { ...obj, PaymentDate: this.loadData.loadDate(obj.PaymentDate), Balance: null };
    if (this.formPayment) this.formPayment.resetForm(this.Payment);
    this.isSubmitted = false;
    this.onHeadChange(this.Payment.HeadId);
    this.onBankChange(this.Payment.BankId);
    this.onBankCashTypeChange();

  }

}
