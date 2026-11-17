import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { ConstantData } from '../../utils/constant-data';
import { RequestModel } from '../../utils/interface';

export interface BankAccountItem {
  BankId: number;
  BankName: string;
  AccountNo: string;
  Branch: string;
  OpeningBalance: number;
  CurrentBalance: number;
}

export interface PendingVoucherItem {
  VoucherId: number;
  VoucherNumber: string;
  VoucherType: string;
  VoucherDate: string;
  Amount: number;
  Status: string;
  CreatedByName: string;
  Narration: string;
}

export interface MonthlyTrendItem {
  MonthIndex: number;
  MonthName: string;
  MonthCode: string;
  Collections: number;
  Disbursements: number;
}

export interface UpcomingRetirementItem {
  MemberId: number;
  StaffNo: string;
  MemberNo: string;
  MemberName: string;
  Designation: string;
  RetirementDate: string;
  DaysRemaining: number;
}

export interface DashboardSummary {
  FinancialYearName: string;
  YearId: number;
  SocietyName: string;
  SocietyRegNo: string;
  CurrentDate: string;
  TotalMembers: number;
  ActiveMembers: number;
  BslMembers: number;
  BpsclMembers: number;
  StaffMembers: number;
  EnrolledThisYear: number;
  CompulsoryDepositBalance: number;
  CdMemberCount: number;
  ShareCapitalBalance: number;
  ScMemberCount: number;
  TotalDeposits: number;
  TotalLoanOutstanding: number;
  LoanMemberCount: number;
  PendingLoanApps: number;
  BankAccounts: BankAccountItem[];
  CashInHand: number;
  TotalLiquidFunds: number;
  PendingVerificationCount: number;
  PendingPayments: number;
  PendingReceipts: number;
  PendingContras: number;
  PendingJournals: number;
  PendingVouchers: PendingVoucherItem[];
  RecentTransactions: PendingVoucherItem[];
  UpcomingRetirements: UpcomingRetirementItem[];
  MonthlyTrend: MonthlyTrendItem[];
  Message?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  dataLoading: boolean = false;
  lastRefreshed: string = '';
  selectedPeriod: string = 'Year';
  userDetail: any = null;
  summary: DashboardSummary | null = null;

  // Visual Breakdown Percentages
  cdPercent: number = 0;
  scPercent: number = 0;
  maxMonthlyAmount: number = 1;
  totalCollectionsFY: number = 0;
  totalDisbursementsFY: number = 0;

  constructor(
    private service: AppService,
    private localService: LocalService,
    private router: Router,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    try {
      this.userDetail = this.localService.getEmployeeDetail();
    } catch (e) {
      this.userDetail = null;
    }
    this.loadDashboard();
  }

  loadDashboard(period: string = 'Year'): void {
    this.selectedPeriod = period;
    const staffId = this.userDetail?.StaffLoginId || 7;

    const payload = {
      StaffLoginId: staffId,
      PeriodFilter: period
    };

    const req: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.dataLoading = true;
    this.service.dashboard('GetDashboardSummary', req).subscribe({
      next: (res: any) => {
        this.dataLoading = false;
        if (res && (res.Message === ConstantData.SuccessMessage || res.SocietyName)) {
          this.summary = res;
          this.computeMetrics();
          const now = new Date();
          this.lastRefreshed = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } else {
          this.toastr.error(res?.Message || 'Failed to load dashboard summary', 'Dashboard');
        }
      },
      error: (err: any) => {
        this.dataLoading = false;
        console.error('Error fetching dashboard summary', err);
        this.toastr.error('Network or server error loading dashboard', 'Dashboard');
      }
    });
  }

  private computeMetrics(): void {
    if (!this.summary) return;

    // 1. Deposits Breakdown
    const totalDep = Number(this.summary.TotalDeposits) || 0;
    const cd = Number(this.summary.CompulsoryDepositBalance) || 0;
    const sc = Number(this.summary.ShareCapitalBalance) || 0;

    if (totalDep > 0) {
      this.cdPercent = Math.round((cd / totalDep) * 1000) / 10;
      this.scPercent = Math.round((sc / totalDep) * 1000) / 10;
    } else {
      this.cdPercent = 0;
      this.scPercent = 0;
    }

    // 2. Monthly Trends Aggregates
    if (this.summary.MonthlyTrend && this.summary.MonthlyTrend.length > 0) {
      let maxVal = 0;
      let sumCol = 0;
      let sumDis = 0;

      for (const m of this.summary.MonthlyTrend) {
        const col = Number(m.Collections) || 0;
        const dis = Number(m.Disbursements) || 0;
        sumCol += col;
        sumDis += dis;
        if (col > maxVal) maxVal = col;
        if (dis > maxVal) maxVal = dis;
      }

      this.maxMonthlyAmount = maxVal > 0 ? maxVal : 1;
      this.totalCollectionsFY = sumCol;
      this.totalDisbursementsFY = sumDis;
    }
  }

  // Bar height percentage for trends chart
  getBarHeight(amount: number): number {
    if (!amount || this.maxMonthlyAmount <= 0) return 4; // minimum visual bar
    const pct = Math.round((amount / this.maxMonthlyAmount) * 100);
    return Math.max(pct, 4);
  }

  // Formatting helpers
  formatCompact(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(value)) return '₹0.00';
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (abs >= 10000000) {
      // Crores (1 Cr = 1,00,00,000)
      return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
    } else if (abs >= 100000) {
      // Lakhs (1 L = 1,00,000)
      return `${sign}₹${(abs / 100000).toFixed(2)} L`;
    } else if (abs >= 1000) {
      // Thousands
      return `${sign}₹${(abs / 1000).toFixed(1)} K`;
    }
    return `${sign}₹${abs.toFixed(2)}`;
  }

  formatCurrency(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(value)) return '₹0.00';
    return '₹' + Number(value).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  getVoucherBadgeClass(type: string | undefined): string {
    switch ((type || '').toUpperCase()) {
      case 'PAYMENT':
        return 'badge-payment';
      case 'RECEIPT':
        return 'badge-receipt';
      case 'CONTRA':
        return 'badge-contra';
      case 'JOURNAL':
        return 'badge-journal';
      default:
        return 'badge-secondary';
    }
  }

  getRetirementBadgeClass(days: number): string {
    if (days <= 15) return 'badge-retire-urgent';
    if (days <= 45) return 'badge-retire-warning';
    return 'badge-retire-info';
  }

  // Navigation Methods
  navigateTo(path: string, queryParams?: any): void {
    if (queryParams) {
      this.router.navigate([path], { queryParams });
    } else {
      this.router.navigate([path]);
    }
  }

  openMemberPassbook(member: UpcomingRetirementItem): void {
    if (member && member.StaffNo) {
      this.router.navigate(['/admin/member-passbook'], {
        queryParams: { staffNo: member.StaffNo }
      });
    } else {
      this.router.navigate(['/admin/member-passbook']);
    }
  }

  openVerification(): void {
    this.router.navigate(['/admin/verify-transactions']);
  }
}
