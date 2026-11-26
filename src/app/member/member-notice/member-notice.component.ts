import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ConstantData } from '../../utils/constant-data';
import { LoadDataService } from '../../utils/load-data.service';
import { MemberPortalService } from '../services/member-portal.service';

declare var $: any;

@Component({
  selector: 'app-member-notice',
  templateUrl: './member-notice.component.html',
  styleUrls: ['./member-notice.component.css']
})
export class MemberNoticeComponent implements OnInit {
  isLoading: boolean = false;
  errorMessage: string = '';

  notices: any[] = [];
  selectedNotice: any = null;

  activeFilter: string = 'ALL'; // ALL | PERSONAL | UNREAD
  selectedCategory: string = '';
  categories: string[] = [];

  totalCount: number = 0;
  personalCount: number = 0;
  unreadCount: number = 0;

  constructor(
    private memberService: MemberPortalService,
    private loadData: LoadDataService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadNotices();
  }

  loadNotices(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.memberService.getMyNotices(this.activeFilter, this.selectedCategory).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res && res.Message === ConstantData.SuccessMessage) {
          this.notices = res.Notices || [];
          this.totalCount = res.TotalCount || 0;
          this.personalCount = res.PersonalCount || 0;
          this.unreadCount = res.UnreadCount || 0;
          if (res.Categories && res.Categories.length > 0) {
            this.categories = res.Categories;
          }
        } else {
          this.errorMessage = (res && res.Message) || 'Unable to load notices.';
          this.toastr.error(this.errorMessage);
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.Message || 'Failed to load notices.';
        this.toastr.error(this.errorMessage);
      }
    });
  }

  setFilter(mode: string): void {
    if (this.activeFilter === mode) return;
    this.activeFilter = mode;
    this.loadNotices();
  }

  onCategoryChange(): void {
    this.loadNotices();
  }

  openNoticeDetail(notice: any): void {
    this.selectedNotice = notice;
    $('#modal_member_notice_detail').modal('show');

    if (!notice.IsRead) {
      this.memberService.markNoticeAsRead(notice.NoticeId).subscribe({
        next: (res: any) => {
          if (res && res.Message === ConstantData.SuccessMessage) {
            notice.IsRead = true;
            this.unreadCount = typeof res.UnreadCount === 'number'
              ? res.UnreadCount
              : Math.max(0, this.unreadCount - 1);
            if (this.activeFilter === 'UNREAD') {
              this.notices = this.notices.filter(n => n.NoticeId !== notice.NoticeId);
            }
          }
        }
      });
    }
  }

  downloadAttachment(notice: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isLoading = true;
    this.memberService.downloadNoticeAttachment(notice.NoticeId).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res && res.Message === ConstantData.SuccessMessage && res.Base64Data) {
          this.loadData.openBase64File(res.FileName, res.ContentType, res.Base64Data);
        } else {
          this.toastr.error((res && res.Message) || 'Attachment is not available.');
        }
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Unable to download attachment.');
      }
    });
  }

  getPriorityLabel(priority: number): string {
    if (priority === 3) return 'Urgent';
    if (priority === 2) return 'Important';
    return 'Normal';
  }
}
