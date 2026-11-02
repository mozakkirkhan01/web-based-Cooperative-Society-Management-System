import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { ConstantData } from '../../utils/constant-data';
import { RequestModel } from '../../utils/interface';

export interface HeadBookRow {
  SlNo: number;
  StaffNo: string;
  MemberNo: string;
  MemberName: string;
  Opening: number;
  OpeningType: string;
  Debits: number;
  Credits: number;
  Closing: number;
  ClosingType: string;

  // Interest breakdown
  OpeningPrn?: number;
  OpeningPrnType?: string;
  OpeningInt?: number;
  OpeningIntType?: string;
  DebitsPrn?: number;
  CreditsPrn?: number;
  DebitsInt?: number;
  CreditsInt?: number;
  ClosingPrn?: number;
  ClosingPrnType?: string;
  ClosingInt?: number;
  ClosingIntType?: string;
}

@Component({
  selector: 'app-head-book',
  templateUrl: './head-book.component.html',
  styleUrls: ['./head-book.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class HeadBookComponent implements OnInit {

  Math = Math;
  dataLoading: boolean = false;
  isInitialLoad: boolean = true;
  userDetail: any = {};

  // Setup / Dropdown options
  years: any[] = [];
  selectedYearId: number = 2026;
  heads: any[] = [];
  selectedHeadCode: string = '018';
  selectedHeadName: string = 'COMPULSORY DEPOSIT';
  hasInterestOption: boolean = true;
  includeInterest: boolean = false;

  // Period / Date filter
  periodOption: string = 'Whole Year';
  periodOptions: string[] = [
    'Whole Year',
    'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November',
    'December', 'January', 'February', 'March'
  ];
  fromDate: string = '2026-04-01';
  toDate: string = '2027-03-31';

  // Record Range filter
  filterType: 'All' | 'StaffNo' | 'MemberNo' = 'All';
  fromNumber: string = '';
  toNumber: string = '';

  // Company Information (for Print Header)
  company: any = {
    CompanyName: 'Bokaro Steel Employees (TA/Med./Mat.) Co-op. Cr. Soc. Ltd.',
    CompanyNameHindi: 'बोकारो इस्पात कर्मचारी (टी०ए०/मेड०/मेट०) सहकारी साख समिति लिमिटेड',
    RegistrationNo: 'BAGH-6/78',
    CompanyAddress: 'Old Admn. Bldg., Bokaro Steel City-827001'
  };
  reportDate: string = '';

  // Data & Results
  rows: HeadBookRow[] = [];
  filteredRows: HeadBookRow[] = [];
  totals: any = {
    Opening: 0,
    OpeningType: 'Cr',
    Debits: 0,
    Credits: 0,
    Closing: 0,
    ClosingType: 'Cr',
    OpeningPrn: 0,
    OpeningPrnType: 'Cr',
    OpeningInt: 0,
    OpeningIntType: 'Cr',
    DebitsPrn: 0,
    CreditsPrn: 0,
    DebitsInt: 0,
    CreditsInt: 0,
    ClosingPrn: 0,
    ClosingPrnType: 'Cr',
    ClosingInt: 0,
    ClosingIntType: 'Cr'
  };
  totalMembersCount: number = 0;

  // In-table quick search & sorting
  searchText: string = '';
  sortColumn: string = 'StaffNo';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 50;
  pageSizeOptions: any[] = [
    { label: '25', value: 25 },
    { label: '50', value: 50 },
    { label: '100', value: 100 },
    { label: '250', value: 250 },
    { label: '500', value: 500 },
    { label: 'All', value: -1 }
  ];

  constructor(
    private service: AppService,
    private localService: LocalService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.userDetail = this.localService.getEmployeeDetail() || {};
    this.initReportDate();
    this.loadSetup();
  }

  initReportDate(): void {
    const today = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dd = String(today.getDate()).padStart(2, '0');
    const mmm = months[today.getMonth()];
    const yyyy = today.getFullYear();
    this.reportDate = `${dd}-${mmm}-${yyyy}`;
  }

  get recordsDisplay(): string {
    if (this.filterType === 'StaffNo') {
      return `Staff No: ${this.fromNumber || 'Start'} to ${this.toNumber || 'End'}`;
    }
    if (this.filterType === 'MemberNo') {
      return `Member No: ${this.fromNumber || 'Start'} to ${this.toNumber || 'End'}`;
    }
    return '(All)';
  }

  // --------------------------------------------------------------------------
  // 1. Load Metadata & Dropdowns
  // --------------------------------------------------------------------------
  loadSetup(): void {
    const req: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        StaffLoginId: this.userDetail?.StaffLoginId || 7
      })).toString()
    };

    this.dataLoading = true;
    this.service.headBook('GetSetup', req).subscribe({
      next: (res: any) => {
        this.dataLoading = false;
        if (res.Message === ConstantData.SuccessMessage) {
          this.years = res.Years || [];
          if (res.ActiveYearId) {
            this.selectedYearId = res.ActiveYearId;
          } else if (this.years.length > 0) {
            this.selectedYearId = this.years[0].YearId;
          }

          this.heads = res.Heads || [];
          if (this.heads.length > 0) {
            const cd = this.heads.find((h: any) => h.HeadCode === '018');
            if (cd) {
              this.selectedHeadCode = cd.HeadCode;
              this.selectedHeadName = cd.HeadName;
              this.hasInterestOption = !!cd.HasInterestOption;
            } else {
              this.selectedHeadCode = this.heads[0].HeadCode;
              this.selectedHeadName = this.heads[0].HeadName;
              this.hasInterestOption = !!this.heads[0].HasInterestOption;
            }
          }

          if (res.Company) {
            this.company = res.Company;
          }

          this.syncDatesForPeriod();
          this.fetchHeadBook();
        } else {
          this.toastr.error(res.Message || 'Failed to load Head Book setup.');
        }
      },
      error: (err: any) => {
        this.dataLoading = false;
        this.toastr.error(err?.error?.Message || 'Error connecting to Head Book API.');
      }
    });
  }

  // --------------------------------------------------------------------------
  // 2. Filter & Date Handlers
  // --------------------------------------------------------------------------
  onYearChange(): void {
    this.syncDatesForPeriod();
    this.fetchHeadBook();
  }

  onHeadChange(): void {
    const selected = this.heads.find((h: any) => h.HeadCode === this.selectedHeadCode);
    if (selected) {
      this.selectedHeadName = selected.HeadName;
      this.hasInterestOption = !!selected.HasInterestOption;
      if (!this.hasInterestOption) {
        this.includeInterest = false;
      }
    }
    this.fetchHeadBook();
  }

  onInterestCheckboxChange(): void {
    this.fetchHeadBook();
  }

  onPeriodChange(): void {
    this.syncDatesForPeriod();
    this.fetchHeadBook();
  }

  onFilterTypeChange(): void {
    if (this.filterType === 'All') {
      this.fromNumber = '';
      this.toNumber = '';
      this.fetchHeadBook();
    }
  }

  syncDatesForPeriod(): void {
    const y = Number(this.selectedYearId) || 2026;
    const pad = (n: number) => String(n).padStart(2, '0');

    if (this.periodOption === 'Whole Year') {
      this.fromDate = `${y}-04-01`;
      this.toDate = `${y + 1}-03-31`;
      return;
    }

    const monthMap: { [key: string]: { m: number; yearOffset: number; lastDay: number } } = {
      'April': { m: 4, yearOffset: 0, lastDay: 30 },
      'May': { m: 5, yearOffset: 0, lastDay: 31 },
      'June': { m: 6, yearOffset: 0, lastDay: 30 },
      'July': { m: 7, yearOffset: 0, lastDay: 31 },
      'August': { m: 8, yearOffset: 0, lastDay: 31 },
      'September': { m: 9, yearOffset: 0, lastDay: 30 },
      'October': { m: 10, yearOffset: 0, lastDay: 31 },
      'November': { m: 11, yearOffset: 0, lastDay: 30 },
      'December': { m: 12, yearOffset: 0, lastDay: 31 },
      'January': { m: 1, yearOffset: 1, lastDay: 31 },
      'February': { m: 2, yearOffset: 1, lastDay: ((y + 1) % 4 === 0 ? 29 : 28) },
      'March': { m: 3, yearOffset: 1, lastDay: 31 }
    };

    const target = monthMap[this.periodOption];
    if (target) {
      const year = y + target.yearOffset;
      this.fromDate = `${year}-${pad(target.m)}-01`;
      this.toDate = `${year}-${pad(target.m)}-${pad(target.lastDay)}`;
    }
  }

  // --------------------------------------------------------------------------
  // 3. Fetch Data
  // --------------------------------------------------------------------------
  fetchHeadBook(): void {
    const payload = {
      StaffLoginId: this.userDetail?.StaffLoginId || 7,
      YearId: Number(this.selectedYearId) || 2026,
      HeadCode: this.selectedHeadCode,
      IncludeInterest: this.includeInterest && this.hasInterestOption,
      FromDate: this.fromDate,
      ToDate: this.toDate,
      FilterType: this.filterType,
      FromNumber: this.filterType !== 'All' ? this.fromNumber : null,
      ToNumber: this.filterType !== 'All' ? this.toNumber : null
    };

    const req: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.dataLoading = true;
    this.service.headBook('GetHeadBook', req).subscribe({
      next: (res: any) => {
        this.dataLoading = false;
        this.isInitialLoad = false;
        if (res.Message === ConstantData.SuccessMessage) {
          this.rows = res.Rows || [];
          this.totalMembersCount = res.TotalMembers || this.rows.length;
          this.totals = res.Totals || {};
          this.currentPage = 1;
          this.applyFilterAndSort();
        } else {
          this.toastr.error(res.Message || 'Failed to fetch Head Book data.');
          this.rows = [];
          this.filteredRows = [];
        }
      },
      error: (err: any) => {
        this.dataLoading = false;
        this.isInitialLoad = false;
        this.toastr.error(err?.error?.Message || 'Server error while generating Head Book.');
      }
    });
  }

  // --------------------------------------------------------------------------
  // 4. In-Memory Filter, Search & Sort
  // --------------------------------------------------------------------------
  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilterAndSort();
  }

  setSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applyFilterAndSort();
  }

  applyFilterAndSort(): void {
    let result = [...this.rows];

    // Client-side quick search
    const q = (this.searchText || '').trim().toLowerCase();
    if (q) {
      result = result.filter(r =>
        (r.StaffNo && r.StaffNo.toLowerCase().includes(q)) ||
        (r.MemberNo && r.MemberNo.toLowerCase().includes(q)) ||
        (r.MemberName && r.MemberName.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a: any, b: any) => {
      let valA = a[this.sortColumn];
      let valB = b[this.sortColumn];

      // Numeric sorting for StaffNo and MemberNo if purely numeric
      if (this.sortColumn === 'StaffNo' || this.sortColumn === 'MemberNo') {
        const numA = parseInt(valA, 10);
        const numB = parseInt(valB, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return this.sortDirection === 'asc' ? numA - numB : numB - numA;
        }
      }

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredRows = result;
  }

  get pagedRows(): HeadBookRow[] {
    if (this.pageSize === -1) {
      return this.filteredRows;
    }
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRows.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    if (this.pageSize === -1 || this.filteredRows.length === 0) return 1;
    return Math.ceil(this.filteredRows.length / this.pageSize);
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) {
      this.currentPage = p;
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  get visiblePages(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }
    if (current - delta > 2) {
      range.unshift(-1);
    }
    if (current + delta < total - 1) {
      range.push(-2);
    }
    range.unshift(1);
    range.push(total);
    return range;
  }

  // --------------------------------------------------------------------------
  // 5. Actions: Print & Export
  // --------------------------------------------------------------------------
  printReport(): void {
    if (this.rows.length === 0) {
      this.toastr.warning('No data to print. Please click Show first.');
      return;
    }
    window.print();
  }

  resetFilters(): void {
    this.periodOption = 'Whole Year';
    this.selectedHeadCode = '018';
    this.selectedHeadName = 'COMPULSORY DEPOSIT';
    this.hasInterestOption = true;
    this.includeInterest = false;
    this.filterType = 'All';
    this.fromNumber = '';
    this.toNumber = '';
    this.searchText = '';
    this.syncDatesForPeriod();
    this.fetchHeadBook();
  }

  exportCsv(): void {
    if (this.filteredRows.length === 0) {
      this.toastr.warning('No records to export.');
      return;
    }

    let csv = '';
    if (!this.includeInterest) {
      csv = 'StaffNo,MemberNo,Name,Opening,OpeningType,Debits,Credits,Closing,ClosingType\n';
      this.filteredRows.forEach(r => {
        csv += `"${r.StaffNo}","${r.MemberNo}","${(r.MemberName || '').replace(/"/g, '""')}",${r.Opening},"${r.OpeningType}",${r.Debits},${r.Credits},${r.Closing},"${r.ClosingType}"\n`;
      });
    } else {
      csv = 'StaffNo,MemberNo,Name,OpeningPrn,OpeningPrnType,OpeningInt,OpeningIntType,DebitsPrn,CreditsPrn,DebitsInt,CreditsInt,ClosingPrn,ClosingPrnType,ClosingInt,ClosingIntType\n';
      this.filteredRows.forEach(r => {
        csv += `"${r.StaffNo}","${r.MemberNo}","${(r.MemberName || '').replace(/"/g, '""')}",${r.OpeningPrn},"${r.OpeningPrnType}",${r.OpeningInt},"${r.OpeningIntType}",${r.DebitsPrn},${r.CreditsPrn},${r.DebitsInt},${r.CreditsInt},${r.ClosingPrn},"${r.ClosingPrnType}",${r.ClosingInt},"${r.ClosingIntType}"\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `HeadBook_${this.selectedHeadName.replace(/\s+/g, '_')}_${this.fromDate}_to_${this.toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  formatDateDisplay(d: string): string {
    if (!d) return '';
    const parts = d.split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${parts[2]}-${months[mIdx] || parts[1]}-${parts[0]}`;
    }
    return d;
  }

  closePage(): void {
    window.history.back();
  }
}
