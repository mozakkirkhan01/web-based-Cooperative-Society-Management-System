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
    // this.getPaymentList();
    this.getMemberList();
    this.getHeadList();
    this.getBankList();
    this.getPaymentList();
    this.resetForm();
    this.getTransactionNo();
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
    this.Payment = {
      PaymentId: 0,
      TrnNo: '',
      MemberId: null,
      HeadId: null,
      BankId: null,
      ChequeNo: '',
      HeadBalance: 0,
      OpeningBalance: 0,
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
    let obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };

    this.service.getTransactionNo(obj).subscribe((response: any) => {
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
  }
  clearMember() {
    this.MemberList = this.AllMemberList;
    this.Payment.MemberId = null;
    this.Payment = {};
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
    this.MemberList = this.AllMemberList;
    this.Payment.MemberId = null;
    this.Payment = {};
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
    this.isSubmitted = true;
    this.formPayment.control.markAllAsTouched();
    if (this.formPayment.invalid) {
      this.toastr.error("Fill all the required fields !!")
      return
    }
    this.Payment.PaymentDate = this.loadData.loadDateTime(this.Payment.PaymentDate);
    this.Payment.UpdatedBy = this.staffLogin.StaffLoginId;
    this.Payment.CreatedBy = this.staffLogin.StaffLoginId;
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(this.Payment)).toString()
    }
    this.service.savePayment(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        if (this.Payment.PaymentId > 0) {
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
      this.toastr.error("Error occured while submitting data")
    }))
  }
  getPaymentList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    }
    this.dataLoading = true
    this.service.getPaymentList(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        this.PaymentList = response.PaymentList;
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
  deletePayment(obj: any) {
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
        this.toastr.error("Error occured while deleteing the recored")
        this.dataLoading = false
      }))
    }
  }

  editPayment(obj: any) {
    this.resetForm()
    this.Payment = obj

  }

}
