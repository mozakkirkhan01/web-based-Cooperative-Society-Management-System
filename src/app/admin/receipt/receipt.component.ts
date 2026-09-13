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
  isSubmitted = false
  StatusList = this.loadData.GetEnumList(Status);
  BankCashTypeList = this.loadData.GetEnumList(BankCashType);
  DebitCreditTypeList = this.loadData.GetEnumList(DebitCreditType);
  PageSize = ConstantData.PageSizes;
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
    this.getReceiptTransactionNo();
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
    this.Receipt = {
      ReceiptId: 0,
      TrnNo: '',
      MemberId: null,
      HeadId: null,
      BankId: null,
      ChequeNo: '',
      HeadBalance: 0,
      OpeningBalance: 0,
      ReceiptDate: new Date(),
      Status: 1,
      DebitCreditType: 2,
      BankCashType: null
    };

    if (this.formReceipt) {
      this.formReceipt.resetForm({
        ReceiptDate: new Date(),
        Status: 1,
        DebitCreditType: 2,
        HeadId: null,
        BankId: null
      });
    }

    this.isSubmitted = false;

    // Auto generate new transaction no after reset
    this.getReceiptTransactionNo();
  }

  sort(key: any) {
    this.sortKey = key;
    this.reverse = !this.reverse;
  }

  onTableDataChange(p: any) {
    this.p = p
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
      this.Receipt.OpeningBalance = selectedBank.OpeningBalance;
    } else {
      this.Receipt.OpeningBalance = 0;
    }
  }
  getReceiptTransactionNo() {
    let obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };

    this.service.getReceiptTransactionNo(obj).subscribe((response: any) => {
      if (response.Message == ConstantData.SuccessMessage) {
        this.Receipt.TrnNo = response.TrnNo;
      } else {
        this.toastr.error(response.Message);
      }
    }, err => {
      this.toastr.error("Error while generating transaction number");
    });
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
  }
  clearMember() {
    this.MemberList = this.AllMemberList;
    this.Receipt.MemberId = null;
    this.Receipt.MemberName = '';
    this.Receipt.Balance = 0;
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
    this.MemberList = this.AllMemberList;
    this.Receipt.MemberId = null;
    this.Receipt = {};
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
    this.isSubmitted = true;
    this.formReceipt.control.markAllAsTouched();
    if (this.formReceipt.invalid) {
      this.toastr.error("Fill all the required fields !!")
      return
    }
    this.Receipt.ReceiptDate = this.loadData.loadDateTime(this.Receipt.ReceiptDate);
    this.Receipt.UpdatedBy = this.staffLogin.StaffLoginId;
    this.Receipt.CreatedBy = this.staffLogin.StaffLoginId;
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(this.Receipt)).toString()
    }
    this.service.saveReceipt(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        if (this.Receipt.ReceiptId > 0) {
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
      this.toastr.error("Error occured while submitting data")
    }))
  }
  getReceiptList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    }
    this.dataLoading = true
    this.service.getReceiptList(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        this.ReceiptList = response.ReceiptList;
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false
    }, (err => {
      this.toastr.error("Error while fetching records")
    }))
  }
  DebitCreditShort: any = {
    [DebitCreditType.Debit]: 'Dr',
    [DebitCreditType.Credit]: 'Cr'
  };
  deleteReceipt(obj: any) {
    if (confirm("Are your sure you want to delete this recored")) {
      var request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(obj)).toString()
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
    this.resetForm()
    this.Receipt = obj

  }
}
