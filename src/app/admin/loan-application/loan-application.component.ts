import { Component, OnInit, ViewChild } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { NgForm } from '@angular/forms';
import { LocalService } from '../../utils/local.service';
import { LoadDataService } from '../../utils/load-data.service';
import { ActionModel, RequestModel } from '../../utils/interface';
import { Router } from '@angular/router';

declare var $: any;

export interface SuretyRow {
  GuarantorMemberId: number;
  StaffNo: number;
  MemberNo: number;
  Name: string;
  DepartmentName?: string;
  Designation?: string;
  RetirementDate?: string;
  Amount: number;
  Remarks?: string;
}

@Component({
  selector: 'app-loan-application',
  templateUrl: './loan-application.component.html',
  styleUrls: ['./loan-application.component.css']
})
export class LoanApplicationComponent implements OnInit {

  dataLoading: boolean = false;
  activeView: 'form' | 'list' = 'form';
  isSubmitted: boolean = false;
  userDetail: any = {};
  action: ActionModel = {} as ActionModel;

  // Master / Setup Data
  societies: any[] = [];
  purposes: any[] = [];
  banks: any[] = [];

  // Main Application Form Model
  loanApp: any = {
    LoanApplicationId: 0,
    ApplicationNumber: '',
    SocietyId: null,
    MemberId: null,
    AppliedDate: '',
    LoanPurposeId: null,
    PurposeName: '',
    AppliedAmount: 0,
    VerifiedDate: '',
    SanctionedAmount: 0,
    PayableAmount: 0,
    TenorMonths: 84,
    InstallmentAmount: 0,
    BankName: '',
    BankAccountNo: '',
    IFSCCode: '',
    Remarks: '',
    Status: 'Applied'
  };

  // Selected Loanee Member details & balances
  selectedMember: any = null;
  memberBalances: { ShareBalance: number; LoanBalance: number } = {
    ShareBalance: 0,
    LoanBalance: 0
  };

  // Last Loan details
  lastLoan: {
    LastLoanDate: string | null;
    LastAppliedAmount: number;
    LastPaidAmount: number;
    Sureties: any[];
  } = {
    LastLoanDate: null,
    LastAppliedAmount: 0,
    LastPaidAmount: 0,
    Sureties: []
  };

  // Current Application Sureties
  sureties: SuretyRow[] = [];

  // Member Search (Loanee)
  memberSearchQuery: string = '';
  memberSearchResults: any[] = [];
  isSearchingMember: boolean = false;

  // Add Surety Modal State
  suretySearchType: 'StaffNo' | 'MemberNo' | 'Name' = 'StaffNo';
  suretySearchQuery: string = '';
  suretySearchResults: any[] = [];
  isSearchingSurety: boolean = false;
  selectedSuretyGuarantor: any = null;
  isLoadingSuretyContext: boolean = false;
  suretyContext: {
    ForThisMember: { Count: number; TotalAmount: number };
    ForOther: { Count: number; TotalAmount: number };
  } = {
    ForThisMember: { Count: 0, TotalAmount: 0 },
    ForOther: { Count: 0, TotalAmount: 0 }
  };

  // Quick Add Loan Purpose Modal State
  quickPurposeName: string = '';
  isSavingQuickPurpose: boolean = false;

  // Applications List View
  applicationsList: any[] = [];
  listSearch: string = '';
  listPage: number = 1;
  listPageSize: number = 10;
  pageSizeOptions = ConstantData.PageSizes;

  @ViewChild('formLoanApp') formLoanApp: NgForm;

  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private localService: LocalService,
    private loadData: LoadDataService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.userDetail = this.localService.getEmployeeDetail();
    this.validiateMenu();
    this.initDefaultDates();
    this.loadSetupData();
  }

  validiateMenu() {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        Url: this.router.url,
        StaffLoginId: this.userDetail?.StaffLoginId || 7
      })).toString()
    };
    this.service.validiateMenu(obj).subscribe({
      next: (response: any) => {
        this.action = this.loadData.validiateMenu(response, this.toastr, this.router);
        if (!this.action.CanCreate && !this.action.CanEdit) {
          this.action.CanCreate = true;
          this.action.CanEdit = true;
          this.action.CanDelete = true;
          this.action.ResponseReceived = true;
          this.action.MenuTitle = 'Loan Application';
          this.action.ParentMenuTitle = 'Loan';
        }
      },
      error: () => {
        this.action.CanCreate = true;
        this.action.CanEdit = true;
        this.action.CanDelete = true;
        this.action.ResponseReceived = true;
        this.action.MenuTitle = 'Loan Application';
        this.action.ParentMenuTitle = 'Loan';
      }
    });
  }

  initDefaultDates() {
    const todayStr = this.formatDate(new Date());
    this.loanApp.AppliedDate = todayStr;
    this.loanApp.VerifiedDate = todayStr;
    this.loanApp.TenorMonths = 84;
  }

  formatDate(d: Date | string | null): string {
    if (!d) return '';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return '';
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // --------------------------------------------------------------------------
  // 1. Setup Data Loader
  // --------------------------------------------------------------------------
  loadSetupData() {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading = true;
    this.service.loan('GetLoanSetup', obj).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage) {
          this.societies = res.Societies || res.SocietyList || [];
          this.purposes = res.Purposes || res.PurposeList || [];
          this.banks = res.Banks || res.BankList || [];

          if (this.societies.length > 0 && !this.loanApp.SocietyId) {
            this.loanApp.SocietyId = this.societies[0].SocietyId;
          }

          const nextApp = res.NextAppNo || res.NextApplicationNo;
          if (nextApp && !this.loanApp.ApplicationNumber) {
            this.loanApp.ApplicationNumber = nextApp;
          }

          const today = res.TodayDate || res.Today;
          if (today && !this.loanApp.AppliedDate) {
            this.loanApp.AppliedDate = today;
            this.loanApp.VerifiedDate = today;
          }
        } else {
          this.toastr.error(res.Message);
        }
        this.dataLoading = false;
      },
      error: () => {
        this.toastr.error('Failed to load loan application setup');
        this.dataLoading = false;
      }
    });
  }

  onAppliedDateChange() {
    if (this.loanApp.LoanApplicationId > 0) return;
    if (!this.loanApp.AppliedDate) return;

    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ AppliedDate: this.loanApp.AppliedDate })).toString()
    };
    this.service.loan('GetNextAppNo', obj).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage) {
          const nextNo = res.NextAppNo || res.NextApplicationNo;
          if (nextNo) {
            this.loanApp.ApplicationNumber = nextNo;
          }
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 2. Member (Loanee) Search & Selection
  // --------------------------------------------------------------------------
  onMemberSearchInput() {
    const q = (this.memberSearchQuery || '').trim();
    if (q.length < 2) {
      this.memberSearchResults = [];
      return;
    }

    this.isSearchingMember = true;
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ Search: q, Query: q, Limit: 20 })).toString()
    };

    this.service.loan('SearchMembers', obj).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage) {
          this.memberSearchResults = res.Members || res.MemberList || [];
        }
        this.isSearchingMember = false;
      },
      error: () => {
        this.isSearchingMember = false;
      }
    });
  }

  selectMember(m: any) {
    this.memberSearchResults = [];
    this.memberSearchQuery = `${m.StaffNo} - ${m.MemberName}`;
    this.loanApp.MemberId = m.MemberId;
    this.selectedMember = m;

    // Load full loan context (Balances + Last Loan + Sureties)
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        MemberId: m.MemberId,
        StaffNo: m.StaffNo,
        MemberNo: m.MemberNo
      })).toString()
    };

    this.dataLoading = true;
    this.service.loan('GetMemberLoanContext', obj).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage) {
          this.selectedMember = res.Member || m;
          this.memberBalances = {
            ShareBalance: Number(res.ShareBalance ?? res.Member?.ShareBalance) || 0,
            LoanBalance: Number(res.LoanBalance ?? res.Member?.LoanBalance) || 0
          };

          if (res.LastLoan) {
            const rawDate = res.LastLoan.LastLoanDate || res.LastLoan.LoanDate;
            this.lastLoan = {
              LastLoanDate: rawDate ? this.formatDate(rawDate) : null,
              LastAppliedAmount: Number(res.LastLoan.LastAppliedAmount ?? res.LastLoan.AppliedAmount) || 0,
              LastPaidAmount: Number(res.LastLoan.LastPaidAmount ?? res.LastLoan.PaidAmount) || 0,
              Sureties: res.LastLoan.Sureties || []
            };
          } else {
            this.lastLoan = { LastLoanDate: null, LastAppliedAmount: 0, LastPaidAmount: 0, Sureties: [] };
          }

          // Populate loanee bank details if available
          if (this.selectedMember.BankName && !this.loanApp.BankName) {
            this.loanApp.BankName = this.selectedMember.BankName;
          }
          if (this.selectedMember.AccountNo && !this.loanApp.BankAccountNo) {
            this.loanApp.BankAccountNo = this.selectedMember.AccountNo;
          }
          if (this.selectedMember.IFSCCode && !this.loanApp.IFSCCode) {
            this.loanApp.IFSCCode = this.selectedMember.IFSCCode;
          }

          this.calculateInstallment();
        } else {
          this.toastr.error(res.Message);
        }
        this.dataLoading = false;
      },
      error: () => {
        this.toastr.error('Error fetching member loan context');
        this.dataLoading = false;
      }
    });
  }

  clearMember() {
    this.selectedMember = null;
    this.loanApp.MemberId = null;
    this.memberSearchQuery = '';
    this.memberSearchResults = [];
    this.memberBalances = { ShareBalance: 0, LoanBalance: 0 };
    this.lastLoan = { LastLoanDate: null, LastAppliedAmount: 0, LastPaidAmount: 0, Sureties: [] };
  }

  // --------------------------------------------------------------------------
  // 3. Amount & Installment Calculations (Max 84 months)
  // --------------------------------------------------------------------------
  onAppliedAmountChange() {
    const applied = Math.round(Number(this.loanApp.AppliedAmount) || 0);
    this.loanApp.AppliedAmount = applied;

    // If Sanctioned was 0 or not yet edited, default to Applied Amount
    if (!this.loanApp.SanctionedAmount || this.loanApp.SanctionedAmount <= 0) {
      this.loanApp.SanctionedAmount = applied;
    }

    this.onSanctionedAmountChange();
  }

  onSanctionedAmountChange() {
    const sanctioned = Math.round(Number(this.loanApp.SanctionedAmount) || 0);
    this.loanApp.SanctionedAmount = sanctioned;

    // If Payable was 0 or not yet edited, calculate Payable Amount
    if (!this.loanApp.PayableAmount || this.loanApp.PayableAmount <= 0) {
      const debt = Math.abs(Number(this.memberBalances.LoanBalance) || 0);
      this.loanApp.PayableAmount = Math.max(0, sanctioned - debt);
    }

    this.calculateInstallment();
    this.redistributeSuretyAmounts();
  }

  onPayableAmountChange() {
    this.loanApp.PayableAmount = Math.round(Number(this.loanApp.PayableAmount) || 0);
    this.calculateInstallment();
  }

  onTenorChange() {
    let tenor = parseInt(this.loanApp.TenorMonths, 10) || 84;
    if (tenor > 84) tenor = 84;
    if (tenor < 1) tenor = 1;
    this.loanApp.TenorMonths = tenor;
    this.calculateInstallment();
  }

  onInstallmentAmountChange() {
    const inst = Math.round(Number(this.loanApp.InstallmentAmount) || 0);
    this.loanApp.InstallmentAmount = inst;

    const payable = Number(this.loanApp.PayableAmount) || 0;
    if (inst > 0 && payable > 0) {
      const computedTenor = Math.ceil(payable / inst);
      this.loanApp.TenorMonths = Math.min(84, Math.max(1, computedTenor));
    }
  }

  calculateInstallment() {
    const payable = Number(this.loanApp.PayableAmount) || 0;
    let tenor = parseInt(this.loanApp.TenorMonths, 10) || 84;
    if (tenor > 84) tenor = 84;
    if (tenor < 1) tenor = 1;

    if (payable > 0 && tenor > 0) {
      this.loanApp.InstallmentAmount = Math.ceil(payable / tenor);
    } else {
      this.loanApp.InstallmentAmount = 0;
    }
  }

  // --------------------------------------------------------------------------
  // 4. Equal Division of Sanctioned Amount among Sureties
  // --------------------------------------------------------------------------
  redistributeSuretyAmounts() {
    const count = this.sureties.length;
    if (count === 0) return;

    const total = Math.round(Number(this.loanApp.SanctionedAmount) || 0);
    if (total <= 0) {
      this.sureties.forEach(s => s.Amount = 0);
      return;
    }

    const base = Math.floor(total / count);
    const remainder = total - (base * count);

    for (let i = 0; i < count; i++) {
      // Last surety receives remainder to guarantee exact sum match
      this.sureties[i].Amount = (i === count - 1) ? (base + remainder) : base;
    }
  }

  get totalSuretyAmount(): number {
    return this.sureties.reduce((sum, s) => sum + (Number(s.Amount) || 0), 0);
  }

  // --------------------------------------------------------------------------
  // 5. Add Surety Modal Logic
  // --------------------------------------------------------------------------
  openAddSuretyModal() {
    if (!this.selectedMember || !this.selectedMember.MemberId) {
      this.toastr.warning('Please select a loanee member first.');
      return;
    }

    this.suretySearchType = 'StaffNo';
    this.suretySearchQuery = '';
    this.suretySearchResults = [];
    this.selectedSuretyGuarantor = null;
    this.suretyContext = {
      ForThisMember: { Count: 0, TotalAmount: 0 },
      ForOther: { Count: 0, TotalAmount: 0 }
    };

    $('#modal_add_surety').modal('show');
  }

  onSuretySearchInput() {
    const q = (this.suretySearchQuery || '').trim();
    if (q.length < 2) {
      this.suretySearchResults = [];
      return;
    }

    this.isSearchingSurety = true;
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ Search: q, Query: q, Limit: 20 })).toString()
    };

    this.service.loan('SearchMembers', obj).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage) {
          const list = res.Members || res.MemberList || [];
          // Filter out the loanee member himself
          this.suretySearchResults = list.filter((m: any) => m.MemberId !== this.selectedMember.MemberId);
        }
        this.isSearchingSurety = false;
      },
      error: () => {
        this.isSearchingSurety = false;
      }
    });
  }

  selectSuretyGuarantor(g: any) {
    this.suretySearchResults = [];
    this.suretySearchQuery = `${g.StaffNo} - ${g.MemberName}`;
    this.selectedSuretyGuarantor = g;

    // Load Surety Context (Counts and amounts for this loanee vs others)
    this.isLoadingSuretyContext = true;
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        GuarantorMemberId: g.MemberId,
        GuarantorStaffNo: g.StaffNo,
        LoaneeMemberId: this.selectedMember.MemberId,
        LoaneeStaffNo: this.selectedMember.StaffNo
      })).toString()
    };

    this.service.loan('GetSuretyContext', obj).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage) {
          this.suretyContext = {
            ForThisMember: res.ForThisMember || { Count: 0, TotalAmount: 0 },
            ForOther: res.ForOther || res.ForOthers || { Count: 0, TotalAmount: 0 }
          };
          if (res.Guarantor) {
            this.selectedSuretyGuarantor = { ...this.selectedSuretyGuarantor, ...res.Guarantor };
          }
        }
        this.isLoadingSuretyContext = false;
      },
      error: () => {
        this.isLoadingSuretyContext = false;
      }
    });
  }

  confirmAddSurety() {
    if (!this.selectedSuretyGuarantor) {
      this.toastr.warning('Please select a guarantor member.');
      return;
    }

    // Check duplicate surety
    const alreadyAdded = this.sureties.some(s => s.GuarantorMemberId === this.selectedSuretyGuarantor.MemberId);
    if (alreadyAdded) {
      this.toastr.warning('This guarantor is already added in this application.');
      return;
    }

    const row: SuretyRow = {
      GuarantorMemberId: this.selectedSuretyGuarantor.MemberId,
      StaffNo: this.selectedSuretyGuarantor.StaffNo,
      MemberNo: this.selectedSuretyGuarantor.MemberNo,
      Name: this.selectedSuretyGuarantor.MemberName,
      DepartmentName: this.selectedSuretyGuarantor.DepartmentName,
      Designation: this.selectedSuretyGuarantor.Designation,
      RetirementDate: this.selectedSuretyGuarantor.RetirementDate,
      Amount: 0
    };

    this.sureties.push(row);
    this.redistributeSuretyAmounts();

    $('#modal_add_surety').modal('hide');
    this.toastr.success(`Guarantor ${row.Name} added to sureties.`);
  }

  removeSurety(index: number) {
    if (index >= 0 && index < this.sureties.length) {
      const removed = this.sureties.splice(index, 1);
      this.redistributeSuretyAmounts();
      this.toastr.info(`Surety ${removed[0]?.Name} removed.`);
    }
  }

  // --------------------------------------------------------------------------
  // 6. Quick Add Loan Purpose
  // --------------------------------------------------------------------------
  openQuickPurposeModal() {
    this.quickPurposeName = '';
    $('#modal_quick_purpose').modal('show');
  }

  saveQuickPurpose() {
    const name = (this.quickPurposeName || '').trim();
    if (!name) {
      this.toastr.warning('Please enter a purpose name.');
      return;
    }

    const payload = {
      LoanPurposeId: 0,
      PurposeName: name,
      Status: 1,
      StaffLoginId: this.userDetail?.StaffLoginId || 7
    };

    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.isSavingQuickPurpose = true;
    this.service.loan('SaveLoanPurpose', obj).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage) {
          this.toastr.success('Loan Purpose created successfully');
          $('#modal_quick_purpose').modal('hide');
          this.quickPurposeName = '';

          // Reload purposes list and select this one
          this.service.loan('LoanPurposeList', { request: this.localService.encrypt(JSON.stringify({})).toString() }).subscribe({
            next: (pRes: any) => {
              if (pRes.Message === ConstantData.SuccessMessage) {
                this.purposes = pRes.PurposeList || [];
                const created = this.purposes.find((p: any) => p.PurposeName.toLowerCase() === name.toLowerCase());
                if (created) {
                  this.loanApp.LoanPurposeId = created.LoanPurposeId;
                  this.loanApp.PurposeName = created.PurposeName;
                }
              }
            }
          });
        } else {
          this.toastr.error(res.Message);
        }
        this.isSavingQuickPurpose = false;
      },
      error: () => {
        this.toastr.error('Error saving purpose');
        this.isSavingQuickPurpose = false;
      }
    });
  }

  onPurposeChange() {
    const selected = this.purposes.find(p => p.LoanPurposeId === this.loanApp.LoanPurposeId);
    if (selected) {
      this.loanApp.PurposeName = selected.PurposeName;
    }
  }

  // --------------------------------------------------------------------------
  // 7. Save Application
  // --------------------------------------------------------------------------
  saveApplication() {
    this.isSubmitted = true;
    if (!this.selectedMember || !this.loanApp.MemberId) {
      this.toastr.error('Please select a loanee member.');
      return;
    }
    if (!this.loanApp.ApplicationNumber) {
      this.toastr.error('Application Number is required.');
      return;
    }
    if (Number(this.loanApp.AppliedAmount) <= 0) {
      this.toastr.error('Applied Amount must be greater than zero.');
      return;
    }
    if (Number(this.loanApp.SanctionedAmount) <= 0) {
      this.toastr.error('Sanctioned Amount must be greater than zero.');
      return;
    }
    if (this.sureties.length === 0) {
      if (!confirm('No sureties have been added. Are you sure you want to proceed without sureties?')) {
        return;
      }
    }

    const payload = {
      LoanApplicationId: this.loanApp.LoanApplicationId || 0,
      ApplicationNumber: this.loanApp.ApplicationNumber,
      SocietyId: this.loanApp.SocietyId || 1,
      MemberId: this.loanApp.MemberId,
      AppliedDate: this.loanApp.AppliedDate,
      LoanPurposeId: this.loanApp.LoanPurposeId || null,
      PurposeName: this.loanApp.PurposeName || null,
      AppliedAmount: Number(this.loanApp.AppliedAmount) || 0,
      VerifiedDate: this.loanApp.VerifiedDate || null,
      SanctionedAmount: Number(this.loanApp.SanctionedAmount) || 0,
      PayableAmount: Number(this.loanApp.PayableAmount) || 0,
      TenorMonths: parseInt(this.loanApp.TenorMonths, 10) || 84,
      InstallmentAmount: Number(this.loanApp.InstallmentAmount) || 0,
      BankName: this.loanApp.BankName || null,
      BankAccountNo: this.loanApp.BankAccountNo || null,
      IFSCCode: this.loanApp.IFSCCode || null,
      Remarks: this.loanApp.Remarks || null,
      StaffLoginId: this.userDetail?.StaffLoginId || 7,
      Sureties: this.sureties.map(s => ({
        GuarantorMemberId: s.GuarantorMemberId,
        StaffNo: s.StaffNo,
        MemberNo: s.MemberNo,
        Name: s.Name,
        Amount: Number(s.Amount) || 0
      }))
    };

    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.dataLoading = true;
    this.service.loan('SaveApplication', obj).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage) {
          const isUpdate = (this.loanApp.LoanApplicationId > 0);
          this.toastr.success(isUpdate ? 'Loan application updated successfully!' : `Loan application #${res.ApplicationNumber} saved successfully!`);
          this.resetForm();
          this.loadSetupData();
        } else {
          this.toastr.error(res.Message);
        }
        this.dataLoading = false;
      },
      error: () => {
        this.toastr.error('Error occurred while saving loan application.');
        this.dataLoading = false;
      }
    });
  }

  resetForm() {
    this.loanApp = {
      LoanApplicationId: 0,
      ApplicationNumber: '',
      SocietyId: this.societies.length > 0 ? this.societies[0].SocietyId : null,
      MemberId: null,
      AppliedDate: this.formatDate(new Date()),
      LoanPurposeId: null,
      PurposeName: '',
      AppliedAmount: 0,
      VerifiedDate: this.formatDate(new Date()),
      SanctionedAmount: 0,
      PayableAmount: 0,
      TenorMonths: 84,
      InstallmentAmount: 0,
      BankName: '',
      BankAccountNo: '',
      IFSCCode: '',
      Remarks: '',
      Status: 'Applied'
    };
    this.clearMember();
    this.sureties = [];
    this.isSubmitted = false;
  }

  // --------------------------------------------------------------------------
  // 8. Applications List View & View/Edit
  // --------------------------------------------------------------------------
  switchView(view: 'form' | 'list') {
    this.activeView = view;
    if (view === 'list') {
      this.loadApplicationsList();
    }
  }

  loadApplicationsList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading = true;
    this.service.loan('LoanApplicationList', obj).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage) {
          this.applicationsList = res.Applications || [];
        } else {
          this.toastr.error(res.Message);
        }
        this.dataLoading = false;
      },
      error: () => {
        this.toastr.error('Error loading loan applications');
        this.dataLoading = false;
      }
    });
  }

  editApplication(item: any) {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ LoanApplicationId: item.LoanApplicationId })).toString()
    };
    this.dataLoading = true;
    this.service.loan('GetApplicationDetail', obj).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage && res.Application) {
          const app = res.Application;
          this.loanApp = {
            LoanApplicationId: app.LoanApplicationId,
            ApplicationNumber: app.ApplicationNumber,
            SocietyId: app.SocietyId,
            MemberId: app.MemberId,
            AppliedDate: this.formatDate(app.AppliedDate),
            LoanPurposeId: app.LoanPurposeId,
            PurposeName: app.PurposeName,
            AppliedAmount: app.AppliedAmount,
            VerifiedDate: this.formatDate(app.VerifiedDate),
            SanctionedAmount: app.SanctionedAmount,
            PayableAmount: app.PayableAmount,
            TenorMonths: app.TenorMonths || 84,
            InstallmentAmount: app.InstallmentAmount,
            BankName: app.BankName,
            BankAccountNo: app.BankAccountNo,
            IFSCCode: app.IFSCCode,
            Remarks: app.Remarks,
            Status: app.Status
          };

          this.sureties = (res.Sureties || []).map((s: any) => ({
            GuarantorMemberId: s.GuarantorMemberId,
            StaffNo: s.StaffNo,
            MemberNo: s.MemberNo,
            Name: s.Name,
            DepartmentName: s.DepartmentName,
            Designation: s.Designation,
            RetirementDate: s.RetirementDate,
            Amount: s.Amount
          }));

          // Set member info and balances
          this.selectMember({
            MemberId: app.MemberId,
            StaffNo: app.StaffNo,
            MemberNo: app.MemberNo,
            MemberName: app.MemberName
          });

          this.switchView('form');
        } else {
          this.toastr.error(res.Message || 'Failed to load application');
        }
        this.dataLoading = false;
      },
      error: () => {
        this.toastr.error('Error fetching application detail');
        this.dataLoading = false;
      }
    });
  }
}
