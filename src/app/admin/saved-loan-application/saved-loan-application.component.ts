import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { LoadDataService } from '../../utils/load-data.service';
import { ConstantData } from '../../utils/constant-data';
import { ActionModel, RequestModel } from '../../utils/interface';

declare var $: any;

@Component({
  selector: 'app-saved-loan-application',
  templateUrl: './saved-loan-application.component.html',
  styleUrls: ['./saved-loan-application.component.css']
})
export class SavedLoanApplicationComponent implements OnInit {
  dataLoading: boolean = false;
  applicationsList: any[] = [];
  listSearch: string = '';
  listPage: number = 1;
  listPageSize: number = 10;
  pageSizeOptions = ConstantData.PageSizes;

  // View modal state
  selectedAppDetail: any = null;
  selectedSureties: any[] = [];
  selectedMemberBalances: any = { ShareBalance: 0, LoanBalance: 0 };
  isLoadingDetail: boolean = false;

  userDetail: any = {};
  action: ActionModel = {} as ActionModel;

  constructor(
    private service: AppService,
    private localService: LocalService,
    private loadData: LoadDataService,
    private toastr: ToastrService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.userDetail = this.localService.getEmployeeDetail();
    this.validiateMenu();
    this.loadApplicationsList();
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
      },
      error: () => {
        // Fallback default permissions
        this.action = { CanCreate: true, CanEdit: true, CanDelete: true } as ActionModel;
      }
    });
  }

  loadApplicationsList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading = true;
    this.service.loan('LoanApplicationList', obj).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage) {
          this.applicationsList = res.Applications || res.Rows || [];
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

  newApplication() {
    this.router.navigate(['/admin/loan-application']);
  }

  editApplication(item: any) {
    if ($('#modal_view_loan_application').length) {
      $('#modal_view_loan_application').modal('hide');
    }
    const id = item?.LoanApplicationId || item?.LoanApplicationId;
    this.router.navigate(['/admin/loan-application'], { queryParams: { id: id } });
  }

  viewApplication(item: any) {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ LoanApplicationId: item.LoanApplicationId })).toString()
    };
    this.isLoadingDetail = true;
    this.selectedAppDetail = null;
    this.selectedSureties = [];

    this.service.loan('GetApplicationDetail', obj).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage && res.Application) {
          this.selectedAppDetail = res.Application;
          this.selectedSureties = res.Sureties || [];

          // Also fetch live share & loan balance for loanee member
          if (this.selectedAppDetail.MemberId) {
            this.fetchMemberBalances(this.selectedAppDetail.MemberId, this.selectedAppDetail.StaffNo, this.selectedAppDetail.MemberNo);
          }

          $('#modal_view_loan_application').modal('show');
        } else {
          this.toastr.error(res.Message || 'Failed to fetch application details');
        }
        this.isLoadingDetail = false;
      },
      error: () => {
        this.toastr.error('Error fetching application details');
        this.isLoadingDetail = false;
      }
    });
  }

  private fetchMemberBalances(memberId: number, staffNo: any, memberNo: any) {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        MemberId: memberId,
        StaffNo: staffNo,
        MemberNo: memberNo
      })).toString()
    };
    this.service.loan('GetMemberLoanContext', obj).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage) {
          this.selectedMemberBalances = {
            ShareBalance: res.ShareBalance || 0,
            LoanBalance: res.LoanBalance || 0
          };
          if (res.Member) {
            // Enrich with any extra fields
            if (!this.selectedAppDetail.Department && res.Member.Department) {
              this.selectedAppDetail.Department = res.Member.Department;
            }
            if (!this.selectedAppDetail.Designation && res.Member.Designation) {
              this.selectedAppDetail.Designation = res.Member.Designation;
            }
            if (!this.selectedAppDetail.MobileNo && res.Member.MobileNo) {
              this.selectedAppDetail.MobileNo = res.Member.MobileNo;
            }
            if (!this.selectedAppDetail.RetirementDate && res.Member.RetirementDate) {
              this.selectedAppDetail.RetirementDate = res.Member.RetirementDate;
            }
            this.selectedAppDetail.FatherName = res.Member.FatherName || '';
            this.selectedAppDetail.HusbandName = res.Member.HusbandName || '';
            this.selectedAppDetail.GuardianType = res.Member.GuardianType || 1;
          }
        }
      }
    });
  }

  getTotalSuretyAmount(): number {
    return (this.selectedSureties || []).reduce((sum, s) => sum + (Number(s.Amount) || 0), 0);
  }

  printModal() {
    window.print();
  }
}
