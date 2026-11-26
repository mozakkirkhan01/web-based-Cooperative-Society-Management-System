import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LoadDataService } from '../../utils/load-data.service';
import { LocalService } from '../../utils/local.service';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';

declare var $: any;

@Component({
  selector: 'app-notice-master',
  templateUrl: './notice-master.component.html',
  styleUrls: ['./notice-master.component.css']
})
export class NoticeMasterComponent implements OnInit {
  dataLoading: boolean = false;
  isSubmitted: boolean = false;
  staffLogin: StaffLoginModel = {} as StaffLoginModel;
  action: ActionModel = {} as ActionModel;

  NoticeList: any[] = [];
  Categories: string[] = [];
  Priorities: any[] = [
    { Key: 1, Value: 'Normal' },
    { Key: 2, Value: 'Important' },
    { Key: 3, Value: 'Urgent' }
  ];

  // Form Model
  Notice: any = {};
  suggestedNoticeNo: string = '';
  defaultPublishDate: string = '';
  selectedTargets: any[] = [];

  // Quick-Add Notice Category (inline in modal)
  showQuickCategoryForm: boolean = false;
  quickCategoryName: string = '';
  isSavingQuickCategory: boolean = false;

  // View Notice Details Modal
  selectedViewNotice: any = null;

  // Member Autocomplete (when TargetType === 2)
  memberSearchQuery: string = '';
  memberSearchResults: any[] = [];
  isSearchingMember: boolean = false;
  private searchTimer: any = null;

  // Table Filters & Pagination
  Search: string = '';
  filterTargetType: number = 0;
  filterStatus: number = 0;
  p: number = 1;
  PageSize = ConstantData.PageSizes;
  itemPerPage: number = this.PageSize[0];

  @ViewChild('formNotice') formNotice: NgForm;
  @ViewChild('fileInput') fileInput: ElementRef<HTMLInputElement>;

  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private loadData: LoadDataService,
    private localService: LocalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.validiateMenu();
    this.loadSetup();
    this.getNoticeList();
  }

  validiateMenu(): void {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        Url: this.router.url,
        StaffLoginId: this.staffLogin?.StaffLoginId || 0
      })).toString()
    };

    this.service.validiateMenu(obj).subscribe({
      next: (response: any) => {
        this.action = this.loadData.validiateMenu(response, this.toastr, this.router);
      },
      error: () => {
        this.toastr.error('Unable to verify page permissions.');
      }
    });
  }

  loadSetup(): void {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        StaffLoginId: this.staffLogin?.StaffLoginId || 0
      })).toString()
    };

    this.service.notice('GetNoticeSetup', obj).subscribe({
      next: (res: any) => {
        if (res && res.Message === ConstantData.SuccessMessage) {
          this.suggestedNoticeNo = res.SuggestedNoticeNumber || '';
          this.defaultPublishDate = res.DefaultPublishDate || this.loadData.loadDateYMD(new Date()) || '';
          if (res.Categories && res.Categories.length > 0) {
            this.Categories = res.Categories;
          }
          if (res.Priorities && res.Priorities.length > 0) this.Priorities = res.Priorities;
          if (!this.Notice.NoticeId) {
            this.Notice.NoticeNumber = this.suggestedNoticeNo;
            if (!this.Notice.PublishDate) {
              this.Notice.PublishDate = this.defaultPublishDate;
            }
            if (!this.Notice.Category || !this.Categories.includes(this.Notice.Category)) {
              this.Notice.Category = this.getDefaultCategory();
            }
          } else if (this.Notice.Category && !this.Categories.includes(this.Notice.Category)) {
            this.Categories = [this.Notice.Category, ...this.Categories];
          }
        }
      }
    });
  }

  getNoticeList(): void {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        StaffLoginId: this.staffLogin?.StaffLoginId || 0,
        TargetType: this.filterTargetType || 0,
        Status: this.filterStatus || 0,
        Search: (this.Search || '').trim()
      })).toString()
    };

    this.dataLoading = true;
    this.service.notice('NoticeList', obj).subscribe({
      next: (res: any) => {
        this.dataLoading = false;
        if (res && res.Message === ConstantData.SuccessMessage) {
          this.NoticeList = res.NoticeList || [];
        } else {
          this.toastr.error((res && res.Message) || 'Error loading notices.');
        }
      },
      error: () => {
        this.dataLoading = false;
        this.toastr.error('Error connecting to server while loading notices.');
      }
    });
  }

  private getDefaultCategory(): string {
    if (this.Categories.includes('General Circular')) return 'General Circular';
    return this.Categories.length > 0 ? this.Categories[0] : '';
  }

  resetForm(): void {
    this.Notice = {
      NoticeId: 0,
      NoticeNumber: this.suggestedNoticeNo || '',
      TargetType: 1,
      Category: this.getDefaultCategory(),
      Priority: 1,
      Title: '',
      Message: '',
      PublishDate: this.defaultPublishDate || this.loadData.loadDateYMD(new Date()),
      ExpiryDate: '',
      IsPinned: false,
      Status: 1,
      HasAttachment: false,
      AttachmentBase64: '',
      AttachmentName: '',
      AttachmentExt: '',
      RemoveAttachment: false
    };
    this.selectedTargets = [];
    this.memberSearchQuery = '';
    this.memberSearchResults = [];
    this.closeQuickCategoryForm();
    this.isSubmitted = false;
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    if (this.formNotice) {
      this.formNotice.form.markAsPristine();
      this.formNotice.form.markAsUntouched();
    }
  }

  openNewNoticeModal(): void {
    this.loadSetup();
    this.resetForm();
    $('#modal_notice_form').modal('show');
  }

  editNotice(item: any): void {
    this.isSubmitted = false;
    const itemCategory = item.Category || this.getDefaultCategory();
    if (itemCategory && !this.Categories.includes(itemCategory)) {
      this.Categories = [itemCategory, ...this.Categories];
    }
    this.Notice = {
      NoticeId: item.NoticeId,
      NoticeNumber: item.NoticeNumber || '',
      TargetType: item.TargetType,
      Category: itemCategory,
      Priority: item.Priority || 1,
      Title: item.Title || '',
      Message: item.Message || '',
      PublishDate: this.loadData.loadDateYMD(item.PublishDate) || '',
      ExpiryDate: item.ExpiryDate ? (this.loadData.loadDateYMD(item.ExpiryDate) || '') : '',
      IsPinned: !!item.IsPinned,
      Status: item.Status || 1,
      HasAttachment: !!item.HasAttachment,
      AttachmentBase64: '',
      AttachmentName: item.AttachmentName || '',
      AttachmentExt: item.AttachmentType || '',
      RemoveAttachment: false
    };
    this.selectedTargets = (item.Targets || []).map((t: any) => ({
      MemberId: t.MemberId,
      StaffNo: t.StaffNo,
      MemberNo: t.MemberNo,
      MemberName: t.MemberName,
      DepartmentName: t.DepartmentName || ''
    }));
    this.memberSearchQuery = '';
    this.memberSearchResults = [];
    this.closeQuickCategoryForm();
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    $('#modal_notice_form').modal('show');
  }

  toggleQuickCategoryForm(): void {
    this.showQuickCategoryForm = !this.showQuickCategoryForm;
    if (!this.showQuickCategoryForm) {
      this.quickCategoryName = '';
    }
  }

  closeQuickCategoryForm(): void {
    this.showQuickCategoryForm = false;
    this.quickCategoryName = '';
  }

  saveQuickCategory(): void {
    const categoryName = (this.quickCategoryName || '').trim();
    if (!categoryName) {
      this.toastr.error('Please enter category name.');
      return;
    }

    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        NoticeCategoryId: 0,
        CategoryName: categoryName,
        Status: 1,
        StaffLoginId: this.staffLogin?.StaffLoginId || 0
      })).toString()
    };

    this.isSavingQuickCategory = true;
    this.service.notice('SaveNoticeCategory', obj).subscribe({
      next: (res: any) => {
        this.isSavingQuickCategory = false;
        if (res && res.Message === ConstantData.SuccessMessage) {
          const savedName = res.CategoryName || categoryName;
          if (res.Categories && res.Categories.length > 0) {
            this.Categories = res.Categories;
          } else if (!this.Categories.includes(savedName)) {
            this.Categories = [...this.Categories, savedName].sort();
          }
          this.Notice.Category = savedName;
          this.closeQuickCategoryForm();
          this.toastr.success('Notice category added successfully.');
        } else {
          this.toastr.error((res && res.Message) || 'Unable to add category.');
        }
      },
      error: () => {
        this.isSavingQuickCategory = false;
        this.toastr.error('Error occurred while adding category.');
      }
    });
  }

  onTargetTypeChange(): void {
    if (this.Notice.TargetType === 1) {
      this.memberSearchQuery = '';
      this.memberSearchResults = [];
    }
  }

  onMemberSearchInput(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    const q = (this.memberSearchQuery || '').trim();
    if (q.length < 2) {
      this.memberSearchResults = [];
      return;
    }

    this.searchTimer = setTimeout(() => {
      this.isSearchingMember = true;
      const obj: RequestModel = {
        request: this.localService.encrypt(JSON.stringify({ Search: q, Query: q, Limit: 15 })).toString()
      };
      this.service.loan('SearchMembers', obj).subscribe({
        next: (res: any) => {
          this.isSearchingMember = false;
          if (res && res.Message === ConstantData.SuccessMessage) {
            const list = res.Members || res.MemberList || [];
            this.memberSearchResults = list.filter((m: any) =>
              !this.selectedTargets.some(t => t.MemberId === m.MemberId)
            );
          } else {
            this.memberSearchResults = [];
          }
        },
        error: () => {
          this.isSearchingMember = false;
          this.memberSearchResults = [];
        }
      });
    }, 220);
  }

  addTargetMember(m: any): void {
    if (!m || !m.MemberId) return;
    if (!this.selectedTargets.some(t => t.MemberId === m.MemberId)) {
      this.selectedTargets.push({
        MemberId: m.MemberId,
        StaffNo: m.StaffNo,
        MemberNo: m.MemberNo,
        MemberName: m.MemberName,
        DepartmentName: m.DepartmentName || ''
      });
    }
    this.memberSearchQuery = '';
    this.memberSearchResults = [];
  }

  removeTargetMember(memberId: number): void {
    this.selectedTargets = this.selectedTargets.filter(t => t.MemberId !== memberId);
  }

  onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.toastr.error('Attachment size cannot exceed 5 MB.');
      input.value = '';
      return;
    }

    const ext = ConstantData.getFileExtension(file.name).toLowerCase();
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
    if (!allowed.includes(ext)) {
      this.toastr.error('Only PDF, PNG, JPG, and JPEG files are supported.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.Notice.AttachmentBase64 = reader.result as string;
      this.Notice.AttachmentName = file.name;
      this.Notice.AttachmentExt = ext;
      this.Notice.RemoveAttachment = false;
      this.Notice.HasAttachment = true;
    };
    reader.readAsDataURL(file);
  }

  removeAttachment(): void {
    this.Notice.AttachmentBase64 = '';
    this.Notice.AttachmentName = '';
    this.Notice.AttachmentExt = '';
    this.Notice.HasAttachment = false;
    this.Notice.RemoveAttachment = true;
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  saveNotice(): void {
    this.isSubmitted = true;
    if (this.formNotice && this.formNotice.invalid) {
      this.toastr.error('Please fill all required notice fields.');
      return;
    }

    if (Number(this.Notice.TargetType) === 2 && this.selectedTargets.length === 0) {
      this.toastr.error('Please select at least one recipient member.');
      return;
    }

    if (this.Notice.ExpiryDate && this.Notice.PublishDate && this.Notice.ExpiryDate < this.Notice.PublishDate) {
      this.toastr.error('Expiry date cannot be earlier than publish date.');
      return;
    }

    const payload = {
      NoticeId: this.Notice.NoticeId || 0,
      NoticeNumber: (this.Notice.NoticeNumber || '').trim(),
      TargetType: Number(this.Notice.TargetType),
      Category: this.Notice.Category,
      Priority: Number(this.Notice.Priority),
      Title: (this.Notice.Title || '').trim(),
      Message: (this.Notice.Message || '').trim(),
      PublishDate: this.Notice.PublishDate,
      ExpiryDate: this.Notice.ExpiryDate || null,
      IsPinned: !!this.Notice.IsPinned,
      Status: Number(this.Notice.Status),
      StaffLoginId: this.staffLogin.StaffLoginId,
      TargetMemberIds: Number(this.Notice.TargetType) === 2
        ? this.selectedTargets.map(t => t.MemberId)
        : [],
      AttachmentBase64: this.Notice.AttachmentBase64 || null,
      AttachmentName: this.Notice.AttachmentName || null,
      AttachmentExt: this.Notice.AttachmentExt || null,
      RemoveAttachment: !!this.Notice.RemoveAttachment
    };

    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.dataLoading = true;
    this.service.notice('SaveNotice', obj).subscribe({
      next: (res: any) => {
        this.dataLoading = false;
        if (res && res.Message === ConstantData.SuccessMessage) {
          this.toastr.success(
            payload.NoticeId > 0 ? 'Notice updated successfully.' : 'Notice published successfully.'
          );
          $('#modal_notice_form').modal('hide');
          this.loadSetup();
          this.getNoticeList();
        } else {
          this.toastr.error((res && res.Message) || 'Unable to save notice.');
        }
      },
      error: () => {
        this.dataLoading = false;
        this.toastr.error('Error occurred while saving notice.');
      }
    });
  }

  deleteNotice(item: any): void {
    if (!confirm(`Delete notice "${item.Title}"?`)) return;

    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        NoticeId: item.NoticeId,
        StaffLoginId: this.staffLogin.StaffLoginId
      })).toString()
    };

    this.dataLoading = true;
    this.service.notice('DeleteNotice', obj).subscribe({
      next: (res: any) => {
        this.dataLoading = false;
        if (res && res.Message === ConstantData.SuccessMessage) {
          this.toastr.success('Notice deleted.');
          this.getNoticeList();
        } else {
          this.toastr.error((res && res.Message) || 'Unable to delete notice.');
        }
      },
      error: () => {
        this.dataLoading = false;
        this.toastr.error('Error occurred while deleting notice.');
      }
    });
  }

  viewAttachment(item: any): void {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        NoticeId: item.NoticeId,
        StaffLoginId: this.staffLogin.StaffLoginId
      })).toString()
    };

    this.dataLoading = true;
    this.service.notice('AdminDownloadAttachment', obj).subscribe({
      next: (res: any) => {
        this.dataLoading = false;
        if (res && res.Message === ConstantData.SuccessMessage && res.Base64Data) {
          this.loadData.openBase64File(res.FileName, res.ContentType, res.Base64Data);
        } else {
          this.toastr.error((res && res.Message) || 'Attachment unavailable.');
        }
      },
      error: () => {
        this.dataLoading = false;
        this.toastr.error('Failed to download attachment.');
      }
    });
  }

  getPriorityLabel(priority: number): string {
    if (priority === 3) return 'Urgent';
    if (priority === 2) return 'Important';
    return 'Normal';
  }

  getPreviewTargets(item: any): any[] {
    return (item && item.Targets ? item.Targets : []).slice(0, 2);
  }

  viewNoticeDetails(item: any): void {
    this.selectedViewNotice = item;
    $('#modal_notice_view').modal('show');
  }

  editFromViewModal(): void {
    if (!this.selectedViewNotice) return;
    const noticeToEdit = this.selectedViewNotice;
    $('#modal_notice_view').modal('hide');
    setTimeout(() => {
      this.editNotice(noticeToEdit);
    }, 200);
  }
}
