import { Component, HostListener, Inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppService } from '../../utils/app.service';
declare var $: any;
import { LocalService } from "../../utils/local.service";
import { ConstantData } from "../../utils/constant-data";
import { ToastrService } from 'ngx-toastr';
import { Status } from '../../utils/enum';
import { RequestModel, StaffLoginModel } from '../../utils/interface';
import { DOCUMENT } from '@angular/common';
import { NotificationService } from '../../utils/notification.service';

@Component({
  selector: 'app-admin-master',
  templateUrl: './admin-master.component.html'
})
export class AdminMasterComponent implements OnInit {
  isAccessReview = ConstantData.AccessReview;
  IsMenuShow = true;
  dataLoading: boolean = false;
  staffLogin: StaffLoginModel = {} as StaffLoginModel;
  imageUrl = this.service.getImageUrl();
  screenWidth: any;
  docElm: any;
  pendingCount = 0;
  pendingNotifications: any[] = [];

  constructor(
    @Inject(DOCUMENT) private document: any,
    private localService: LocalService,
    private router: Router,
    private service: AppService,
    private toastr: ToastrService,
    public notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.screenWidth = window.innerWidth;
    this.getUserMenuList();
    this.getCompanyList();
    this.docElm = this.document.documentElement;
    this.notificationService.pendingCount$.subscribe(count => {
      this.pendingCount = count;
    });
    this.notificationService.pendingNotifications$.subscribe(list => {
      this.pendingNotifications = list;
    });
    this.notificationService.refresh();
  }

  getNotificationIcon(txnType: string): string {
    const type = (txnType || '').toUpperCase();
    if (type === 'PAYMENT') return 'bi bi-arrow-up-circle-fill text-danger';
    if (type === 'RECEIPT') return 'bi bi-arrow-down-circle-fill text-success';
    if (type === 'TRANSFER') return 'bi bi-arrow-left-right text-primary';
    if (type === 'CONTRA') return 'bi bi-bank2 text-info';
    if (type === 'SCHEDULE') return 'bi bi-calendar2-week-fill text-warning';
    return 'bi bi-journal-check text-secondary';
  }

  openVerifyPage(item?: any) {
    if (item && item.VoucherId) {
      this.router.navigate(['/admin/verify-transactions'], { queryParams: { voucherId: item.VoucherId } });
    } else {
      this.router.navigate(['/admin/verify-transactions']);
    }
  }
  Company: any = {};
  getCompanyList() {
    var request: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ Status: Status.Active })).toString()
    }
    this.dataLoading = true
    this.service.getCompanyList(request).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        if (response.CompanyList.length != 0)
          this.Company = response.CompanyList[0];
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false
    }, (err => {
      this.toastr.error("Error while fetching records")
    }))
  }

  isFullScreen: boolean = false;
  fullScreen() {
    if (!this.isFullScreen) {
      if (this.docElm.requestFullscreen) {
        this.docElm.requestFullscreen();
      } else if (this.docElm.mozRequestFullScreen) {
        this.docElm.mozRequestFullScreen();
      } else if (this.docElm.webkitRequestFullScreen) {
        this.docElm.webkitRequestFullScreen();
      } else if (this.docElm.msRequestFullscreen) {
        this.docElm.msRequestFullscreen();
      }
      this.isFullScreen = true;
    } else {
      if (this.document.exitFullscreen) {
        this.document.exitFullscreen();
      } else if (this.document.webkitExitFullscreen) {
        this.document.webkitExitFullscreen();
      } else if (this.document.mozCancelFullScreen) {
        this.document.mozCancelFullScreen();
      } else if (this.document.msExitFullscreen) {
        this.document.msExitFullscreen();
      }
      this.isFullScreen = false;
    }
  }

  MenuList: any[] = [];
  getUserMenuList() {
    var request: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ StaffLoginId: this.staffLogin.StaffLoginId })).toString()
    }
    this.dataLoading = true
    this.service.getUserMenuList(request).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        this.MenuList = response.MenuList;
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false
    }, (err => {
      this.toastr.error("Error while fetching records")
    }))
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.screenWidth = window.innerWidth;

  }

  checkSideNav() {
    if (this.screenWidth <= 500) {
      this.hideSideBar();
    }
  }

  hideSideBar() {
    if (this.IsMenuShow) {
      $('body').addClass('toggle-sidebar');
      this.IsMenuShow = false;
    }
    else {
      $('body').removeClass('toggle-sidebar');
      this.IsMenuShow = true;
    }

  }

  logOut() {
    this.localService.removeEmployeeDetail();
    this.router.navigate(['/admin-login']);
  }

}
