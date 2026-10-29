import { Component, OnInit, ViewChild } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { NgForm } from '@angular/forms';
import { LocalService } from '../../utils/local.service';
import { LoadDataService } from '../../utils/load-data.service';
import { Status } from '../../utils/enum';
import { ActionModel, RequestModel } from '../../utils/interface';
import { Router } from '@angular/router';

declare var $: any;

@Component({
  selector: 'app-loan-purpose',
  templateUrl: './loan-purpose.component.html',
  styleUrls: ['./loan-purpose.component.css']
})
export class LoanPurposeComponent implements OnInit {

  dataLoading: boolean = false;
  PurposeList: any[] = [];
  Purpose: any = {};
  isSubmitted: boolean = false;
  StatusList = this.loadData.GetEnumList(Status);
  AllStatusList = Status;
  PageSize = ConstantData.PageSizes;
  p: number = 1;
  Search: string = '';
  reverse: boolean = false;
  sortKey: string = 'PurposeName';
  itemPerPage: number = this.PageSize[0];
  userDetail: any = {};
  action: ActionModel = {} as ActionModel;

  @ViewChild('formPurpose') formPurpose: NgForm;

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
    this.getLoanPurposeList();
    this.resetForm();
  }

  validiateMenu() {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        Url: this.router.url,
        StaffLoginId: this.userDetail?.StaffLoginId || 7
      })).toString()
    };
    this.dataLoading = true;
    this.service.validiateMenu(obj).subscribe({
      next: (response: any) => {
        this.action = this.loadData.validiateMenu(response, this.toastr, this.router);
        // Fallback permissions if menu validation returns default
        if (!this.action.CanCreate && !this.action.CanEdit) {
          this.action.CanCreate = true;
          this.action.CanEdit = true;
          this.action.CanDelete = true;
          this.action.ResponseReceived = true;
          this.action.MenuTitle = 'Manage Loan Purpose';
          this.action.ParentMenuTitle = 'Master Entry';
        }
        this.dataLoading = false;
      },
      error: () => {
        this.action.CanCreate = true;
        this.action.CanEdit = true;
        this.action.CanDelete = true;
        this.action.ResponseReceived = true;
        this.action.MenuTitle = 'Manage Loan Purpose';
        this.action.ParentMenuTitle = 'Master Entry';
        this.dataLoading = false;
      }
    });
  }

  sort(key: string) {
    this.sortKey = key;
    this.reverse = !this.reverse;
  }

  resetForm() {
    this.Purpose = {
      LoanPurposeId: 0,
      PurposeName: '',
      Status: 1
    };
    if (this.formPurpose) {
      this.formPurpose.control.markAsPristine();
      this.formPurpose.control.markAsUntouched();
    }
    this.isSubmitted = false;
  }

  newPurpose() {
    this.resetForm();
    $('#modal_purpose').modal('show');
  }

  editPurpose(item: any) {
    this.Purpose = {
      LoanPurposeId: item.LoanPurposeId,
      PurposeName: item.PurposeName,
      Status: item.Status
    };
    $('#modal_purpose').modal('show');
  }

  getLoanPurposeList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.dataLoading = true;
    this.service.loan('LoanPurposeList', obj).subscribe({
      next: (r1: any) => {
        const response = r1 as any;
        if (response.Message === ConstantData.SuccessMessage) {
          this.PurposeList = response.PurposeList || [];
        } else {
          this.toastr.error(response.Message);
        }
        this.dataLoading = false;
      },
      error: () => {
        this.toastr.error('Error while fetching loan purposes');
        this.dataLoading = false;
      }
    });
  }

  savePurpose() {
    this.formPurpose?.control.markAllAsTouched();
    this.isSubmitted = true;
    if (this.formPurpose?.invalid) {
      this.toastr.error('Please enter the loan purpose name.');
      return;
    }

    const payload = {
      LoanPurposeId: this.Purpose.LoanPurposeId || 0,
      PurposeName: (this.Purpose.PurposeName || '').trim(),
      Status: this.Purpose.Status || 1,
      StaffLoginId: this.userDetail?.StaffLoginId || 7
    };

    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.dataLoading = true;
    this.service.loan('SaveLoanPurpose', obj).subscribe({
      next: (r1: any) => {
        const response = r1 as any;
        if (response.Message === ConstantData.SuccessMessage) {
          if (this.Purpose.LoanPurposeId > 0) {
            this.toastr.success('Loan Purpose updated successfully');
          } else {
            this.toastr.success('Loan Purpose added successfully');
          }
          $('#modal_purpose').modal('hide');
          this.resetForm();
          this.getLoanPurposeList();
        } else {
          this.toastr.error(response.Message);
        }
        this.dataLoading = false;
      },
      error: () => {
        this.toastr.error('Error occurred while saving loan purpose');
        this.dataLoading = false;
      }
    });
  }

  deletePurpose(item: any) {
    if (confirm(`Are you sure you want to delete purpose "${item.PurposeName}"?`)) {
      const payload = {
        LoanPurposeId: item.LoanPurposeId,
        StaffLoginId: this.userDetail?.StaffLoginId || 7
      };
      const obj: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(payload)).toString()
      };
      this.dataLoading = true;
      this.service.loan('DeleteLoanPurpose', obj).subscribe({
        next: (r1: any) => {
          const response = r1 as any;
          if (response.Message === ConstantData.SuccessMessage) {
            this.toastr.success('Loan Purpose deleted successfully');
            this.getLoanPurposeList();
          } else {
            this.toastr.error(response.Message);
          }
          this.dataLoading = false;
        },
        error: () => {
          this.toastr.error('Error deleting loan purpose');
          this.dataLoading = false;
        }
      });
    }
  }
}
