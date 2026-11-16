import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LoadDataService } from '../../utils/load-data.service';
import { LocalService } from '../../utils/local.service';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';

declare var $: any;

@Component({
  selector: 'app-staff-salary',
  templateUrl: './staff-salary.component.html',
  styleUrls: ['./staff-salary.component.css']
})
export class StaffSalaryComponent implements OnInit {
  dataLoading: boolean = false;
  action: ActionModel = {} as ActionModel;
  staffLogin: StaffLoginModel = {} as StaffLoginModel;

  // Dropdown lists
  SalaryModes = ['Add', 'Modify'];
  StaffList: any[] = [];
  BankList: any[] = [];
  PaymentModes = [
    { Key: 1, Value: 'Bank' },
    { Key: 2, Value: 'Cash' }
  ];

  // Main Model
  model: any = {
    SalaryMode: 'Add',
    MemberId: null,
    StaffNo: '',
    StaffNoFormatted: '',
    SalaryDate: new Date().toISOString().substring(0, 10),
    Name: '',
    Designation: '',
    TotalPayments: 0.00,
    TotalDeductions: 0.00,
    PrevDues: 0.00,
    NetTotal: 0.00,
    NetPayment: 0.00,
    NextDues: 0.00,
    PaymentMode: 1, // 1 = Bank, 2 = Cash
    BankId: null,
    BankName: '',
    CurBankBal: 0.00,
    ChequeNo: '',
    MonthEL: 0,
    MonthCL: 0,
    MonthHPL: 0
  };

  // Payments Modal Model
  payments: any = {
    BasicPay: 0.00,
    FixedDA: 0.00,
    VariableDA: 0.00,
    HouseRent: 0.00,
    Conveyance: 0.00,
    Medical: 0.00,
    OtherPayments: 0.00,
    TotalPayments: 0.00
  };

  // Deductions Modal Model
  deductions: any = {
    CPFStaffCont: 0.00,
    MedicalCont: 0.00,
    StaffLoanPrincipal: 0.00,
    StaffLoanInterest: 0.00,
    HouseRentDeduction: 0.00,
    SalaryAdvanceRecovery: 0.00,
    FestivalAdvanceRecovery: 0.00,
    VDARecovery: 0.00,
    IncomeTaxStaff: 0.00,
    TotalDeductions: 0.00
  };

  // Leaves Modal Model
  leaves: any = {
    AvailableEL: 0,
    AvailableCL: 0,
    AvailableHPL: 0,
    MonthEL: 0,
    MonthCL: 0,
    MonthHPL: 0
  };

  isNetPaymentOverridden: boolean = false;

  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private loadDataService: LoadDataService,
    private localService: LocalService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.validiateMenu();
    this.getInitData();
  }

  validiateMenu() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ Url: this.router.url, StaffLoginId: this.staffLogin.StaffLoginId })).toString()
    };
    this.dataLoading = true;
    this.service.validiateMenu(obj).subscribe((response: any) => {
      this.action = this.loadDataService.validiateMenu(response, this.toastr, this.router);
      this.dataLoading = false;
    }, (err => {
      this.toastr.error("Error while fetching permission");
      this.dataLoading = false;
    }));
  }

  getInitData() {
    var req: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ StaffLoginId: this.staffLogin.StaffLoginId })).toString()
    };
    this.dataLoading = true;
    this.service.getStaffSalaryInit(req).subscribe((res: any) => {
      if (res.Message === ConstantData.SuccessMessage) {
        this.StaffList = res.StaffList || [];
        this.BankList = res.BankList || [];
        if (res.DefaultDate) {
          this.model.SalaryDate = new Date(res.DefaultDate).toISOString().substring(0, 10);
        }
        if (this.BankList.length > 0) {
          this.model.BankId = this.BankList[0].BankId;
          this.onBankChange();
        }
      } else {
        this.toastr.error(res.Message);
      }
      this.dataLoading = false;
    }, (err => {
      this.toastr.error("Error loading staff salary setup data");
      this.dataLoading = false;
    }));
  }

  onStaffChange() {
    if (!this.model.MemberId) {
      this.resetStaffDetails();
      return;
    }

    var selected = this.StaffList.find(x => x.MemberId == this.model.MemberId);
    if (selected) {
      this.model.StaffNo = selected.StaffNo;
      this.model.StaffNoFormatted = selected.StaffNoFormatted;
      this.model.Name = selected.MemberName;
      this.model.Designation = selected.Designation;
    }

    this.fetchStaffSalaryDetails();
  }

  onDateChange() {
    if (this.model.MemberId) {
      this.fetchStaffSalaryDetails();
    }
    if (this.model.BankId && this.model.PaymentMode === 1) {
      this.onBankChange();
    }
  }

  fetchStaffSalaryDetails() {
    var req: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        MemberId: this.model.MemberId,
        SalaryDate: this.model.SalaryDate,
        Mode: this.model.SalaryMode,
        StaffLoginId: this.staffLogin.StaffLoginId
      })).toString()
    };

    this.dataLoading = true;
    this.service.getStaffSalaryDetails(req).subscribe((res: any) => {
      if (res.Message === ConstantData.SuccessMessage) {
        this.model.Name = res.Name || '';
        this.model.Designation = res.Designation || '';
        this.model.PrevDues = res.PrevDues || 0.00;

        if (res.Payments) {
          this.payments = { ...res.Payments };
        }
        if (res.Deductions) {
          this.deductions = { ...res.Deductions };
        }
        if (res.Leaves) {
          this.leaves = { ...res.Leaves };
          this.model.MonthEL = res.Leaves.MonthEL || 0;
          this.model.MonthCL = res.Leaves.MonthCL || 0;
          this.model.MonthHPL = res.Leaves.MonthHPL || 0;
        }

        if (res.SalaryId) {
          this.model.SalaryId = res.SalaryId;
          this.model.PaymentMode = res.PaymentMode || 1;
          this.model.BankId = res.BankId;
          this.model.ChequeNo = res.ChequeNo || '';
        }

        this.calculatePaymentsTotal();
        this.calculateDeductionsTotal();
        this.isNetPaymentOverridden = false;
        this.calculateSummary();
      } else {
        this.toastr.error(res.Message);
      }
      this.dataLoading = false;
    }, (err => {
      this.toastr.error("Error fetching staff details");
      this.dataLoading = false;
    }));
  }

  onBankChange() {
    if (!this.model.BankId || this.model.PaymentMode !== 1) {
      this.model.CurBankBal = 0.00;
      return;
    }

    var req: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        BankId: this.model.BankId,
        SalaryDate: this.model.SalaryDate,
        StaffLoginId: this.staffLogin.StaffLoginId
      })).toString()
    };

    this.service.getStaffSalaryBankBalance(req).subscribe((res: any) => {
      if (res.Message === ConstantData.SuccessMessage) {
        this.model.CurBankBal = res.CurBankBal || 0.00;
      }
    });
  }

  onPaymentModeChange() {
    if (this.model.PaymentMode === 2) { // Cash
      this.model.BankId = null;
      this.model.ChequeNo = '';
      this.model.CurBankBal = 0.00;
    } else {
      if (this.BankList.length > 0 && !this.model.BankId) {
        this.model.BankId = this.BankList[0].BankId;
      }
      this.onBankChange();
    }
  }

  // Calculations for Payments
  calculatePaymentsTotal() {
    this.payments.TotalPayments =
      (parseFloat(this.payments.BasicPay) || 0) +
      (parseFloat(this.payments.FixedDA) || 0) +
      (parseFloat(this.payments.VariableDA) || 0) +
      (parseFloat(this.payments.HouseRent) || 0) +
      (parseFloat(this.payments.Conveyance) || 0) +
      (parseFloat(this.payments.Medical) || 0) +
      (parseFloat(this.payments.OtherPayments) || 0);

    this.model.TotalPayments = this.payments.TotalPayments;

    // Auto-update CPF Staff Cont = 12% of (Basic + Fixed DA + Var DA)
    const basicDa = (parseFloat(this.payments.BasicPay) || 0) +
                    (parseFloat(this.payments.FixedDA) || 0) +
                    (parseFloat(this.payments.VariableDA) || 0);
    this.deductions.CPFStaffCont = Math.round(basicDa * 0.12);
    this.calculateDeductionsTotal();
  }

  // Calculations for Deductions
  calculateDeductionsTotal() {
    this.deductions.TotalDeductions =
      (parseFloat(this.deductions.CPFStaffCont) || 0) +
      (parseFloat(this.deductions.MedicalCont) || 0) +
      (parseFloat(this.deductions.StaffLoanPrincipal) || 0) +
      (parseFloat(this.deductions.StaffLoanInterest) || 0) +
      (parseFloat(this.deductions.HouseRentDeduction) || 0) +
      (parseFloat(this.deductions.SalaryAdvanceRecovery) || 0) +
      (parseFloat(this.deductions.FestivalAdvanceRecovery) || 0) +
      (parseFloat(this.deductions.VDARecovery) || 0) +
      (parseFloat(this.deductions.IncomeTaxStaff) || 0);

    this.model.TotalDeductions = this.deductions.TotalDeductions;
    this.calculateSummary();
  }

  // Summary Net Calculations
  calculateSummary() {
    const totalPayments = parseFloat(this.model.TotalPayments) || 0;
    const totalDeductions = parseFloat(this.model.TotalDeductions) || 0;
    const prevDues = parseFloat(this.model.PrevDues) || 0;

    this.model.NetTotal = totalPayments - totalDeductions + prevDues;

    if (!this.isNetPaymentOverridden) {
      this.model.NetPayment = this.model.NetTotal;
    }

    const netPayment = parseFloat(this.model.NetPayment) || 0;
    this.model.NextDues = this.model.NetTotal - netPayment;
  }

  onNetPaymentChange() {
    this.isNetPaymentOverridden = true;
    const netTotal = parseFloat(this.model.NetTotal) || 0;
    const netPayment = parseFloat(this.model.NetPayment) || 0;
    this.model.NextDues = netTotal - netPayment;
  }

  // Leaves Save
  onLeavesClose() {
    this.model.MonthEL = parseInt(this.leaves.MonthEL) || 0;
    this.model.MonthCL = parseInt(this.leaves.MonthCL) || 0;
    this.model.MonthHPL = parseInt(this.leaves.MonthHPL) || 0;
    $('#leavesModal').modal('hide');
  }

  // Submit Salary
  saveStaffSalary() {
    if (!this.model.MemberId) {
      this.toastr.error("Please select a staff member");
      return;
    }
    if (!this.model.SalaryDate) {
      this.toastr.error("Please select a valid salary date");
      return;
    }
    if (this.model.PaymentMode === 1 && !this.model.BankId) {
      this.toastr.error("Please select a bank account");
      return;
    }
    if (this.model.NetPayment <= 0) {
      this.toastr.error("Net payment must be greater than zero");
      return;
    }

    const payload = {
      SalaryId: this.model.SalaryId || 0,
      MemberId: this.model.MemberId,
      SalaryDate: this.model.SalaryDate,
      PrevDues: this.model.PrevDues || 0,
      TotalPayments: this.model.TotalPayments || 0,
      TotalDeductions: this.model.TotalDeductions || 0,
      NetTotal: this.model.NetTotal || 0,
      NetPayment: this.model.NetPayment || 0,
      NextDues: this.model.NextDues || 0,
      PaymentMode: this.model.PaymentMode,
      BankId: this.model.BankId,
      ChequeNo: this.model.ChequeNo || '',
      MonthEL: this.model.MonthEL || 0,
      MonthCL: this.model.MonthCL || 0,
      MonthHPL: this.model.MonthHPL || 0,
      Payments: this.payments,
      Deductions: this.deductions,
      StaffLoginId: this.staffLogin.StaffLoginId
    };

    var req: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.dataLoading = true;
    this.service.saveStaffSalary(req).subscribe((res: any) => {
      if (res.Message === ConstantData.SuccessMessage) {
        this.toastr.success("Staff salary processed and accounting voucher posted successfully!");
        this.resetForm();
      } else {
        this.toastr.error(res.Message);
      }
      this.dataLoading = false;
    }, (err => {
      this.toastr.error("Error occurred while saving staff salary");
      this.dataLoading = false;
    }));
  }

  resetStaffDetails() {
    this.model.MemberId = null;
    this.model.StaffNo = '';
    this.model.StaffNoFormatted = '';
    this.model.Name = '';
    this.model.Designation = '';
    this.model.TotalPayments = 0.00;
    this.model.TotalDeductions = 0.00;
    this.model.PrevDues = 0.00;
    this.model.NetTotal = 0.00;
    this.model.NetPayment = 0.00;
    this.model.NextDues = 0.00;
    this.model.ChequeNo = '';
    this.payments = { BasicPay: 0, FixedDA: 0, VariableDA: 0, HouseRent: 0, Conveyance: 0, Medical: 0, OtherPayments: 0, TotalPayments: 0 };
    this.deductions = { CPFStaffCont: 0, MedicalCont: 0, StaffLoanPrincipal: 0, StaffLoanInterest: 0, HouseRentDeduction: 0, SalaryAdvanceRecovery: 0, FestivalAdvanceRecovery: 0, VDARecovery: 0, IncomeTaxStaff: 0, TotalDeductions: 0 };
    this.leaves = { AvailableEL: 0, AvailableCL: 0, AvailableHPL: 0, MonthEL: 0, MonthCL: 0, MonthHPL: 0 };
    this.isNetPaymentOverridden = false;
  }

  resetForm() {
    this.resetStaffDetails();
    this.model.SalaryMode = 'Add';
    this.model.SalaryDate = new Date().toISOString().substring(0, 10);
    this.model.PaymentMode = 1;
    if (this.BankList.length > 0) {
      this.model.BankId = this.BankList[0].BankId;
      this.onBankChange();
    }
  }
}
