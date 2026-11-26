import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { ConstantData } from '../../utils/constant-data';
import { MemberLoginDetailModel } from '../../utils/interface';
import { LocalService } from '../../utils/local.service';
import { MemberPortalService } from '../services/member-portal.service';

@Component({
  selector: 'app-member-master',
  templateUrl: './member-master.component.html',
  styleUrls: ['./member-master.component.css']
})
export class MemberMasterComponent implements OnInit, OnDestroy {
  memberDetail: MemberLoginDetailModel = {} as MemberLoginDetailModel;
  company: any = {};
  imageUrl: string = ConstantData.getBaseUrl();
  noImageUrl: string = ConstantData.getNoImage();
  isLoggingOut: boolean = false;
  currentYear: number = new Date().getFullYear();
  unreadNoticeCount: number = 0;
  private unreadSub?: Subscription;

  constructor(
    private localService: LocalService,
    private memberService: MemberPortalService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const detail = this.localService.getMemberDetail();
    if (!detail) {
      this.localService.clearMemberSession();
      this.router.navigate(['/member/login']);
      return;
    }
    this.memberDetail = detail;
    this.unreadSub = this.memberService.unreadNoticeCount$.subscribe(count => {
      this.unreadNoticeCount = count;
    });
    this.loadMeta();
    this.loadUnreadNotices();
  }

  ngOnDestroy(): void {
    if (this.unreadSub) {
      this.unreadSub.unsubscribe();
    }
  }

  loadMeta(): void {
    this.memberService.getLoginMeta().subscribe({
      next: (res: any) => {
        if (res && res.Message === ConstantData.SuccessMessage && res.Company) {
          this.company = res.Company;
        }
      },
      error: () => {}
    });
  }

  loadUnreadNotices(): void {
    this.memberService.getUnreadNoticeCount().subscribe({
      error: () => {}
    });
  }

  logOut(): void {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;

    this.memberService.logout().subscribe({
      next: () => this.finishLogout(),
      error: () => this.finishLogout()
    });
  }

  private finishLogout(): void {
    this.isLoggingOut = false;
    this.localService.clearMemberSession();
    this.toastr.info('You have been signed out safely.');
    this.router.navigate(['/member/login']);
  }
}
