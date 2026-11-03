import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { ConstantData } from '../../utils/constant-data';
import { RequestModel } from '../../utils/interface';

export interface P17Row {
  LineId?: number;
  SlNo: number;
  PageNo: string;
  StaffNo: string;
  MemberNo?: string;
  MemberName?: string;
  Department?: string;
  VrNo: string;
  VrDate: string; // "020326"
  LoanPaid: number;
  LoanRefund: number;
  LoanReceived: number;
  InterestRefund: number;
  InterestReceived: number;
  Installment: number;
  ActInstt?: string;
  Err?: string;
  IsRepeatedStaff?: boolean;
  HasPaidAndReceivedSameDate?: boolean;
}

@Component({
  selector: 'app-edp-p17',
  templateUrl: './edp-p17.component.html',
  styleUrls: ['./edp-p17.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class EdpP17Component implements OnInit {

  // Setup & State
  dataLoading = false;
  savingBatch = false;
  isInitialLoad = true;
  userDetail: any = {};
  reportDate = '';

  months: any[] = [];
  selectedMonthCode = '0326';
  selectedCategory = 'BSL';
  selectedSortBy = 'Date';

  company: any = {
    CompanyName: 'Bokaro Steel Employees (TA/Med./Mat.) Co-op. Cr. Soc. Ltd.',
    CompanyNameHindi: 'बोकारो इस्पात कर्मचारी (टी०ए०/मेड०/मेट०) सहकारी साख समिति लिमिटेड',
    RegistrationNo: 'BAGH-6/78',
    CompanyAddress: 'Old Admn. Bldg., Bokaro Steel City-827001'
  };

  // Data & Results
  rows: P17Row[] = [];
  filteredRows: P17Row[] = [];
  totals: any = {
    TotalRecords: 0,
    TotalLoanPaid: 0,
    TotalLoanRefund: 0,
    TotalLoanReceived: 0,
    TotalInterestRefund: 0,
    TotalInterestReceived: 0,
    TotalInstallment: 0
  };

  // Search & Pagination
  searchText = '';
  currentPage = 1;
  pageSize = 25;
  pageSizeOptions = [
    { label: '15 / page', value: 15 },
    { label: '25 / page', value: 25 },
    { label: '50 / page', value: 50 },
    { label: 'All records', value: -1 }
  ];

  // Edit / Form Model
  isEditing = false;
  editIndex = -1;
  formModel: P17Row = this.getEmptyForm();

  // Member search autocomplete
  memberSearchLoading = false;
  memberSearchResults: any[] = [];
  showMemberDropdown = false;
  Math = Math;

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

  get formattedMonthDisplay(): string {
    const found = this.months.find(m => m.MonthCode === this.selectedMonthCode);
    if (found) return found.MonthName;
    if (this.selectedMonthCode && this.selectedMonthCode.length === 4) {
      return `${this.selectedMonthCode.substring(0, 2)}/20${this.selectedMonthCode.substring(2, 4)}`;
    }
    return this.selectedMonthCode;
  }

  getEmptyForm(): P17Row {
    return {
      SlNo: 0,
      PageNo: '001',
      StaffNo: '',
      MemberNo: '',
      MemberName: '',
      Department: '',
      VrNo: '',
      VrDate: '',
      LoanPaid: 0,
      LoanRefund: 0,
      LoanReceived: 0,
      InterestRefund: 0,
      InterestReceived: 0,
      Installment: 0
    };
  }

  // 1. Setup API
  loadSetup(): void {
    const req: RequestModel = { request: '' };
    this.dataLoading = true;
    this.service.edpAdvice('GetSetup', req).subscribe({
      next: (res: any) => {
        this.dataLoading = false;
        if (res.Message === ConstantData.SuccessMessage) {
          if (res.Company) {
            this.company = { ...this.company, ...res.Company };
          }
          this.months = res.Months || [];
          if (res.DefaultMonthCode) {
            this.selectedMonthCode = res.DefaultMonthCode;
          }
          this.fetchAdviceData();
        } else {
          this.toastr.error(res.Message || 'Failed to load EDP setup.');
        }
      },
      error: () => {
        this.dataLoading = false;
        this.toastr.error('Server error loading setup.');
      }
    });
  }

  // 2. Fetch Advice Data
  fetchAdviceData(): void {
    const payload = {
      StaffLoginId: this.userDetail?.StaffLoginId || 7,
      AdviceType: 'P17',
      MonthCode: this.selectedMonthCode,
      MemberCategory: this.selectedCategory,
      SortBy: this.selectedSortBy
    };

    const req: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.dataLoading = true;
    this.service.edpAdvice('GetAdviceData', req).subscribe({
      next: (res: any) => {
        this.dataLoading = false;
        this.isInitialLoad = false;
        if (res.Message === ConstantData.SuccessMessage) {
          this.rows = res.Rows || [];
          this.applyFilterAndSort();
          this.calculateTotals();
        } else {
          this.toastr.error(res.Message || 'Failed to fetch P17 advice data.');
          this.rows = [];
          this.filteredRows = [];
        }
      },
      error: () => {
        this.dataLoading = false;
        this.isInitialLoad = false;
        this.toastr.error('Server error while generating P17 advice.');
      }
    });
  }

  // 3. Save Batch
  saveDraftBatch(): void {
    const payload = {
      StaffLoginId: this.userDetail?.StaffLoginId || 7,
      AdviceType: 'P17',
      MonthCode: this.selectedMonthCode,
      Lines: this.rows
    };

    const req: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.savingBatch = true;
    this.service.edpAdvice('SaveBatch', req).subscribe({
      next: (res: any) => {
        this.savingBatch = false;
        if (res.Message === ConstantData.SuccessMessage) {
          this.toastr.success('P17 Advice Batch saved successfully!');
        } else {
          this.toastr.error(res.Message || 'Failed to save batch.');
        }
      },
      error: () => {
        this.savingBatch = false;
        this.toastr.error('Server error saving batch.');
      }
    });
  }

  // 4. Form Actions (Add / Update / Delete)
  onSearchStaff(term: string): void {
    if (!term || term.trim().length < 2) {
      this.memberSearchResults = [];
      this.showMemberDropdown = false;
      return;
    }

    const payload = { SearchTerm: term.trim() };
    const req: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.memberSearchLoading = true;
    this.service.edpAdvice('SearchMember', req).subscribe({
      next: (res: any) => {
        this.memberSearchLoading = false;
        if (res.Message === ConstantData.SuccessMessage) {
          this.memberSearchResults = res.Members || [];
          this.showMemberDropdown = this.memberSearchResults.length > 0;
        }
      },
      error: () => { this.memberSearchLoading = false; }
    });
  }

  selectMember(m: any): void {
    this.formModel.StaffNo = m.StaffNo;
    this.formModel.MemberNo = m.MemberNo;
    this.formModel.MemberName = m.MemberName;
    this.formModel.Department = m.Department;
    this.showMemberDropdown = false;
    this.memberSearchResults = [];
  }

  onLoanAmountOrDateChange(): void {
    if (this.formModel.LoanPaid > 0 && this.formModel.VrDate && this.formModel.VrDate.length >= 6) {
      // Parse day from VrDate (DDMMYY)
      const day = parseInt(this.formModel.VrDate.substring(0, 2), 10);
      let daysInMonth = 31;
      if (this.selectedMonthCode && this.selectedMonthCode.length === 4) {
        const m = parseInt(this.selectedMonthCode.substring(0, 2), 10);
        const y = 2000 + parseInt(this.selectedMonthCode.substring(2, 4), 10);
        daysInMonth = new Date(y, m, 0).getDate();
      }

      const daysCharged = Math.max(1, (daysInMonth - day) + 1);
      // Interest formula: (Principal * 6.5 * daysCharged) / 36500
      this.formModel.InterestRefund = Math.round((this.formModel.LoanPaid * 6.5 * daysCharged) / 36500);

      if (!this.formModel.Installment || this.formModel.Installment === 0) {
        this.formModel.Installment = Math.round(this.formModel.LoanPaid / 24);
      }
    }
  }

  addOrUpdateEntry(): void {
    if (!this.formModel.StaffNo || this.formModel.StaffNo.trim() === '') {
      this.toastr.warning('Please enter Staff Number.');
      return;
    }

    if (this.formModel.LoanPaid <= 0 && this.formModel.LoanReceived <= 0) {
      this.toastr.warning('Please enter Loan Paid or Loan Received amount.');
      return;
    }

    if (this.isEditing && this.editIndex >= 0) {
      this.rows[this.editIndex] = { ...this.formModel };
      this.toastr.info('Entry updated.');
      this.cancelEdit();
    } else {
      this.formModel.SlNo = this.rows.length + 1;
      this.rows.push({ ...this.formModel });
      this.toastr.success('Entry added.');
      this.formModel = this.getEmptyForm();
    }

    this.applyFilterAndSort();
    this.calculateTotals();
  }

  editRow(row: P17Row, index: number): void {
    this.isEditing = true;
    this.editIndex = index;
    this.formModel = { ...row };
  }

  deleteRow(index: number): void {
    if (confirm('Are you sure you want to remove this row from the P17 advice?')) {
      this.rows.splice(index, 1);
      this.reIndexRows();
      this.applyFilterAndSort();
      this.calculateTotals();
      this.toastr.warning('Row removed.');
    }
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editIndex = -1;
    this.formModel = this.getEmptyForm();
  }

  reIndexRows(): void {
    let sl = 1;
    for (const r of this.rows) {
      r.SlNo = sl++;
    }
  }

  calculateTotals(): void {
    const list = this.filteredRows;
    this.totals = {
      TotalRecords: list.length,
      TotalLoanPaid: list.reduce((acc, r) => acc + (r.LoanPaid || 0), 0),
      TotalLoanRefund: list.reduce((acc, r) => acc + (r.LoanRefund || 0), 0),
      TotalLoanReceived: list.reduce((acc, r) => acc + (r.LoanReceived || 0), 0),
      TotalInterestRefund: list.reduce((acc, r) => acc + (r.InterestRefund || 0), 0),
      TotalInterestReceived: list.reduce((acc, r) => acc + (r.InterestReceived || 0), 0),
      TotalInstallment: list.reduce((acc, r) => acc + (r.Installment || 0), 0)
    };
  }

  // 5. Filter & Pagination
  applyFilterAndSort(): void {
    let list = [...this.rows];

    if (this.searchText && this.searchText.trim() !== '') {
      const q = this.searchText.trim().toLowerCase();
      list = list.filter(r =>
        (r.StaffNo && r.StaffNo.toLowerCase().includes(q)) ||
        (r.MemberName && r.MemberName.toLowerCase().includes(q)) ||
        (r.VrNo && r.VrNo.toLowerCase().includes(q))
      );
    }

    this.filteredRows = list;
    this.currentPage = 1;
  }

  get pagedRows(): P17Row[] {
    if (this.pageSize === -1) return this.filteredRows;
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

  // 6. Print Report
  printReport(): void {
    window.print();
  }

  // 7. Export .TXT File for SAIL EDP
  downloadEdpTextFile(): void {
    const payload = {
      AdviceType: 'P17',
      MonthCode: this.selectedMonthCode,
      Lines: this.rows
    };

    const req: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.service.edpAdvice('ExportTextFile', req).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage && res.FileContent) {
          const blob = new Blob([res.FileContent], { type: 'text/plain;charset=utf-8' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.setAttribute('download', res.FileName || `P17_${this.selectedMonthCode}.TXT`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          this.toastr.success('EDP P17 Text File downloaded successfully!');
        } else {
          this.toastr.error(res.Message || 'Failed to generate text file.');
        }
      },
      error: () => {
        this.toastr.error('Server error exporting text file.');
      }
    });
  }

  // 8. Export CSV
  exportCsv(): void {
    if (this.rows.length === 0) {
      this.toastr.warning('No data to export.');
      return;
    }

    const headers = ['SlNo', 'File/Page', 'StaffNo', 'VrNo', 'VrDate', 'LoanPaid', 'LoanRefund', 'LoanReceived', 'IntRefund', 'IntReceived', 'Installment'];
    const csvRows: string[] = [];
    csvRows.push(headers.join(','));

    for (const r of this.rows) {
      const row = [
        r.SlNo,
        `"003/${r.PageNo || '001'}"`,
        `"${r.StaffNo}"`,
        `"${r.VrNo}"`,
        `"${r.VrDate}"`,
        r.LoanPaid || 0,
        r.LoanRefund || 0,
        r.LoanReceived || 0,
        r.InterestRefund || 0,
        r.InterestReceived || 0,
        r.Installment || 0
      ];
      csvRows.push(row.join(','));
    }

    const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `EDP_P17_${this.selectedMonthCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toastr.success('CSV exported successfully!');
  }
}
