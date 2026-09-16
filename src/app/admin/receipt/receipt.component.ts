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
  selector: 'app-receipt',
  templateUrl: './receipt.component.html',
  styleUrls: ['./receipt.component.css']
})
export class ReceiptComponent {
  BankList: any[] = [];
  // IMPORTANT: expose enum for HTML
  BankCashType = BankCashType;
  dataLoading: boolean = false
  // BankList: any = [];
  MemberList: any = []
  HeadList: any = []
  ReceiptList: any = []
  Receipt: any = {}
  // Prevent another click while the save request is running.
  isSaving = false;
  transactionNoRequest = 0;
  TotalRecords = 0;
  listRequest = 0;
  pendingReceipt: any = null;
  FromDate: any = null;
  ToDate: any = null;
  isSubmitted = false
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
    // this.getReceiptList();
    this.getMemberList();
    this.getHeadList();
    this.getBankList();
    this.getReceiptList();
    this.resetForm();
    try {
      const pending = sessionStorage.getItem('ReceiptPending:' + this.staffLogin.StaffLoginId);
      if (pending) {
        this.pendingReceipt = JSON.parse(this.localService.decrypt(pending));
        this.Receipt = { ...this.pendingReceipt, ReceiptDate: this.loadData.loadDate(this.pendingReceipt.ReceiptDate) };
        this.toastr.warning("A receipt is awaiting confirmation. Retry it before starting another receipt.");
      }
    } catch {
      this.isSaving = true;
      this.toastr.error("Unable to restore the pending receipt. Contact the administrator.");
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

  @ViewChild('formReceipt') formReceipt: NgForm;
  resetForm() {
    if (this.isSaving || this.pendingReceipt) return;
    this.Receipt = {
      ReceiptId: 0,
      TrnNo: '',
      MemberId: null,
      HeadId: null,
      BankId: null,
      ChequeNo: '',
      Balance: null,
      HeadBalance: 0,
      OpeningBalance: 0,
      ReceiptDate: new Date(),
      Status: 1,
      DebitCreditType: 2,
      BankCashType: null
    };

    if (this.formReceipt) {
      this.formReceipt.resetForm(this.Receipt);
    }

    this.isSubmitted = false;

    // Show the placeholder until the API saves the receipt.
    this.getReceiptTransactionNo();
  }

  sort(key: any) {
    this.sortKey = key;
    this.reverse = !this.reverse;
    this.filterReceiptList();
  }

  onTableDataChange(p: any) {
    this.p = p
    this.getReceiptList();
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
        this.onHeadChange(this.Receipt.HeadId);
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false
    }, (err => {
      this.toastr.error("Error while fetching records")
      this.dataLoading = false;
    }))
  }
  onHeadChange(headId: any) {
    const selectedHead = this.HeadList.find(
      (x: any) => x.HeadId == headId
    );

    if (selectedHead) {
      this.Receipt.HeadBalance = selectedHead.CurrentBalance;
    } else {
      this.Receipt.HeadBalance = 0;
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
        this.onBankChange(this.Receipt.BankId);
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false
    }, (err => {
      this.toastr.error("Error while fetching records")
      this.dataLoading = false;
    }))
  }
  onBankChange(BankId: any) {
    const selectedBank = this.BankList.find(
      (x: any) => x.BankId == BankId
    );

    if (selectedBank) {
      this.Receipt.OpeningBalance = selectedBank.OpeningBalance;
    } else {
      this.Receipt.OpeningBalance = 0;
    }
  }
  getReceiptTransactionNo() {
    // The API assigns the actual number when a new receipt is saved.
    // Do not display a preview number that another user could receive.
    if (!(this.Receipt.ReceiptId > 0)) {
      this.Receipt.TrnNo = 'Assigned on save';
    }
  }
onBankCashTypeChange() {
  if (this.Receipt.BankCashType == BankCashType.Cash) {
    this.Receipt.BankId = null;
    this.Receipt.ChequeNo = '';
    this.Receipt.OpeningBalance = 0;
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
    this.Receipt.MemberId = 0;
    this.Receipt.Balance = null;
  }
  clearMember() {
    if (this.isSaving || this.pendingReceipt) return;
    // Clear only member details; retain the amount, head and bank.
    this.MemberList = this.AllMemberList;
    this.Receipt.MemberId = null;
    this.Receipt.MemberName = '';
    this.Receipt.Balance = null;
  }
  // clearMember() {
  //   this.MemberList = this.AllMemberList;
  //   this.Receipt.MemberId = null;
  //   this.Receipt = {};
  // }

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
  //     this.Receipt.MemberId = event.option.id;
  //     var Receipt = this.MemberList.find((x: any) => x.MemberId == this.Receipt.MemberId);
  //  }
  afterMemberSelected(event: any) {
    this.Receipt.MemberId = event.option.id;
    this.Receipt.MemberName = event.option.value;

    const member = this.MemberList.find(
      (x: any) => x.MemberId == this.Receipt.MemberId
    );

    if (member) {
      this.Receipt.MemberName = member.SearchMember;
    }
  }
  saveReceipt() {
    if (this.isSaving) return;
    if (!this.action.ResponseReceived || !(this.Receipt.ReceiptId > 0 ? this.action.CanEdit : this.action.CanCreate)) {
      this.toastr.error("You do not have permission to save this receipt");
      return;
    }
    if (this.pendingReceipt) {
      this.submitReceipt(this.pendingReceipt);
      return;
    }
    this.isSubmitted = true;
    this.formReceipt.control.markAllAsTouched();
    if (this.formReceipt.invalid) {
      this.toastr.error("Fill all the required fields !!")
      return
    }
    // A typed member name alone is not a valid member selection.
    if (!this.AllMemberList.some((x: any) => x.MemberId == this.Receipt.MemberId)) {
      this.toastr.error("Select a valid member from the list");
      return;
    }
    if (!this.HeadList.some((x: any) => x.HeadId == this.Receipt.HeadId)) {
      this.toastr.error("Select a valid head from the list");
      return;
    }
    if (!Number.isFinite(Number(this.Receipt.Amount)) || Number(this.Receipt.Amount) <= 0) {
      this.toastr.error("Amount must be greater than zero");
      return;
    }
    if (!String(this.Receipt.ReceiptNo || '').trim()) {
      this.toastr.error("Receipt number is required");
      return;
    }
    if (this.Receipt.BankCashType == BankCashType.Bank && !this.BankList.some((x: any) => x.BankId == this.Receipt.BankId)) {
      this.toastr.error("Select a bank for bank receipts");
      return;
    }
    this.onBankCashTypeChange();
    // Format a copy for the API so a failed save does not change the form date.
    const receipt: any = {
      ...this.Receipt,
      // The placeholder is only for display; it is never sent as a receipt number.
      TrnNo: this.Receipt.ReceiptId > 0 ? this.Receipt.TrnNo : null,
      ReceiptDate: this.loadData.loadDateTime(this.Receipt.ReceiptDate),
      DebitCreditType: DebitCreditType.Credit,
      UpdatedBy: this.staffLogin.StaffLoginId,
      CreatedBy: this.staffLogin.StaffLoginId
    };
    receipt.RequestKey = this.createRequestKey();
    this.submitReceipt(receipt);
  }
  // Retain the same request key and payload until the API confirms the save.
  createRequestKey() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const value = Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
    return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
  }
  submitReceipt(receipt: any) {
    try {
      sessionStorage.setItem('ReceiptPending:' + this.staffLogin.StaffLoginId, this.localService.encrypt(JSON.stringify(receipt)).toString());
    } catch {
      this.toastr.error("Unable to retain the receipt request for safe retry. Enable browser session storage.");
      return;
    }
    this.pendingReceipt = receipt;
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(receipt)).toString()
    }
    this.isSaving = true;
    this.service.saveReceipt(obj).subscribe(r1 => {
      this.isSaving = false;
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        this.pendingReceipt = null;
        sessionStorage.removeItem('ReceiptPending:' + this.staffLogin.StaffLoginId);
        if (receipt.ReceiptId > 0) {
          this.toastr.success("Receipt detail updated successfully")
          $('#staticBackdrop').modal('hide')
        } else {
          this.toastr.success("Receipt added successfully")
        }
        this.resetForm()
        this.getReceiptList()
      } else {
        this.toastr.error(response.Message)
      }
    }, (err => {
      this.isSaving = false;
      if ([400, 401, 403, 404, 409].includes(err.status)) {
        this.pendingReceipt = null;
        sessionStorage.removeItem('ReceiptPending:' + this.staffLogin.StaffLoginId);
      }
      this.toastr.error(err.error?.Message || "Receipt confirmation unavailable. Retry the same receipt.")
    }))
  }
  getReceiptList() {
    const requestNo = ++this.listRequest;
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        StaffLoginId: this.staffLogin.StaffLoginId,
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
    this.service.getReceiptList(obj).subscribe(r1 => {
      if (requestNo != this.listRequest) return;
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        this.ReceiptList = response.ReceiptList;
        this.TotalRecords = response.TotalRecords;
        this.p = response.PageNumber;
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false
    }, (err => {
      if (requestNo != this.listRequest) return;
      this.dataLoading = false;
      this.ReceiptList = [];
      this.TotalRecords = 0;
      this.toastr.error(err.error?.Message || "Error while fetching records")
    }))
  }
  filterReceiptList() {
    const fromDate = this.FromDate ? this.loadData.loadDateYMD(this.FromDate) : null;
    const toDate = this.ToDate ? this.loadData.loadDateYMD(this.ToDate) : null;
    this.p = 1;
    this.listRequest++;
    if ((fromDate && fromDate.includes('NaN')) || (toDate && toDate.includes('NaN')) || (fromDate && toDate && fromDate > toDate)) {
      this.ReceiptList = [];
      this.TotalRecords = 0;
      this.dataLoading = false;
      this.toastr.error("Select a valid date range");
      return;
    }
    this.getReceiptList();
  }
  clearDateFilter() {
    this.FromDate = null;
    this.ToDate = null;
    this.filterReceiptList();
  }
  DebitCreditShort: any = {
    [DebitCreditType.Debit]: 'Dr',
    [DebitCreditType.Credit]: 'Cr'
  };
  deleteReceipt(obj: any) {
    if (this.isSaving || this.pendingReceipt || !this.action.CanDelete) return;
    if (confirm("Are your sure you want to delete this recored")) {
      var request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify({ ReceiptId: obj.ReceiptId, StaffLoginId: this.staffLogin.StaffLoginId })).toString()
      }
      this.dataLoading = true
      this.service.deleteReceipt(request).subscribe(r1 => {
        let response = r1 as any
        if (response.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Record Deleted successfully")
          this.getReceiptList()
        } else {
          this.toastr.error(response.Message)
          this.dataLoading = false
        }
      }, (err => {
        this.toastr.error("Error occured while deleteing the recored")
        this.dataLoading = false
      }))
    }
  }

  editReceipt(obj: any) {
    if (this.isSaving || this.pendingReceipt || !this.action.CanEdit) return;
    // Edit a copy; the displayed row changes only after a successful save.
    this.transactionNoRequest++;
    this.Receipt = { ...obj, ReceiptDate: this.loadData.loadDate(obj.ReceiptDate), Balance: null };
    if (this.formReceipt) this.formReceipt.resetForm(this.Receipt);
    this.isSubmitted = false;
    this.onHeadChange(this.Receipt.HeadId);
    this.onBankChange(this.Receipt.BankId);
    this.onBankCashTypeChange();

  }
}
