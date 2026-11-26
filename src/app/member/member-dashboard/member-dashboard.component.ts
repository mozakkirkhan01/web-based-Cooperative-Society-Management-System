import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ConstantData } from '../../utils/constant-data';
import { MemberPortalService } from '../services/member-portal.service';

@Component({
  selector: 'app-member-dashboard',
  templateUrl: './member-dashboard.component.html',
  styleUrls: ['./member-dashboard.component.css']
})
export class MemberDashboardComponent implements OnInit {
  isLoading: boolean = false;
  errorMessage: string = '';

  member: any = null;
  balances: any[] = [];
  lastLoan: any = null;
  modernLoans: any[] = [];
  recoveries: any = null;
  settlement: any = null;

  selectedYearId: number = 0;
  financialYearName: string = '';
  financialYears: any[] = [];

  selectedDetailTab: string = 'Loan Recoveries';
  detailTabs: string[] = ['Loan Recoveries', 'CD Recoveries', 'RD Recoveries', 'Guaranteed By Me'];

  recentNotices: any[] = [];
  unreadNoticeCount: number = 0;

  constructor(
    private memberService: MemberPortalService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.loadRecentNotices();
  }

  loadRecentNotices(): void {
    this.memberService.getUnreadNoticeCount().subscribe({
      next: (res: any) => {
        if (res && res.Message === ConstantData.SuccessMessage) {
          this.recentNotices = res.RecentNotices || [];
          this.unreadNoticeCount = res.UnreadCount || 0;
        }
      },
      error: () => {}
    });
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.memberService.getMyDashboard(this.selectedYearId).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res && res.Message === ConstantData.SuccessMessage) {
          this.member = res.Member;
          this.balances = res.Balances || [];
          this.lastLoan = res.LastLoan || null;
          this.modernLoans = res.ModernLoans || [];
          this.recoveries = res.Recoveries || null;
          this.settlement = res.Settlement || null;
          if (res.FinancialYears && res.FinancialYears.length > 0) {
            this.financialYears = res.FinancialYears;
          }
          if (res.YearId) {
            this.selectedYearId = res.YearId;
          }
          if (res.FinancialYearName) {
            this.financialYearName = res.FinancialYearName;
          }
        } else {
          this.errorMessage = (res && res.Message) ? res.Message : 'Unable to load dashboard.';
          this.toastr.error(this.errorMessage);
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.Message || 'Failed to load dashboard data.';
        this.toastr.error(this.errorMessage);
      }
    });
  }

  onYearChange(): void {
    this.loadDashboard();
  }

  getHeadBalance(headCode: string, keyword: string): { amount: number; type: string } {
    const match = (this.balances || []).find(b =>
      b.HeadCode === headCode ||
      (b.HeadName && b.HeadName.toUpperCase().includes(keyword.toUpperCase()))
    );
    return match
      ? { amount: Number(match.Balance) || 0, type: match.BalanceType || '' }
      : { amount: 0, type: '' };
  }

  getTotalGuaranteed(): number {
    const list = this.recoveries?.SuretyList || [];
    return list.reduce((sum: number, item: any) => sum + (Number(item.Amount) || 0), 0);
  }

  getActiveRecoveryRows(): any[] {
    if (!this.recoveries) return [];
    if (this.selectedDetailTab === 'Loan Recoveries') return this.recoveries.LoanRecoveries || [];
    if (this.selectedDetailTab === 'CD Recoveries') return this.recoveries.CdRecoveries || [];
    if (this.selectedDetailTab === 'RD Recoveries') return this.recoveries.RdRecoveries || [];
    return [];
  }
}
