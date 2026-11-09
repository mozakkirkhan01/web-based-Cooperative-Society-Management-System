import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { ConstantData } from '../../utils/constant-data';
import { RequestModel } from '../../utils/interface';

declare var $: any;

@Component({
  selector: 'app-member-info',
  templateUrl: './member-info.component.html',
  styleUrls: ['./member-info.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class MemberInfoComponent implements OnInit {
  searchQuery: string = '';
  isLoading: boolean = false;

  // Member Autocomplete Search
  memberSearchResults: any[] = [];
  isSearchingMember: boolean = false;

  member: any = null;
  balances: any[] = [];
  lastLoan: any = null;
  recoveries: any = null;
  settlement: any = null;

  selectedDetailView: string = 'Loan Recoveries';
  detailViewOptions: string[] = ['Surety List', 'Loan Recoveries', 'CD Recoveries', 'RD Recoveries'];

  // Financial Year Selection
  selectedYearId: number = (new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1);
  financialYearName: string = `${this.selectedYearId}-${String((this.selectedYearId + 1) % 100).padStart(2, '0')}`;
  financialYears: any[] = [];

  get isCurrentFinancialYear(): boolean {
    if (!this.financialYears || this.financialYears.length === 0) return true;
    const match = this.financialYears.find((f: any) => f.YearId === this.selectedYearId);
    return match ? !!match.IsCurrent : false;
  }

  constructor(
    private service: AppService,
    private localService: LocalService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const qStaff = this.route.snapshot.queryParams['staffNo'] || this.route.snapshot.queryParams['id'];
    if (qStaff && qStaff.trim()) {
      this.searchQuery = qStaff.trim();
      this.fetchMemberInfo();
    }
  }

  onSearchInput(): void {
    const q = (this.searchQuery || '').trim();
    if (q.length < 2) {
      this.memberSearchResults = [];
      return;
    }

    this.isSearchingMember = true;
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ Search: q, Query: q, Limit: 15 })).toString()
    };

    this.service.loan('SearchMembers', obj).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage) {
          this.memberSearchResults = res.Members || res.MemberList || [];
        } else {
          this.memberSearchResults = [];
        }
        this.isSearchingMember = false;
      },
      error: () => {
        this.isSearchingMember = false;
        this.memberSearchResults = [];
      }
    });
  }

  selectMemberSuggestion(m: any, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.memberSearchResults = [];
    this.searchQuery = `${m.StaffNo} - ${m.MemberName}`;
    this.fetchMemberInfo(m.MemberId);
  }

  onSearchButtonClick(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.memberSearchResults = [];
    this.fetchMemberInfo();
  }

  clearSearch(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.searchQuery = '';
    this.member = null;
    this.balances = [];
    this.lastLoan = null;
    this.recoveries = null;
    this.settlement = null;
    this.memberSearchResults = [];
  }

  onBlur(): void {
    setTimeout(() => {
      this.memberSearchResults = [];
    }, 250);
  }

  fetchMemberInfo(memberId?: number): void {
    this.memberSearchResults = [];

    // If searching by text query, strip extra labels like '805129 - SUMITRA KUMARI' -> '805129'
    let cleanQuery = (this.searchQuery || '').trim();
    if (cleanQuery.includes(' - ')) {
      cleanQuery = cleanQuery.split(' - ')[0].trim();
    }

    if (!memberId && (!cleanQuery || !cleanQuery.trim())) {
      this.toastr.warning('Please enter a Staff No, Member No, or Member Name.');
      return;
    }

    this.isLoading = true;
    const payload: any = {
      YearId: this.selectedYearId || 0
    };

    if (memberId && memberId > 0) {
      payload.MemberId = memberId;
    } else {
      payload.Query = cleanQuery;
    }

    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.service.getMemberInfoDetails(obj).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.Message === ConstantData.SuccessMessage) {
          this.member = res.Member;
          this.balances = res.Balances || [];
          this.lastLoan = res.LastLoan;
          this.recoveries = res.Recoveries;
          this.settlement = res.Settlement;
          if (res.FinancialYears && res.FinancialYears.length > 0) {
            this.financialYears = res.FinancialYears;
          }
          if (res.FinancialYearName) {
            this.financialYearName = res.FinancialYearName;
          }
          if (res.YearId) {
            this.selectedYearId = res.YearId;
          }
          if (this.member) {
            this.searchQuery = `${this.member.StaffNo} - ${this.member.MemberName}`;
          }
        } else {
          this.toastr.error(res.Message || 'Member information not found.');
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toastr.error(err?.error?.Message || 'An error occurred while retrieving member details.');
      }
    });
  }

    onYearChange(): void {
    if (this.member) {
      this.fetchMemberInfo(this.member.MemberId);
    } else {
      this.fetchMemberInfo();
    }
  }

  onSearchKey(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      if (this.memberSearchResults && this.memberSearchResults.length === 1) {
        this.selectMemberSuggestion(this.memberSearchResults[0]);
      } else {
        this.memberSearchResults = [];
        this.fetchMemberInfo();
      }
    } else if (event.key === 'Escape') {
      this.memberSearchResults = [];
    }
  }

  getTotalSuretyAmount(sureties: any[]): number {
    return (sureties || []).reduce((acc: number, item: any) => acc + (Number(item.Amount) || 0), 0);
  }

  openSettlementModal(): void {
    if (!this.member) {
      this.toastr.warning('Please load a member before opening settlement statement.');
      return;
    }
    if (typeof $ !== 'undefined' && $('#modal_settlement_statement').length) {
      $('#modal_settlement_statement').modal('show');
    }
  }

  printSettlementStatement(): void {
    window.print();
  }

  closePage(): void {
    this.router.navigate(['/admin/admin-dashboard']);
  }
}
