import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { STATUS_OPTIONS } from '../../utils/constants';
import { Status } from '../../utils/enum';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { LoadDataService } from '../../utils/load-data.service';
import { LocalService } from '../../utils/local.service';

declare var $: any;

@Component({
  selector: 'app-notice-category',
  templateUrl: './notice-category.component.html',
  styleUrls: ['./notice-category.component.css']
})
export class NoticeCategoryComponent implements OnInit {
  dataLoading: boolean = false;
  NoticeCategoryList: any[] = [];
  NoticeCategory: any = {};
  isSubmitted: boolean = false;
  StatusList = STATUS_OPTIONS;
  AllStatusList = Status;
  PageSize = ConstantData.PageSizes;
  p: number = 1;
  Search: string = '';
  reverse: boolean = false;
  sortKey: string = 'CategoryName';
  itemPerPage: number = this.PageSize[0];
  staffLogin: StaffLoginModel = {} as StaffLoginModel;
  action: ActionModel = {} as ActionModel;

  @ViewChild('formNoticeCategory') formNoticeCategory: NgForm;

  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private localService: LocalService,
    private loadData: LoadDataService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.validiateMenu();
    this.getNoticeCategoryList();
    this.resetForm();
  }

  validiateMenu(): void {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        Url: this.router.url,
        StaffLoginId: this.staffLogin?.StaffLoginId || 0
      })).toString()
    };

    this.dataLoading = true;
    this.service.validiateMenu(obj).subscribe({
      next: (response: any) => {
        this.action = this.loadData.validiateMenu(response, this.toastr, this.router);
        this.dataLoading = false;
      },
      error: () => {
        this.toastr.error('Unable to verify page permissions.');
        this.dataLoading = false;
      }
    });
  }

  sort(key: string): void {
    this.sortKey = key;
    this.reverse = !this.reverse;
  }

  onTableDataChange(p: number): void {
    this.p = p;
  }

  resetForm(): void {
    this.NoticeCategory = {
      NoticeCategoryId: 0,
      CategoryName: '',
      Status: Status.Active
    };
    if (this.formNoticeCategory) {
      this.formNoticeCategory.control.markAsPristine();
      this.formNoticeCategory.control.markAsUntouched();
    }
    this.isSubmitted = false;
  }

  newNoticeCategory(): void {
    this.resetForm();
    $('#modal_popup').modal('show');
  }

  editNoticeCategory(item: any): void {
    this.resetForm();
    this.NoticeCategory = {
      NoticeCategoryId: item.NoticeCategoryId,
      CategoryName: item.CategoryName,
      Status: item.Status
    };
    $('#modal_popup').modal('show');
  }

  getNoticeCategoryList(): void {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        StaffLoginId: this.staffLogin?.StaffLoginId || 0,
        NoticeCategoryId: 0,
        Status: 0
      })).toString()
    };

    this.dataLoading = true;
    this.service.notice('NoticeCategoryList', obj).subscribe({
      next: (res: any) => {
        this.dataLoading = false;
        if (res && res.Message === ConstantData.SuccessMessage) {
          this.NoticeCategoryList = res.NoticeCategoryList || [];
        } else {
          this.toastr.error((res && res.Message) || 'Error while fetching records');
        }
      },
      error: () => {
        this.dataLoading = false;
        this.toastr.error('Error while fetching records');
      }
    });
  }

  saveNoticeCategory(): void {
    this.isSubmitted = true;
    if (this.formNoticeCategory) {
      this.formNoticeCategory.control.markAllAsTouched();
      if (this.formNoticeCategory.invalid) {
        this.toastr.error('Fill all the required fields !!');
        return;
      }
    }

    const categoryName = (this.NoticeCategory.CategoryName || '').trim();
    if (!categoryName) {
      this.toastr.error('Category name is required.');
      return;
    }

    const payload = {
      NoticeCategoryId: this.NoticeCategory.NoticeCategoryId || 0,
      CategoryName: categoryName,
      Status: Number(this.NoticeCategory.Status) || Status.Active,
      StaffLoginId: this.staffLogin?.StaffLoginId || 0
    };

    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.dataLoading = true;
    this.service.notice('SaveNoticeCategory', obj).subscribe({
      next: (res: any) => {
        this.dataLoading = false;
        if (res && res.Message === ConstantData.SuccessMessage) {
          if (payload.NoticeCategoryId > 0) {
            this.toastr.success('Notice category updated successfully.');
            $('#modal_popup').modal('hide');
          } else {
            this.toastr.success('Notice category added successfully.');
            $('#modal_popup').modal('hide');
          }
          this.resetForm();
          this.getNoticeCategoryList();
        } else {
          this.toastr.error((res && res.Message) || 'Unable to save notice category.');
        }
      },
      error: () => {
        this.dataLoading = false;
        this.toastr.error('Error occurred while submitting data');
      }
    });
  }

  deleteNoticeCategory(item: any): void {
    if (!confirm(`Are you sure you want to delete "${item.CategoryName}"?`)) {
      return;
    }

    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        NoticeCategoryId: item.NoticeCategoryId,
        StaffLoginId: this.staffLogin?.StaffLoginId || 0
      })).toString()
    };

    this.dataLoading = true;
    this.service.notice('DeleteNoticeCategory', obj).subscribe({
      next: (res: any) => {
        this.dataLoading = false;
        if (res && res.Message === ConstantData.SuccessMessage) {
          this.toastr.success('Record deleted successfully');
          this.getNoticeCategoryList();
        } else {
          this.toastr.error((res && res.Message) || 'Unable to delete record');
        }
      },
      error: () => {
        this.dataLoading = false;
        this.toastr.error('Error occurred while deleting the record');
      }
    });
  }
}
